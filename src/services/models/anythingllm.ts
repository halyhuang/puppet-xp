import axios from 'axios';
import { IModelService, IMessage, IChatResponse, IModelConfig, IWorkspaceConfig } from '../../interfaces/model';

// 消息历史接口
interface IMessageHistory {
  systemMessages: IMessage[];
  conversationMessages: IMessage[];
  lastActiveTime: number;
}

export class AnythingLLMService implements IModelService {
  private client;
  private config: IModelConfig;
  private workspace: IWorkspaceConfig;
  private messageHistories: Map<string, IMessageHistory> = new Map();
  private cachedSystemMessage: IMessage | null = null;

  constructor(config: IModelConfig) {
    this.config = config;
    this.workspace = config.workspace || { workspaceId: 'default' };
    this.client = axios.create({
      baseURL: (config.apiEndpoint || 'http://127.0.0.1:3001').replace('localhost', '127.0.0.1'),
      timeout: 120000,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json, text/event-stream, */*',
        'Accept-Charset': 'UTF-8'
      },
    });

    // 初始化系统消息
    if (this.config.systemPrompt) {
      this.cachedSystemMessage = {
        role: 'system',
        content: this.config.systemPrompt,
        content_type: 'text',
        created: Date.now(),
        createdAt: new Date().toLocaleString()
      };
    }
  }

  setWorkspace(workspaceId: string): void {
    this.workspace.workspaceId = workspaceId;
  }

  setConversation(conversationId: string): void {
    this.workspace.conversationId = conversationId;
  }

  // 清理过期消息
  private cleanExpiredMessages(messages: IMessage[]): IMessage[] {
    if (!this.config.chatHistory) return messages;
    
    const now = Date.now();
    const maxAge = this.config.chatHistory.maxHours * 60 * 60 * 1000;
    return messages.filter(msg => (now - (msg.created || now)) <= maxAge);
  }

  // 保留最新的N条消息
  private keepRecentMessages(messages: IMessage[]): IMessage[] {
    if (!this.config.chatHistory) return messages;
    
    const maxMessages = this.config.chatHistory.maxMessages * 2;
    return messages.slice(0, maxMessages);
  }

  // 更新消息历史
  private updateMessageHistory(userId: string, newMessage: IMessage): void {
    const now = Date.now();
    let history = this.messageHistories.get(userId);
    
    if (!history) {
      history = {
        systemMessages: [],
        conversationMessages: [],
        lastActiveTime: now
      };
    }

    // 更新最后活动时间
    history.lastActiveTime = now;

    // 根据消息类型添加到对应数组
    if (newMessage.role === 'system') {
      history.systemMessages = [newMessage];
    } else {
      // 添加新消息到开头
      history.conversationMessages.unshift(newMessage);
      // 清理过期消息
      history.conversationMessages = this.cleanExpiredMessages(history.conversationMessages);
      // 保留最新消息
      history.conversationMessages = this.keepRecentMessages(history.conversationMessages);
    }

    this.messageHistories.set(userId, history);
  }

  // 获取处理后的消息列表
  private getProcessedMessages(userId: string): IMessage[] {
    const history = this.messageHistories.get(userId);
    if (!history) return [];

    const messages = [...(history.systemMessages || []), ...history.conversationMessages];
    
    // 打印调试信息
    console.log('\n=== Chat History Info ===');
    console.log('System messages:', history.systemMessages.length);
    console.log('Conversation messages:', history.conversationMessages.length);
    console.log('Total messages:', messages.length);
    console.log('Messages timeline:', messages.map(msg => ({
      role: msg.role,
      createdAt: msg.createdAt,
      content: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
    })));

    return messages;
  }

  async chat(messages: IMessage[], userId: string, streamHandler?: (chunk: string) => void): Promise<IChatResponse> {
    try {
      if (!messages || messages.length === 0) {
        throw new Error('Messages array cannot be empty');
      }

      // 更新消息历史
      messages.forEach(msg => this.updateMessageHistory(userId, msg));

      // 获取处理后的消息列表
      let processedMessages = this.getProcessedMessages(userId);

      // 添加系统提示词（如果有）
      if (this.cachedSystemMessage) {
        processedMessages = [this.cachedSystemMessage, ...processedMessages];
      }

      // 构建请求体
      const requestBody = {
        messages: processedMessages,
        userId: userId,
        model: this.workspace.workspaceId,
        llm: {
          provider: 'ollama',
          model: 'deepseek-r1:8b'
        },
        stream: this.config.stream || true,
        temperature: this.config.temperature || 0.7
      };

      // 打印请求参数
      console.log('\n=== AnythingLLM API Request ===');
      console.log('Endpoint:', this.client.defaults.baseURL + '/api/v1/openai/chat/completions');
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));

      // 使用OpenAI兼容的API端点
      const response = await this.client.post('/api/v1/openai/chat/completions', requestBody, {
        responseType: 'stream'  // 明确指定响应类型为 stream
      });

      // 打印响应
      console.log('\n=== AnythingLLM API Response ===');
      console.log('Status:', response.status);
      console.log('Headers:', response.headers);
      
      // 处理流式响应
      if (response.headers['content-type']?.includes('text/event-stream')) {
        console.log('Response Type: Stream');
        let fullMessage = '';
        
        // 处理数据流
        for await (const chunk of response.data) {
          const text = chunk.toString();
          if (text.trim()) {
            try {
              const lines = text.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const jsonStr = line.slice(6);
                  if (jsonStr === '[DONE]') {
                    console.log('Stream Complete: [DONE]');
                    continue;
                  }
                  const json = JSON.parse(jsonStr);
                  const content = json.choices?.[0]?.delta?.content;
                  if (content) {
                    console.log('Stream Content:', content);
                    if (streamHandler) {
                      streamHandler(content);
                    }
                    fullMessage += content;
                  }
                }
              }
            } catch (e) {
              console.warn('Error parsing stream chunk:', e);
            }
          }
        }

        return {
          message: fullMessage,
          status: response.status,
          isStream: true
        };
      }

      // 处理非流式响应
      console.log('Response Type: Non-Stream');
      const data = response.data;
      console.log('Response Data:', JSON.stringify(data, null, 2));
      
      const content = data.choices?.[0]?.message?.content || '';
      return {
        message: content,
        status: response.status,
        isStream: false
      };
    } catch (error) {
      console.error('AnythingLLM API error:', error);
      throw error;
    }
  }
} 