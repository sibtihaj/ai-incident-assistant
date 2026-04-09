import ChatInterface from "@/components/chat/ChatInterface";

/** Navbar is `h-14` (3.5rem); pin chat to remaining viewport so the input sits at the bottom of the screen. */
export default function ChatPage() {
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 max-h-[calc(100dvh-3.5rem)] flex-col">
      <ChatInterface className="min-h-0 h-full flex-1" />
    </div>
  );
}
