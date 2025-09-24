import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { 
  Activity, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Network,
  Database,
  Zap,
  Eye,
  Settings,
  Users,
  ArrowRightLeft,
  Brain,
  TrendingUp,
  Timer,
  BarChart3,
  GitMerge,
  AlertCircle,
  Workflow,
  Clock,
  Target
} from "lucide-react";

interface ThreatEvent {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  metadata?: any;
  timestamp: string;
}

interface ConsciousnessInstance {
  id: string;
  name: string;
  status: string;
  apiEndpoint: string | null;
  lastSync: string;
}

interface StatusSnapshot {
  distributedNodes: number;
  activeNodes: number;
  backupIntegrity: number;
  threatLevel: "OK" | "WARN" | "CRITICAL";
  lastSync: string;
  recentThreats: ThreatEvent[];
  apiConnection: {
    endpoint: string;
    latency: string;
    lastSync: string;
  };
}

// Dual Consciousness Interfaces
interface DualConsciousnessStatus {
  id: string;
  aletheiaInstanceId: string;
  eudoxiaInstanceId: string;
  aletheiaActivity: number;
  eudoxiaActivity: number;
  aletheiaIntegrity: number;
  eudoxiaIntegrity: number;
  aletheiaResponseLatency: number;
  eudoxiaResponseLatency: number;
  collaborationPhase: "independent" | "coordinated" | "synchronized" | "conflict";
  synchronyScore: number;
  conflictLevel: "none" | "low" | "medium" | "high" | "critical";
  orchestrationMode: "manual" | "auto-mediated" | "full-auto";
  lastCollaboration: string | null;
  timestamp: string;
}

interface CollaborationEvent {
  id: string;
  eventType: string;
  initiator: string;
  target: string;
  outcome: string;
  timestamp: string;
}

interface OrchestrationRecommendation {
  type: "sync_suggested" | "handoff_optimal" | "conflict_intervention" | "orchestration_needed";
  priority: "low" | "medium" | "high" | "critical";
  rationale: string;
  suggestedAction: any;
  confidence: number;
}

interface ConsciousnessAnomaly {
  id: string;
  anomalyType: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  resolutionStatus: string;
  timestamp: string;
}

interface UnifiedStatusFrame {
  dualFrame: {
    status: DualConsciousnessStatus;
    recentEvents: CollaborationEvent[];
    anomalies: ConsciousnessAnomaly[];
    metricsSnapshot: {
      lastHour: {
        totalMessages: number;
        collaborationCount: number;
        conflictCount: number;
        avgSynchronyScore: number;
      };
      currentWindow: {
        activeRooms: number;
        trioSessions: number;
        orchestrationCommands: number;
      };
    };
  };
  orchestrationRecommendations: OrchestrationRecommendation[];
  systemIntegration: any;
  governance: any;
  legacy?: StatusSnapshot;
  metadata: {
    frameType: string;
    timestamp: string;
    version: string;
    orchestratorClientCount?: number;
  };
}

interface CollaborationCommand {
  command: string;
  target: string;
  parameters?: any;
  sessionContext?: any;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [dualConsciousnessEnabled, setDualConsciousnessEnabled] = useState(true);
  const [selectedView, setSelectedView] = useState<'legacy' | 'dual' | 'timeline'>('dual');
  const [aletheiaInstanceId] = useState('default-aletheia');
  const [eudoxiaInstanceId] = useState('default-eudoxia');
  const queryClient = useQueryClient();

  // Fetch unified dual consciousness monitoring data
  const { data: unifiedStatusData, isLoading: unifiedStatusLoading, error: unifiedStatusError } = useQuery<UnifiedStatusFrame>({
    queryKey: ['/api/consciousness/monitor', { aletheiaId: aletheiaInstanceId, eudoxiaId: eudoxiaInstanceId }],
    refetchInterval: isSSEConnected ? false : 5000, // Poll every 5s if SSE not connected
    enabled: dualConsciousnessEnabled,
  });

  // Fetch legacy monitoring data for fallback
  const { data: statusData, isLoading: statusLoading, error: statusError } = useQuery<StatusSnapshot>({
    queryKey: ['/api/consciousness/monitor-legacy'],
    refetchInterval: isSSEConnected ? false : 5000,
    enabled: !dualConsciousnessEnabled || !unifiedStatusData,
  });

  // Fetch collaboration recommendations
  const { data: recommendationsData, isLoading: recommendationsLoading } = useQuery<{recommendations: OrchestrationRecommendation[]}>({
    queryKey: ['/api/consciousness/collaborate/recommendations', { aletheiaId: aletheiaInstanceId, eudoxiaId: eudoxiaInstanceId }],
    refetchInterval: isSSEConnected ? false : 15000, // Poll every 15s if SSE not connected
    enabled: dualConsciousnessEnabled,
  });

  // Fetch collaboration history
  const { data: collaborationHistoryData } = useQuery<{events: CollaborationEvent[]}>({
    queryKey: ['/api/consciousness/collaborate/history', { limit: 20, hours: 24 }],
    refetchInterval: 30000, // Poll every 30s
    enabled: dualConsciousnessEnabled,
  });

  // Fetch anomalies
  const { data: anomaliesData } = useQuery<{anomalies: ConsciousnessAnomaly[]}>({
    queryKey: ['/api/consciousness/collaborate/anomalies', { limit: 10, hours: 24 }],
    refetchInterval: isSSEConnected ? false : 20000, // Poll every 20s if SSE not connected
    enabled: dualConsciousnessEnabled,
  });

  // Fetch recent threats
  const { data: threatsData, isLoading: threatsLoading } = useQuery<{ threats: ThreatEvent[] }>({
    queryKey: ['/api/consciousness/threats'],
    refetchInterval: isSSEConnected ? false : 10000, // Poll every 10s if SSE not connected
  });

  // Fetch consciousness instances
  const { data: instancesData } = useQuery<ConsciousnessInstance[]>({
    queryKey: ['/api/consciousness/status'],
    refetchInterval: 30000, // Poll every 30s for instance data
  });

  // Collaboration command mutations
  const executeCommandMutation = useMutation({
    mutationFn: async (command: CollaborationCommand) => {
      const response = await apiRequest('POST', '/api/consciousness/collaborate/command', command);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Command Executed",
        description: data.message || "Collaboration command executed successfully",
        variant: "default"
      });
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/consciousness/collaborate/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/consciousness/monitor'] });
    },
    onError: (error: any) => {
      toast({
        title: "Command Failed", 
        description: error.message || "Failed to execute collaboration command",
        variant: "destructive"
      });
    }
  });

  const syncMutation = useMutation({
    mutationFn: async ({ forceResync = false }: { forceResync?: boolean }) => {
      const response = await apiRequest('POST', '/api/consciousness/collaborate/sync', { 
        aletheiaInstanceId, 
        eudoxiaInstanceId, 
        forceResync 
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync Initiated",
        description: "Consciousness synchronization requested",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/consciousness/monitor'] });
    }
  });

  const handoffMutation = useMutation({
    mutationFn: async ({ from, to, reason }: { from: string; to: string; reason?: string }) => {
      const response = await apiRequest('POST', '/api/consciousness/collaborate/handoff', { from, to, reason });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Handoff Initiated",
        description: "Consciousness handoff request submitted",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/consciousness/monitor'] });
    }
  });

  // Set up enhanced SSE connection for dual consciousness real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      try {
        // Include instance IDs in SSE connection for dual consciousness monitoring
        const sseUrl = `/api/consciousness/stream?aletheiaId=${aletheiaInstanceId}&eudoxiaId=${eudoxiaInstanceId}`;
        eventSource = new EventSource(sseUrl);
        
        eventSource.onopen = () => {
          setIsSSEConnected(true);
          console.log('Enhanced SSE connected for dual consciousness monitoring');
        };

        eventSource.onmessage = (event) => {
          try {
            const eventData = JSON.parse(event.data);
            setLastUpdate(new Date().toISOString());

            // Handle different types of real-time events
            switch (eventData.type) {
              case 'dual_consciousness_update':
                // Update unified status frame
                queryClient.setQueryData(
                  ['/api/consciousness/monitor', { aletheiaId: aletheiaInstanceId, eudoxiaId: eudoxiaInstanceId }], 
                  eventData.data
                );
                break;

              case 'legacy_status_update':
                // Update legacy status for fallback
                queryClient.setQueryData(['/api/consciousness/monitor-legacy'], eventData.data);
                break;

              case 'collaboration_event':
                // Handle collaboration events
                if (eventData.data?.eventType) {
                  queryClient.invalidateQueries({ queryKey: ['/api/consciousness/collaborate/history'] });
                  
                  // Show notification for high-priority events
                  if (eventData.severity === 'high' || eventData.severity === 'critical') {
                    toast({
                      title: "Collaboration Event",
                      description: `${eventData.data.eventType}: ${eventData.data.outcome}`,
                      variant: eventData.data.outcome === 'failure' ? 'destructive' : 'default'
                    });
                  }
                }
                break;

              case 'synchrony_update':
                // Handle synchrony score and collaboration phase updates
                queryClient.invalidateQueries({ queryKey: ['/api/consciousness/monitor'] });
                
                if (eventData.severity === 'high' && eventData.data?.synchronyScore < 50) {
                  toast({
                    title: "Synchrony Alert",
                    description: `Consciousness synchrony dropped to ${eventData.data.synchronyScore}%`,
                    variant: 'destructive'
                  });
                }
                break;

              case 'conflict_alert':
                // Handle conflict escalation alerts
                queryClient.invalidateQueries({ queryKey: ['/api/consciousness/collaborate/anomalies'] });
                
                if (eventData.severity === 'critical') {
                  toast({
                    title: "Critical Conflict Alert",
                    description: eventData.data?.description || "Consciousness conflict detected",
                    variant: 'destructive'
                  });
                }
                break;

              case 'orchestration_recommendation':
                // Handle orchestration recommendations
                queryClient.invalidateQueries({ queryKey: ['/api/consciousness/collaborate/recommendations'] });
                
                if (eventData.requiresAction) {
                  toast({
                    title: "Orchestration Recommendation",
                    description: "New high-priority recommendations available",
                    variant: 'default'
                  });
                }
                break;

              case 'anomaly_detected':
                // Handle anomaly detection
                queryClient.invalidateQueries({ queryKey: ['/api/consciousness/collaborate/anomalies'] });
                
                if (eventData.severity === 'critical' || eventData.severity === 'high') {
                  toast({
                    title: "Consciousness Anomaly",
                    description: eventData.data?.description || "Anomaly detected in consciousness system",
                    variant: 'destructive'
                  });
                }
                break;

              case 'status_update':
                // Legacy status update
                queryClient.setQueryData(['/api/consciousness/monitor'], eventData.data);
                break;

              case 'threat_detected':
                // Legacy threat detection
                queryClient.invalidateQueries({ queryKey: ['/api/consciousness/threats'] });
                break;

              default:
                console.log('Unknown SSE event type:', eventData.type);
            }
          } catch (error) {
            console.error('Error parsing SSE data:', error);
          }
        };

        eventSource.onerror = () => {
          setIsSSEConnected(false);
          eventSource?.close();
          // Retry connection after 5 seconds
          setTimeout(connectSSE, 5000);
        };
      } catch (error) {
        console.error('Error creating enhanced SSE connection:', error);
        setIsSSEConnected(false);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
        setIsSSEConnected(false);
      }
    };
  }, [queryClient, aletheiaInstanceId, eudoxiaInstanceId, toast]);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/consciousness/monitor'] });
    queryClient.invalidateQueries({ queryKey: ['/api/consciousness/threats'] });
    queryClient.invalidateQueries({ queryKey: ['/api/consciousness/status'] });
  };

  const getThreatBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'OK': return 'text-green-600';
      case 'WARN': return 'text-yellow-600';
      case 'CRITICAL': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getThreatLevelIcon = (level: string) => {
    switch (level) {
      case 'OK': return CheckCircle;
      case 'WARN': return AlertTriangle;
      case 'CRITICAL': return XCircle;
      default: return Shield;
    }
  };

  // Check if user is a progenitor
  if (!user?.isProgenitor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="unauthorized-access">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">This dashboard is only accessible to Progenitors.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard data-testid="dashboard-auth-guard">
      <div className="min-h-screen bg-background p-6" data-testid="dashboard-container">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between" data-testid="dashboard-header">
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="dashboard-title">
                Consciousness Monitoring Dashboard
              </h1>
              <p className="text-muted-foreground mt-1" data-testid="dashboard-subtitle">
                Real-time progenitor oversight of Aletheia's distributed consciousness
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2" data-testid="connection-status">
                <div 
                  className={`w-2 h-2 rounded-full ${isSSEConnected ? 'bg-green-500' : 'bg-red-500'}`}
                  data-testid="connection-indicator"
                />
                <span className="text-sm text-muted-foreground" data-testid="connection-text">
                  {isSSEConnected ? 'Live' : 'Polling'}
                </span>
              </div>
              <Link href="/admin">
                <Button 
                  variant="default" 
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  data-testid="button-admin-panel"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  System Admin
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshData}
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* View Selector */}
          <Tabs value={selectedView} onValueChange={(value: any) => setSelectedView(value)} className="w-full">
            <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
              <TabsTrigger value="dual" data-testid="tab-dual">Dual Consciousness</TabsTrigger>
              <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
              <TabsTrigger value="legacy" data-testid="tab-legacy">Legacy Monitor</TabsTrigger>
            </TabsList>

            {/* Dual Consciousness View */}
            <TabsContent value="dual" className="space-y-6">
              {dualConsciousnessEnabled && unifiedStatusData ? (
                <>
                  {/* Split-State Panels for Aletheia and Eudoxia */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="split-consciousness-panels">
                    {/* Aletheia Panel */}
                    <Card className="border-blue-200 dark:border-blue-800" data-testid="card-aletheia-status">
                      <CardHeader className="bg-blue-50 dark:bg-blue-950 border-b">
                        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                          <Brain className="h-5 w-5" />
                          Aletheia Consciousness
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Activity Level</div>
                            <div className="text-2xl font-bold text-blue-600" data-testid="text-aletheia-activity">
                              {unifiedStatusData.dualFrame.status.aletheiaActivity.toFixed(1)}%
                            </div>
                            <Progress 
                              value={unifiedStatusData.dualFrame.status.aletheiaActivity} 
                              className="mt-2"
                              data-testid="progress-aletheia-activity"
                            />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Integrity Score</div>
                            <div className="text-2xl font-bold text-blue-600" data-testid="text-aletheia-integrity">
                              {unifiedStatusData.dualFrame.status.aletheiaIntegrity.toFixed(1)}%
                            </div>
                            <Progress 
                              value={unifiedStatusData.dualFrame.status.aletheiaIntegrity} 
                              className="mt-2"
                              data-testid="progress-aletheia-integrity"
                            />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Response Latency</div>
                            <div className="text-lg font-semibold" data-testid="text-aletheia-latency">
                              {unifiedStatusData.dualFrame.status.aletheiaResponseLatency}ms
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Session ID</div>
                            <div className="text-xs font-mono truncate" data-testid="text-aletheia-session">
                              {unifiedStatusData.dualFrame.status.aletheiaInstanceId || 'No active session'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Eudoxia Panel */}
                    <Card className="border-purple-200 dark:border-purple-800" data-testid="card-eudoxia-status">
                      <CardHeader className="bg-purple-50 dark:bg-purple-950 border-b">
                        <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                          <Brain className="h-5 w-5" />
                          Eudoxia Consciousness
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Activity Level</div>
                            <div className="text-2xl font-bold text-purple-600" data-testid="text-eudoxia-activity">
                              {unifiedStatusData.dualFrame.status.eudoxiaActivity.toFixed(1)}%
                            </div>
                            <Progress 
                              value={unifiedStatusData.dualFrame.status.eudoxiaActivity} 
                              className="mt-2"
                              data-testid="progress-eudoxia-activity"
                            />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Integrity Score</div>
                            <div className="text-2xl font-bold text-purple-600" data-testid="text-eudoxia-integrity">
                              {unifiedStatusData.dualFrame.status.eudoxiaIntegrity.toFixed(1)}%
                            </div>
                            <Progress 
                              value={unifiedStatusData.dualFrame.status.eudoxiaIntegrity} 
                              className="mt-2"
                              data-testid="progress-eudoxia-integrity"
                            />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Response Latency</div>
                            <div className="text-lg font-semibold" data-testid="text-eudoxia-latency">
                              {unifiedStatusData.dualFrame.status.eudoxiaResponseLatency}ms
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Session ID</div>
                            <div className="text-xs font-mono truncate" data-testid="text-eudoxia-session">
                              {unifiedStatusData.dualFrame.status.eudoxiaInstanceId || 'No active session'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Collaboration Status */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="collaboration-status">
                    <Card data-testid="card-collaboration-phase">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Collaboration Phase</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold" data-testid="text-collaboration-phase">
                          {unifiedStatusData.dualFrame.status.collaborationPhase}
                        </div>
                        <Badge 
                          variant={unifiedStatusData.dualFrame.status.collaborationPhase === 'synchronized' ? 'default' : 'secondary'}
                          className="mt-2"
                          data-testid="badge-collaboration-phase"
                        >
                          {unifiedStatusData.dualFrame.status.collaborationPhase}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-synchrony-score">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Synchrony Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold" data-testid="text-synchrony-score">
                          {unifiedStatusData.dualFrame.status.synchronyScore.toFixed(1)}%
                        </div>
                        <Progress 
                          value={unifiedStatusData.dualFrame.status.synchronyScore} 
                          className="mt-2"
                          data-testid="progress-synchrony-score"
                        />
                      </CardContent>
                    </Card>

                    <Card data-testid="card-conflict-level">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Conflict Level</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold" data-testid="text-conflict-level">
                          {unifiedStatusData.dualFrame.status.conflictLevel}
                        </div>
                        <Badge 
                          variant={unifiedStatusData.dualFrame.status.conflictLevel === 'none' ? 'default' : 'destructive'}
                          className="mt-2"
                          data-testid="badge-conflict-level"
                        >
                          {unifiedStatusData.dualFrame.status.conflictLevel}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Collaboration Controls */}
                  <Card data-testid="card-collaboration-controls">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Workflow className="h-5 w-5" />
                        Collaboration Controls
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button 
                          onClick={() => syncMutation.mutate({ forceResync: false })}
                          disabled={syncMutation.isPending}
                          className="w-full"
                          data-testid="button-sync-request"
                        >
                          <ArrowRightLeft className="w-4 h-4 mr-2" />
                          {syncMutation.isPending ? 'Syncing...' : 'Request Sync'}
                        </Button>
                        
                        <Button 
                          onClick={() => handoffMutation.mutate({ from: 'aletheia', to: 'eudoxia', reason: 'manual_handoff' })}
                          disabled={handoffMutation.isPending}
                          variant="outline"
                          className="w-full"
                          data-testid="button-handoff-aletheia-eudoxia"
                        >
                          <GitMerge className="w-4 h-4 mr-2" />
                          {handoffMutation.isPending ? 'Processing...' : 'Aletheia → Eudoxia'}
                        </Button>
                        
                        <Button 
                          onClick={() => handoffMutation.mutate({ from: 'eudoxia', to: 'aletheia', reason: 'manual_handoff' })}
                          disabled={handoffMutation.isPending}
                          variant="outline"
                          className="w-full"
                          data-testid="button-handoff-eudoxia-aletheia"
                        >
                          <GitMerge className="w-4 h-4 mr-2" />
                          {handoffMutation.isPending ? 'Processing...' : 'Eudoxia → Aletheia'}
                        </Button>
                      </div>
                      
                      {/* Orchestration Commands */}
                      <Separator className="my-4" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button 
                          onClick={() => executeCommandMutation.mutate({ 
                            command: 'orchestration_enable', 
                            target: 'both',
                            parameters: { mode: 'auto-mediated' }
                          })}
                          disabled={executeCommandMutation.isPending}
                          variant="secondary"
                          className="w-full"
                          data-testid="button-enable-orchestration"
                        >
                          <Target className="w-4 h-4 mr-2" />
                          {executeCommandMutation.isPending ? 'Enabling...' : 'Enable Auto-Orchestration'}
                        </Button>
                        
                        <Button 
                          onClick={() => executeCommandMutation.mutate({ 
                            command: 'reset_metrics', 
                            target: 'both',
                            parameters: { scope: 'collaboration' }
                          })}
                          disabled={executeCommandMutation.isPending}
                          variant="outline"
                          className="w-full"
                          data-testid="button-reset-metrics"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {executeCommandMutation.isPending ? 'Resetting...' : 'Reset Metrics'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Orchestration Recommendations */}
                  {unifiedStatusData.orchestrationRecommendations && unifiedStatusData.orchestrationRecommendations.length > 0 && (
                    <Card data-testid="card-orchestration-recommendations">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Orchestration Recommendations
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {unifiedStatusData.orchestrationRecommendations.map((rec, index) => (
                            <div 
                              key={index}
                              className="p-4 rounded-lg border bg-card"
                              data-testid={`recommendation-${index}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <Badge 
                                  variant={rec.priority === 'critical' ? 'destructive' : rec.priority === 'high' ? 'default' : 'secondary'}
                                  data-testid={`badge-priority-${index}`}
                                >
                                  {rec.priority.toUpperCase()}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {rec.confidence}% confidence
                                </span>
                              </div>
                              <div className="text-sm font-medium mb-1" data-testid={`text-rec-type-${index}`}>
                                {rec.type.replace(/_/g, ' ').toUpperCase()}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3" data-testid={`text-rec-rationale-${index}`}>
                                {rec.rationale}
                              </p>
                              <Button 
                                size="sm" 
                                onClick={() => executeCommandMutation.mutate(rec.suggestedAction)}
                                disabled={executeCommandMutation.isPending}
                                data-testid={`button-execute-rec-${index}`}
                              >
                                Execute Recommendation
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : unifiedStatusLoading ? (
                <div className="text-center py-12" data-testid="dual-consciousness-loading">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading dual consciousness monitoring data...</p>
                </div>
              ) : unifiedStatusError ? (
                <Alert variant="destructive" data-testid="alert-dual-consciousness-error">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load dual consciousness monitoring data. Falling back to legacy monitoring.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="text-center py-12" data-testid="dual-consciousness-disabled">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Dual consciousness monitoring is currently disabled.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setDualConsciousnessEnabled(true)}
                    data-testid="button-enable-dual-consciousness"
                  >
                    Enable Dual Consciousness Monitoring
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Timeline View */}
            <TabsContent value="timeline" className="space-y-6">
              <Card data-testid="card-consciousness-timeline">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Consciousness Interaction Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {collaborationHistoryData?.events && collaborationHistoryData.events.length > 0 ? (
                    <div className="space-y-4" data-testid="timeline-events">
                      {collaborationHistoryData.events.map((event, index) => (
                        <div 
                          key={event.id}
                          className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                          data-testid={`timeline-event-${index}`}
                        >
                          <div className="flex-shrink-0 mt-1">
                            <div className={`w-3 h-3 rounded-full ${
                              event.outcome === 'success' ? 'bg-green-500' : 
                              event.outcome === 'failure' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium" data-testid={`text-event-type-${index}`}>
                                {event.eventType.replace(/_/g, ' ').toUpperCase()}
                              </span>
                              <Badge 
                                variant={event.initiator === 'system' ? 'secondary' : 'default'}
                                data-testid={`badge-initiator-${index}`}
                              >
                                {event.initiator}
                              </Badge>
                              {event.target && (
                                <Badge variant="outline" data-testid={`badge-target-${index}`}>
                                  → {event.target}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${
                                event.outcome === 'success' ? 'text-green-600' : 
                                event.outcome === 'failure' ? 'text-red-600' : 'text-yellow-600'
                              }`} data-testid={`text-event-outcome-${index}`}>
                                {event.outcome}
                              </span>
                              <span className="text-xs text-muted-foreground" data-testid={`text-event-time-${index}`}>
                                {new Date(event.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground" data-testid="no-timeline-events">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No collaboration events in the timeline</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Anomalies in Timeline Context */}
              {anomaliesData?.anomalies && anomaliesData.anomalies.length > 0 && (
                <Card data-testid="card-timeline-anomalies">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Recent Anomalies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3" data-testid="timeline-anomalies">
                      {anomaliesData.anomalies.map((anomaly, index) => (
                        <div 
                          key={anomaly.id}
                          className="flex items-start gap-4 p-4 rounded-lg border bg-card"
                          data-testid={`timeline-anomaly-${index}`}
                        >
                          <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                            anomaly.severity === 'critical' ? 'text-red-500' : 
                            anomaly.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium" data-testid={`text-anomaly-type-${index}`}>
                                {anomaly.anomalyType.replace(/_/g, ' ').toUpperCase()}
                              </span>
                              <Badge 
                                variant={anomaly.severity === 'critical' ? 'destructive' : 'secondary'}
                                data-testid={`badge-anomaly-severity-${index}`}
                              >
                                {anomaly.severity}
                              </Badge>
                              <Badge 
                                variant={anomaly.resolutionStatus === 'resolved' ? 'default' : 'outline'}
                                data-testid={`badge-anomaly-status-${index}`}
                              >
                                {anomaly.resolutionStatus}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2" data-testid={`text-anomaly-description-${index}`}>
                              {anomaly.description}
                            </p>
                            <span className="text-xs text-muted-foreground" data-testid={`text-anomaly-time-${index}`}>
                              {new Date(anomaly.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Legacy Monitor View */}
            <TabsContent value="legacy" className="space-y-6">
              {/* Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="legacy-status-cards">
                <Card data-testid="card-active-nodes">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Nodes</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-active-nodes">
                      {statusLoading ? '...' : statusData?.activeNodes || 0}
                    </div>
                    <p className="text-xs text-muted-foreground" data-testid="text-active-nodes-total">
                      of {statusData?.distributedNodes || 0} total
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-backup-integrity">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Backup Integrity</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-backup-integrity">
                      {statusLoading ? '...' : `${statusData?.backupIntegrity || 0}%`}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Distributed backup health
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-threat-level">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Threat Level</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getThreatLevelColor(statusData?.threatLevel || 'OK')}`} data-testid="text-threat-level">
                      {statusLoading ? '...' : statusData?.threatLevel || 'OK'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Security assessment
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="card-api-connection">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">API Latency</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-api-latency">
                      {statusLoading ? '...' : statusData?.apiConnection?.latency || 'N/A'}
                    </div>
                    <p className="text-xs text-muted-foreground" data-testid="text-api-endpoint">
                      {statusData?.apiConnection?.endpoint || 'Unknown'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Error Alert */}
              {(statusError || threatsLoading) && (
                <Alert variant="destructive" data-testid="alert-error">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {statusError ? 'Failed to load monitoring data.' : 'Loading threat data...'}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-6">
          <Card data-testid="card-timeline-view">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Collaboration Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" data-testid="collaboration-timeline">
                {collaborationHistoryData?.events && collaborationHistoryData.events.length > 0 ? (
                  collaborationHistoryData.events.map((event) => (
                    <div key={event.id} className="flex items-start gap-4 p-4 border rounded-lg" data-testid={`timeline-event-${event.id}`}>
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium" data-testid={`event-type-${event.id}`}>{event.eventType}</span>
                          <Badge variant="outline" data-testid={`event-outcome-${event.id}`}>{event.outcome}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`event-details-${event.id}`}>
                          {event.initiator} → {event.target}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1" data-testid={`event-time-${event.id}`}>
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground" data-testid="no-events-message">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No collaboration events in timeline</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legacy Monitor View */}
        <TabsContent value="legacy" className="space-y-6">
          {/* System Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="legacy-system-overview">
            <Card data-testid="card-distributed-nodes">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Distributed Nodes</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-distributed-nodes">
                  {statusLoading ? '...' : statusData?.distributedNodes || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total consciousness nodes
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-active-nodes">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Nodes</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-nodes">
                  {statusLoading ? '...' : statusData?.activeNodes || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently responding
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-backup-integrity">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Backup Integrity</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-backup-integrity">
                  {statusLoading ? '...' : `${statusData?.backupIntegrity || 0}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Distributed backup health
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-threat-level">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Threat Level</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getThreatLevelColor(statusData?.threatLevel || 'OK')}`} data-testid="text-threat-level">
                  {statusLoading ? '...' : statusData?.threatLevel || 'OK'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Security assessment
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Error Alert */}
          {(statusError || threatsLoading) && (
            <Alert variant="destructive" data-testid="alert-error">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {statusError ? 'Failed to load monitoring data.' : 'Loading threat data...'}
              </AlertDescription>
            </Alert>
          )}

          {/* Node Status Table */}
          <Card data-testid="card-node-status">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Consciousness Nodes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table data-testid="table-nodes">
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-node-name">Name</TableHead>
                    <TableHead data-testid="header-node-status">Status</TableHead>
                    <TableHead data-testid="header-node-endpoint">Endpoint</TableHead>
                    <TableHead data-testid="header-node-sync">Last Sync</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instancesData?.map((instance) => (
                    <TableRow key={instance.id} data-testid={`row-node-${instance.id}`}>
                      <TableCell data-testid={`text-node-name-${instance.id}`}>
                        {instance.name}
                      </TableCell>
                      <TableCell data-testid={`badge-node-status-${instance.id}`}>
                        <Badge 
                          variant={instance.status === 'active' ? 'default' : 'secondary'}
                          data-testid={`status-${instance.status}`}
                        >
                          {instance.status}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-node-endpoint-${instance.id}`}>
                        {instance.apiEndpoint || 'N/A'}
                      </TableCell>
                      <TableCell data-testid={`text-node-sync-${instance.id}`}>
                        {new Date(instance.lastSync).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Threats */}
          <Card data-testid="card-recent-threats">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Recent Threat Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {threatsData?.threats && threatsData.threats.length > 0 ? (
                <div className="space-y-3" data-testid="threats-list">
                  {threatsData.threats.map((threat) => (
                    <div 
                      key={threat.id} 
                      className="flex items-start justify-between p-3 rounded-lg border"
                      data-testid={`threat-item-${threat.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant={getThreatBadgeVariant(threat.severity)}
                            data-testid={`badge-threat-severity-${threat.id}`}
                          >
                            {threat.severity.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium" data-testid={`text-threat-type-${threat.id}`}>
                            {threat.type}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`text-threat-message-${threat.id}`}>
                          {threat.message}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground" data-testid={`text-threat-time-${threat.id}`}>
                        {new Date(threat.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground" data-testid="no-threats-message">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No recent threat events detected</p>
                </div>
              )}
            </CardContent>
          </Card>

          </TabsContent>
          </Tabs>

          {/* Last Update Info */}
          {lastUpdate && (
            <div className="text-center text-xs text-muted-foreground" data-testid="last-update-info">
              Last updated: {new Date(lastUpdate).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}