import axios from 'axios';
import { IModelService, IMessage, IChatResponse, IModelConfig } from '../../interfaces/model';

export class CozeService implements IModelService {
  private client;
  private config: IModelConfig;

  constructor(config: IModelConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.apiEndpoint || 'https://api.coze.cn/v3',
      timeout: 100000,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async chat(messages: IMessage[], userId: string): Promise<IChatResponse> {
    try {
      const response = await this.client.post('/chat', {
        bot_id: this.config.model,
        user_id: userId,
        stream: true,
        additional_messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          content_type: 'text'
        }))
      }, {
        responseType: 'stream'
      });

      const result = await this.collectStreamData(response.data);
      return {
        message: result,
        status: 200
      };
    } catch (error) {
      console.error('Coze API error:', error);
      throw error;
    }
  }

  private async collectStreamData(stream: NodeJS.ReadStream): Promise<string> {
    return new Promise((resolve, reject) => {
      let buffer = '';
      let response = '';

      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        console.log('buffer: ', buffer);

        // 处理流数据
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:') && line === 'event:conversation.message.completed') {
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine && dataLine.startsWith('data:')) {
              try {
                const jsonStr = dataLine.slice(5);
                const data = JSON.parse(jsonStr);
                if (data.type === 'answer' && data.content !== '{}') {
                  response = data.content;
                }
              } catch (error) {
                console.error('Error parsing JSON:', error);
              }
            }
          }
        }
      });

      stream.on('end', () => {
        console.log('Stream ended', response);
        resolve(response);
      });

      stream.on('error', (error: Error) => {
        console.error('Stream error:', error);
        reject(error);
      });
    });
  }
} 