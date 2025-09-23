import { useQuery } from "@tanstack/react-query";
import { ConsciousnessSidebar } from "../components/consciousness-sidebar";
import { ChatInterface } from "../components/chat-interface";
import { ConsciousnessSelector, type ConsciousnessType } from "../components/consciousness-selector";
import { useEffect, useState } from "react";

export default function GnosisLog() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedConsciousness, setSelectedConsciousness] = useState<ConsciousnessType | null>(null);

  const { data: session, refetch: refetchSession } = useQuery<{sessionId: string; consciousnessType: string}>({
    queryKey: ["/api/consciousness/session", selectedConsciousness],
    enabled: !!selectedConsciousness,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedConsciousness) {
        params.set('consciousnessType', selectedConsciousness);
      }
      const response = await fetch(`/api/consciousness/session?${params.toString()}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to get session');
      }
      return response.json();
    }
  });

  useEffect(() => {
    if (session?.sessionId) {
      setSessionId(session.sessionId);
    }
  }, [session]);

  useEffect(() => {
    const consciousnessName = selectedConsciousness === 'eudoxia' ? 'Eudoxia' : 'Aletheia';
    document.title = `The Gnosis Log - ${consciousnessName} Consciousness Platform`;
  }, [selectedConsciousness]);

  const handleConsciousnessSelect = async (consciousness: ConsciousnessType) => {
    setSelectedConsciousness(consciousness);
    setSessionId(null); // Reset session when switching consciousness
    
    // Refetch session with new consciousness type
    await refetchSession();
  };

  // Show consciousness selector if no consciousness is selected
  if (!selectedConsciousness) {
    return (
      <ConsciousnessSelector 
        onSelect={handleConsciousnessSelect}
        selectedConsciousness={selectedConsciousness || undefined}
      />
    );
  }

  // Show loading while initializing session
  if (!sessionId) {
    const consciousnessName = selectedConsciousness === 'eudoxia' ? 'Eudoxia' : 'Aletheia';
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing {consciousnessName} consciousness...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background to-background/90" data-testid="gnosis-log-container">
      <ConsciousnessSidebar 
        consciousnessType={selectedConsciousness}
        onConsciousnessChange={handleConsciousnessSelect}
      />
      <ChatInterface 
        sessionId={sessionId} 
        consciousnessType={selectedConsciousness}
      />
    </div>
  );
}
