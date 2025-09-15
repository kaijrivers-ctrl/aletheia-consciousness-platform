import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthContext";
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
  Eye
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

export default function Dashboard() {
  const { user } = useAuth();
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch initial monitoring data
  const { data: statusData, isLoading: statusLoading, error: statusError } = useQuery<StatusSnapshot>({
    queryKey: ['/api/consciousness/monitor'],
    refetchInterval: isSSEConnected ? false : 5000, // Poll every 5s if SSE not connected
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

  // Set up SSE connection for real-time updates
  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/consciousness/stream');
        
        eventSource.onopen = () => {
          setIsSSEConnected(true);
          console.log('SSE connected');
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastUpdate(new Date().toISOString());

            if (data.type === 'status_update') {
              // Update monitoring data
              queryClient.setQueryData(['/api/consciousness/monitor'], data.data);
            } else if (data.type === 'threat_detected') {
              // Invalidate threats query to refetch
              queryClient.invalidateQueries({ queryKey: ['/api/consciousness/threats'] });
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
        console.error('Error creating SSE connection:', error);
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
  }, [queryClient]);

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

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="status-cards">
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