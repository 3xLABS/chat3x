"use client";

// Visual flow builder — React Flow canvas + palette + inspector + triggers.
import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Flow, FlowGraph, NodeData, NodeType, Trigger } from "@/lib/types";
import { FlowNodeCard, type CanvasNodeData } from "./FlowNodeCard";
import { NODE_META, NODE_TYPES } from "./nodeMeta";
import { NodeInspector } from "./NodeInspector";
import { TriggerBar } from "./TriggerBar";

type CanvasNode = Node<CanvasNodeData>;

const nodeTypes = { chat3x: FlowNodeCard };

function toCanvas(graph: FlowGraph): { nodes: CanvasNode[]; edges: Edge[] } {
  return {
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      type: "chat3x" as const,
      position: n.position,
      data: { nodeType: n.type, payload: n.data, isEntry: n.id === graph.entryId },
    })),
    edges: graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
    })),
  };
}

function toGraph(nodes: CanvasNode[], edges: Edge[]): FlowGraph {
  const entry = nodes.find((n) => n.data.isEntry) ?? nodes[0];
  return {
    entryId: entry?.id ?? null,
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.data.nodeType,
      position: { x: n.position.x, y: n.position.y },
      data: n.data.payload,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
    })),
  };
}

export function FlowBuilder({ flowId }: { flowId: string }) {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [name, setName] = useState("");
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    fetch(`/api/flows/${flowId}`)
      .then((r) => r.json())
      .then((f: Flow) => {
        setFlow(f);
        setName(f.name);
        setTriggers(f.triggers);
        const canvas = toCanvas(f.graph);
        setNodes(canvas.nodes);
        setEdges(canvas.edges);
      })
      .catch(() => setFlow(null));
  }, [flowId, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  function addNode(nodeType: NodeType) {
    const id = `node_${crypto.randomUUID().slice(0, 8)}`;
    const offset = nodes.length * 24;
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: "chat3x",
        position: { x: 120 + offset, y: 100 + offset },
        data: { nodeType, payload: NODE_META[nodeType].defaultData(), isEntry: prev.length === 0 },
      },
    ]);
    setSelectedId(id);
  }

  function updatePayload(id: string, payload: NodeData) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, payload } } : n)));
  }

  function setEntry(id: string) {
    setNodes((prev) => prev.map((n) => ({ ...n, data: { ...n.data, isEntry: n.id === id } })));
  }

  function deleteNode(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  }

  async function save() {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, graph: toGraph(nodes, edges), triggers }),
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
    setTimeout(() => setSaveState("idle"), 1500);
  }

  if (!flow) {
    return <div className="p-10 font-mono text-sm text-ink-faint">loading flow…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header: name, save */}
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
        <Link href="/flows" className="font-mono text-xs text-ink-faint hover:text-accent">
          ← flows
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-ink outline-none"
          aria-label="Flow name"
        />
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          {saveState === "saved" ? "✓ saved" : saveState === "error" ? "save failed" : ""}
        </span>
        <button
          onClick={save}
          disabled={saveState === "saving"}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-accent-ink transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          Save
        </button>
      </div>

      <TriggerBar triggers={triggers} onChange={setTriggers} />

      <div className="flex min-h-0 flex-1">
        {/* Node palette */}
        <div className="flex w-40 shrink-0 flex-col gap-1.5 border-r border-line bg-surface p-3">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            add node
          </p>
          {NODE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => addNode(t)}
              className="rounded-md border border-line px-2.5 py-1.5 text-left text-xs text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink"
              style={{ borderLeftWidth: 3, borderLeftColor: NODE_META[t].colorVar }}
            >
              {NODE_META[t].label}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={({ nodes: sel }) => setSelectedId(sel[0]?.id ?? null)}
            fitView
            proOptions={{ hideAttribution: false }}
            colorMode="dark"
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>

        {/* Inspector */}
        {selected && (
          <NodeInspector
            nodeId={selected.id}
            nodeType={selected.data.nodeType}
            payload={selected.data.payload}
            isEntry={selected.data.isEntry}
            onChange={(payload) => updatePayload(selected.id, payload)}
            onSetEntry={() => setEntry(selected.id)}
            onDelete={() => deleteNode(selected.id)}
          />
        )}
      </div>
    </div>
  );
}
