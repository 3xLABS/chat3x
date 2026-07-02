// Domain types for CHAT3X — a local-first ManyChat-style automation engine.
// Mirrors ManyChat's model: Trigger → Flow (graph of nodes) → Actions.

export type NodeType =
  | "message"
  | "condition"
  | "action"
  | "delay"
  | "user_input"
  | "ai"
  | "start_flow";

export interface QuickReplyButton {
  id: string;
  label: string;
}

// Node payloads — one shape per node type, discriminated by `type` on FlowNode
export interface MessageNodeData {
  text: string;
  buttons: QuickReplyButton[];
}

export type ConditionOp =
  | "eq"
  | "neq"
  | "contains"
  | "gt"
  | "lt"
  | "has_tag"
  | "not_has_tag";

export interface ConditionNodeData {
  // field is a contact field key ("name" or any custom field); ignored for tag ops
  field: string;
  op: ConditionOp;
  value: string;
}

export type ActionKind = "add_tag" | "remove_tag" | "set_field";

export interface ActionNodeData {
  kind: ActionKind;
  tag?: string;
  fieldKey?: string;
  fieldValue?: string;
}

export interface DelayNodeData {
  seconds: number;
}

export interface UserInputNodeData {
  question: string;
  fieldKey: string; // where the answer is stored on the contact
}

export interface AiNodeData {
  systemPrompt: string;
  fallbackText: string; // used when the local model is unreachable
}

export interface StartFlowNodeData {
  flowId: string;
}

export type NodeData =
  | MessageNodeData
  | ConditionNodeData
  | ActionNodeData
  | DelayNodeData
  | UserInputNodeData
  | AiNodeData
  | StartFlowNodeData;

export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  // routing handle: button id on message nodes, "yes"/"no" on condition nodes
  sourceHandle?: string | null;
}

export interface FlowGraph {
  entryId: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export type TriggerType = "keyword" | "new_contact" | "default_reply";
export type KeywordMatch = "is" | "contains" | "begins_with";

export interface Trigger {
  id: string;
  type: TriggerType;
  keyword?: string;
  match?: KeywordMatch;
  enabled: boolean;
}

export interface Flow {
  id: string;
  name: string;
  graph: FlowGraph;
  triggers: Trigger[];
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  fields: Record<string, string>;
  tags: string[];
  createdAt: string;
}

// Where a paused conversation resumes when the contact replies
export interface FlowState {
  flowId: string;
  waitNodeId: string;
  waitType: "buttons" | "input";
  fieldKey?: string;
}

export type ConversationStatus = "bot" | "human";

export interface Conversation {
  id: string;
  contactId: string;
  status: ConversationStatus;
  state: FlowState | null;
  updatedAt: string;
}

export type MessageSender = "contact" | "bot" | "agent";

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: MessageSender;
  text: string;
  buttons: QuickReplyButton[] | null;
  createdAt: string;
}
