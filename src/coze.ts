import type { Message } from "wechaty";
import { ContactInterface, RoomInterface } from "wechaty/impls";
import { ModelFactory } from './services/modelFactory.js';
import type { IModelService, IMessage } from './interfaces/model.js';
import { Config } from "./config.js";
import { log } from 'wechaty-puppet';
import * as fs from 'fs';
import * as path from 'path';
import { Wechaty } from 'wechaty';

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

/** 
 * CozeBot - Wechaty Coze Bot Implementation
 * @description 基于 Wechaty 的 Coze 机器人实现
 */
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
  
  // 存储用户历史消息
  private messageHistory: Map<string, IMessage[]> = new Map();
  
  // 历史消息的最大条数
  private readonly MAX_HISTORY_LENGTH = 10;
  
  // 清理超时的历史记录（默认30分钟）
  private readonly HISTORY_TIMEOUT = 30 * 60 * 1000;
  
  // 记录最后活动时间
  private lastActiveTime: Map<string, number> = new Map();

  // 历史消息文件存储目录
  private readonly HISTORY_DIR = 'chat_history';
  
  // 文件同步间隔（5分钟）
  private readonly SYNC_INTERVAL = 5 * 60 * 1000;

  // 定时任务的目标群聊ID
  private readonly TARGET_ROOM_ID = '49030987852@chatroom';
  
  // 定时任务的消息内容
  private readonly DAILY_MESSAGE = '深圳梧山，新的一天开始了';

  // 保存定时器引用
  private scheduleTimer: NodeJS.Timeout | null = null;

  constructor(private readonly bot: Wechaty) {
    this.modelService = ModelFactory.createModel(Config.modelConfig);
    this.startTime = new Date();
    
    // 创建历史记录目录
    if (!fs.existsSync(this.HISTORY_DIR)) {
      fs.mkdirSync(this.HISTORY_DIR, { recursive: true });
    }
    
    // 加载历史消息
    this.loadHistoryFromFiles();
    
    // 定期清理过期的历史记录
    setInterval(() => this.cleanExpiredHistory(), this.HISTORY_TIMEOUT);
    
    // 定期同步历史记录到文件
    setInterval(() => this.syncHistoryToFiles(), this.SYNC_INTERVAL);

    // 启动定时任务
    this.scheduleDailyMessage();
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

  // 从文件加载历史消息
  private loadHistoryFromFiles(): void {
    try {
      const files = fs.readdirSync(this.HISTORY_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const userId = file.replace('.json', '');
          const filePath = path.join(this.HISTORY_DIR, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          try {
            const data = JSON.parse(content);
            if (data.messages && Array.isArray(data.messages)) {
              this.messageHistory.set(userId, data.messages);
              this.lastActiveTime.set(userId, data.lastActiveTime || Date.now());
            }
          } catch (e) {
            log.error('CozeBot', `Failed to parse history file ${file}:`, e);
          }
        }
      }
      log.info('CozeBot', `Loaded history for ${this.messageHistory.size} users`);
    } catch (e) {
      log.error('CozeBot', 'Failed to load history files:', e);
    }
  }

  // 同步历史记录到文件
  private syncHistoryToFiles(): void {
    try {
      for (const [userId, messages] of this.messageHistory.entries()) {
        const lastActiveTime = this.lastActiveTime.get(userId) || Date.now();
        const filePath = path.join(this.HISTORY_DIR, `${userId}.json`);
        const data = {
          userId,
          messages,
          lastActiveTime,
          lastSync: Date.now()
        };
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      }
      log.info('CozeBot', `Synced history for ${this.messageHistory.size} users`);
    } catch (e) {
      log.error('CozeBot', 'Failed to sync history to files:', e);
    }
  }

  // 清理过期的历史记录（同时清理文件）
  private cleanExpiredHistory(): void {
    const now = Date.now();
    for (const [userId, lastTime] of this.lastActiveTime.entries()) {
      if (now - lastTime > this.HISTORY_TIMEOUT) {
        this.messageHistory.delete(userId);
        this.lastActiveTime.delete(userId);
        
        // 删除过期的历史文件
        try {
          const filePath = path.join(this.HISTORY_DIR, `${userId}.json`);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          log.error('CozeBot', `Failed to delete expired history file for ${userId}:`, e);
        }
      }
    }
  }

  // create messages for Coze API request
  private createMessages(text: string, userId: string): IMessage[] {
    // 获取历史消息
    const history = this.messageHistory.get(userId) || [];
    
    // 创建新消息
    const newMessage: IMessage = {
      role: 'user',
      content: text,
      content_type: 'text',
    };

    // 更新历史消息
    const updatedHistory = [...history, newMessage];
    
    // 如果超过最大长度，只保留最近的消息
    const trimmedHistory = updatedHistory.slice(-this.MAX_HISTORY_LENGTH);
    
    // 更新存储
    this.messageHistory.set(userId, trimmedHistory);
    this.lastActiveTime.set(userId, Date.now());
    
    return trimmedHistory;
  }

  // 添加AI回复到历史记录（同时触发文件同步）
  private async addAssistantMessageToHistory(userId: string, content: string): Promise<void> {
    const history = this.messageHistory.get(userId) || [];
    const assistantMessage: IMessage = {
      role: 'assistant',
      content: content,
      content_type: 'text',
    };
    
    const updatedHistory = [...history, assistantMessage];
    const trimmedHistory = updatedHistory.slice(-this.MAX_HISTORY_LENGTH);
    this.messageHistory.set(userId, trimmedHistory);
    this.lastActiveTime.set(userId, Date.now());
    
    // 立即同步到文件
    try {
      const filePath = path.join(this.HISTORY_DIR, `${userId}.json`);
      const data = {
        userId,
        messages: trimmedHistory,
        lastActiveTime: Date.now(),
        lastSync: Date.now()
      };
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      log.error('CozeBot', `Failed to sync history file for ${userId}:`, e);
    }
  }

  // send question to Coze with OpenAI API and get answer
  async onChat(text: string, userId: string): Promise<string> {
    if (!userId) {
      log.warn('CozeBot', 'Missing user id, using default')
      userId = 'default_user'
    }
    
    // 创建包含历史消息的请求
    const inputMessages = this.createMessages(text, userId);
    try {
      // 调用主模型服务
      const response = await this.modelService.chat(inputMessages, userId);
      console.log(`🤖️ AI says: ${response.message}`);
      
      // 将AI的回复添加到历史记录
      if (response.message) {
        await this.addAssistantMessageToHistory(userId, response.message);
      }
      
      return response.message || this.cozeErrorMessage;
    } catch (e) {
      console.error(`❌ ${e}`);
      if (Config.fallbackModel) {
        try {
          const fallbackService = ModelFactory.createModel(Config.fallbackModel);
          const response = await fallbackService.chat(inputMessages, userId);
          if (response.message) {
            await this.addAssistantMessageToHistory(userId, response.message);
          }
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
      // 添加延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      await talker.say(msg);
    }
  }

  // reply to private message
  private async onPrivateMessage(talker: ContactInterface, text: string) {
    try {
      // 使用 talker.id 作为唯一标识
      const userId = `private_${talker.id || talker.name() || 'unknown'}`;

      const chatgptReplyMessage = await this.onChat(text, userId);
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
      // 添加更详细的room对象信息日志
      const roomInfo = {
        roomId: room.id,
        isReady: room.isReady,
        memberCount: (await room.memberAll()).length,
        roomType: room.toString(),
      };
      log.info('CozeBot', '[正常群聊] Room详细信息: ' + JSON.stringify(roomInfo, null, 2));

      // 使用 room.id + talker.id 作为唯一标识
      const userId = `group_${room.id}_user_${name}`;

      const chatgptReplyMessage = await this.onChat(text, userId);
      if (!chatgptReplyMessage) {
        return;
      }

      const wholeReplyMessage = `${text}\n----------\n${chatgptReplyMessage}`;
      const sendInfo = {
        roomId: room.id,
        messageLength: wholeReplyMessage.length,
        isReady: room.isReady,
      };
      log.info('CozeBot', '[正常群聊] 准备发送回复，Room状态: ' + JSON.stringify(sendInfo, null, 2));
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
  async onMessage(msg: Message) {
    const talker = msg.talker();
    const rawText = msg.text();
    const room = msg.room();
    const isPrivateChat = !room;

    // 检查黑名单和消息有效性
    if (this.isBlacklisted(talker.name()) || 
        this.isNonsense(talker, msg.type(), rawText)) {
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
        await this.onPrivateMessage(talker, text);
      } else if (room) {
        await this.onGroupMessage(room, text, name);
      }
    }

    // 检查发送者ID是否存在
    if (!talker.id) {
      log.warn('CozeBot', 'Missing talker ID in message:', {
        messageType: msg.type(),
        messageId: msg.id,
        text: rawText,
        roomId: room?.id || '',
        talkerName: talker.name(),
      });
    }
  }

  // 设置定时任务
  private scheduleDailyMessage(): void {
    const scheduleMessage = async () => {
      try {
        log.info('CozeBot', `开始执行定时任务，当前时间: ${new Date().toLocaleString()}`);
        
        // 检查机器人是否在线
        if (!this.bot.isLoggedIn) {
          log.error('CozeBot', '机器人未登录，无法发送消息');
          return;
        }

        const room = await this.bot.Room.find({ id: this.TARGET_ROOM_ID });
        
        // 添加更详细的定时任务room对象信息日志
        if (room) {
          const roomInfo = {
            roomId: room.id,
            isReady: room.isReady,
            memberCount: (await room.memberAll()).length,
            roomType: room.toString(),
          };
          log.info('CozeBot', '[定时任务] Room详细信息: ' + JSON.stringify(roomInfo, null, 2));
        }

        // 列出所有可用的群聊ID
        const allRooms = await this.bot.Room.findAll();
        log.info('CozeBot', `当前可用群聊数量: ${allRooms.length}`);
        log.info('CozeBot', '所有可用群聊ID:');
        for (const r of allRooms) {
          log.info('CozeBot', `群ID: ${r.id}`);
          if (r.id === this.TARGET_ROOM_ID) {
            log.info('CozeBot', `✅ 找到目标群聊ID: ${r.id}`);
          }
        }

        if (!room) {
          log.error('CozeBot', `未找到目标群聊，ID: ${this.TARGET_ROOM_ID}`);
          return;
        }

        // 使用与正常群聊相同的用户ID构造方式
        const userId = `group_${this.TARGET_ROOM_ID}_schedule`;
        
        // 调用 Coze API 获取回复
        const chatgptReplyMessage = await this.onChat(this.DAILY_MESSAGE, userId);
        if (!chatgptReplyMessage) {
          log.error('CozeBot', 'Coze API 返回空回复');
          return;
        }

        // 构造完整回复消息
        const wholeReplyMessage = `${this.DAILY_MESSAGE}\n----------\n${chatgptReplyMessage}`;
        
        // 再次检查room状态，添加更多信息
        const sendInfo = {
          roomId: room.id,
          isReady: room.isReady,
          messageLength: wholeReplyMessage.length,
          roomType: room.toString(),
          memberCount: (await room.memberAll()).length,
        };
        log.info('CozeBot', '[定时任务] 准备发送消息，Room状态: ' + JSON.stringify(sendInfo, null, 2));

        // 使用与正常群聊相同的发送方式
        await this.reply(room, wholeReplyMessage);
        log.info('CozeBot', '定时消息发送成功');

      } catch (e) {
        log.error('CozeBot', '定时任务执行失败:', e);
      }
    };

    // 计算到今天或明天早上8:00的毫秒数
    const calculateNextTime = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(8, 0, 0, 0);  // 设置为8:00
      
      // 如果当前时间已经过了今天的8:00，就设置为明天的8:00
      if (now >= next) {
        next.setDate(next.getDate() + 1);
      }
      
      return next.getTime() - now.getTime();
    };

    // 设置定时器
    const scheduleNext = () => {
      // 清除之前的定时器
      if (this.scheduleTimer) {
        clearTimeout(this.scheduleTimer);
      }

      const timeUntilNext = calculateNextTime();
      this.scheduleTimer = setTimeout(() => {
        scheduleMessage()  // 执行定时任务
          .then(() => {
            log.info('CozeBot', 'Daily message task completed, scheduling next one');
            scheduleNext();  // 设置下一次执行
          })
          .catch(e => {
            log.error('CozeBot', 'Error in daily message task:', e);
            scheduleNext();  // 即使出错也设置下一次执行
          });
      }, timeUntilNext);

      // 记录下一次执行的时间
      const nextTime = new Date(Date.now() + timeUntilNext);
      log.info('CozeBot', `Daily message scheduled, next message will be sent at: ${nextTime.toLocaleString()}`);
    };

    // 启动定时任务
    scheduleNext();
  }
}

