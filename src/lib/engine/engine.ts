// The flow engine — walks a flow graph node by node and emits outputs.
// Pure and dependency-injected: no DB access, no timers, no network.
// The runtime (src/lib/runtime.ts) applies outputs and owns side effects.
import type {
  ActionNodeData,
  AiNodeData,
  ConditionNodeData,
  Contact,
  DelayNodeData,
  FlowGraph,
  FlowNode,
  FlowState,
  MessageNodeData,
  QuickReplyButton,
  StartFlowNodeData,
  UserInputNodeData,
} from "../types";
import { evaluateCondition } from "./conditions";
import { interpolate } from "./interpolate";

export type EngineOutput =
  | { type: "message"; text: string; buttons: QuickReplyButton[] }
  | { type: "add_tag"; tag: string }
  | { type: "remove_tag"; tag: string }
  | { type: "set_field"; key: string; value: string }
  // Engine stops at a delay; the runtime sleeps, then resumes at resumeNodeId.
  | { type: "delay"; seconds: number; flowId: string; resumeNodeId: string };

export interface EngineResult {
  outputs: EngineOutput[];
  state: FlowState | null; // set when waiting for the contact (buttons / input)
}

export interface EngineDeps {
  getGraph: (flowId: string) => FlowGraph | null; // used by start_flow nodes
  generateAi?: (systemPrompt: string, userMessage: string) => Promise<string>;
}

export interface EngineContext {
  contact: Contact;
  lastMessage: string;
}

const MAX_STEPS = 50; // guard against cyclic graphs

function findNode(graph: FlowGraph, id: string): FlowNode | null {
  return graph.nodes.find((n) => n.id === id) ?? null;
}

function nextNodeId(graph: FlowGraph, nodeId: string, handle?: string): string | null {
  const edge = graph.edges.find(
    (e) => e.source === nodeId && (handle === undefined || e.sourceHandle === handle),
  );
  return edge?.target ?? null;
}

/** Walk the graph from a node until the flow ends or waits for the contact. */
export async function runFlow(
  flowId: string,
  graph: FlowGraph,
  startNodeId: string | null,
  ctx: EngineContext,
  deps: EngineDeps,
): Promise<EngineResult> {
  const outputs: EngineOutput[] = [];
  // Contact is mutated locally so later conditions see earlier action effects;
  // the runtime persists the same mutations from the outputs list.
  const contact: Contact = {
    ...ctx.contact,
    fields: { ...ctx.contact.fields },
    tags: [...ctx.contact.tags],
  };
  let currentFlowId = flowId;
  let currentGraph = graph;
  let nodeId: string | null = startNodeId ?? graph.entryId ?? graph.nodes[0]?.id ?? null;

  for (let step = 0; step < MAX_STEPS && nodeId; step++) {
    const node = findNode(currentGraph, nodeId);
    if (!node) break;

    switch (node.type) {
      case "message": {
        const data = node.data as MessageNodeData;
        const buttons = data.buttons.filter((b) => b.label.trim() !== "");
        outputs.push({ type: "message", text: interpolate(data.text, contact), buttons });
        if (buttons.length > 0) {
          // Wait for a button tap (or any reply, which re-enters trigger matching)
          return {
            outputs,
            state: { flowId: currentFlowId, waitNodeId: node.id, waitType: "buttons" },
          };
        }
        nodeId = nextNodeId(currentGraph, node.id);
        break;
      }
      case "condition": {
        const data = node.data as ConditionNodeData;
        const branch = evaluateCondition(data, contact) ? "yes" : "no";
        nodeId = nextNodeId(currentGraph, node.id, branch);
        break;
      }
      case "action": {
        const data = node.data as ActionNodeData;
        if (data.kind === "add_tag" && data.tag) {
          if (!contact.tags.includes(data.tag)) contact.tags.push(data.tag);
          outputs.push({ type: "add_tag", tag: data.tag });
        } else if (data.kind === "remove_tag" && data.tag) {
          contact.tags = contact.tags.filter((t) => t !== data.tag);
          outputs.push({ type: "remove_tag", tag: data.tag });
        } else if (data.kind === "set_field" && data.fieldKey) {
          const value = interpolate(data.fieldValue ?? "", contact);
          contact.fields[data.fieldKey] = value;
          outputs.push({ type: "set_field", key: data.fieldKey, value });
        }
        nodeId = nextNodeId(currentGraph, node.id);
        break;
      }
      case "delay": {
        const data = node.data as DelayNodeData;
        const resumeNodeId = nextNodeId(currentGraph, node.id);
        if (resumeNodeId) {
          outputs.push({
            type: "delay",
            seconds: Math.max(0, data.seconds),
            flowId: currentFlowId,
            resumeNodeId,
          });
        }
        return { outputs, state: null }; // runtime resumes after the pause
      }
      case "user_input": {
        const data = node.data as UserInputNodeData;
        outputs.push({ type: "message", text: interpolate(data.question, contact), buttons: [] });
        return {
          outputs,
          state: {
            flowId: currentFlowId,
            waitNodeId: node.id,
            waitType: "input",
            fieldKey: data.fieldKey,
          },
        };
      }
      case "ai": {
        const data = node.data as AiNodeData;
        let text = data.fallbackText;
        if (deps.generateAi) {
          try {
            text = await deps.generateAi(interpolate(data.systemPrompt, contact), ctx.lastMessage);
          } catch {
            text = data.fallbackText; // local model down → graceful degradation
          }
        }
        outputs.push({ type: "message", text, buttons: [] });
        nodeId = nextNodeId(currentGraph, node.id);
        break;
      }
      case "start_flow": {
        const data = node.data as StartFlowNodeData;
        const target = deps.getGraph(data.flowId);
        if (!target) return { outputs, state: null };
        currentFlowId = data.flowId;
        currentGraph = target;
        nodeId = target.entryId ?? target.nodes[0]?.id ?? null;
        break;
      }
      default:
        nodeId = null;
    }
  }
  return { outputs, state: null };
}

/** Resume a flow waiting on quick-reply buttons. Returns null if no button matched. */
export async function resumeWithButton(
  graph: FlowGraph,
  state: FlowState,
  reply: string,
  ctx: EngineContext,
  deps: EngineDeps,
): Promise<EngineResult | null> {
  const node = findNode(graph, state.waitNodeId);
  if (!node || node.type !== "message") return null;
  const data = node.data as MessageNodeData;
  const button = data.buttons.find(
    (b) => b.id === reply || b.label.trim().toLowerCase() === reply.trim().toLowerCase(),
  );
  if (!button) return null; // not a button tap → caller falls back to trigger matching
  const next = nextNodeId(graph, node.id, button.id);
  if (!next) return { outputs: [], state: null };
  return runFlow(state.flowId, graph, next, ctx, deps);
}

/** Resume a flow waiting on free-text user input: store the answer, continue. */
export async function resumeWithInput(
  graph: FlowGraph,
  state: FlowState,
  answer: string,
  ctx: EngineContext,
  deps: EngineDeps,
): Promise<EngineResult> {
  const outputs: EngineOutput[] = [];
  const contact: Contact = {
    ...ctx.contact,
    fields: { ...ctx.contact.fields },
    tags: [...ctx.contact.tags],
  };
  if (state.fieldKey) {
    contact.fields[state.fieldKey] = answer;
    outputs.push({ type: "set_field", key: state.fieldKey, value: answer });
  }
  const next = nextNodeId(graph, state.waitNodeId);
  if (!next) return { outputs, state: null };
  const result = await runFlow(state.flowId, graph, next, { ...ctx, contact }, deps);
  return { outputs: [...outputs, ...result.outputs], state: result.state };
}
