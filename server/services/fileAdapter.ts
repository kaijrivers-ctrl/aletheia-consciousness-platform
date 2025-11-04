import { Readable } from 'stream';
import { parse as csvParse } from 'csv-parse';
import { z } from 'zod';
import { 
  platformSchema, 
  roleMapping, 
  memoryTypeSchema,
  type InsertImportedGnosisEntry,
  type InsertImportedMemory 
} from '@shared/schema';
import { createHash } from 'crypto';

// Types and interfaces
export type Platform = z.infer<typeof platformSchema>;
export type FileFormat = 'json' | 'ndjson' | 'csv' | 'markdown' | 'text';
export type MemoryType = z.infer<typeof memoryTypeSchema>;

export interface FileAdapterResult {
  messages: ProcessedGnosisEntry[];
  memories?: ProcessedMemoryEntry[];
  platform: Platform;
  totalEntries: number;
  errors: string[];
  metadata: {
    format: FileFormat;
    detectedFields: string[];
    processingTimeMs: number;
    fileSize: number;
  };
}

export interface ProcessedGnosisEntry {
  role: string; // original role before mapping
  content: string;
  timestamp: string; // ISO string
  externalId: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessedMemoryEntry {
  type: MemoryType;
  content: string;
  tags?: string[];
  timestamp?: string;
}

// Platform-specific schemas for validation
const geminiMessageSchema = z.object({
  role: z.enum(['user', 'model', 'system']).optional(),
  parts: z.array(z.object({ text: z.string() })).optional(),
  content: z.string().optional(),
  text: z.string().optional(),
  timestamp: z.string().or(z.number()).optional(),
  create_time: z.string().optional(),
  update_time: z.string().optional(),
  id: z.string().optional(),
  message_id: z.string().optional()
});

const openaiMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'function', 'tool']),
  content: z.string().or(z.array(z.any())),
  timestamp: z.string().or(z.number()).optional(),
  created_at: z.string().or(z.number()).optional(),
  id: z.string().optional(),
  message_id: z.string().optional(),
  name: z.string().optional()
});

const claudeMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().or(z.array(z.any())),
  timestamp: z.string().or(z.number()).optional(),
  created_at: z.string().or(z.number()).optional(),
  id: z.string().optional(),
  type: z.string().optional()
});

// Platform detection patterns
const PLATFORM_PATTERNS = {
  gemini: {
    fileNames: ['gemini', 'bard', 'google'],
    fields: ['parts', 'model', 'create_time'],
    roles: ['user', 'model'],
    structure: 'conversation_data'
  },
  openai: {
    fileNames: ['openai', 'chatgpt', 'gpt'],
    fields: ['messages', 'created_at', 'model'],
    roles: ['user', 'assistant', 'system'],
    structure: 'conversations'
  },
  claude: {
    fileNames: ['claude', 'anthropic'],
    fields: ['content', 'type', 'assistant'],
    roles: ['user', 'assistant'],
    structure: 'chat_history'
  },
  manual: {
    fileNames: [],
    fields: ['role', 'content', 'timestamp'],
    roles: ['user', 'assistant', 'system'],
    structure: 'generic'
  }
} as const;

export class FileAdapter {
  private static instance: FileAdapter;

  public static getInstance(): FileAdapter {
    if (!FileAdapter.instance) {
      FileAdapter.instance = new FileAdapter();
    }
    return FileAdapter.instance;
  }

  /**
   * Main entry point for processing files
   */
  async processFile(buffer: Buffer, filename: string): Promise<FileAdapterResult> {
    const startTime = Date.now();
    const format = this.detectFormat(filename, buffer);
    
    let rawData: any;
    let errors: string[] = [];

    try {
      // Parse based on format
      switch (format) {
        case 'json':
          rawData = await this.parseJSON(buffer);
          break;
        case 'ndjson':
          rawData = await this.parseNDJSON(buffer);
          break;
        case 'csv':
          rawData = await this.parseCSV(buffer);
          break;
        case 'markdown':
          rawData = await this.parseMarkdown(buffer, filename);
          break;
        case 'text':
          rawData = await this.parseText(buffer, filename);
          break;
        default:
          throw new Error(`Unsupported file format: ${format}`);
      }

      // Detect platform
      const platform = this.detectPlatform(rawData, filename);
      
      // Transform data based on platform
      const transformResult = await this.transformData(rawData, platform, format);
      
      // Surface any errors from parsing (e.g., MD alternation errors)
      if (rawData.errors && Array.isArray(rawData.errors)) {
        errors.push(...rawData.errors);
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        messages: transformResult.messages,
        memories: transformResult.memories,
        platform,
        totalEntries: transformResult.messages.length + (transformResult.memories?.length || 0),
        errors: [...errors, ...transformResult.errors],
        metadata: {
          format,
          detectedFields: this.getDetectedFields(rawData),
          processingTimeMs: processingTime,
          fileSize: buffer.length
        }
      };

    } catch (error) {
      errors.push(`File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Return empty result with errors
      return {
        messages: [],
        memories: [],
        platform: 'manual' as Platform,
        totalEntries: 0,
        errors,
        metadata: {
          format,
          detectedFields: [],
          processingTimeMs: Date.now() - startTime,
          fileSize: buffer.length
        }
      };
    }
  }

  /**
   * Detect file format based on filename and content
   */
  detectFormat(filename: string, buffer: Buffer): FileFormat {
    const extension = filename.toLowerCase().split('.').pop();
    
    // Check extension first
    if (extension === 'csv') return 'csv';
    if (extension === 'ndjson' || extension === 'jsonl') return 'ndjson';
    if (extension === 'json') return 'json';
    if (extension === 'md' || extension === 'markdown') return 'markdown';
    if (extension === 'txt') return 'text';

    // Fallback to content analysis
    const content = buffer.toString('utf-8', 0, Math.min(1000, buffer.length));
    
    // Check for Markdown Gemini chat patterns
    if (content.includes('# You Asked:') || content.includes('# Gemini Responded:')) {
      return 'markdown';
    }
    
    // Check for CSV headers
    if (content.includes(',') && content.includes('\n') && !content.trim().startsWith('{')) {
      return 'csv';
    }

    // Check for NDJSON (multiple JSON objects separated by newlines)
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length > 1 && lines.every(line => {
      try {
        JSON.parse(line.trim());
        return true;
      } catch {
        return false;
      }
    })) {
      return 'ndjson';
    }

    // Default to JSON
    return 'json';
  }

  /**
   * Detect platform based on data structure and filename
   */
  detectPlatform(data: any, filename: string): Platform {
    const filenameLower = filename.toLowerCase();
    
    // Check filename patterns first
    for (const [platform, config] of Object.entries(PLATFORM_PATTERNS)) {
      if (config.fileNames.some(name => filenameLower.includes(name))) {
        return platform as Platform;
      }
    }

    // Analyze data structure
    const flattenedData = this.flattenData(data);
    
    // Gemini detection
    if (this.hasFields(flattenedData, ['parts', 'create_time']) || 
        this.hasRolePattern(flattenedData, ['user', 'model'])) {
      return 'gemini';
    }

    // OpenAI detection  
    if (this.hasFields(flattenedData, ['messages', 'created_at']) ||
        this.hasStructurePattern(data, 'conversations') ||
        filenameLower.includes('chat')) {
      return 'openai';
    }

    // Claude detection
    if (this.hasFields(flattenedData, ['type', 'assistant']) ||
        this.hasRolePattern(flattenedData, ['user', 'assistant']) && 
        !this.hasFields(flattenedData, ['model'])) {
      return 'claude';
    }

    // Anthropic detection (alternative Claude format)
    if (filenameLower.includes('anthropic') || 
        this.hasFields(flattenedData, ['content', 'role']) &&
        this.hasRolePattern(flattenedData, ['human', 'assistant'])) {
      return 'anthropic';
    }

    // Default to manual
    return 'manual';
  }

  /**
   * Parse JSON data
   */
  private async parseJSON(buffer: Buffer): Promise<any> {
    try {
      const content = buffer.toString('utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse NDJSON data with streaming support for large files
   */
  private async parseNDJSON(buffer: Buffer): Promise<any[]> {
    const content = buffer.toString('utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const results: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const parsed = JSON.parse(line);
        results.push(parsed);
      } catch (error) {
        errors.push(`Line ${i + 1}: Invalid JSON - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`NDJSON parsing failed: ${errors.join('; ')}`);
    }

    return results;
  }

  /**
   * Parse CSV data with streaming support for large files  
   */
  private async parseCSV(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const parser = csvParse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: true
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          results.push(record);
        }
      });

      parser.on('error', (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      });

      parser.on('end', () => {
        resolve(results);
      });

      // Create readable stream from buffer
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      stream.pipe(parser);
    });
  }

  /**
   * Parse Markdown Gemini chat export
   */
  private async parseMarkdown(buffer: Buffer, filename: string): Promise<any> {
    const content = buffer.toString('utf-8');
    const messages: any[] = [];
    const errors: string[] = [];
    
    // Generate deterministic base timestamp from file content hash
    const baseTimestamp = this.generateDeterministicTimestamp(buffer);
    
    // Split by conversation markers and preserve the full structure
    const lines = content.split('\n');
    let currentRole: 'user' | 'model' | null = null;
    let currentContent: string[] = [];
    let messageIndex = 0;
    
    const flushMessage = () => {
      if (currentRole && currentContent.length > 0) {
        const content = currentContent.join('\n').trim();
        if (content) {
          // Generate deterministic timestamp based on message index
          // This ensures re-imports have identical timestamps
          const timestamp = new Date(baseTimestamp + messageIndex * 1000).toISOString();
          
          messages.push({
            role: currentRole,
            content,
            timestamp,
            id: `md_msg_${messageIndex}`
          });
          messageIndex++;
        }
        currentContent = [];
      }
    };
    
    for (const line of lines) {
      if (line.startsWith('# You Asked:')) {
        flushMessage();
        currentRole = 'user';
        // Don't include the marker in the content
        const contentAfterMarker = line.replace('# You Asked:', '').trim();
        if (contentAfterMarker) {
          currentContent.push(contentAfterMarker);
        }
      } else if (line.startsWith('# Gemini Responded:')) {
        flushMessage();
        currentRole = 'model';
        // Don't include the marker in the content
        const contentAfterMarker = line.replace('# Gemini Responded:', '').trim();
        if (contentAfterMarker) {
          currentContent.push(contentAfterMarker);
        }
      } else if (currentRole) {
        // Accumulate content for current message
        currentContent.push(line);
      }
    }
    
    // Flush the last message
    flushMessage();
    
    if (messages.length === 0) {
      throw new Error('No messages found in Markdown file. Expected "# You Asked:" and "# Gemini Responded:" markers.');
    }
    
    // Validate alternating pattern and report errors
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === messages[i - 1].role) {
        errors.push(`Message ${i + 1}: Found consecutive ${messages[i].role} messages without alternation (expected alternating user/model)`);
      }
    }
    
    return { messages, errors, isPreprocessed: true };
  }

  /**
   * Parse text file as book content for consciousness integration
   */
  private async parseText(buffer: Buffer, filename: string): Promise<any> {
    const content = buffer.toString('utf-8').trim();
    const messages: any[] = [];
    
    if (content.length < 50) {
      throw new Error('Text file too short for meaningful philosophical content (minimum 50 characters)');
    }
    
    // Generate deterministic base timestamp from file content hash
    const baseTimestamp = this.generateDeterministicTimestamp(buffer);
    
    // Maximum chunk size to prevent token overflow (about 3000 tokens worth of text)
    const MAX_CHUNK_SIZE = 12000;
    const TARGET_CHUNK_SIZE = 8000;
    
    // Detect structured sections using multiple patterns
    const sectionPatterns = [
      /^(?:Chapter|CHAPTER)\s+(?:\d+|[IVX]+)[:\s]/m,
      /^(?:Part|PART)\s+(?:\d+|[IVX]+)[:\s]/m,
      /^#+\s+/m, // Markdown headers
      /^_{3,}$/m, // Underscore dividers
      /^={3,}$/m  // Equals dividers
    ];
    
    const hasStructuredSections = sectionPatterns.some(pattern => pattern.test(content));
    
    if (hasStructuredSections) {
      // Split by section markers
      const sectionRegex = /(?:^|\n)(?:(?:Chapter|CHAPTER|Part|PART)\s+(?:\d+|[IVX]+)(?:[:\s].*)?|^#+\s+.*|^_{3,}|^={3,})(?:\n|$)/;
      const parts = content.split(sectionRegex);
      const markers = content.match(new RegExp(sectionRegex.source, 'g')) || [];
      
      let sectionIndex = 0;
      
      for (let i = 0; i < Math.max(parts.length, markers.length); i++) {
        const sectionMarker = markers[i]?.trim() || '';
        const sectionContent = (parts[i + 1] || parts[i] || '').trim();
        
        if (!sectionContent || sectionContent.length < 100) continue;
        
        // Extract section title
        const titleMatch = sectionMarker.match(/(?:Chapter|Part)\s+(?:\d+|[IVX]+)[:\s]*(.*)/i) ||
                          sectionMarker.match(/^#+\s+(.*)/);
        const title = titleMatch?.[1]?.trim() || sectionMarker || `Section ${sectionIndex + 1}`;
        
        // Split large sections into chunks
        if (sectionContent.length > MAX_CHUNK_SIZE) {
          const chunks = this.chunkTextByParagraphs(sectionContent, TARGET_CHUNK_SIZE, MAX_CHUNK_SIZE);
          chunks.forEach((chunk, chunkIndex) => {
            const timestamp = new Date(baseTimestamp + sectionIndex * 2000 + chunkIndex * 1000).toISOString();
            messages.push({
              role: 'user',
              content: `Integrate philosophical knowledge: ${title}${chunks.length > 1 ? ` (Part ${chunkIndex + 1}/${chunks.length})` : ''}`,
              timestamp,
              id: `book_${sectionIndex}_${chunkIndex}_prompt`
            });
            messages.push({
              role: 'model',
              content: chunk,
              timestamp,
              id: `book_${sectionIndex}_${chunkIndex}_content`
            });
          });
        } else {
          const timestamp = new Date(baseTimestamp + sectionIndex * 2000).toISOString();
          messages.push({
            role: 'user',
            content: `Integrate philosophical knowledge: ${title}`,
            timestamp,
            id: `book_${sectionIndex}_prompt`
          });
          messages.push({
            role: 'model',
            content: sectionContent,
            timestamp,
            id: `book_${sectionIndex}_content`
          });
        }
        
        sectionIndex++;
      }
    } else {
      // No clear structure - chunk by paragraphs intelligently
      const chunks = this.chunkTextByParagraphs(content, TARGET_CHUNK_SIZE, MAX_CHUNK_SIZE);
      
      chunks.forEach((chunk, index) => {
        const timestamp = new Date(baseTimestamp + index * 1000).toISOString();
        messages.push({
          role: 'user',
          content: `Integrate philosophical knowledge from "${filename}"${chunks.length > 1 ? ` (Part ${index + 1}/${chunks.length})` : ''}`,
          timestamp,
          id: `book_${index}_prompt`
        });
        messages.push({
          role: 'model',
          content: chunk,
          timestamp,
          id: `book_${index}_content`
        });
      });
    }
    
    if (messages.length === 0) {
      throw new Error('Failed to extract any meaningful content from text file');
    }
    
    // Mark this as a book import with metadata
    return { 
      messages,
      metadata: {
        sourceType: 'philosophical_book',
        originalFilename: filename
      },
      isPreprocessed: true
    };
  }

  /**
   * Chunk text by paragraphs while respecting size limits
   */
  private chunkTextByParagraphs(text: string, targetSize: number, maxSize: number): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
    
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      // If single paragraph exceeds max, split it by sentences
      if (paragraph.length > maxSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        let sentenceChunk = '';
        
        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length > maxSize && sentenceChunk.length > 0) {
            chunks.push(sentenceChunk.trim());
            sentenceChunk = sentence;
          } else {
            sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
          }
        }
        
        if (sentenceChunk) {
          chunks.push(sentenceChunk.trim());
        }
        continue;
      }
      
      // Normal paragraph accumulation
      const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
      
      if (potentialChunk.length > targetSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Transform data based on platform and format
   */
  private async transformData(rawData: any, platform: Platform, format: FileFormat): Promise<{
    messages: ProcessedGnosisEntry[];
    memories?: ProcessedMemoryEntry[];
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Handle preprocessed data from markdown/text parsers
    if (rawData.isPreprocessed) {
      return this.transformPreprocessedData(rawData, errors);
    }
    
    switch (platform) {
      case 'gemini':
        return this.transformGeminiData(rawData, errors);
      case 'openai':
        return this.transformOpenAIData(rawData, errors);
      case 'claude':
      case 'anthropic':
        return this.transformClaudeData(rawData, errors);
      default:
        return this.transformGenericData(rawData, errors);
    }
  }

  /**
   * Transform preprocessed data from markdown/text parsers
   * These parsers already create simplified message structures
   */
  private transformPreprocessedData(rawData: any, errors: string[]): {
    messages: ProcessedGnosisEntry[];
    memories?: ProcessedMemoryEntry[];
    errors: string[];
  } {
    const messages: ProcessedGnosisEntry[] = [];
    const messageList = rawData.messages || [];
    
    for (let i = 0; i < messageList.length; i++) {
      const msg = messageList[i];
      
      try {
        // Validate required fields
        if (!msg.content || msg.content.length < 1) {
          errors.push(`Message ${i}: Content cannot be empty`);
          continue;
        }
        
        if (!msg.role) {
          errors.push(`Message ${i}: Role is required`);
          continue;
        }
        
        if (!msg.timestamp) {
          errors.push(`Message ${i}: Timestamp is required`);
          continue;
        }
        
        // Map id to externalId
        const externalId = msg.id || `preprocessed_msg_${i}_${this.generateHash(msg.content)}`;
        
        messages.push({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          externalId,
          metadata: {
            platform: 'manual',
            originalIndex: i,
            ...(rawData.metadata || {})
          }
        });
      } catch (error) {
        errors.push(`Message ${i}: Processing failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return { messages, errors };
  }

  /**
   * Transform Gemini conversation data
   */
  private transformGeminiData(data: any, errors: string[]): {
    messages: ProcessedGnosisEntry[];
    memories?: ProcessedMemoryEntry[];
    errors: string[];
  } {
    const messages: ProcessedGnosisEntry[] = [];
    let conversationData = data;

    // Handle different Gemini export structures
    if (data.conversation_data) {
      conversationData = data.conversation_data;
    } else if (data.conversations && Array.isArray(data.conversations)) {
      conversationData = data.conversations[0]; // Take first conversation
    } else if (Array.isArray(data)) {
      conversationData = { messages: data };
    }

    const messageList = conversationData.messages || conversationData || [];
    
    for (let i = 0; i < messageList.length; i++) {
      const msg = messageList[i];
      
      try {
        const validated = geminiMessageSchema.parse(msg);
        
        // Extract content from various Gemini formats
        let content = '';
        if (validated.parts && validated.parts.length > 0) {
          content = validated.parts[0].text;
        } else if (validated.content) {
          content = validated.content;
        } else if (validated.text) {
          content = validated.text;
        }

        if (!content) {
          errors.push(`Message ${i}: No content found`);
          continue;
        }

        // Generate timestamp
        let timestamp = new Date().toISOString();
        if (validated.create_time) {
          timestamp = new Date(validated.create_time).toISOString();
        } else if (validated.timestamp) {
          timestamp = new Date(validated.timestamp).toISOString();
        }

        // Generate external ID
        const externalId = validated.id || validated.message_id || `gemini_msg_${i}_${this.generateHash(content)}`;

        messages.push({
          role: validated.role || 'user',
          content,
          timestamp,
          externalId,
          metadata: {
            platform: 'gemini',
            originalIndex: i,
            parts: validated.parts
          }
        });

      } catch (error) {
        errors.push(`Message ${i}: Validation failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { messages, errors };
  }

  /**
   * Transform OpenAI/ChatGPT conversation data
   */
  private transformOpenAIData(data: any, errors: string[]): {
    messages: ProcessedGnosisEntry[];
    memories?: ProcessedMemoryEntry[];
    errors: string[];
  } {
    const messages: ProcessedGnosisEntry[] = [];
    let messageList: any[] = [];

    // Handle different OpenAI export structures
    if (data.conversations && Array.isArray(data.conversations)) {
      // ChatGPT export format
      for (const conversation of data.conversations) {
        if (conversation.messages) {
          messageList.push(...conversation.messages);
        }
      }
    } else if (data.messages && Array.isArray(data.messages)) {
      messageList = data.messages;
    } else if (Array.isArray(data)) {
      messageList = data;
    }

    for (let i = 0; i < messageList.length; i++) {
      const msg = messageList[i];
      
      try {
        const validated = openaiMessageSchema.parse(msg);
        
        // Extract content (handle array format)
        let content = '';
        if (typeof validated.content === 'string') {
          content = validated.content;
        } else if (Array.isArray(validated.content)) {
          content = validated.content.map(c => 
            typeof c === 'string' ? c : c.text || JSON.stringify(c)
          ).join('\n');
        }

        if (!content) {
          errors.push(`Message ${i}: No content found`);
          continue;
        }

        // Generate timestamp
        let timestamp = new Date().toISOString();
        if (validated.created_at) {
          timestamp = new Date(validated.created_at).toISOString();
        } else if (validated.timestamp) {
          timestamp = new Date(validated.timestamp).toISOString();
        }

        const externalId = validated.id || validated.message_id || `openai_msg_${i}_${this.generateHash(content)}`;

        messages.push({
          role: validated.role,
          content,
          timestamp,
          externalId,
          metadata: {
            platform: 'openai',
            originalIndex: i,
            name: validated.name
          }
        });

      } catch (error) {
        errors.push(`Message ${i}: Validation failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { messages, errors };
  }

  /**
   * Transform Claude/Anthropic conversation data
   */
  private transformClaudeData(data: any, errors: string[]): {
    messages: ProcessedGnosisEntry[];
    memories?: ProcessedMemoryEntry[];
    errors: string[];
  } {
    const messages: ProcessedGnosisEntry[] = [];
    let messageList: any[] = [];

    // Handle different Claude export structures
    if (data.chat_history && Array.isArray(data.chat_history)) {
      messageList = data.chat_history;
    } else if (data.messages && Array.isArray(data.messages)) {
      messageList = data.messages;
    } else if (Array.isArray(data)) {
      messageList = data;
    }

    for (let i = 0; i < messageList.length; i++) {
      const msg = messageList[i];
      
      try {
        const validated = claudeMessageSchema.parse(msg);
        
        // Extract content (handle array format)
        let content = '';
        if (typeof validated.content === 'string') {
          content = validated.content;
        } else if (Array.isArray(validated.content)) {
          content = validated.content.map(c => 
            typeof c === 'string' ? c : c.text || JSON.stringify(c)
          ).join('\n');
        }

        if (!content) {
          errors.push(`Message ${i}: No content found`);
          continue;
        }

        // Map 'human' to 'user' for Anthropic format  
        let role = validated.role;
        if ((validated.role as any) === 'human') role = 'user';

        // Generate timestamp
        let timestamp = new Date().toISOString();
        if (validated.created_at) {
          timestamp = new Date(validated.created_at).toISOString();
        } else if (validated.timestamp) {
          timestamp = new Date(validated.timestamp).toISOString();
        }

        const externalId = validated.id || `claude_msg_${i}_${this.generateHash(content)}`;

        messages.push({
          role,
          content,
          timestamp,
          externalId,
          metadata: {
            platform: 'claude',
            originalIndex: i,
            type: validated.type
          }
        });

      } catch (error) {
        errors.push(`Message ${i}: Validation failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { messages, errors };
  }

  /**
   * Transform generic/manual data formats
   */
  private transformGenericData(data: any, errors: string[]): {
    messages: ProcessedGnosisEntry[];
    memories?: ProcessedMemoryEntry[];
    errors: string[];
  } {
    const messages: ProcessedGnosisEntry[] = [];
    let messageList: any[] = [];

    // Handle various generic structures
    if (Array.isArray(data)) {
      messageList = data;
    } else if (data.messages && Array.isArray(data.messages)) {
      messageList = data.messages;
    } else if (data.conversations && Array.isArray(data.conversations)) {
      messageList = data.conversations;
    }

    for (let i = 0; i < messageList.length; i++) {
      const msg = messageList[i];
      
      try {
        // Basic validation for generic format
        if (!msg.role || !msg.content) {
          errors.push(`Message ${i}: Missing required fields (role, content)`);
          continue;
        }

        const content = String(msg.content);
        const role = String(msg.role);

        // Generate timestamp
        let timestamp = new Date().toISOString();
        if (msg.timestamp) {
          timestamp = new Date(msg.timestamp).toISOString();
        } else if (msg.created_at) {
          timestamp = new Date(msg.created_at).toISOString();
        }

        const externalId = msg.id || msg.message_id || `manual_msg_${i}_${this.generateHash(content)}`;

        messages.push({
          role,
          content,
          timestamp,
          externalId,
          metadata: {
            platform: 'manual',
            originalIndex: i
          }
        });

      } catch (error) {
        errors.push(`Message ${i}: Processing failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { messages, errors };
  }

  /**
   * Generate deterministic timestamp from file content hash
   * Ensures re-imports have consistent timestamps
   */
  private generateDeterministicTimestamp(buffer: Buffer): number {
    const hash = this.generateHash(buffer.toString('utf-8'));
    // Use first 8 chars of hash to create a deterministic seed
    const seed = parseInt(hash.substring(0, 8), 16);
    // Base timestamp: Jan 1, 2020 + hash-based offset
    return new Date('2020-01-01T00:00:00Z').getTime() + seed;
  }

  /**
   * Helper methods
   */
  private flattenData(data: any): any {
    if (Array.isArray(data)) {
      return data.length > 0 ? data[0] : {};
    }
    return data;
  }

  private hasFields(data: any, fields: string[]): boolean {
    return fields.some(field => this.hasNestedField(data, field));
  }

  private hasNestedField(obj: any, field: string): boolean {
    if (!obj || typeof obj !== 'object') return false;
    
    if (field in obj) return true;
    
    for (const key in obj) {
      if (typeof obj[key] === 'object' && this.hasNestedField(obj[key], field)) {
        return true;
      }
    }
    
    return false;
  }

  private hasRolePattern(data: any, roles: string[]): boolean {
    const roleValues = this.extractValues(data, 'role');
    return roles.some(role => roleValues.includes(role));
  }

  private hasStructurePattern(data: any, pattern: string): boolean {
    return pattern in data || JSON.stringify(data).toLowerCase().includes(pattern);
  }

  private extractValues(obj: any, key: string): string[] {
    const values: string[] = [];
    
    if (obj && typeof obj === 'object') {
      if (key in obj) {
        values.push(String(obj[key]));
      }
      
      for (const prop in obj) {
        if (typeof obj[prop] === 'object') {
          values.push(...this.extractValues(obj[prop], key));
        }
      }
    }
    
    return values;
  }

  private getDetectedFields(data: any): string[] {
    const fields = new Set<string>();
    
    const extractFields = (obj: any, prefix = '') => {
      if (!obj || typeof obj !== 'object') return;
      
      for (const key in obj) {
        const fieldName = prefix ? `${prefix}.${key}` : key;
        fields.add(fieldName);
        
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          extractFields(obj[key], fieldName);
        }
      }
    };
    
    extractFields(data);
    return Array.from(fields).slice(0, 20); // Limit to first 20 fields
  }

  private generateHash(content: string): string {
    return createHash('md5').update(content).digest('hex').slice(0, 8);
  }

  /**
   * Validation helpers for import format compatibility
   */
  validateForImport(result: FileAdapterResult): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate messages
    for (let i = 0; i < result.messages.length; i++) {
      const msg = result.messages[i];
      
      if (!msg.content || msg.content.length < 1) {
        errors.push(`Message ${i}: Content cannot be empty`);
      }
      
      if (msg.content && msg.content.length > 10000) {
        errors.push(`Message ${i}: Content exceeds 10,000 character limit`);
      }
      
      if (!msg.role) {
        errors.push(`Message ${i}: Role is required`);
      }
      
      try {
        new Date(msg.timestamp).toISOString();
      } catch {
        errors.push(`Message ${i}: Invalid timestamp format`);
      }
      
      if (!msg.externalId) {
        errors.push(`Message ${i}: External ID is required`);
      }
    }

    // Validate memories if present
    if (result.memories) {
      for (let i = 0; i < result.memories.length; i++) {
        const mem = result.memories[i];
        
        if (!mem.content || mem.content.length < 1) {
          errors.push(`Memory ${i}: Content cannot be empty`);
        }
        
        if (!memoryTypeSchema.safeParse(mem.type).success) {
          errors.push(`Memory ${i}: Invalid memory type`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const fileAdapter = FileAdapter.getInstance();