import { Message } from "wechaty";
import { MessageType } from "../types/message";
import { ICozeBotMessageHandler } from "../interfaces/bot";

export interface MessageClassification {
  shouldSendToModel: boolean;
  shouldSendWelcome: boolean;
  isGroupMessage: boolean;
  messageType: MessageType;
  content: string;
  triggerText: string | null;
}

export class MessageClassifier {
  constructor(private bot: ICozeBotMessageHandler) {}

  classify(message: Message): MessageClassification {
    const type = message.type();
    const text = message.text();
    const room = message.room();

    return {
      shouldSendToModel: this.bot.shouldSendToModel(type, text),
      shouldSendWelcome: this.bot.shouldSendWelcomeMessage(type, text),
      isGroupMessage: !!room,
      messageType: type,
      content: text,
      triggerText: this.getTriggerText(text, !room)
    };
  }

  private getTriggerText(text: string, isPrivateChat: boolean): string | null {
    if (isPrivateChat) {
      return text;  // 私聊直接返回
    }
    
    // 群聊检查@和关键词
    if (this.bot.isMentioned(text)) {
      return this.bot.extractContent(text);
    }
    
    // 特殊关键词触发
    if (this.bot.hasKeyword(text)) {
      return "恭喜发财！介绍一下自己，你有什么能力";
    }
    
    return null;
  }
} 