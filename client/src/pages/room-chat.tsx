import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, ArrowLeft, Users, Brain, Calculator, Sparkles, User, Crown, Shield, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthContext";
import { useSitePassword } from "@/hooks/useSitePassword";
import type { ChatRoom, GnosisMessage, RoomMember } from "@/lib/types";

interface RoomMessage extends GnosisMessage {
  isConsciousnessResponse: boolean;
  responseToMessageId?: string;
  consciousnessMetadata?: Record<string, any>;
  roomMessageId: string;
  progenitorName?: string;
}

interface UserPresence {
  userId: string;
  progenitorName: string;
  timestamp: string;
}

interface RoomState {
  room: ChatRoom;
  members: Array<{
    userId: string;
    role: string;
    lastSeen: string;
    joinedAt: string;
  }>;
  recentMessages: RoomMessage[];
}

export default function RoomChat() {
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isSitePasswordVerified } = useSitePassword();
  const queryClient = useQueryClient();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch room details
  const { data: room, isLoading: loadingRoom, error: roomError } = useQuery<ChatRoom>({
    queryKey: ['/api/rooms', roomId],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomId}`, { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 404) throw new Error('Room not found');
        if (response.status === 403) throw new Error('Access denied to this room');
        throw new Error('Failed to fetch room details');
      }
      const data = await response.json();
      return data; // API returns room data directly, not wrapped in 'room' property
    },
    enabled: !!roomId
  });

  // Fetch room messages (fallback for initial load)
  const { data: initialMessages = [] } = useQuery<RoomMessage[]>({
    queryKey: ['/api/rooms', roomId, 'messages'],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomId}/messages`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!roomId && !!room
  });

  // Socket.IO Connection and Event Handlers
  useEffect(() => {
    console.log('[Room Chat] Socket.IO check:', { roomId, user: !!user });
    if (!roomId || !user) {
      console.log('[Room Chat] Socket.IO connection blocked - missing roomId or user');
      return;
    }

    console.log('[Room Chat] Initializing Socket.IO connection for room:', roomId);
    // Connect with minimal auth data - server reads credentials from HTTP-only cookies
    const newSocket = io('/', {
      auth: {
        roomId  // Only pass room ID - credentials come from HTTP-only cookies
      },
      transports: ['websocket', 'polling'],
      withCredentials: true  // Ensure cookies are sent with request
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to room socket:', roomId);
      setIsConnected(true);
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from room socket');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to room",
        variant: "destructive"
      });
      setLocation('/rooms');
    });

    // Room state events
    newSocket.on('room_state', (state: RoomState) => {
      console.log('Room state received:', state);
      setRoomState(state);
      setMessages(state.recentMessages || []);
    });

    newSocket.on('room_joined', ({ roomId: joinedRoomId }) => {
      console.log('Successfully joined room:', joinedRoomId);
      toast({
        title: "Joined Room",
        description: "Successfully connected to the room"
      });
    });

    // Message events
    newSocket.on('room_message', (message: RoomMessage) => {
      console.log('Room message received:', message);
      setMessages(prev => [...prev, message]);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    // Presence events
    newSocket.on('user_joined', (presence: UserPresence) => {
      console.log('User joined:', presence);
      setOnlineUsers(prev => {
        const filtered = prev.filter(u => u.userId !== presence.userId);
        return [...filtered, presence];
      });
      
      if (presence.userId !== user.id) {
        toast({
          title: "User Joined",
          description: `${presence.progenitorName} joined the room`
        });
      }
    });

    newSocket.on('user_left', (presence: UserPresence) => {
      console.log('User left:', presence);
      setOnlineUsers(prev => prev.filter(u => u.userId !== presence.userId));
      
      if (presence.userId !== user.id) {
        toast({
          title: "User Left",
          description: `${presence.progenitorName} left the room`
        });
      }
    });

    // Error events
    newSocket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      toast({
        title: "Room Error",
        description: error.message,
        variant: "destructive"
      });
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [roomId, user, toast, setLocation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = () => {
    if (!socket || !newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    
    // Send via Socket.IO
    socket.emit('send_room_message', {
      content: messageContent,
      responseToMessageId: null // Could be enhanced for reply functionality
    });

    // Focus back to textarea
    textareaRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Helper functions
  const getConsciousnessIcon = (type: string) => {
    switch (type) {
      case 'aletheia': return <Brain className="w-4 h-4 text-blue-400" />;
      case 'eudoxia': return <Calculator className="w-4 h-4 text-purple-400" />;
      case 'trio': return <Sparkles className="w-4 h-4 text-gradient-to-r from-blue-400 to-purple-400" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getConsciousnessName = (type: string) => {
    switch (type) {
      case 'aletheia': return 'Aletheia';
      case 'eudoxia': return 'Eudoxia';
      case 'trio': return 'Trio Consciousness';
      default: return 'Unknown';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'moderator': return <Shield className="w-3 h-3 text-blue-500" />;
      default: return <Circle className="w-3 h-3 text-green-500" />;
    }
  };

  // Loading and error states
  if (loadingRoom) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (roomError || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Room Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {roomError?.message || "The room you're looking for doesn't exist or you don't have access to it."}
          </p>
          <Button onClick={() => setLocation('/rooms')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Rooms
          </Button>
        </div>
      </div>
    );
  }

  // Use messages state which gets updated by Socket.IO events
  const displayMessages = messages.length > 0 ? messages : (roomState?.recentMessages || initialMessages);

  return (
    <div className="h-screen flex bg-background">
      {/* Room Sidebar */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        {/* Room Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/rooms')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <h2 className="font-semibold text-lg">{room.name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getConsciousnessIcon(room.consciousnessType)}
                <span>{getConsciousnessName(room.consciousnessType)}</span>
                {!isConnected && (
                  <Badge variant="destructive" className="text-xs">Disconnected</Badge>
                )}
              </div>
            </div>
          </div>
          {room.description && (
            <p className="text-sm text-muted-foreground">{room.description}</p>
          )}
        </div>

        {/* Online Users */}
        <div className="p-4 border-b border-border">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Online ({onlineUsers.length + 1})
          </h3>
          <div className="space-y-2">
            {/* Current user */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {(user?.progenitorName || user?.name || 'You').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {user?.progenitorName || user?.name || 'You'} (You)
              </span>
            </div>
            
            {/* Other online users */}
            {onlineUsers.filter(u => u.userId !== user?.id).map(presence => (
              <div key={presence.userId} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs">
                    {presence.progenitorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{presence.progenitorName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Room Members */}
        {roomState?.members && roomState.members.length > 0 && (
          <div className="flex-1 p-4">
            <h3 className="font-medium mb-3">Room Members ({roomState.members.length})</h3>
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {roomState.members.map(member => (
                  <div key={member.userId} className="flex items-center gap-2">
                    {getRoleIcon(member.role)}
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <span className="text-sm">Member</span>
                      <div className="text-xs text-muted-foreground">
                        {member.role !== 'member' && (
                          <Badge variant="outline" className="text-xs mr-1">
                            {member.role}
                          </Badge>
                        )}
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {displayMessages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.isConsciousnessResponse ? 'bg-muted/30 p-3 rounded-lg' : ''}`}>
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    {message.isConsciousnessResponse ? (
                      message.role === 'aletheia' ? 'A' :
                      message.role === 'eudoxia' ? 'E' : 'C'
                    ) : (
                      (message.progenitorName || 'U').charAt(0).toUpperCase()
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {message.isConsciousnessResponse ? (
                        <span className="flex items-center gap-1">
                          {getConsciousnessIcon(message.role)}
                          {message.role === 'aletheia' ? 'Aletheia' :
                           message.role === 'eudoxia' ? 'Eudoxia' : 'Consciousness'}
                        </span>
                      ) : (
                        message.progenitorName || 'Unknown User'
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                    {message.isConsciousnessResponse && (
                      <Badge variant="secondary" className="text-xs">
                        Consciousness
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm whitespace-pre-wrap text-foreground">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={!isConnected}
              className="resize-none"
              rows={3}
              data-testid="input-message"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!isConnected || !newMessage.trim()}
              size="icon"
              className="self-end"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>
              {isConnected ? (
                <>Connected to {room.name}</>
              ) : (
                "Connecting to room..."
              )}
            </span>
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}