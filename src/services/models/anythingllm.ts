import axios from 'axios';
import { IModelService, IMessage, IChatResponse, IModelConfig, IWorkspaceConfig } from '../../interfaces/model';

export class AnythingLLMService implements IModelService {
  private client;
  private config: IModelConfig;
  private workspace: IWorkspaceConfig;

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
  }

  setWorkspace(workspaceId: string): void {
    this.workspace.workspaceId = workspaceId;
  }

  setConversation(conversationId: string): void {
    this.workspace.conversationId = conversationId;
  }

  async chat(messages: IMessage[], userId: string, streamHandler?: (chunk: string) => void): Promise<IChatResponse> {
    try {
      if (!messages || messages.length === 0) {
        throw new Error('Messages array cannot be empty');
      }

      // 处理聊天历史
      let filteredMessages = messages;
      if (this.config.chatHistory) {
        const now = Date.now();
        const maxAge = this.config.chatHistory.maxHours * 60 * 60 * 1000; // 转换为毫秒
        
        // 确保所有消息都有created时间戳
        const messagesWithTime = messages.map(msg => ({
          ...msg,
          created: msg.created || now,  // 使用毫秒时间戳
          createdAt: new Date(msg.created || now).toLocaleString()  // 添加可读的时间字符串
        }));

        // 分离系统消息和对话消息
        const systemMessages = messagesWithTime.filter(msg => msg.role === 'system');
        const conversationMessages = messagesWithTime.filter(msg => msg.role !== 'system');

        // 对话消息按created时间戳排序（较早的在前）
        const sortedConversationMessages = conversationMessages.sort((a, b) => a.created - b.created);
        
        // 按时间过滤消息
        const timeFilteredMessages = sortedConversationMessages
          .filter(msg => (now - msg.created) <= maxAge);

        // 获取最近的完整对话轮次
        const maxRounds = this.config.chatHistory.maxMessages;
        const conversationPairs: IMessage[] = [];
        let currentPair: IMessage[] = [];

        // 从较早的消息开始处理，确保对话的顺序正确
        for (const msg of timeFilteredMessages) {
          if (msg.role === 'user') {
            if (currentPair.length === 2) {
              // 如果已经有一个完整的对话对，保存它
              conversationPairs.push(...currentPair);
              currentPair = [];
              
              // 检查是否已达到最大轮次
              if (conversationPairs.length >= maxRounds * 2) {
                break;
              }
            }
            currentPair = [msg];
          } else if (msg.role === 'assistant' && currentPair.length === 1) {
            currentPair.push(msg);
          }
        }

        // 处理最后一个对话对
        if (currentPair.length > 0) {
          conversationPairs.push(...currentPair);
        }

        // 保留最近的 maxRounds 轮对话
        const recentPairs = conversationPairs.slice(-maxRounds * 2);

        // 组合最终的消息数组：系统消息（如果有）+ 最近的对话
        filteredMessages = [...systemMessages, ...recentPairs];

        // 打印调试信息
        console.log('\n=== Chat History Processing ===');
        console.log('System messages:', systemMessages.length);
        console.log('Time filtered messages:', timeFilteredMessages.length);
        console.log('Conversation pairs:', Math.floor(recentPairs.length / 2));
        console.log('Final messages:', filteredMessages.length);
        console.log('Messages timeline:', filteredMessages.map(msg => ({
          role: msg.role,
          createdAt: msg.createdAt,
          content: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '')
        })));
      }

      // 添加新的系统提示词（如果配置了的话）
      let messagesWithSystem = filteredMessages;
      if (this.config.systemPrompt) {
        const now = Date.now();
        const systemMessage: IMessage = {
          role: 'system',
          content: this.config.systemPrompt,
          content_type: 'text',
          created: now,
          createdAt: new Date(now).toLocaleString()
        };
        
        // 如果已经有系统消息，替换它；否则添加到开头
        const hasSystemMessage = filteredMessages.some(msg => msg.role === 'system');
        if (hasSystemMessage) {
          messagesWithSystem = filteredMessages.map(msg => 
            msg.role === 'system' ? systemMessage : msg
          );
        } else {
          messagesWithSystem = [systemMessage, ...filteredMessages];
        }
      }

      // 打印聊天历史信息
      console.log('\n=== Chat History Info ===');
      console.log('Original messages count:', messages.length);
      console.log('Filtered messages count:', filteredMessages.length);
      console.log('Final messages count:', messagesWithSystem.length);
      
      // 构建与Postman示例完全一致的请求体
      const requestBody = {
        messages: messagesWithSystem,
        userId: userId,  // 使用传入的 userId
        model: this.workspace.workspaceId,  // 使用 workspace.workspaceId 作为 model
        llm: {
          provider: 'ollama',
          model: 'deepseek-r1:8b'
        },
        stream: this.config.stream || true,  // 使用配置的 stream 参数，默认为 true
        temperature: this.config.temperature || 0.7
      };

      // 打印请求参数
      console.log('\n=== AnythingLLM API Request ===');
      console.log('Endpoint:', this.client.defaults.baseURL + '/api/v1/openai/chat/completions');
      console.log('Headers:', this.client.defaults.headers);
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