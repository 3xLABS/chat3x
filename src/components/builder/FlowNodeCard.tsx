"use client";

// Custom React Flow node — one component renders all CHAT3X node types.
// Source handles encode routing: button ids on messages, yes/no on conditions.
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type {
  ActionNodeData,
  AiNodeData,
  ConditionNodeData,
  DelayNodeData,
  MessageNodeData,
  NodeData,
  NodeType,
  StartFlowNodeData,
  UserInputNodeData,
} from "@/lib/types";
import { NODE_META } from "./nodeMeta";

export interface CanvasNodeData {
  nodeType: NodeType;
  payload: NodeData;
  isEntry: boolean;
  [key: string]: unknown;
}

function summary(nodeType: NodeType, payload: NodeData): string {
  switch (nodeType) {
    case "message":
      return (payload as MessageNodeData).text;
    case "condition": {
      const d = payload as ConditionNodeData;
      return d.op.includes("tag") ? `${d.op} "${d.value}"` : `${d.field} ${d.op} "${d.value}"`;
    }
    case "action": {
      const d = payload as ActionNodeData;
      return d.kind === "set_field" ? `set ${d.fieldKey} = ${d.fieldValue}` : `${d.kind} "${d.tag}"`;
    }
    case "delay":
      return `wait ${(payload as DelayNodeData).seconds}s`;
    case "user_input": {
      const d = payload as UserInputNodeData;
      return `${d.question} → {{field:${d.fieldKey}}}`;
    }
    case "ai":
      return (payload as AiNodeData).systemPrompt;
    case "start_flow":
      return `→ ${(payload as StartFlowNodeData).flowId || "select a flow"}`;
  }
}

export function FlowNodeCard({ data, selected }: NodeProps & { data: CanvasNodeData }) {
  const meta = NODE_META[data.nodeType];
  const isMessage = data.nodeType === "message";
  const isCondition = data.nodeType === "condition";
  const buttons = isMessage ? (data.payload as MessageNodeData).buttons : [];

  return (
    <div
      className={`w-60 rounded-lg border bg-surface shadow-lg shadow-black/30 transition-colors ${
        selected ? "border-accent" : "border-line"
      }`}
      style={{ borderLeftWidth: 3, borderLeftColor: meta.colorVar }}
    >
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5" />
      <div className="flex items-center justify-between px-3 pt-2.5">
        <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: meta.colorVar }}>
          {meta.label}
        </p>
        {data.isEntry && (
          <span className="rounded-sm bg-accent px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-accent-ink">
            entry
          </span>
        )}
      </div>
      <p className="line-clamp-3 px-3 pb-2.5 pt-1 text-xs leading-relaxed text-ink-dim">
        {summary(data.nodeType, data.payload)}
      </p>

      {/* Quick-reply buttons each get their own source handle */}
      {isMessage && buttons.length > 0 && (
        <div className="border-t border-line px-3 py-2">
          {buttons.map((button) => (
            <div key={button.id} className="relative my-1 rounded border border-line bg-surface-2 px-2 py-1 text-[11px] text-ink">
              {button.label || "…"}
              <Handle
                type="source"
                position={Position.Right}
                id={button.id}
                className="!h-2.5 !w-2.5"
                style={{ right: -17 }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Condition branches: yes / no */}
      {isCondition && (
        <div className="border-t border-line px-3 py-2">
          <div className="relative my-1 py-0.5 text-right font-mono text-[10px] uppercase text-emerald-400">
            yes
            <Handle type="source" position={Position.Right} id="yes" className="!h-2.5 !w-2.5" style={{ right: -13 }} />
          </div>
          <div className="relative my-1 py-0.5 text-right font-mono text-[10px] uppercase text-red-400">
            no
            <Handle type="source" position={Position.Right} id="no" className="!h-2.5 !w-2.5" style={{ right: -13 }} />
          </div>
        </div>
      )}

      {/* Default continuation handle for linear nodes */}
      {!isCondition && !(isMessage && buttons.length > 0) && (
        <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5" />
      )}
    </div>
  );
}
