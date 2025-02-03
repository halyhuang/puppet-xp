import { Message } from "wechaty";
import { ContactInterface, RoomInterface } from "wechaty/impls";
import { ModelFactory } from './services/modelFactory.js';
import { IModelService, IMessage } from './interfaces/model.js';
import { Config } from "./config.js";
import { log } from 'wechaty-puppet'

enum MessageType {
  Unknown = 0,
  Attachment = 1, // Attach(6),
  Audio = 2, // Audio(1), Voice(34)
  Contact = 3, // ShareCard(42)
  ChatHistory = 4, // ChatHistory(19)
  Emoticon = 5, // Sticker: Emoticon(15), Emoticon(47)
  Image = 6, // Img(2), Image(3)
  Text = 7, // Text(1)
  Location = 8, // Location(48)
  MiniProgram = 9, // MiniProgram(33)
  GroupNote = 10, // GroupNote(53)
  Transfer = 11, // Transfers(2000)
  RedEnvelope = 12, // RedEnvelopes(2001)
  Recalled = 13, // Recalled(10002)
  Url = 14, // Url(5)
  Video = 15, // Video(4), Video(43)
  Post = 16, // Moment, Channel, Tweet, etc
}
export default class CozeBot {
  // chatbot name (WeChat account name)
  botName: string = '';

  // chatbot start time (prevent duplicate response on restart)
  startTime: Date = new Date();

  // self-chat may cause some issue for some WeChat Account
  // please set to true if self-chat cause some errors
  disableSelfChat: boolean = false;

  // chatbot trigger keyword
  cozeTriggerKeyword: string = Config.cozeTriggerKeyword;

  // Coze error response
  cozeErrorMessage: string = '🤖️：AI智能体摆烂了，请稍后再试～';

  // Coze system content configuration (guided by OpenAI official document)
  currentDate: string = new Date().toISOString().split('T')[0] || '';

  // message size for a single reply by the bot
  SINGLE_MESSAGE_MAX_SIZE: number = 800;

  private modelService: IModelService;
  
  constructor() {
    this.modelService = ModelFactory.createModel(Config.modelConfig);
    this.startTime = new Date();
  }

  // set bot name during login stage
  setBotName(botName: string) {
    this.botName = botName;
  }

  // get trigger keyword in group chat: (@Name <keyword>)
  // in group chat, replace the special character after "@username" to space
  // to prevent cross-platfrom mention issue
  private get chatGroupTriggerKeyword(): string {
    return `@${this.botName} ${this.cozeTriggerKeyword || ''}`;
  }

  // configure API with model API keys and run an initial test
  async startCozeBot() {
    try {
      // Hint user the trigger keyword in private chat and group chat
      console.log(`🤖️ Coze name is: ${this.botName}`);
      console.log(`🎯 Trigger keyword in private chat is: ${this.cozeTriggerKeyword}`);
      console.log(`🎯 Trigger keyword in group chat is: ${this.chatGroupTriggerKeyword}`);
      // Run an initial test to confirm API works fine
      // await this.onChat("Say Hello World");
      console.log(`✅ Coze starts success, ready to handle message!`);
    } catch (e) {
      console.error(`❌ ${e}`);
    }
  }

  // 添加字符集检测函数
  private isUtf8mb4(str: string): boolean {
    return /[\u{10000}-\u{10FFFF}]/u.test(str)
  }

  // 添加字符集处理函数
  private handleUtf8mb4Text(text: string): string {
    if (!text) return text
    
    // 检测是否包含 utf8mb4 字符
    const hasUtf8mb4 = this.isUtf8mb4(text)
    if (hasUtf8mb4) {
      console.log('检测到 utf8mb4 字符')
    }
    return text
  }

  // check whether Coze bot can be triggered
  private async triggerCozeMessage(text: string, isPrivateChat: boolean = false): Promise<string> {
    let returnText = '';
    let triggered = false;
    if (isPrivateChat) {
      returnText = text;
    } else {
      // 群聊中检查@触发
      const textMention = `@${this.botName}`;
      const startsWithMention = text.startsWith(textMention);
      const endsWithMention = text.endsWith(textMention);

      if (startsWithMention) {
        // 处理开头@的情况
        const textWithoutMention = text.slice(textMention.length).trim();
        if (textWithoutMention) {
          triggered = true;
          returnText = textWithoutMention;
        }
      } else if (endsWithMention) {
        // 处理结尾@的情况
        const textWithoutMention = text.slice(0, -textMention.length).trim();
        if (textWithoutMention) {
          triggered = true;
          returnText = textWithoutMention;
        }
      }
      // 保留特殊关键词触发
      else if (text.includes('恭喜发财')) { 
          triggered = true;
          returnText = "恭喜发财！介绍一下自己，你有什么能力";
      }
    }
    
    if (triggered) {
      console.log(`🎯 Coze triggered: ${returnText}`);
    }
    return returnText;
  }

  // filter out the message that does not need to be processed
  private isNonsense(talker: ContactInterface, messageType: MessageType, text: string): boolean {
    return (
      (this.disableSelfChat && talker.self()) ||
      ![MessageType.Text, MessageType.Url].includes(messageType) ||
      // 虽然可能误伤，但是更全面地过滤
      talker.name().includes('微信') ||
      // video or voice reminder
      text.includes('收到一条视频/语音聊天消息，请在手机上查看') ||
      // red pocket reminder
      text.includes('收到红包，请在手机上查看') ||
      // location information
      text.includes('/cgi-bin/mmwebwx-bin/webwxgetpubliclinkimg')
    );
  }

  // create messages for Coze API request
  private createMessages(text: string): IMessage[] {
    const messages = [
      {
        role: 'user' as const,
        content: text,
        content_type: 'text' as const,
      },
    ];
    return messages;
  }

  // send question to Coze with OpenAI API and get answer
  async onChat(text: string, name: string): Promise<string> {
    if (!name) {
      log.warn('CozeBot', 'Missing user name, using default')
      name = 'default_user'
    }
    
    // 创建消息格式
    const inputMessages = this.createMessages(text);
    try {
      // 调用主模型服务
      const response = await this.modelService.chat(inputMessages, name);
      console.log(`🤖️ AI says: ${response.message}`);
      return response.message || this.cozeErrorMessage;
    } catch (e) {
      console.error(`❌ ${e}`);
      // 如果主模型失败且配置了备用模型，尝试使用备用模型
      if (Config.fallbackModel) {
        try {
          const fallbackService = ModelFactory.createModel(Config.fallbackModel);
          const response = await fallbackService.chat(inputMessages, name);
          return response.message || this.cozeErrorMessage;
        } catch (fallbackError) {
          console.error('Fallback model failed:', fallbackError);
        }
      }
      return this.cozeErrorMessage;
    }
  }

  // reply with the segmented messages from a single-long message
  private async reply(talker: RoomInterface | ContactInterface, message: string): Promise<void> {
    // 添加 utf8mb4 处理
    message = this.handleUtf8mb4Text(message)
    
    const messages: Array<string> = [];
    while (message.length > this.SINGLE_MESSAGE_MAX_SIZE) {
      messages.push(message.slice(0, this.SINGLE_MESSAGE_MAX_SIZE));
      message = message.slice(this.SINGLE_MESSAGE_MAX_SIZE);
    }
    messages.push(message);
    
    for (const msg of messages) {
      await talker.say(msg);
    }
  }

  // reply to private message
  private async onPrivateMessage(talker: ContactInterface, text: string, name: string) {
    try {
      // 确保用户标识符不为空
      if (!name) {
        name = talker.id || 'unknown_user';
      }

      const chatgptReplyMessage = await this.onChat(text, name);
      if (!chatgptReplyMessage) {
        return;
      }

      await this.reply(talker, chatgptReplyMessage);
    } catch (e) {
      log.error('CozeBot', 'Failed to handle private message:', e);
    }
  }

  // reply to group message
  private async onGroupMessage(room: RoomInterface, text: string, name: string) {
    try {
      // 确保用户标识符不为空
      if (!name) {
        name = room.id || 'unknown_room';
      }

      const chatgptReplyMessage = await this.onChat(text, name);
      if (!chatgptReplyMessage) {
        return;
      }

      const wholeReplyMessage = `${text}\n----------\n${chatgptReplyMessage}`;
      await this.reply(room, wholeReplyMessage);
    } catch (e) {
      log.error('CozeBot', 'Failed to handle group message:', e);
    }
  }

  // Check if the talker is in the blacklist
  private isBlacklisted(talkerName: string): boolean {
    return !!Config.blacklist && Config.blacklist.includes(talkerName);
  }

  // receive a message (main entry)
  async onMessage(message: Message) {
    const talker = message.talker();
    const rawText = message.text();
    const room = message.room();
    const isPrivateChat = !room;

    // 检查黑名单和消息有效性
    if (this.isBlacklisted(talker.name()) || 
        this.isNonsense(talker, message.type(), rawText)) {
      return;
    }
    
    const text = await this.triggerCozeMessage(rawText, isPrivateChat);
    if (text.length > 0) {
      // 获取发送者名称，确保不为空
      let name = talker.name();
      const talkerId = talker.id;

      // 如果是群聊，尝试获取群内昵称
      if (room) {
        try {
          const alias = await room.alias(talker);
          if (alias) {
            name = alias;
          }
        } catch (e) {
          log.warn('CozeBot', 'Failed to get room alias:', e);
        }
      }

      // 确保用户标识符不为空
      if (!name || !talkerId) {
        log.warn('CozeBot', 'Missing user info, using fallback', {
          name,
          talkerId,
          roomId: room?.id,
        });
        name = talkerId || 'unknown_user';
      }

      // 根据是私聊还是群聊分别处理
      if (isPrivateChat) {
        return await this.onPrivateMessage(talker, text, name);
      } else {
        return await this.onGroupMessage(room, text, name);
      }
    }

    // 检查发送者ID是否存在
    if (!talker.id) {
      log.warn('CozeBot', 'Missing talker ID in message:', {
        messageType: message.type(),
        messageId: message.id,
        text: rawText,
        roomId: room?.id || '',
        talkerName: talker.name(),
      })
    }
  }
}
