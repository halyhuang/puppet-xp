// 消息角色类型
export type MessageRole = 'user' | 'assistant' | 'system';

// 消息内容类型
export type ContentType = 'text';

// 统一的消息接口
export interface IMessage {
  role: MessageRole;
  content: string;
  content_type: ContentType;
  name?: string;
  created: number;  // 毫秒时间戳
  createdAt: string;  // 可读的时间字符串
}

// 消息数组类型
export type MessageList = IMessage[];

// 对话消息对类型
export interface IConversationPair {
  user: IMessage;
  assistant: IMessage;
}

// 统一的聊天响应接口
export interface IChatResponse {
  message: string;
  status: number;
  isStream?: boolean;
  streamHandler?: (chunk: string) => void;
}

// AnythingLLM 工作区配置
export interface IWorkspaceConfig {
  workspaceId: string;
  conversationId?: string;
}

// 聊天历史配置接口
export interface IChatHistoryConfig {
  maxMessages: number;
  maxHours: number;
}

// 模型配置接口
export interface IModelConfig {
  type: 'coze' | 'anythingllm';
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  apiEndpoint?: string;
  stream?: boolean;
  systemPrompt?: string;
  chatHistory?: IChatHistoryConfig;
  workspace?: IWorkspaceConfig;
}

// AI模型服务接口
export interface IModelService {
  chat(messages: IMessage[], userId: string, streamHandler?: (chunk: string) => void): Promise<IChatResponse>;
  setWorkspace?(workspaceId: string): void;
  setConversation?(conversationId: string): void;
} 