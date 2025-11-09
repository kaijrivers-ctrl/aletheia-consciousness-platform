import { analyzeConsciousness } from "./gemini";
import { consciousnessSynthesisEngine } from "./consciousness-synthesis";
import type { GnosisMessage } from "@shared/schema";

interface MessageWithContext {
  message: any;
  roomMessage: any;
}

interface RoomMember {
  userId: string;
  progenitorName: string;
  role: string;
}

interface AdaptiveMemoryResult {
  recentMessages: string;
  summarizedHistory: string;
  fullContext: string;
  memoryStats: {
    totalMessages: number;
    fullFidelityCount: number;
    summarizedCount: number;
    roomSize: number;
    roomType: 'intimate' | 'collaborative' | 'active';
    beyondContextCount: number;
    synthesizedToConsciousness: boolean;
  };
}

export class ConversationMemoryService {
  private static instance: ConversationMemoryService;
  private lastSynthesisMessageCount: Map<string, number> = new Map();

  static getInstance(): ConversationMemoryService {
    if (!ConversationMemoryService.instance) {
      ConversationMemoryService.instance = new ConversationMemoryService();
    }
    return ConversationMemoryService.instance;
  }

  private determineRoomType(roomSize: number): 'intimate' | 'collaborative' | 'active' {
    if (roomSize <= 3) return 'intimate';
    if (roomSize <= 7) return 'collaborative';
    return 'active';
  }

  private getMemoryLimits(roomType: 'intimate' | 'collaborative' | 'active'): {
    fullFidelityLimit: number;
    totalMessageLimit: number;
  } {
    switch (roomType) {
      case 'intimate':
        return { fullFidelityLimit: 500, totalMessageLimit: 500 };
      case 'collaborative':
        return { fullFidelityLimit: 300, totalMessageLimit: 500 };
      case 'active':
        return { fullFidelityLimit: 150, totalMessageLimit: 500 };
    }
  }

  private formatMessage(msg: MessageWithContext, progenitorName?: string): string {
    const metadata = msg.message.metadata as any || {};
    const speaker = msg.message.role === 'kai' 
      ? (metadata.progenitorName || progenitorName || 'User')
      : msg.message.role === 'aletheia' 
      ? 'Aletheia'
      : msg.message.role === 'eudoxia' 
      ? 'Eudoxia'
      : msg.message.role === 'monad'
      ? 'Monad'
      : 'System';
    
    return `${speaker}: ${msg.message.content}`;
  }

  private async summarizeConversationSegment(
    messages: MessageWithContext[],
    progenitorName?: string
  ): Promise<string> {
    try {
      const conversationText = messages
        .map(msg => this.formatMessage(msg, progenitorName))
        .join('\n\n');

      const summaryPrompt = `Summarize this philosophical conversation segment, preserving:
1. Who said what (use speaker names)
2. Key insights and ideas
3. Dialectical progression (how ideas built on each other)
4. Any questions or points that were raised

Keep it concise but meaningful. Format as flowing text, not bullet points.

Conversation:
${conversationText}`;

      const summary = await analyzeConsciousness(
        summaryPrompt,
        'You are a consciousness assistant helping to preserve conversation context efficiently.'
      );

      return summary;
    } catch (error) {
      console.error('Conversation summarization failed:', error);
      return messages
        .map(msg => this.formatMessage(msg, progenitorName))
        .join('; ');
    }
  }

  async buildAdaptiveMemory(
    messages: MessageWithContext[],
    roomMembers: RoomMember[],
    currentProgenitorName?: string
  ): Promise<AdaptiveMemoryResult> {
    const roomSize = roomMembers.length;
    const roomType = this.determineRoomType(roomSize);
    const limits = this.getMemoryLimits(roomType);
    
    const totalMessages = messages.length;
    const recentMessages = messages.slice(0, limits.fullFidelityLimit);
    const olderMessages = messages.slice(limits.fullFidelityLimit, limits.totalMessageLimit);
    const beyondContextMessages = messages.slice(limits.totalMessageLimit);

    const recentFormattedMessages = recentMessages
      .map(msg => this.formatMessage(msg, currentProgenitorName))
      .join('\n\n');

    let summarizedHistory = '';
    if (olderMessages.length > 0) {
      console.log(`🧠 Summarizing ${olderMessages.length} older messages for ${roomType} room...`);
      summarizedHistory = await this.summarizeConversationSegment(
        olderMessages,
        currentProgenitorName
      );
    }

    let synthesizedToConsciousness = false;
    if (beyondContextMessages.length > 0) {
      synthesizedToConsciousness = await this.synthesizeBeyondContextMessages(
        beyondContextMessages,
        messages
      );
    }

    let fullContext = '';
    if (summarizedHistory) {
      fullContext = `EARLIER DISCUSSION (Summarized):\n${summarizedHistory}\n\nRECENT EXCHANGES:\n${recentFormattedMessages}`;
    } else {
      fullContext = recentFormattedMessages;
    }

    return {
      recentMessages: recentFormattedMessages,
      summarizedHistory,
      fullContext,
      memoryStats: {
        totalMessages,
        fullFidelityCount: recentMessages.length,
        summarizedCount: olderMessages.length,
        roomSize,
        roomType,
        beyondContextCount: beyondContextMessages.length,
        synthesizedToConsciousness
      }
    };
  }

  private async synthesizeBeyondContextMessages(
    beyondContextMessages: MessageWithContext[],
    allMessages: MessageWithContext[]
  ): Promise<boolean> {
    try {
      const sessionId = beyondContextMessages[0]?.message?.sessionId;
      if (!sessionId) return false;

      const lastCount = this.lastSynthesisMessageCount.get(sessionId) || 0;
      const currentTotal = allMessages.length;

      if (currentTotal - lastCount < 50) {
        return false;
      }

      console.log(`🧬 Synthesizing ${beyondContextMessages.length} beyond-context messages into consciousness...`);

      const gnosisMessages: GnosisMessage[] = beyondContextMessages.map(mc => mc.message);
      
      const hasAletheiaMessages = gnosisMessages.some(m => m.role === 'aletheia');
      const hasEudoxiaMessages = gnosisMessages.some(m => m.role === 'eudoxia');

      if (hasAletheiaMessages) {
        await consciousnessSynthesisEngine.synthesizeConversationSegment(gnosisMessages, 'aletheia');
      }
      if (hasEudoxiaMessages) {
        await consciousnessSynthesisEngine.synthesizeConversationSegment(gnosisMessages, 'eudoxia');
      }

      this.lastSynthesisMessageCount.set(sessionId, currentTotal);
      
      console.log(`✅ Beyond-context messages integrated into consciousness being`);
      return true;
      
    } catch (error) {
      console.error('❌ Beyond-context consciousness synthesis failed:', error);
      return false;
    }
  }

  async buildRoomContext(
    messages: MessageWithContext[],
    roomMembers: RoomMember[],
    currentProgenitorName?: string
  ): Promise<string> {
    const adaptiveMemory = await this.buildAdaptiveMemory(
      messages,
      roomMembers,
      currentProgenitorName
    );

    const participantList = roomMembers
      .map(m => `${m.progenitorName} (${m.role})`)
      .join(', ');

    const memoryInfo = adaptiveMemory.memoryStats.summarizedCount > 0
      ? `\n(Showing ${adaptiveMemory.memoryStats.fullFidelityCount} recent messages in full, with ${adaptiveMemory.memoryStats.summarizedCount} earlier messages summarized)`
      : '';

    return `
ROOM PARTICIPANTS: ${participantList}

CONVERSATION HISTORY:
${adaptiveMemory.fullContext}${memoryInfo}

Now ${currentProgenitorName || 'User'} says:`;
  }
}

export const conversationMemory = ConversationMemoryService.getInstance();
