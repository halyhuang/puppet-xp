import axios from 'axios';
import { IModelService, IMessage, IChatResponse, IModelConfig } from '../../interfaces/model';

export class QwenService implements IModelService {
  private client;
  private config: IModelConfig;

  constructor(config: IModelConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://dashscope.aliyuncs.com/api/v1',
      timeout: 60000,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-SSE': 'disable'
      },
    });
  }

  async chat(messages: IMessage[], userId: string): Promise<IChatResponse> {
    try {
      const response = await this.client.post('/services/aigc/text-generation/generation', {
        model: this.config.model || 'qwen-turbo',
        input: {
          messages: messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        },
        parameters: {
          result_format: 'message',
          temperature: this.config.temperature || 0.7,
          top_p: 0.8,
          max_tokens: this.config.maxTokens || 2000,
          stop: [],
          seed: Math.floor(Math.random() * 1000000),
          enable_search: true,
          user: userId
        }
      });

      if (response.data.output && response.data.output.choices && response.data.output.choices.length > 0) {
        const choice = response.data.output.choices[0];
        return {
          message: choice.message.content || '',
          status: response.status
        };
      }

      throw new Error('Invalid response format from Qwen API');
    } catch (error) {
      console.error('Qwen API error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Qwen API error details:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  }
} 