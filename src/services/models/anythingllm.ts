import axios from 'axios';
import { IModelService, IMessage, IChatResponse, IModelConfig, IWorkspaceConfig, createMessageDeque, createRequestMessages } from '../../interfaces/model.js';

export class AnythingLLMService implements IModelService {
  private client;
  private config: IModelConfig;
  private workspace: IWorkspaceConfig;
  private cachedSystemMessage: IMessage | null = null;
  private llmConfig: { provider: string; model: string };

  constructor(config: IModelConfig) {
    this.config = config;
    this.workspace = config.workspace || { workspaceId: 'default' };
    this.llmConfig = {
      provider: 'ollama',  // 默认值
      model: config.model || 'deepseek-r1:7b'  // 从配置中获取，如果没有则使用默认值
    };
    
    this.client = axios.create({
      baseURL: (config.apiEndpoint),
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

  async chat(messages: IMessage[], userId: string, streamHandler?: (chunk: string) => void): Promise<IChatResponse> {
    try {
      if (!messages || messages.length === 0) {
        throw new Error('Messages array cannot be empty');
      }

      // 计算最大消息数
      const maxRounds = this.config.chatHistory?.maxMessages ?? 2;  // 默认2轮对话
      const messagesPerRound = 2;  // 每轮包含用户消息和助手消息
      const maxTotal = maxRounds * messagesPerRound + 1;  // 最后+1是最新的用户消息

      // 创建消息队列并添加现有消息
      const messageQueue = createMessageDeque(maxTotal);
      messages.forEach((msg: IMessage) => messageQueue.push(msg));

      // 构建请求体 - 系统消息放在最前面
      const requestBody = {
        messages: createRequestMessages(messageQueue, this.cachedSystemMessage),
        userId: userId,
        model: this.workspace.workspaceId,
        llm: this.llmConfig,
        stream: this.config.stream || true,
        temperature: this.config.temperature || 0.7
      };

      // 打印请求参数（包含消息顺序信息）
      console.log('\n=== AnythingLLM API Request ===');
      console.log('Endpoint:', this.client.defaults.baseURL + '/api/v1/openai/chat/completions');
      console.log('Message order check:');
      requestBody.messages.forEach((msg: IMessage, index: number) => {
        console.log(`[${index + 1}] ${msg.role}:`, 
          msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : ''));
      });

      // 使用OpenAI兼容的API端点
      const response = await this.client.post('/api/v1/openai/chat/completions', requestBody, {
        responseType: 'stream'
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

        // 创建助理回复消息并添加到队列
        const assistantMessage: IMessage = {
          role: 'assistant',
          content: fullMessage,
          content_type: 'text',
          created: Date.now(),
          createdAt: new Date().toLocaleString()
        };
        messageQueue.push(assistantMessage);
        
        // 更新原始消息数组
        messages.length = 0;  // 清空原数组
        messages.push(...messageQueue.toArray());  // 添加队列中的所有消息

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

      // 创建助理回复消息并添加到队列
      const assistantMessage: IMessage = {
        role: 'assistant',
        content: content,
        content_type: 'text',
        created: Date.now(),
        createdAt: new Date().toLocaleString()
      };
      messageQueue.push(assistantMessage);
      
      // 更新原始消息数组
      messages.length = 0;  // 清空原数组
      messages.push(...messageQueue.toArray());  // 添加队列中的所有消息

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