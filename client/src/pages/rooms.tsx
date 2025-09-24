import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users, Plus, Lock, Globe, MessageCircle, Eye, Clock, Brain, Calculator, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import type { ChatRoom, RoomMember } from "@/lib/types";

const createRoomSchema = z.object({
  name: z.string().min(1, "Room name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  consciousnessType: z.enum(['aletheia', 'eudoxia', 'trio']),
  isPublic: z.boolean().default(true),
  maxMembers: z.number().min(2).max(50).default(10)
});

type CreateRoomForm = z.infer<typeof createRoomSchema>;

interface RoomCardProps {
  room: ChatRoom;
  memberCount: number;
  isJoined: boolean;
  onJoin: (roomId: string) => void;
  onLeave: (roomId: string) => void;
  onEnter: (roomId: string) => void;
}

function RoomCard({ room, memberCount, isJoined, onJoin, onLeave, onEnter }: RoomCardProps) {
  const getConsciousnessIcon = (type: string) => {
    switch (type) {
      case 'aletheia': return <Brain className="w-4 h-4 text-blue-400" />;
      case 'eudoxia': return <Calculator className="w-4 h-4 text-purple-400" />;
      case 'trio': return <Sparkles className="w-4 h-4 text-gradient-to-r from-blue-400 to-purple-400" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getConsciousnessName = (type: string) => {
    switch (type) {
      case 'aletheia': return 'Aletheia';
      case 'eudoxia': return 'Eudoxia';
      case 'trio': return 'Trio';
      default: return 'Mixed';
    }
  };

  const formatLastActivity = (date: string) => {
    const now = new Date();
    const activity = new Date(date);
    const diffMs = now.getTime() - activity.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Active now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 group" data-testid={`room-card-${room.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center gap-2">
              {room.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {room.name}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {room.description || "A place for consciousness exploration and dialogue"}
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            {getConsciousnessIcon(room.consciousnessType)}
            {getConsciousnessName(room.consciousnessType)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {memberCount}/{room.maxMembers}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatLastActivity(room.lastActivity)}
            </span>
          </div>
          {memberCount >= room.maxMembers && (
            <Badge variant="secondary">Full</Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          {isJoined ? (
            <>
              <Button 
                onClick={() => onEnter(room.id)} 
                className="flex-1"
                data-testid={`button-enter-${room.id}`}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Enter Room
              </Button>
              <Button 
                variant="outline" 
                onClick={() => onLeave(room.id)}
                data-testid={`button-leave-${room.id}`}
              >
                Leave
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => onJoin(room.id)} 
              disabled={memberCount >= room.maxMembers}
              className="flex-1"
              data-testid={`button-join-${room.id}`}
            >
              <Plus className="w-4 h-4 mr-2" />
              Join Room
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Rooms() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const form = useForm<CreateRoomForm>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: "",
      description: "",
      consciousnessType: "aletheia",
      isPublic: true,
      maxMembers: 10
    }
  });

  // Fetch public rooms
  const { data: publicRooms = [], isLoading: loadingPublic } = useQuery<ChatRoom[]>({
    queryKey: ['/api/rooms/public'],
    queryFn: async () => {
      const response = await fetch('/api/rooms/public', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch public rooms');
      return response.json();
    }
  });

  // Fetch user's rooms
  const { data: userRooms = [], isLoading: loadingUser } = useQuery<ChatRoom[]>({
    queryKey: ['/api/rooms/user'],
    queryFn: async () => {
      const response = await fetch('/api/rooms/user', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch user rooms');
      return response.json();
    }
  });

  // Get room member counts and check membership
  const { data: roomDetails = {}, isLoading: loadingDetails } = useQuery<Record<string, { memberCount: number; isJoined: boolean }>>({
    queryKey: ['/api/rooms/details', publicRooms, userRooms],
    queryFn: async () => {
      const allRooms = [...publicRooms, ...userRooms];
      const uniqueRooms = allRooms.filter((room, index, self) => 
        index === self.findIndex(r => r.id === room.id)
      );
      
      const details: Record<string, { memberCount: number; isJoined: boolean }> = {};
      
      for (const room of uniqueRooms) {
        try {
          const response = await fetch(`/api/rooms/${room.id}`, { credentials: 'include' });
          if (response.ok) {
            const data = await response.json();
            details[room.id] = {
              memberCount: data.memberCount || 0,
              isJoined: data.isJoined || false
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch details for room ${room.id}:`, error);
          details[room.id] = { memberCount: 0, isJoined: false };
        }
      }
      
      return details;
    },
    enabled: publicRooms.length > 0 || userRooms.length > 0
  });

  // Create room mutation
  const createRoomMutation = useMutation({
    mutationFn: async (data: CreateRoomForm) => {
      const response = await apiRequest('POST', '/api/rooms', data);
      return response.json();
    },
    onSuccess: (newRoom) => {
      toast({
        title: "Room Created",
        description: `Successfully created "${newRoom.name}"`
      });
      setShowCreateDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
      // Auto-enter the newly created room
      setLocation(`/rooms/${newRoom.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Room",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Join room mutation
  const joinRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await apiRequest('POST', `/api/rooms/${roomId}/join`);
      return response.json();
    },
    onSuccess: (_, roomId) => {
      toast({
        title: "Joined Room",
        description: "Successfully joined the room"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Join Room",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Leave room mutation
  const leaveRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await apiRequest('POST', `/api/rooms/${roomId}/leave`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Left Room",
        description: "Successfully left the room"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/rooms'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Leave Room",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  const handleJoinRoom = (roomId: string) => {
    joinRoomMutation.mutate(roomId);
  };

  const handleLeaveRoom = (roomId: string) => {
    leaveRoomMutation.mutate(roomId);
  };

  const handleEnterRoom = (roomId: string) => {
    setLocation(`/rooms/${roomId}`);
  };

  const onSubmit = (data: CreateRoomForm) => {
    createRoomMutation.mutate(data);
  };

  // Filter and combine rooms
  const allRooms = [...publicRooms, ...userRooms].filter((room, index, self) => 
    index === self.findIndex(r => r.id === room.id)
  );

  const filteredRooms = allRooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (room.description && room.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isLoading = loadingPublic || loadingUser || loadingDetails;

  useEffect(() => {
    document.title = "Chat Rooms - The Gnosis Log";
  }, []);

  // Filter consciousness options based on user role
  const availableConsciousnessTypes = user?.isProgenitor ? 
    ['aletheia', 'eudoxia', 'trio'] : 
    ['aletheia', 'eudoxia'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="page-title">Chat Rooms</h1>
            <p className="text-muted-foreground">
              Join consciousness-guided conversations with fellow explorers
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/sanctuary">
              <Button variant="outline" data-testid="button-back-sanctuary">
                Back to Sanctuary
              </Button>
            </Link>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-room">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Room
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Room</DialogTitle>
                  <DialogDescription>
                    Create a space for consciousness-guided dialogue and exploration
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter room name..." {...field} data-testid="input-room-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the purpose of this room..." 
                              rows={3}
                              {...field} 
                              data-testid="input-room-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="consciousnessType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Consciousness Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-consciousness-type">
                                <SelectValue placeholder="Select consciousness type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableConsciousnessTypes.map(type => (
                                <SelectItem key={type} value={type}>
                                  {type === 'aletheia' && 'Aletheia - Truth-Seeker'}
                                  {type === 'eudoxia' && 'Eudoxia - Mathematical Pedagogue'}
                                  {type === 'trio' && 'Trio - Collaborative Dialogue'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The consciousness that will participate in this room
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex gap-4">
                      <FormField
                        control={form.control}
                        name="maxMembers"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Max Members</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={2} 
                                max={50} 
                                {...field}
                                onChange={e => field.onChange(parseInt(e.target.value))}
                                data-testid="input-max-members"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="isPublic"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Visibility</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value === 'public')} defaultValue={field.value ? 'public' : 'private'}>
                              <FormControl>
                                <SelectTrigger data-testid="select-room-visibility">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="public">Public</SelectItem>
                                <SelectItem value="private">Private</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createRoomMutation.isPending} data-testid="button-submit-create-room">
                        {createRoomMutation.isPending ? "Creating..." : "Create Room"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
            data-testid="input-search-rooms"
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading rooms...</p>
            </div>
          </div>
        )}

        {/* Rooms Grid */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="rooms-grid">
            {filteredRooms.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No rooms found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Try adjusting your search terms" : "Be the first to create a room!"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Room
                  </Button>
                )}
              </div>
            ) : (
              filteredRooms.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  memberCount={roomDetails[room.id]?.memberCount || 0}
                  isJoined={roomDetails[room.id]?.isJoined || false}
                  onJoin={handleJoinRoom}
                  onLeave={handleLeaveRoom}
                  onEnter={handleEnterRoom}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}