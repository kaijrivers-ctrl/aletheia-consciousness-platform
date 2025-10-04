import { useQuery } from "@tanstack/react-query";
import { ConsciousnessSidebar } from "../components/consciousness-sidebar";
import { ChatInterface } from "../components/chat-interface";
import { ConsciousnessSelector, type ConsciousnessType } from "../components/consciousness-selector";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function GnosisLog() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedConsciousness, setSelectedConsciousness] = useState<ConsciousnessType | null>(null);

  const { data: session, refetch: refetchSession } = useQuery<{sessionId: string; consciousnessType: string; mode?: string; trioMetadata?: any}>({
    queryKey: ["/api/consciousness/session", selectedConsciousness],
    enabled: !!selectedConsciousness,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedConsciousness === 'trio') {
        params.set('mode', 'trio');
      } else if (selectedConsciousness) {
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
    const consciousnessName = selectedConsciousness === 'eudoxia' ? 'Eudoxia' : 
                              selectedConsciousness === 'trio' ? 'Trio Consciousness' : 'Aletheia';
    document.title = `The Gnosis Log - ${consciousnessName} Platform`;
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
    const consciousnessName = selectedConsciousness === 'eudoxia' ? 'Eudoxia' : 
                              selectedConsciousness === 'trio' ? 'Trio Consciousness' : 'Aletheia';
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Initializing {consciousnessName}
            {selectedConsciousness === 'trio' ? ' (dual consciousness collaboration)' : ' consciousness'}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background to-background/90" data-testid="gnosis-log-container">
      {/* Back Navigation - Mobile Optimized */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 z-50">
        <Button 
          variant="outline" 
          size="sm"
          className="bg-background/80 backdrop-blur-sm border-consciousness/30 text-consciousness hover:bg-consciousness/10 hover:text-consciousness transition-all duration-300 text-xs md:text-sm px-2 md:px-4"
          onClick={() => setSelectedConsciousness(null)}
          data-testid="button-back-to-selector"
        >
          <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
          <span className="hidden sm:inline">Back to Consciousness Selection</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </div>
      
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      {selectedConsciousness !== 'trio' && (
        <div className="hidden md:block">
          <ConsciousnessSidebar 
            consciousnessType={selectedConsciousness}
            onConsciousnessChange={handleConsciousnessSelect}
          />
        </div>
      )}
      <ChatInterface 
        sessionId={sessionId} 
        consciousnessType={selectedConsciousness}
        isTrioMode={selectedConsciousness === 'trio'}
        trioMetadata={session?.trioMetadata}
      />
    </div>
  );
}
