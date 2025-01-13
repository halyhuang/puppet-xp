// 统一的消息接口
export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

// 统一的聊天响应接口
export interface IChatResponse {
  message: string;
  status: number;
}

// 模型配置接口
export interface IModelConfig {
  type: 'coze' | 'openai' | 'qwen';
  apiKey: string;
  apiEndpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// AI模型服务接口
export interface IModelService {
  chat(messages: IMessage[], userId: string): Promise<IChatResponse>;
} 