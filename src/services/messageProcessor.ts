import { Message } from "wechaty";
import { ICozeBotMessageHandler } from "../interfaces/bot.js";
import { types, log } from "wechaty-puppet";

export class MessageProcessor {
  constructor(private bot: ICozeBotMessageHandler) {}

  public async processMessage(message: Message): Promise<void> {
    try {
      const talker = message.talker();
      const messageType = message.type();
      const room = message.room();
      
      // 对于图片消息，保存图片但不发送给模型
      if (messageType === types.Message.Image) {
        try {
          log.info('MessageProcessor', '开始处理图片消息');
          
          // 保存图片消息到日志文件
          if (room) {
            await this.bot.saveMessage(message);
            log.info('MessageProcessor', '群聊图片消息已保存到日志');
          } else {
            await this.bot.saveMessage(message);
            log.info('MessageProcessor', '私聊图片消息已保存到日志');
          }
          
          // 图片消息不需要进一步处理
          return;
          
        } catch (e) {
          log.error('MessageProcessor', '处理图片消息失败:', e);
          return;
        }
      }

      // 获取消息内容（非图片消息）
      let text = message.text();

      // 检查是否应该发送给模型（非图片消息）
      if (!this.bot.shouldSendToModel(messageType, text)) {
        log.info('MessageProcessor', '消息不需要发送给模型');
        return;
      }

      // 群聊消息处理
      if (room) {
        const name = talker.name();
        
        // 检查是否@机器人或包含关键词
        if (this.bot.isMentioned(text) || this.bot.hasKeyword(text)) {
          const content = this.bot.extractContent(text);
          log.info('MessageProcessor', `处理群聊消息: ${content}`);
          await this.bot.onGroupMessage(room, content, name);
        } else {
          log.info('MessageProcessor', '群聊消息未@机器人或不包含关键词');
        }
        return;
      }

      // 私聊消息处理
      log.info('MessageProcessor', '处理私聊消息');
      await this.bot.onPrivateMessage(talker, text);
      
    } catch (e) {
      log.error('MessageProcessor', '处理消息失败:', e);
    }
  }
} 