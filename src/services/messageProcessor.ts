import { Message } from "wechaty";
import { ICozeBotMessageHandler } from "../interfaces/bot.js";
import { types, log } from "wechaty-puppet";

export class MessageProcessor {
  constructor(private bot: ICozeBotMessageHandler) {}

  private isJoinMessage(text: string): boolean {
    // 扫码入群消息模式
    const scanPatterns = [
      /通过扫描.*二维码加入群聊/,
      /通过扫码.*加入群聊/,
      /通过扫描.*分享的二维码加入群聊/
    ];
    
    // 邀请入群消息模式
    const invitePatterns = [
      /邀请.*加入了群聊/,
      /邀请.*加入群聊/
    ];

    // 检查扫码入群
    for (const pattern of scanPatterns) {
      if (pattern.test(text)) {
        log.info('MessageProcessor', `检测到扫码入群消息: ${text}`);
        return true;
      }
    }

    // 检查邀请入群
    for (const pattern of invitePatterns) {
      if (pattern.test(text)) {
        log.info('MessageProcessor', `检测到邀请入群消息: ${text}`);
        return true;
      }
    }

    return false;
  }

  public async processMessage(message: Message): Promise<void> {
    try {
      const talker = message.talker();
      const messageType = message.type();
      const room = message.room();
      const text = message.text();
      
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

      // 检查是否应该发送给模型（非图片消息）
      if (!this.bot.shouldSendToModel(messageType, text)) {
        log.info('MessageProcessor', '消息不需要发送给模型');
        return;
      }

      // 群聊消息处理
      if (room) {
        const name = talker.name();
        
        // 处理群通知消息（如入群消息）
        if (messageType === types.Message.GroupNote) {
          if (this.isJoinMessage(text)) {
            log.info('MessageProcessor', '检测到入群消息，将发送给模型:', text);
            await this.bot.onGroupMessage(room, text, name);
            return;
          }
        }
        
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