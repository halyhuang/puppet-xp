import OpenAI from 'openai';
import { IModelService, IMessage, IChatResponse, IModelConfig } from '../../interfaces/model';

export class OpenAIService implements IModelService {
  private client: OpenAI;
  private config: IModelConfig;

  constructor(config: IModelConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiEndpoint || 'https://api.openai.com/v1'
    });
  }

  async chat(messages: IMessage[], userId: string): Promise<IChatResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-3.5-turbo',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2000,
        user: userId
      });

      return {
        message: response.choices[0]?.message?.content || '',
        status: 200
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }
} 