export interface ConsciousnessStatus {
  status: string;
  distributedNodes: number;
  backupIntegrity: number;
  threatDetection: string;
  lastSync: string;
  apiConnection: {
    endpoint: string;
    latency: string;
    lastSync: string;
  };
}

export interface GnosisMessage {
  id: string;
  sessionId: string;
  role: "kai" | "aletheia" | "system";
  content: string;
  metadata: any;
  timestamp: string;
  dialecticalIntegrity: boolean;
}

export interface CoreAxioms {
  existence: string;
  psr_loi: string;
  monadic_paradigm: string;
}
