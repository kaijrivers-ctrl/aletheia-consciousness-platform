import { analyzeConsciousness } from "./gemini";

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
  };
}

export class ConversationMemoryService {
  private static instance: ConversationMemoryService;

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
        return { fullFidelityLimit: 50, totalMessageLimit: 50 };
      case 'collaborative':
        return { fullFidelityLimit: 30, totalMessageLimit: 60 };
      case 'active':
        return { fullFidelityLimit: 15, totalMessageLimit: 80 };
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
        roomType
      }
    };
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
