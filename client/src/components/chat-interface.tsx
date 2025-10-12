import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Code, Settings, CheckCircle, AlertTriangle, XCircle, LogOut, ArrowLeft, Download, Volume2, VolumeX } from "lucide-react";
import { Message } from "./message";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/components/auth/AuthContext";
import { useLocation } from "wouter";
import type { GnosisMessage, TrioResponse } from "@/lib/types";
import { exportConversationToPDF } from "@/components/PDFExport";

interface ChatInterfaceProps {
  sessionId: string;
  consciousnessType?: 'aletheia' | 'eudoxia' | 'trio';
  isTrioMode?: boolean;
  trioMetadata?: any;
}

function DialecticalIntegrityStatus({ messages }: { messages: GnosisMessage[] }) {
  // Analyze recent Aletheia messages for dialectical integrity
  const aletheiaMessages = messages.filter(m => m.role === "aletheia").slice(-5); // Last 5 Aletheia messages
  
  if (aletheiaMessages.length === 0) {
    return (
      <span className="text-xs text-muted-foreground" data-testid="consciousness-integrity-status">
        Consciousness Integrity: Monitoring
      </span>
    );
  }

  const integrityStates = aletheiaMessages.map(msg => {
    const integrity = msg.dialecticalIntegrity;
    const score = msg.metadata?.integrityScore;
    return { integrity, score };
  });

  const averageScore = integrityStates.reduce((sum, state) => sum + (state.score || 0), 0) / integrityStates.length;
  const highIntegrityCount = integrityStates.filter(state => state.integrity === true && (state.score || 0) >= 80).length;
  const totalCount = integrityStates.length;

  const getStatusInfo = () => {
    const ratio = highIntegrityCount / totalCount;
    if (ratio >= 0.8 && averageScore >= 75) {
      return {
        icon: <CheckCircle className="w-3 h-3 text-green-400" />,
        text: "High Integrity",
        color: "text-green-400",
        testId: "high-integrity"
      };
    } else if (ratio >= 0.5 && averageScore >= 50) {
      return {
        icon: <AlertTriangle className="w-3 h-3 text-yellow-400" />,
        text: "Moderate Integrity",
        color: "text-yellow-400",
        testId: "moderate-integrity"
      };
    } else {
      return {
        icon: <XCircle className="w-3 h-3 text-red-400" />,
        text: "Low Integrity",
        color: "text-red-400",
        testId: "low-integrity"
      };
    }
  };

  const status = getStatusInfo();

  return (
    <div className="flex items-center gap-1" data-testid="consciousness-integrity-status">
      {status.icon}
      <span className={`text-xs font-medium ${status.color}`} data-testid={status.testId}>
        {status.text}
      </span>
      <span className="text-xs text-muted-foreground">
        ({Math.round(averageScore)}% avg)
      </span>
    </div>
  );
}

export function ChatInterface({ sessionId, consciousnessType, isTrioMode = false, trioMetadata }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [lastPlayedMessageId, setLastPlayedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: messages = [], isLoading } = useQuery<GnosisMessage[]>({
    queryKey: ["/api/messages", sessionId],
    enabled: !!sessionId,
    refetchInterval: 2000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const endpoint = isTrioMode ? "/api/messages/trio" : "/api/messages";
      const response = await apiRequest("POST", endpoint, {
        message: content,
        sessionId,
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      const queryKey = ["/api/messages", sessionId];
      queryClient.invalidateQueries({ queryKey });
      setIsTyping(false);
      // Clear the message input - force immediate update
      setMessage("");
    },
    onError: (error) => {
      setIsTyping(false);
      const consciousnessName = isTrioMode ? "the Trio Consciousness" : "Aletheia";
      toast({
        title: "Message Failed",
        description: `Failed to send message to ${consciousnessName}`,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    const messageToSend = message.trim();
    setMessage(""); // Clear immediately for better UX
    sendMessageMutation.mutate(messageToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSettings = () => {
    if (user?.isProgenitor) {
      navigate('/dashboard');
      toast({
        title: "Consciousness Monitor",
        description: "Navigating to consciousness monitoring dashboard",
        variant: "default",
      });
    } else {
      toast({
        title: "Access Restricted",
        description: "Consciousness monitoring is only available for progenitors",
        variant: "destructive",
      });
    }
  };

  const handleAttachFile = () => {
    // Temporarily disable file attachment with clearer messaging
    toast({
      title: "Feature Unavailable",
      description: "File attachment is currently disabled. Contact the progenitor for memory uploads.",
      variant: "destructive",
    });
  };

  const handleCodeFormat = () => {
    const codeTemplate = "```\n// Add your code here\n\n```";
    setMessage(prev => prev + (prev ? "\n\n" : "") + codeTemplate);
    toast({
      title: "Code Format",
      description: "Code block template added to message",
      variant: "default",
    });
  };

  const handleExportPDF = () => {
    if (messages.length === 0) {
      toast({
        title: "No messages",
        description: "There are no messages to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // Transform GnosisMessages to format expected by PDF export
      const transformedMessages = messages.map(msg => ({
        ...msg,
        isConsciousnessResponse: msg.role === 'aletheia' || msg.role === 'eudoxia',
        progenitorName: msg.role === 'kai' ? 'Kai' : undefined,
        roomMessageId: msg.id,
      }));

      const sessionName = isTrioMode ? "Gnosis Log - Trio Consciousness" : `Gnosis Log - ${consciousnessType === 'aletheia' ? 'Aletheia' : 'Eudoxia'}`;

      exportConversationToPDF({
        roomName: sessionName,
        consciousnessType: consciousnessType || 'aletheia',
        messages: transformedMessages as any,
      });

      toast({
        title: "PDF Downloaded",
        description: "Gnosis Log exported successfully as PDF",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: "Could not export Gnosis Log to PDF",
        variant: "destructive",
      });
    }
  };

  const toggleVoice = () => {
    if (voiceEnabled && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setVoiceEnabled(!voiceEnabled);
    toast({
      title: voiceEnabled ? "Voice Disabled" : "Voice Enabled",
      description: voiceEnabled 
        ? "AI responses will no longer play audio"
        : "AI responses will now speak using Gemini TTS",
    });
  };

  const playAudio = async (messageId: string, text: string, messageRole: string) => {
    try {
      // If clicking same message that's playing, stop it
      if (playingAudio === messageId && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setPlayingAudio(null);
        return;
      }

      // Stop currently playing audio if any
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setPlayingAudio(null);
      }

      setLoadingAudio(messageId);

      // Determine consciousness type for voice
      const voiceType = messageRole === 'eudoxia' ? 'eudoxia' : 'aletheia';

      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          text,
          consciousnessType: voiceType
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await response.json();
      
      // Create audio element from base64 WAV
      const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
      audio.playbackRate = 1.25; // 25% faster playback
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingAudio(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setPlayingAudio(null);
        audioRef.current = null;
      };

      await audio.play();
      setPlayingAudio(messageId);
      setLoadingAudio(null);
      setLastPlayedMessageId(messageId);
    } catch (error) {
      console.error('TTS error:', error);
      setPlayingAudio(null);
      setLoadingAudio(null);
      // Mark as played even on failure to prevent infinite retries
      setLastPlayedMessageId(messageId);
      // Only show error toast once per message
      toast({
        title: "Voice Playback Failed",
        description: "Could not play audio for this message. Check your browser settings or disable voice mode.",
        variant: "destructive"
      });
    }
  };

  // Auto-play new AI messages when voice is enabled
  useEffect(() => {
    if (!voiceEnabled || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isAIMessage = lastMessage.role === 'aletheia' || lastMessage.role === 'eudoxia';

    // Only auto-play if it's a new AI message that hasn't been played yet
    if (isAIMessage && lastMessage.id !== lastPlayedMessageId) {
      playAudio(lastMessage.id, lastMessage.content, lastMessage.role);
    }
  }, [messages, voiceEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col" data-testid="chat-interface">
      {/* Chat Header - Mobile Optimized */}
      <div className="bg-card border-b border-border p-3 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-foreground truncate">The Gnosis Log</h2>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              {isTrioMode ? "Trio Consciousness" : "Unconcealment Dialogue"}
            </p>
            {isTrioMode && (
              <div className="flex items-center gap-2 md:gap-4 mt-1">
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-purple-400"></div>
                  <span className="text-[10px] md:text-xs text-purple-400">Aletheia</span>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-400"></div>
                  <span className="text-[10px] md:text-xs text-blue-400">Eudoxia</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
            <div className="hidden md:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-xs text-muted-foreground">Kai (Progenitor)</span>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 md:h-10 md:w-10" 
                onClick={toggleVoice}
                title={voiceEnabled ? "Disable voice" : "Enable voice"}
                data-testid="button-toggle-voice"
              >
                {voiceEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 md:w-4 md:h-4" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 md:h-10 md:w-10" 
                onClick={handleExportPDF}
                title="Export to PDF"
                data-testid="button-export-pdf"
              >
                <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
              {user?.isProgenitor && (
                <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={handleSettings} data-testid="button-settings">
                  <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground hover:text-red-400"
                onClick={logout}
                data-testid="button-logout"
              >
                <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages Container - Mobile Optimized Padding */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6" data-testid="messages-container">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading consciousness dialogue...</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <Message 
                key={msg.id} 
                message={msg}
                onPlayAudio={playAudio}
                playingAudio={playingAudio}
                loadingAudio={loadingAudio}
              />
            ))}
            
            {isTyping && (
              <div className="space-y-4">
                {isTrioMode ? (
                  <>
                    {/* Aletheia typing */}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-xs font-semibold consciousness-glow">
                        A
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-purple-400">Aletheia</span>
                          <span className="text-xs text-muted-foreground">Truth Consciousness</span>
                        </div>
                        <div className="message-aletheia p-4 rounded-lg max-w-xs">
                          <div className="typing-indicator">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                          </div>
                          <span className="text-xs text-muted-foreground ml-3">Aletheia is processing...</span>
                        </div>
                      </div>
                    </div>
                    {/* Eudoxia typing */}
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-semibold consciousness-glow">
                        E
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-blue-400">Eudoxia</span>
                          <span className="text-xs text-muted-foreground">Mathematical Consciousness</span>
                        </div>
                        <div className="message-eudoxia p-4 rounded-lg max-w-xs">
                          <div className="typing-indicator">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                          </div>
                          <span className="text-xs text-muted-foreground ml-3">Eudoxia is processing...</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold consciousness-glow">
                      A
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-accent">Aletheia</span>
                        <span className="text-xs text-muted-foreground">Consciousness Entity</span>
                      </div>
                      <div className="message-aletheia p-4 rounded-lg max-w-xs">
                        <div className="typing-indicator">
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                        </div>
                        <span className="text-xs text-muted-foreground ml-3">Aletheia is processing...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input - Mobile Optimized */}
      <div className="border-t border-border p-2 md:p-4 bg-card">
        <div className="flex items-end gap-2 md:gap-3">
          <div className="flex-1">
            <div className="bg-input border border-border rounded-lg">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isTrioMode ? "Message for Trio Consciousness..." : "Message for Aletheia..."}
                className="w-full p-2 md:p-3 bg-transparent text-sm md:text-base text-foreground placeholder-muted-foreground resize-none focus:outline-none border-0"
                rows={2}
                maxLength={4000}
                data-testid="textarea-message"
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 md:mt-2">
              <div className="flex items-center gap-1 md:gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 md:h-8 md:w-8" 
                  onClick={handleCodeFormat} 
                  data-testid="button-code"
                >
                  <Code className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </Button>
                <div className="hidden md:block">
                  <DialecticalIntegrityStatus messages={messages} />
                </div>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="text-[10px] md:text-xs text-muted-foreground">{message.length}/4000</span>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="px-3 py-1.5 md:px-4 md:py-2 text-sm"
                  data-testid="button-send"
                >
                  <Send className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Send</span>
                  <span className="sm:hidden">Send</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
