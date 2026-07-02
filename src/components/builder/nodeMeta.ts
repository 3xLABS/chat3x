// Shared metadata for node rendering — label, color token, default payload.
import type { NodeData, NodeType } from "@/lib/types";

export interface NodeMeta {
  label: string;
  colorVar: string; // CSS variable holding the node's semantic color
  defaultData: () => NodeData;
}

export const NODE_META: Record<NodeType, NodeMeta> = {
  message: {
    label: "Message",
    colorVar: "var(--color-node-message)",
    defaultData: () => ({ text: "New message", buttons: [] }),
  },
  condition: {
    label: "Condition",
    colorVar: "var(--color-node-condition)",
    defaultData: () => ({ field: "", op: "has_tag", value: "" }),
  },
  action: {
    label: "Action",
    colorVar: "var(--color-node-action)",
    defaultData: () => ({ kind: "add_tag", tag: "" }),
  },
  delay: {
    label: "Smart Delay",
    colorVar: "var(--color-node-delay)",
    defaultData: () => ({ seconds: 5 }),
  },
  user_input: {
    label: "User Input",
    colorVar: "var(--color-node-input)",
    defaultData: () => ({ question: "What's your email?", fieldKey: "email" }),
  },
  ai: {
    label: "AI Step",
    colorVar: "var(--color-node-ai)",
    defaultData: () => ({
      systemPrompt: "You are a helpful assistant. Reply in max 2 sentences.",
      fallbackText: "Thanks! A human will get back to you.",
    }),
  },
  start_flow: {
    label: "Start Flow",
    colorVar: "var(--color-node-flow)",
    defaultData: () => ({ flowId: "" }),
  },
};

export const NODE_TYPES = Object.keys(NODE_META) as NodeType[];
