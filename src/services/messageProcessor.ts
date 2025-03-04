import { Message } from "wechaty";
import { RoomInterface } from "wechaty/impls";
import { ICozeBotMessageHandler } from "../interfaces/bot.js";
import { MessageClassifier } from "./messageClassifier.js";

export class MessageProcessor {
  private messageClassifier: MessageClassifier;

  constructor(private bot: ICozeBotMessageHandler) {
    this.messageClassifier = new MessageClassifier(bot);
  }

  async processMessage(message: Message): Promise<void> {
    const classification = this.messageClassifier.classify(message);
    const room = message.room();
    const talker = message.talker();

    // 1. 保存消息
    await this.bot.saveMessage(message);

    // 2. 处理欢迎消息
    if (classification.shouldSendWelcome && room) {
      await this.handleWelcomeMessage(room, classification.content);
      return;
    }

    // 3. 处理需要发送给模型的消息
    if (classification.shouldSendToModel && classification.triggerText) {
      if (room) {
        await this.bot.onGroupMessage(room, classification.triggerText, talker.name());
      } else {
        await this.bot.onPrivateMessage(talker, classification.triggerText);
      }
    }
  }

  private async handleWelcomeMessage(room: RoomInterface, text: string): Promise<void> {
    const memberName = await this.extractMemberName(text);
    if (memberName) {
      await this.bot.sendWelcomeMessage(room, [memberName]);
    }
  }

  private async extractMemberName(text: string): Promise<string | null> {
    const patterns = [
      /"(.+)"通过扫描/,
      /"(.+)"通过扫码/,
      /\"(.+)\"通过/,
      /(.+)通过扫描/,
      /(.+)通过扫码/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }
} 