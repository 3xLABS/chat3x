"use client";

// Right-hand panel: edit the selected node's payload, set entry, delete.
import { useEffect, useState } from "react";
import type {
  ActionNodeData,
  AiNodeData,
  ConditionNodeData,
  ConditionOp,
  DelayNodeData,
  Flow,
  MessageNodeData,
  NodeData,
  NodeType,
  StartFlowNodeData,
  UserInputNodeData,
} from "@/lib/types";
import { NODE_META } from "./nodeMeta";

interface NodeInspectorProps {
  nodeId: string;
  nodeType: NodeType;
  payload: NodeData;
  isEntry: boolean;
  onChange: (payload: NodeData) => void;
  onSetEntry: () => void;
  onDelete: () => void;
}

const CONDITION_OPS: ConditionOp[] = ["has_tag", "not_has_tag", "eq", "neq", "contains", "gt", "lt"];

const inputClass =
  "w-full rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent";
const labelClass = "mb-1 mt-3 block font-mono text-[10px] uppercase tracking-wider text-ink-faint";

export function NodeInspector({
  nodeId,
  nodeType,
  payload,
  isEntry,
  onChange,
  onSetEntry,
  onDelete,
}: NodeInspectorProps) {
  const meta = NODE_META[nodeType];

  return (
    <div className="flex h-full w-80 shrink-0 flex-col overflow-y-auto border-l border-line bg-surface p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: meta.colorVar }}>
        {meta.label}
      </p>
      <p className="mt-0.5 font-mono text-xs text-ink-faint">{nodeId}</p>

      {nodeType === "message" && <MessageFields payload={payload as MessageNodeData} onChange={onChange} />}
      {nodeType === "condition" && <ConditionFields payload={payload as ConditionNodeData} onChange={onChange} />}
      {nodeType === "action" && <ActionFields payload={payload as ActionNodeData} onChange={onChange} />}
      {nodeType === "delay" && <DelayFields payload={payload as DelayNodeData} onChange={onChange} />}
      {nodeType === "user_input" && <UserInputFields payload={payload as UserInputNodeData} onChange={onChange} />}
      {nodeType === "ai" && <AiFields payload={payload as AiNodeData} onChange={onChange} />}
      {nodeType === "start_flow" && <StartFlowFields payload={payload as StartFlowNodeData} onChange={onChange} />}

      <div className="mt-auto flex gap-2 pt-6">
        {!isEntry && (
          <button
            onClick={onSetEntry}
            className="flex-1 rounded-md border border-line px-3 py-1.5 text-xs text-ink-dim transition-colors hover:border-accent hover:text-accent"
          >
            Set as entry
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex-1 rounded-md border border-line px-3 py-1.5 text-xs text-ink-dim transition-colors hover:border-red-400 hover:text-red-400"
        >
          Delete node
        </button>
      </div>
    </div>
  );
}

function MessageFields({ payload, onChange }: { payload: MessageNodeData; onChange: (d: NodeData) => void }) {
  return (
    <>
      <label className={labelClass}>Text — supports {"{{name}}"} and {"{{field:key}}"}</label>
      <textarea
        className={`${inputClass} min-h-24`}
        value={payload.text}
        onChange={(e) => onChange({ ...payload, text: e.target.value })}
      />
      <label className={labelClass}>Quick replies</label>
      {payload.buttons.map((button, i) => (
        <div key={button.id} className="mb-1.5 flex gap-1.5">
          <input
            className={inputClass}
            value={button.label}
            placeholder="Button label"
            onChange={(e) => {
              const buttons = payload.buttons.map((b, j) => (j === i ? { ...b, label: e.target.value } : b));
              onChange({ ...payload, buttons });
            }}
          />
          <button
            onClick={() => onChange({ ...payload, buttons: payload.buttons.filter((_, j) => j !== i) })}
            className="shrink-0 rounded-md border border-line px-2 text-xs text-ink-faint hover:border-red-400 hover:text-red-400"
            aria-label="Remove button"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onChange({
            ...payload,
            buttons: [...payload.buttons, { id: `b_${crypto.randomUUID().slice(0, 6)}`, label: "" }],
          })
        }
        className="mt-1 rounded-md border border-dashed border-line px-3 py-1.5 text-xs text-ink-dim hover:border-accent hover:text-accent"
      >
        + Add quick reply
      </button>
    </>
  );
}

function ConditionFields({ payload, onChange }: { payload: ConditionNodeData; onChange: (d: NodeData) => void }) {
  const isTagOp = payload.op.includes("tag");
  return (
    <>
      <label className={labelClass}>Operator</label>
      <select
        className={inputClass}
        value={payload.op}
        onChange={(e) => onChange({ ...payload, op: e.target.value as ConditionOp })}
      >
        {CONDITION_OPS.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
      {!isTagOp && (
        <>
          <label className={labelClass}>Field (name or custom field key)</label>
          <input className={inputClass} value={payload.field} onChange={(e) => onChange({ ...payload, field: e.target.value })} />
        </>
      )}
      <label className={labelClass}>{isTagOp ? "Tag" : "Value"}</label>
      <input className={inputClass} value={payload.value} onChange={(e) => onChange({ ...payload, value: e.target.value })} />
    </>
  );
}

function ActionFields({ payload, onChange }: { payload: ActionNodeData; onChange: (d: NodeData) => void }) {
  return (
    <>
      <label className={labelClass}>Action</label>
      <select
        className={inputClass}
        value={payload.kind}
        onChange={(e) => onChange({ ...payload, kind: e.target.value as ActionNodeData["kind"] })}
      >
        <option value="add_tag">add tag</option>
        <option value="remove_tag">remove tag</option>
        <option value="set_field">set field</option>
      </select>
      {payload.kind === "set_field" ? (
        <>
          <label className={labelClass}>Field key</label>
          <input className={inputClass} value={payload.fieldKey ?? ""} onChange={(e) => onChange({ ...payload, fieldKey: e.target.value })} />
          <label className={labelClass}>Value</label>
          <input className={inputClass} value={payload.fieldValue ?? ""} onChange={(e) => onChange({ ...payload, fieldValue: e.target.value })} />
        </>
      ) : (
        <>
          <label className={labelClass}>Tag</label>
          <input className={inputClass} value={payload.tag ?? ""} onChange={(e) => onChange({ ...payload, tag: e.target.value })} />
        </>
      )}
    </>
  );
}

function DelayFields({ payload, onChange }: { payload: DelayNodeData; onChange: (d: NodeData) => void }) {
  return (
    <>
      <label className={labelClass}>Delay in seconds</label>
      <input
        type="number"
        min={0}
        className={inputClass}
        value={payload.seconds}
        onChange={(e) => onChange({ ...payload, seconds: Number(e.target.value) })}
      />
    </>
  );
}

function UserInputFields({ payload, onChange }: { payload: UserInputNodeData; onChange: (d: NodeData) => void }) {
  return (
    <>
      <label className={labelClass}>Question</label>
      <textarea
        className={`${inputClass} min-h-20`}
        value={payload.question}
        onChange={(e) => onChange({ ...payload, question: e.target.value })}
      />
      <label className={labelClass}>Save answer to field</label>
      <input className={inputClass} value={payload.fieldKey} onChange={(e) => onChange({ ...payload, fieldKey: e.target.value })} />
    </>
  );
}

function AiFields({ payload, onChange }: { payload: AiNodeData; onChange: (d: NodeData) => void }) {
  return (
    <>
      <label className={labelClass}>System prompt (runs on local Ollama)</label>
      <textarea
        className={`${inputClass} min-h-24`}
        value={payload.systemPrompt}
        onChange={(e) => onChange({ ...payload, systemPrompt: e.target.value })}
      />
      <label className={labelClass}>Fallback text (if the model is offline)</label>
      <textarea
        className={`${inputClass} min-h-16`}
        value={payload.fallbackText}
        onChange={(e) => onChange({ ...payload, fallbackText: e.target.value })}
      />
    </>
  );
}

function StartFlowFields({ payload, onChange }: { payload: StartFlowNodeData; onChange: (d: NodeData) => void }) {
  const [flows, setFlows] = useState<Flow[]>([]);
  useEffect(() => {
    fetch("/api/flows").then((r) => r.json()).then(setFlows).catch(() => setFlows([]));
  }, []);
  return (
    <>
      <label className={labelClass}>Jump to flow</label>
      <select className={inputClass} value={payload.flowId} onChange={(e) => onChange({ ...payload, flowId: e.target.value })}>
        <option value="">— select —</option>
        {flows.map((flow) => (
          <option key={flow.id} value={flow.id}>
            {flow.name}
          </option>
        ))}
      </select>
    </>
  );
}
