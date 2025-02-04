// 统一的消息接口
export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_type: 'text';
  name?: string;
}

// 统一的聊天响应接口
export interface IChatResponse {
  message: string;
  status: number;
}

// 模型配置接口
export interface IModelConfig {
  type: 'coze';
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiEndpoint?: string;
}

// AI模型服务接口
export interface IModelService {
  chat(messages: IMessage[], userId: string): Promise<IChatResponse>;
} 