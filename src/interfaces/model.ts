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

// 消息队列（使用 double-ended-queue 并添加大小限制）
import Deque from 'double-ended-queue';

export class MessageDeque {
  private deque: Deque<IMessage>;
  private maxSize: number;

  constructor(maxSize: number = 5) {
    this.deque = new Deque<IMessage>();
    this.maxSize = maxSize;
  }

  // 添加消息到队列尾部，自动控制大小
  push(message: IMessage): void {
    this.deque.push(message);
    // 如果超出最大长度，从头部删除
    while (this.deque.length > this.maxSize) {
      this.deque.shift();
    }
  }

  // 获取所有消息
  toArray(): IMessage[] {
    return this.deque.toArray();
  }

  // 获取队列长度
  get length(): number {
    return this.deque.length;
  }
}

// 创建消息队列的工厂函数
export function createMessageDeque(maxSize: number = 5): MessageDeque {
  return new MessageDeque(maxSize);
}

// 创建API请求消息数组（包含系统消息）
export function createRequestMessages(deque: MessageDeque, systemMessage: IMessage | null): IMessage[] {
  const messages = deque.toArray();
  return systemMessage ? [systemMessage, ...messages] : messages;
}

// 消息数组类型（为了保持兼容性）
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