import { Message } from "wechaty";
import { ContactInterface, RoomInterface } from "wechaty/impls";
import { types } from "wechaty-puppet";
import { MessageType } from "../types/message.js";

export interface ICozeBotMessageHandler {
  // 基本属性
  botName: string;
  
  // 消息处理方法
  saveMessage(message: Message): Promise<void>;
  onGroupMessage(room: RoomInterface, text: string, name: string): Promise<void>;
  onPrivateMessage(talker: ContactInterface, text: string): Promise<void>;
  sendWelcomeMessage(room: RoomInterface, names: string[]): Promise<void>;
  
  // 消息判断方法
  shouldSendToModel(messageType: types.Message, text: string): boolean;
  shouldSendWelcomeMessage(messageType: MessageType, text: string): boolean;
  isMentioned(text: string): boolean;
  hasKeyword(text: string): boolean;
  extractContent(text: string): string;
  isNonsense(talker: ContactInterface, messageType: MessageType, text: string): boolean;
} 