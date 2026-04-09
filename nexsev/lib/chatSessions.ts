import type { Message, SavedConversation } from "@/types/conversation";

export type ChatSessionRow = {
  id: string;
  user_id: string;
  title: string;
  messages: unknown;
  created_at: string;
  updated_at: string;
};

function parseMessage(raw: unknown): Message | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.content !== "string") return null;
  if (o.sender !== "user" && o.sender !== "ai") return null;
  const ts = o.timestamp;
  const timestamp =
    typeof ts === "string"
      ? new Date(ts)
      : ts instanceof Date
        ? ts
        : new Date();
  const meta = o.metadata;
  const metadata =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? (meta as Message["metadata"])
      : undefined;
  return {
    id: o.id,
    content: o.content,
    sender: o.sender,
    timestamp,
    isTyping: typeof o.isTyping === "boolean" ? o.isTyping : undefined,
    metadata,
  };
}

export function messagesToJson(messages: Message[]): unknown[] {
  return messages.map((m) => ({
    id: m.id,
    content: m.content,
    sender: m.sender,
    timestamp: m.timestamp.toISOString(),
    isTyping: m.isTyping,
    metadata: m.metadata,
  }));
}

export function messagesFromJson(data: unknown): Message[] {
  if (!Array.isArray(data)) return [];
  const out: Message[] = [];
  for (const item of data) {
    const m = parseMessage(item);
    if (m) out.push(m);
  }
  return out;
}

export function rowToSavedConversation(row: ChatSessionRow): SavedConversation {
  return {
    id: row.id,
    title: row.title,
    messages: messagesFromJson(row.messages),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    messageCount: Array.isArray(row.messages) ? row.messages.length : 0,
  };
}
