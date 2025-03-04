import { Message } from './types';
import { ChatLogger } from './ChatLogger';
import { Logger } from './logger';
import { MessageDeduplicator } from './MessageDeduplicator';

const logger = new Logger('MessageHandler');
const messageDeduplicator = new MessageDeduplicator({
    maxSize: 5000,
    ttlSeconds: 60
});

export class MessageHandler {
    private chatLogger: ChatLogger;

    constructor() {
        this.chatLogger = new ChatLogger();
    }

    public constructMessage(rawMessage: string | Message): Message {
        try {
            logger.info('=== Starting message construction ===');
            logger.info('Raw message:', rawMessage);

            let message: Message;

            if (typeof rawMessage === 'string') {
                if (rawMessage.startsWith('pic msg')) {
                    const picPaths = rawMessage.slice(8); // Remove 'pic msg '
                    try {
                        const paths = JSON.parse(picPaths);
                        message = {
                            type: "Message#Image",
                            pic_msg: paths
                        };
                    } catch {
                        message = {
                            type: "Message#Image",
                            pic_msg: picPaths // 直接使用字符串，不需要数组包装
                        };
                    }
                } else {
                    try {
                        message = JSON.parse(rawMessage);
                    } catch {
                        message = { type: "Message#Text", content: rawMessage };
                    }
                }
            } else {
                message = rawMessage;
            }

            // Handle group notifications
            if (typeof message.type === 'string' && message.type.includes('GroupNote')) {
                const content = message.content || '';
                if (content.includes('拍了拍')) {
                    message.note_type = 'pat';
                } else if (content.includes('邀请') && content.includes('加入了群聊')) {
                    message.note_type = 'invite';
                } else if (content.includes('通过扫描二维码加入群聊')) {
                    message.note_type = 'scan';
                } else {
                    message.note_type = 'other';
                }
                logger.info('Group notification type:', message.note_type, 'Content:', content);
            }

            // Handle pic_msg field
            if (message.pic_msg) {
                if (typeof message.pic_msg === 'string') {
                    try {
                        const parsedPaths = JSON.parse(message.pic_msg);
                        message.pic_msg = parsedPaths; // 直接使用解析后的结果
                    } catch {
                        // 如果解析失败，保持原始字符串
                        // TypeScript 会自动处理类型
                    }
                }
                message.type = "Message#Image";
            }

            // Handle message header information
            if (typeof message.talker === 'string' && message.talker.includes('@')) {
                const parts = message.talker.split('@');
                if (parts.length > 1) {
                    message.room = parts[1];
                }
            }

            // Ensure basic fields exist
            if (!message.type) {
                message.type = "Message#Text";
            }

            logger.info('Constructed message:', JSON.stringify(message));
            return message;

        } catch (error) {
            logger.error('Failed to construct message:', error);
            return { type: "Message#Text", content: String(rawMessage) };
        }
    }

    private shouldIgnoreMessage(message: Message): boolean {
        if (messageDeduplicator.isDuplicate(message)) {
            logger.info('Ignoring duplicate message');
            return true;
        }

        const sender = String(message.talker || '').toLowerCase();
        const content = String(message.content || '');
        const msgType = String(message.type || '');

        if (sender.includes('微信团队')) {
            logger.info('Ignoring WeChat team message');
            return true;
        }

        if (['sysmsg', 'system', 'groupnote'].some(keyword => msgType.toLowerCase().includes(keyword))) {
            logger.info('Ignoring system message');
            return true;
        }

        const systemKeywords = [
            '收到红包',
            '发起了红包',
            '修改群名为',
            '群公告',
            '拍了拍',
            '撤回了一条消息',
            '开启了朋友验证',
            '加入了群聊',
            '邀请',
            '发起了群聊',
            '群成员'
        ];

        if (systemKeywords.some(keyword => content.includes(keyword))) {
            logger.info('Ignoring system-related message:', content);
            return true;
        }

        return false;
    }

    private shouldSendWelcomeMessage(message: Message): boolean {
        if (message.type === "Message#GroupNote") {
            return ['invite', 'scan'].includes(message.note_type || '');
        }
        return false;
    }

    public async handleMessage(rawMessage: string | Message): Promise<void> {
        try {
            logger.info('=== Starting new message processing ===');
            logger.info('Received raw message:', rawMessage);

            // 1. Construct standard message object
            const message = this.constructMessage(rawMessage);
            logger.info('Standardized message:', JSON.stringify(message));

            // 2. Check if message should be ignored
            if (this.shouldIgnoreMessage(message)) {
                logger.info('Message filtered, not processing');
                return;
            }

            // 3. Use ChatLogger to handle message
            const [saveSuccess, shouldSendToModel] = await this.chatLogger.handleMessage(message);

            // 4. Handle results
            if (!saveSuccess) {
                logger.error('Failed to save message');
                return;
            }

            // 5. Handle group notifications
            if (message.type === "Message#GroupNote") {
                if (this.shouldSendWelcomeMessage(message)) {
                    logger.info('Sending welcome message');
                    // Add welcome message sending logic here
                } else {
                    logger.info('Skipping non-welcome notification message');
                }
                return;
            }

            // 6. Decide whether to send to model
            if (shouldSendToModel) {
                logger.info('Sending text message to model');
                await this.sendToModel(message);
            } else {
                logger.info('Media message saved, skipping model processing');
            }

            logger.info('=== Message processing completed ===');

        } catch (error) {
            logger.error('Message processing error:', error);
        }
    }

    private async sendToModel(message: Message): Promise<void> {
        try {
            if (message.type === "Message#Text") {
                logger.info('Sending text message to model:', JSON.stringify(message));
                // Add model sending logic here
            } else {
                logger.warn('Non-text message should not be sent to model:', message.type);
            }
        } catch (error) {
            logger.error('Failed to send message to model:', error);
        }
    }
} 