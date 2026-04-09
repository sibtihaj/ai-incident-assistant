import type { ConversationMemory, Message, SavedConversation } from "@/types/conversation";

export type ChatSessionRow = {
  id: string;
  user_id: string;
  title: string;
  messages: unknown;
  created_at: string;
  updated_at: string;
};

export type StoredSessionPayload = {
  messages: unknown;
  memory?: ConversationMemory;
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

export function makeStoredSessionPayload(
  messages: Message[],
  memory?: ConversationMemory
): StoredSessionPayload {
  return {
    messages: messagesToJson(messages),
    memory,
  };
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

export function memoryFromStored(data: unknown): ConversationMemory | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return undefined;
  }
  const maybe = (data as { memory?: unknown }).memory;
  if (!maybe || typeof maybe !== "object" || Array.isArray(maybe)) {
    return undefined;
  }
  const m = maybe as Record<string, unknown>;
  const summary =
    typeof m.incidentSummary === "string" ? m.incidentSummary : "";
  const keyFacts =
    m.keyFacts && typeof m.keyFacts === "object" && !Array.isArray(m.keyFacts)
      ? Object.fromEntries(
          Object.entries(m.keyFacts as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string"
          )
        )
      : {};
  const updatedAt =
    typeof m.updatedAt === "string" ? m.updatedAt : new Date().toISOString();
  return {
    incidentSummary: summary,
    keyFacts,
    updatedAt,
  };
}

export function messagesFromStored(data: unknown): Message[] {
  if (Array.isArray(data)) {
    return messagesFromJson(data);
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return messagesFromJson((data as { messages?: unknown }).messages ?? []);
  }
  return [];
}

export function rowToSavedConversation(row: ChatSessionRow): SavedConversation {
  const parsedMessages = messagesFromStored(row.messages);
  const parsedMemory = memoryFromStored(row.messages);
  return {
    id: row.id,
    title: row.title,
    messages: parsedMessages,
    memory: parsedMemory,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    messageCount: parsedMessages.length,
  };
}
