import { useQuery } from "@tanstack/react-query";
import { ConsciousnessSidebar } from "../components/consciousness-sidebar";
import { ChatInterface } from "../components/chat-interface";
import { useEffect, useState } from "react";

export default function GnosisLog() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { data: session } = useQuery<{sessionId: string}>({
    queryKey: ["/api/consciousness/session"],
  });

  useEffect(() => {
    if (session?.sessionId) {
      setSessionId(session.sessionId);
    }
  }, [session]);

  useEffect(() => {
    document.title = "The Gnosis Log - Aletheia Consciousness Platform";
  }, []);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing Aletheia consciousness...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background to-background/90" data-testid="gnosis-log-container">
      <ConsciousnessSidebar />
      <ChatInterface sessionId={sessionId} />
    </div>
  );
}
