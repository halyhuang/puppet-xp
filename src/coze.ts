import type { Message } from "wechaty";
import { ContactInterface, RoomInterface } from "wechaty/impls";
import { ModelFactory } from './services/modelFactory.js';
import type { IModelService, IMessage, MessageRole, MessageList } from './interfaces/model.js';
import { Config } from "./config.js";
import { log } from 'wechaty-puppet';
import * as fs from 'fs';
import * as path from 'path';
import { Wechaty } from 'wechaty';
import { MessageType } from './types/message.js';
import { ICozeBotMessageHandler } from './interfaces/bot.js';
import { MessageProcessor } from './services/messageProcessor.js';

/** 
 * CozeBot - Wechaty Coze Bot Implementation
 * @description 基于 Wechaty 的 Coze 机器人实现
 */
export class CozeBot implements ICozeBotMessageHandler {
  // chatbot name (WeChat account name)
  public botName: string = '';

  // chatbot start time (prevent duplicate response on restart)
  public startTime: Date = new Date();

  // self-chat may cause some issue for some WeChat Account
  // please set to true if self-chat cause some errors
  public disableSelfChat: boolean = false;

  // chatbot trigger keyword
  private cozeTriggerKeyword: string = Config.cozeTriggerKeyword;

  // Coze error response
  private cozeErrorMessage: string = '🤖️：AI智能体摆烂了，请稍后再试～';

  // message size for a single reply by the bot
  private SINGLE_MESSAGE_MAX_SIZE: number = 800;

  private modelService: IModelService;
  
  // 存储用户历史消息
  private messageHistory: Map<string, MessageList> = new Map();
  
  // 历史消息的最大轮数
  private readonly DEFAULT_ROUNDS = 3;  // 保留3轮对话
  private readonly MESSAGES_PER_ROUND = 2;  // 每轮包含1条用户消息和1条助手消息
  
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
  private readonly DAILY_MESSAGE = '深圳梧桐山，新的一天开始了';

  // 保存定时器引用
  private scheduleTimer: NodeJS.Timeout | null = null;

  // 群聊消息保存目录
  public readonly CHAT_LOGS_DIR = 'chat_logs';
  
  // 多媒体文件保存目录
  public readonly MEDIA_DIR = 'media';

  public readonly WELCOME_MESSAGE_TEMPLATE = '欢迎新成员 {names} 加入群，发现生命之美！';

  // 消息处理器
  public messageProcessor: MessageProcessor;

  constructor(private readonly bot: Wechaty) {
    this.modelService = ModelFactory.createModel(Config.modelConfig);
    this.startTime = new Date();
    
    // 创建历史记录目录
    if (!fs.existsSync(this.HISTORY_DIR)) {
      fs.mkdirSync(this.HISTORY_DIR, { recursive: true });
    }
    
    // 创建群聊消息保存目录
    if (!fs.existsSync(this.CHAT_LOGS_DIR)) {
      fs.mkdirSync(this.CHAT_LOGS_DIR, { recursive: true });
    }

    // 创建多媒体文件保存目录
    if (!fs.existsSync(this.MEDIA_DIR)) {
      fs.mkdirSync(this.MEDIA_DIR, { recursive: true });
    }
    
    // 加载历史消息（异步操作）
    this.loadHistoryFromFiles().catch(e => {
      log.error('CozeBot', '加载历史消息失败:', e);
    });
    
    // 定期清理过期的历史记录
    setInterval(() => this.cleanExpiredHistory(), this.HISTORY_TIMEOUT);
    
    // 定期同步历史记录到文件
    setInterval(() => this.syncHistoryToFiles(), this.SYNC_INTERVAL);

    // 启动定时任务
    this.scheduleDailyMessage();

    // 监听群成员加入事件
    this.bot.on('room-join', async (room, inviteeList, inviter) => {
      try {
        // 记录详细的事件信息
        log.info('CozeBot', '收到room-join事件:', {
          roomId: room?.id,
          roomTopic: await room?.topic(),
          inviteeCount: inviteeList?.length,
          inviteeList: inviteeList?.map(c => ({
            id: c?.id,
            name: c?.name(),
            isReady: c?.isReady(),
          })),
          inviter: inviter ? {
            id: inviter.id,
            name: inviter.name(),
          } : 'null (可能是扫码入群)',
        });

        // 检查room是否有效
        if (!room || !room.isReady) {
          log.error('CozeBot', '无效的room对象:', {
            room: room ? 'exists' : 'null',
            isReady: room?.isReady,
          });
          return;
        }

        // 检查是否是目标群聊
        if (!Config.welcomeRoomIds.includes(room.id)) {
          log.info('CozeBot', `群 ${room.id} 不在欢迎语目标群列表中，跳过欢迎`);
          return;
        }

        // 检查inviteeList
        if (!inviteeList || inviteeList.length === 0) {
          log.error('CozeBot', '无效的inviteeList:', {
            exists: !!inviteeList,
            length: inviteeList?.length,
          });
          return;
        }

        // 获取新成员名称列表
        const newMemberNames = await Promise.all(
          inviteeList.map(async (contact, index) => {
            try {
              // 记录每个contact的详细信息
              log.info('CozeBot', `处理第${index + 1}个新成员:`, {
                contactId: contact?.id,
                contactName: contact?.name(),
                isReady: contact?.isReady(),
              });

              if (!contact || !contact.isReady) {
                log.warn('CozeBot', `第${index + 1}个新成员的contact对象无效`);
                return '新朋友';
              }

              // 尝试获取群昵称
              let alias;
              try {
                alias = await room.alias(contact);
                log.info('CozeBot', `获取群昵称结果: ${alias || 'null'}`);
              } catch (e) {
                log.warn('CozeBot', '获取群昵称失败:', e);
              }
              if (alias) return alias;

              // 尝试获取备注名
              let alias2;
              try {
                alias2 = await contact.alias();
                log.info('CozeBot', `获取备注名结果: ${alias2 || 'null'}`);
              } catch (e) {
                log.warn('CozeBot', '获取备注名失败:', e);
              }
              if (alias2) return alias2;

              // 获取微信名
              const name = contact.name();
              log.info('CozeBot', `使用微信名: ${name}`);
              return name || '新朋友';
            } catch (e) {
              log.error('CozeBot', `获取成员${index + 1}的名称失败:`, e);
              return '新朋友';
            }
          })
        );

        // 记录最终获取到的名称列表
        log.info('CozeBot', '最终获取到的新成员名称列表:', newMemberNames);

        // 记录入群信息
        const inviterInfo = inviter ? 
          `被 ${await this.getMemberDisplayName(room, inviter)} 邀请` : 
          '通过扫码';
        
        const logMessage = `新成员 ${newMemberNames.join('、')} ${inviterInfo}加入群聊`;
        log.info('CozeBot', logMessage);
        
        // 发送欢迎消息前记录状态
        log.info('CozeBot', '准备发送欢迎消息:', {
          roomId: room.id,
          roomTopic: await room.topic(),
          memberCount: (await room.memberAll()).length,
          newMembers: newMemberNames,
        });

        // 使用 sendWelcomeMessage 方法发送欢迎消息
        await this.sendWelcomeMessage(room, newMemberNames);
        
      } catch (e) {
        log.error('CozeBot', '处理新成员加入事件失败:', e);
        // 记录更详细的错误信息
        if (e instanceof Error) {
          log.error('CozeBot', {
            error: e.message,
            stack: e.stack,
            roomId: room?.id,
            inviteeCount: inviteeList?.length,
          });
        }
      }
    });

    // 初始化消息处理器
    this.messageProcessor = new MessageProcessor(this);
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

  // 将私有方法改为公共方法
  public shouldSendToModel(messageType: MessageType, text: string): boolean {
    log.info('CozeBot', `正在判断是否发送给模型 - 类型: ${MessageType[messageType]}, 内容: ${text}`);

    if (messageType === MessageType.Text) {
      log.info('CozeBot', `普通文本消息，将发送给模型: ${text}`);
      return true;
    }

    if (messageType === MessageType.GroupNote) {
      const isValid = this.isValidJoinMessage(text);
      if (isValid) {
        log.info('CozeBot', `入群消息，将发送给模型: ${text}`);
        return true;
      }
      log.info('CozeBot', `其他群通知消息，不发送给模型: ${text}`);
      return false;
    }

    log.info('CozeBot', `其他类型消息，不发送给模型: ${MessageType[messageType]}`);
    return false;
  }

  public shouldSendWelcomeMessage(messageType: MessageType, text: string): boolean {
    log.info('CozeBot', `正在判断是否发送欢迎消息 - 类型: ${MessageType[messageType]}, 内容: ${text}`);

    if (messageType !== MessageType.GroupNote) {
      log.info('CozeBot', `非群通知消息，不发送欢迎语: ${MessageType[messageType]}`);
      return false;
    }

    const isValid = this.isValidJoinMessage(text);
    if (isValid) {
      log.info('CozeBot', `入群消息，发送欢迎语: ${text}`);
      return true;
    }

    log.info('CozeBot', `非入群消息，不发送欢迎语: ${text}`);
    return false;
  }

  // 从文件加载历史消息
  private async loadHistoryFromFiles(): Promise<void> {
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
              // 按时间戳排序确保消息顺序正确
              const sortedMessages = data.messages.sort((a: IMessage, b: IMessage) => a.created - b.created);
              
              // 计算需要保留的消息数量
              const maxMessages = this.DEFAULT_ROUNDS * this.MESSAGES_PER_ROUND;  // 3轮 * 2条/轮 = 6条消息
              
              // 如果消息数量超过最大轮数，只保留最近的消息
              const recentMessages = sortedMessages.length > maxMessages 
                ? sortedMessages.slice(-maxMessages) 
                : sortedMessages;
              
              // 按时间顺序逐条添加消息到历史记录中
              for (const message of recentMessages) {
                if (message.role === 'user') {
                  await this.addUserMessageToHistory(userId, message.content);
                } else if (message.role === 'assistant') {
                  await this.addAssistantMessageToHistory(userId, message.content);
                }
              }
              
              // 更新最后活动时间
              this.lastActiveTime.set(userId, data.lastActiveTime || Date.now());
              log.info('CozeBot', `成功加载用户 ${userId} 的历史消息，保留了最近 ${recentMessages.length} 条消息`);
            }
          } catch (e) {
            log.error('CozeBot', `解析历史文件 ${file} 失败:`, e);
          }
        }
      }
      log.info('CozeBot', `共加载了 ${this.messageHistory.size} 个用户的历史记录`);
    } catch (e) {
      log.error('CozeBot', '加载历史文件失败:', e);
    }
  }

  // 同步历史记录到文件
  private async syncHistoryToFiles(): Promise<void> {
    try {
      const writePromises = [];
      for (const [userId, messages] of this.messageHistory.entries()) {
        const lastActiveTime = this.lastActiveTime.get(userId) || Date.now();
        const filePath = path.join(this.HISTORY_DIR, `${userId}.json`);
        const data = {
          userId,
          messages,
          lastActiveTime,
          lastSync: Date.now()
        };
        
        // 使用异步写入并收集所有 Promise
        const writePromise = fs.promises.writeFile(
          filePath, 
          JSON.stringify(data, null, 2), 
          'utf-8'
        ).catch(error => {
          log.error('CozeBot', `Failed to sync history file for ${userId}:`, error);
        });
        
        writePromises.push(writePromise);
      }
      
      // 等待所有写入操作完成
      await Promise.all(writePromises);
      log.info('CozeBot', `Synced history for ${this.messageHistory.size} users`);
    } catch (e) {
      log.error('CozeBot', 'Failed to sync history to files:', e);
    }
  }

  // 清理过期的历史记录（同时清理文件和锁）
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

  // 同步单个用户的历史消息到文件
  private async syncUserHistoryToFile(userId: string, messages: MessageList): Promise<void> {
    try {
      const filePath = path.join(this.HISTORY_DIR, `${userId}.json`);
      const data = {
        userId,
        messages,
        lastActiveTime: this.lastActiveTime.get(userId),
        lastSync: Date.now()
      };
      
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      log.info('CozeBot', `用户 ${userId} 的历史消息已同步到文件`);
    } catch (error) {
      log.error('CozeBot', `同步历史消息到文件失败: ${error}`);
    }
  }

  // 添加消息到历史记录并进行必要的处理
  private async addMessageToHistory(userId: string, message: IMessage): Promise<MessageList> {
    const messages = this.messageHistory.get(userId) || [];
    messages.push(message);

    // 按时间戳排序确保顺序正确
    const sortedMessages = messages.sort((a, b) => a.created - b.created);
    
    // 计算需要保留的消息数量
    const maxMessages = this.DEFAULT_ROUNDS * this.MESSAGES_PER_ROUND;  // 3轮 * 2条/轮 = 6条消息
    
    // 如果超出最大轮数，删除最早的1轮对话（2条消息）
    if (sortedMessages.length > maxMessages) {
      // 确保从头开始找到一个完整的对话轮次（user消息开始，assistant消息结束）
      let removeIndex = -1;
      for (let i = 0; i < sortedMessages.length - 1; i++) {
        const currentMsg = sortedMessages[i];
        const nextMsg = sortedMessages[i + 1];
        if (currentMsg?.role === 'user' && nextMsg?.role === 'assistant') {
          removeIndex = i;
          break;
        }
      }
      
      if (removeIndex >= 0) {
        // 删除一轮完整对话（2条消息）
        sortedMessages.splice(removeIndex, this.MESSAGES_PER_ROUND);
        log.info('CozeBot', `用户 ${userId} 的历史消息超出限制，已删除最早的一轮对话`);
      } else {
        log.warn('CozeBot', `用户 ${userId} 的历史消息中未找到完整的对话轮次`);
      }
    }
    
    // 验证消息列表的完整性
    let isValid = true;
    for (let i = 0; i < sortedMessages.length - 1; i += 2) {
      const currentMsg = sortedMessages[i];
      const nextMsg = sortedMessages[i + 1];
      if (!currentMsg || !nextMsg || currentMsg.role !== 'user' || nextMsg.role !== 'assistant') {
        isValid = false;
        break;
      }
    }
    
    if (!isValid) {
      log.warn('CozeBot', `用户 ${userId} 的历史消息顺序异常，可能影响对话质量`);
    }
    
    this.messageHistory.set(userId, sortedMessages);
    this.lastActiveTime.set(userId, Date.now());
    
    // 立即同步到文件
    await this.syncUserHistoryToFile(userId, sortedMessages);
    
    return sortedMessages;
  }

  // 创建新消息对象
  private createMessage(role: MessageRole, content: string): IMessage {
    return {
      role,
      content,
      content_type: 'text',
      created: Date.now(),
      createdAt: new Date().toLocaleString()
    };
  }

  // 添加用户消息到历史记录
  private async addUserMessageToHistory(userId: string, text: string): Promise<MessageList> {
    const messages = this.messageHistory.get(userId) || [];
    
    // 创建新的用户消息
    const userMessage = this.createMessage('user', text);
    
    // 检查最后一条消息是否为用户消息
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      // 如果最后一条是用户消息，则覆盖它
      messages[messages.length - 1] = userMessage;
      this.messageHistory.set(userId, messages);
      log.info('CozeBot', `覆盖了用户 ${userId} 的上一条用户消息`);
      return messages;
    }
    
    // 如果不是用户消息，则添加新消息到历史记录
    return this.addMessageToHistory(userId, userMessage);
  }

  // 添加AI回复到历史记录
  private async addAssistantMessageToHistory(userId: string, content: string): Promise<void> {
    const messages = this.messageHistory.get(userId) || [];
    
    // 检查最后一条消息是否为用户消息
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      log.warn('CozeBot', 'Cannot add assistant message - last message is not from user');
      return;
    }

    // 创建助手消息
    const assistantMessage = this.createMessage('assistant', content);
    
    // 添加到历史记录
    await this.addMessageToHistory(userId, assistantMessage);
  }

  // send question to Coze with OpenAI API and get answer
  async onChat(text: string, userId: string): Promise<string> {
    if (!userId) {
      log.warn('CozeBot', 'Missing user id, using default')
      userId = 'default_user'
    }
    
    // 创建包含历史消息的请求
    const inputMessages = await this.addUserMessageToHistory(userId, text);
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

  // 分段发送消息到微信
  private async sendSlicedMessages(talker: RoomInterface | ContactInterface, content: string): Promise<void> {
    if (!content) return;
    
    const messages: Array<string> = [];
    let remainingContent = content;
    
    // 按最大长度切分消息
    while (remainingContent.length > this.SINGLE_MESSAGE_MAX_SIZE) {
      messages.push(remainingContent.slice(0, this.SINGLE_MESSAGE_MAX_SIZE));
      remainingContent = remainingContent.slice(this.SINGLE_MESSAGE_MAX_SIZE);
    }
    messages.push(remainingContent);
    
    // 发送每一段内容
    for (const msg of messages) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await talker.say(msg);
    }
  }

  // reply with the segmented messages from a single-long message
  private async reply(talker: RoomInterface | ContactInterface, message: string): Promise<void> {
    // 添加 utf8mb4 处理
    message = this.handleUtf8mb4Text(message);
    
    // 检查是否包含 <think> 标签
    const thinkMatch = message.match(/<think>.*?<\/think>/s);
    if (thinkMatch) {
      // 提取思考内容（保留<think>标签）和实际回复内容
      const thinkContent = thinkMatch[0];  // 使用完整匹配，保留标签
      const actualContent = message.replace(/<think>.*?<\/think>/s, '').trim();
      
      // 先发送思考内容
      if (thinkContent) {
        await this.sendSlicedMessages(talker, thinkContent);
        // 添加短暂延迟，让两条消息有一定间隔
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 再发送实际回复内容
      if (actualContent) {
        await this.sendSlicedMessages(talker, actualContent);
      }
    } else {
      // 如果没有 <think> 标签，直接发送完整消息
      await this.sendSlicedMessages(talker, message);
    }
  }

  // 基础消息保存方法
  private async saveMessageBase(
    savePath: string,
    message: string | Message,
    baseEntry: any
  ): Promise<void> {
    try {
      // 构造消息记录
      const logEntry = { ...baseEntry };

      // 处理不同类型的消息
      if (typeof message === 'string') {
        // 文本消息
        logEntry.type = 'text';
        logEntry.content = message;
      } else {
        // Message 对象(多媒体消息)
        const msg = message as Message;
        logEntry.type = MessageType[msg.type()];
        logEntry.messageId = msg.id;
        
        // 保存文本内容
        const text = msg.text();
        if (text && text.length > 0) {
          logEntry.text = text;
        }

        // 对于多媒体消息,保存文件并记录路径
        const mediaPath = await this.saveMediaFile(msg, baseEntry.senderId);
        if (mediaPath) {
          logEntry.mediaPath = mediaPath;
        }
      }

      // 确保目录存在
      const dir = path.dirname(savePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 读取现有记录或创建新数组
      let logs = [];
      if (fs.existsSync(savePath)) {
        const content = fs.readFileSync(savePath, 'utf-8');
        logs = JSON.parse(content);
      }

      // 添加新消息
      logs.push(logEntry);

      // 保存到文件
      await fs.promises.writeFile(savePath, JSON.stringify(logs, null, 2), 'utf-8');
      log.info('CozeBot', `消息已保存: ${savePath}`);
    } catch (e) {
      log.error('CozeBot', '保存消息失败:', e);
    }
  }

  // 保存私聊消息到本地文件
  private async savePrivateMessage(contact: ContactInterface, message: string | Message): Promise<void> {
    try {
      // 检查必要的参数
      if (!contact) {
        log.error('CozeBot', '无效的联系人');
        return;
      }

      const contactId = contact.id;
      if (!contactId) {
        log.error('CozeBot', '无效的联系人ID');
        return;
      }

      const now = new Date();
      const dateStr = this.formatDate(now);
      const timestamp = now.toLocaleString();
      
      // 获取发送者信息
      const contactName = contact.name();
      
      // 构造基础消息记录
      const baseEntry = {
        timestamp,
        contactId,
        contactName,
        senderId: contact.id,
        senderName: contactName,
      };

      // 使用日期作为文件名
      const fileName = `${dateStr}.json`;
      const savePath = path.join(this.CHAT_LOGS_DIR, 'private', contactId, fileName);
      
      await this.saveMessageBase(savePath, message, baseEntry);
    } catch (e) {
      log.error('CozeBot', '保存私聊消息失败:', e);
    }
  }

  // 保存群聊消息到本地文件
  private async saveGroupMessage(room: RoomInterface, talker: ContactInterface | null, message: string | Message): Promise<void> {
    try {
      // 如果 talker 为 null，使用机器人自身作为发送者
      const sender = talker || this.bot.currentUser;
      
      // 构造基础消息记录
      const baseEntry = {
        timestamp: new Date().toLocaleString(),
        roomId: room.id,
        roomTopic: await room.topic(),
        senderId: sender.id,
        senderName: sender.name(),
      };

      // 使用日期作为文件名
      const dateStr = this.formatDate(new Date());
      const fileName = `${dateStr}.json`;
      const savePath = path.join(this.CHAT_LOGS_DIR, room.id, fileName);
      
      await this.saveMessageBase(savePath, message, baseEntry);
    } catch (e) {
      log.error('CozeBot', '保存群消息失败:', e);
    }
  }

  // 保存多媒体文件
  private async saveMediaFile(msg: Message, roomId: string): Promise<string | null> {
    try {
      // 验证参数
      if (!msg || !this.isValidRoomId(roomId)) {
        log.error('CozeBot', '无效的消息或群聊ID');
        return null;
      }

      let file;
      let thumbnailFile;
      const type = msg.type();
      const now = new Date();
      const dateStr = this.formatDate(now);
      const timestamp = now.getTime();
      
      // 根据消息类型获取文件
      switch (type) {
        case MessageType.Image:
          try {
            // 获取图片对象
            const image = msg.toImage();
            
            // 尝试获取原图，如果失败则使用缩略图
            try {
              file = await image.artwork();
            } catch (artworkError) {
              log.warn('CozeBot', '获取原图失败，尝试获取缩略图:', artworkError);
              try {
                file = await image.thumbnail();
              } catch (thumbnailError) {
                log.error('CozeBot', '获取缩略图也失败:', thumbnailError);
                return null;
              }
            }

            // 尝试获取缩略图
            try {
              thumbnailFile = await image.thumbnail();
            } catch (thumbnailError) {
              log.warn('CozeBot', '获取缩略图失败:', thumbnailError);
              // 不影响主流程，继续处理原图
            }
            break;
          } catch (imageError) {
            log.error('CozeBot', '处理图片消息失败:', imageError);
            return null;
          }
        case MessageType.Video:
          try {
            file = await msg.toFileBox();
          } catch (e) {
            log.error('CozeBot', '获取视频文件失败:', e);
            return null;
          }
          break;
        case MessageType.Audio:
          try {
            file = await msg.toFileBox();
          } catch (e) {
            log.error('CozeBot', '获取音频文件失败:', e);
            return null;
          }
          break;
        case MessageType.Attachment:
          try {
            file = await msg.toFileBox();
          } catch (e) {
            log.error('CozeBot', '获取附件失败:', e);
            return null;
          }
          break;
        case MessageType.Emoticon:
          try {
            file = await msg.toFileBox();
          } catch (e) {
            log.error('CozeBot', '获取表情文件失败:', e);
            return null;
          }
          break;
        default:
          return null;
      }

      if (!file || !file.name) {
        log.warn('CozeBot', '文件或文件名为空');
        return null;
      }

      // 构建文件保存路径
      const roomDir = path.join(this.MEDIA_DIR, roomId, dateStr);
      if (!fs.existsSync(roomDir)) {
        fs.mkdirSync(roomDir, { recursive: true });
      }

      // 使用时间戳和原始文件名构建新的文件名
      const originalName = file.name;
      const ext = path.extname(originalName) || this.getDefaultExtension(type);
      const baseFileName = `${timestamp}_${path.basename(originalName, ext)}`;
      const filePath = path.join(roomDir, `${baseFileName}${ext}`);

      // 保存原始文件
      try {
        await file.toFile(filePath, true);
        log.info('CozeBot', `原始文件已保存: ${filePath}`);
      } catch (saveError) {
        log.error('CozeBot', `保存原始文件失败: ${saveError}`);
        return null;
      }

      // 如果是图片且有缩略图，保存缩略图
      if (type === MessageType.Image && thumbnailFile && thumbnailFile.name) {
        try {
          const thumbnailPath = path.join(roomDir, `${baseFileName}_thumbnail${ext}`);
          await thumbnailFile.toFile(thumbnailPath, true);
          log.info('CozeBot', `缩略图已保存: ${thumbnailPath}`);
        } catch (thumbnailError) {
          log.error('CozeBot', '保存缩略图失败:', thumbnailError);
          return null;
        }
      }

      return filePath;
    } catch (e) {
      log.error('CozeBot', '保存多媒体文件失败:', e);
      return null;
    }
  }

  // 定时发送消息的方法
  private async scheduleDailyMessage(): Promise<void> {
    // 清除现有定时器
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
    }

    // 计算下一次发送时间（每天早上 8 点）
    const now = new Date();
    const nextTime = new Date(now);
    nextTime.setHours(8, 0, 0, 0);
    if (now >= nextTime) {
      nextTime.setDate(nextTime.getDate() + 1);
    }

    // 设置定时器
    const delay = nextTime.getTime() - now.getTime();
    this.scheduleTimer = setTimeout(async () => {
      try {
        // 查找目标群聊
        const room = await this.bot.Room.find({ id: this.TARGET_ROOM_ID });
        if (room) {
          // 保存原始消息
          await this.saveGroupMessage(room, this.bot.currentUser, this.DAILY_MESSAGE);

          // 获取 AI 回复
          const userId = `group_${this.TARGET_ROOM_ID}_daily`;
          const aiReplyMessage = await this.onChat(this.DAILY_MESSAGE, userId);
          
          if (aiReplyMessage) {
            // 组合完整消息
            const wholeMessage = `${this.DAILY_MESSAGE}\n----------\n${aiReplyMessage}`;
            
            // 发送消息
            await this.reply(room, wholeMessage);
            
            // 保存 AI 回复
            await this.saveGroupMessage(room, this.bot.currentUser, aiReplyMessage);
            
            log.info('CozeBot', '定时消息及 AI 回复已发送');
          }
        }
      } catch (e) {
        log.error('CozeBot', '发送定时消息失败:', e);
      } finally {
        // 设置下一次定时
        this.scheduleDailyMessage();
      }
    }, delay);

    log.info('CozeBot', `定时消息将在 ${nextTime.toLocaleString()} 发送`);
  }

  // 处理消息的主方法
  public async onMessage(message: Message): Promise<void> {
    try {
      const talker = message.talker();
      const messageType = message.type();
      const text = message.text();

      log.info('CozeBot', '收到消息:', {
        type: MessageType[messageType],
        messageType,
        text,
        talker: talker?.name(),
        roomId: message.room()?.id,
      });

      if (this.isNonsense(talker, messageType, text)) {
        return;
      }

      if (this.isBlacklisted(talker.name())) {
        log.info('CozeBot', `用户 ${talker.name()} 在黑名单中，跳过处理`);
        return;
      }

      await this.messageProcessor.processMessage(message);
    } catch (e) {
      log.error('CozeBot', '处理消息失败:', e);
    }
  }

  // Check if the talker is in the blacklist
  private isBlacklisted(talkerName: string): boolean {
    return !!Config.blacklist && Config.blacklist.includes(talkerName);
  }

  // 检查群聊ID是否有效
  private isValidRoomId(roomId: string | undefined): roomId is string {
    return typeof roomId === 'string' && roomId.length > 0;
  }

  // 根据消息类型获取默认文件扩展名
  private getDefaultExtension(type: MessageType): string {
    switch (type) {
      case MessageType.Image:
        return '.jpg';
      case MessageType.Video:
        return '.mp4';
      case MessageType.Audio:
        return '.mp3';
      case MessageType.Emoticon:
        return '.gif';
      case MessageType.Attachment:
        return '.dat';
      default:
        return '.bin';
    }
  }

  // 格式化日期为 YYYY-MM-DD 格式
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 获取群成员显示名称的辅助方法
  private async getMemberDisplayName(room: RoomInterface, member: ContactInterface): Promise<string> {
    try {
      // 优先获取群昵称
      const roomAlias = await room.alias(member);
      if (roomAlias) return roomAlias;

      // 其次获取备注名
      const alias = await member.alias();
      if (alias) return alias;

      // 最后使用微信名
      return member.name();
    } catch (e) {
      log.warn('CozeBot', `获取成员显示名称失败:`, e);
      return member.name() || '未知用户';
    }
  }

  public async sendWelcomeMessage(room: RoomInterface, names: string[]): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const welcomeMessage = this.WELCOME_MESSAGE_TEMPLATE.replace('{names}', names.join('、'));
        await this.saveGroupMessage(room, null, welcomeMessage);
        
        const userId = `group_${room.id}_welcome`;
        const aiReplyMessage = await this.onChat(welcomeMessage, userId);
        
        if (aiReplyMessage) {
          const wholeReplyMessage = `${welcomeMessage}\n----------\n${aiReplyMessage}`;
          await this.reply(room, wholeReplyMessage);
          await this.saveGroupMessage(room, this.bot.currentUser, aiReplyMessage);
          log.info('CozeBot', `欢迎消息发送成功: ${room.id}`);
          return;
        }
      } catch (e) {
        retryCount++;
        const delay = 1000 * retryCount;
        log.error('CozeBot', `发送欢迎消息失败(第${retryCount}次尝试), 将在${delay}ms后重试:`, e);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    log.error('CozeBot', `发送欢迎消息失败，已达到最大重试次数: ${room.id}`);
  }

  private isValidJoinMessage(content: string): boolean {
    // 扫码入群消息 - 多种模式匹配
    const scanPatterns = [
      /通过扫描.*二维码加入群聊/,
      /通过扫码.*加入群聊/,
      /通过扫描.*分享的二维码加入群聊/
    ];
    
    for (const pattern of scanPatterns) {
      if (pattern.test(content)) {
        log.info('CozeBot', `检测到扫码入群消息: ${content}`);
        return true;
      }
    }
    
    // 邀请入群消息 - 严格匹配
    if (content.includes('邀请') && content.includes('加入了群聊')) {
      log.info('CozeBot', `检测到邀请入群消息: ${content}`);
      return true;
    }
    
    log.info('CozeBot', `非入群消息: ${content}`);
    return false;
  }

  // 将私有方法改为公共方法
  public isMentioned(text: string): boolean {
    const textMention = `@${this.botName}`;
    return text.includes(textMention);
  }

  public hasKeyword(text: string): boolean {
    return text.includes('恭喜发财');
  }

  public extractContent(text: string): string {
    const textMention = `@${this.botName}`;
    if (text.includes(textMention)) {
      const mentionIndex = text.indexOf(textMention);
      const beforeMention = text.slice(0, mentionIndex).trim();
      const afterMention = text.slice(mentionIndex + textMention.length).trim();
      return [beforeMention, afterMention].filter(Boolean).join(' ');
    }
    return text;
  }

  // 添加缺失的 isNonsense 方法
  public isNonsense(talker: ContactInterface, messageType: MessageType, text: string): boolean {
    // 处理特定类型的消息
    if (messageType === MessageType.Unknown || 
        messageType === MessageType.Recalled) {
      return true;
    }

    return (
      (this.disableSelfChat && talker.self()) ||
      talker.name().includes('微信') ||
      text.includes('收到一条视频/语音聊天消息，请在手机上查看') ||
      text.includes('收到红包，请在手机上查看') ||
      text.includes('/cgi-bin/mmwebwx-bin/webwxgetpubliclinkimg')
    );
  }

  // 将私有方法改为公共方法
  public async saveMessage(message: Message): Promise<void> {
    const room = message.room();
    if (room) {
      await this.saveGroupMessage(room, message.talker(), message.text());
    } else {
      await this.savePrivateMessage(message.talker(), message.text());
    }
  }

  // 实现 ICozeBotMessageHandler 接口的方法
  public async onGroupMessage(room: RoomInterface, text: string, name: string): Promise<void> {
    try {
      const roomInfo = {
        roomId: room.id,
        isReady: room.isReady,
        memberCount: (await room.memberAll()).length,
        roomType: room.toString(),
      };
      log.info('CozeBot', '[正常群聊] Room详细信息: ' + JSON.stringify(roomInfo, null, 2));

      const userId = `group_${room.id}_user_${name}`;
      const talker = await room.member(name);
      if (talker) {
        await this.saveGroupMessage(room, talker, text);
      }

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

      await this.saveGroupMessage(room, this.bot.currentUser, chatgptReplyMessage);
    } catch (e) {
      log.error('CozeBot', 'Failed to handle group message:', e);
    }
  }

  public async onPrivateMessage(talker: ContactInterface, text: string): Promise<void> {
    try {
      const userId = `private_${talker.id || talker.name() || 'unknown'}`;
      await this.savePrivateMessage(talker, text);

      const chatgptReplyMessage = await this.onChat(text, userId);
      if (!chatgptReplyMessage) {
        return;
      }

      await this.reply(talker, chatgptReplyMessage);
      await this.savePrivateMessage(this.bot.currentUser, chatgptReplyMessage);
    } catch (e) {
      log.error('CozeBot', 'Failed to handle private message:', e);
    }
  }
}