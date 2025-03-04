import * as fs from 'fs';
import * as path from 'path';
import { 
    Message, 
    LogEntry, 
    ChatLoggerConfig
} from './types';
import { format } from 'date-fns';
import { Logger } from './logger';

const logger = new Logger('ChatLogger');

export class ChatLogger {
    private baseDir: string;
    private lockFiles: Set<string> = new Set();

    constructor(config: ChatLoggerConfig = {}) {
        this.baseDir = config.baseDir || "chat_logs";
        logger.info('ChatLogger initialized with base directory:', this.baseDir);
        this.ensureDirectoryExists(this.baseDir);
        logger.info('Base directory ensured');
    }

    public static createLogger(config?: ChatLoggerConfig): ChatLogger {
        logger.info('Creating new ChatLogger instance');
        return new ChatLogger(config);
    }

    private ensureDirectoryExists(dir: string): void {
        logger.info('Ensuring directory exists:', dir);
        if (!fs.existsSync(dir)) {
            logger.info('Creating directory:', dir);
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private async acquireLock(filePath: string): Promise<boolean> {
        const lockFile = `${filePath}.lock`;
        if (this.lockFiles.has(lockFile)) {
            return false;
        }
        try {
            fs.writeFileSync(lockFile, process.pid.toString());
            this.lockFiles.add(lockFile);
            return true;
        } catch (error) {
            logger.error('Failed to acquire lock:', error);
            return false;
        }
    }

    private releaseLock(filePath: string): void {
        const lockFile = `${filePath}.lock`;
        try {
            if (fs.existsSync(lockFile)) {
                fs.unlinkSync(lockFile);
            }
            this.lockFiles.delete(lockFile);
        } catch (error) {
            logger.error('Failed to release lock:', error);
        }
    }

    public normalizeMessage(message: Message): Message {
        try {
            logger.info('Normalizing message:', {
                type: message.type,
                hasPicMsg: !!message.pic_msg,
                rawMessage: JSON.stringify(message)
            });
            
            let msgType = "text";
            if (typeof message === 'object' && message.type) {
                if (message.type === 'Image' || message.type.includes('Image')) {
                    msgType = "image";
                    logger.info('Detected image message, setting type to:', msgType);
                }
            }

            let roomName = "";
            let senderName = "";

            if (message.talker) {
                const header = String(message.talker);
                const parts = header.split('@');
                
                if (parts.length > 1) {
                    const [contactPart, roomPart] = parts;
                    
                    if (contactPart && contactPart.includes('<') && contactPart.includes('>')) {
                        const contactMatch = contactPart.match(/<([^>]+)>/);
                        senderName = contactMatch?.[1] ?? "";
                    }
                    
                    if (roomPart && roomPart.includes('<') && roomPart.includes('>')) {
                        const roomMatch = roomPart.match(/<([^>]+)>/);
                        roomName = roomMatch?.[1] ?? "";
                    }
                } else if (header.includes('<') && header.includes('>')) {
                    const match = header.match(/<([^>]+)>/);
                    senderName = match?.[1] ?? "";
                }
            }

            const normalizedMsg: Message = {
                type: msgType,
                room_id: message.room_id || "",
                room_name: roomName,
                sender_id: message.sender_id || "",
                sender_name: senderName,
                content: message.content || "",
                pic_msg: message.pic_msg
            };

            logger.info('Initialized normalized message:', {
                type: normalizedMsg.type,
                room_id: normalizedMsg.room_id,
                pic_msg: normalizedMsg.pic_msg ? 'present' : 'absent'
            });

            if (msgType === "image" && message.pic_msg) {
                try {
                    let picPaths = message.pic_msg;
                    if (typeof picPaths === 'string') {
                        picPaths = JSON.parse(picPaths);
                        logger.info('Parsed pic_msg from string');
                    }

                    if (Array.isArray(picPaths)) {
                        logger.info('Processing pic_msg array:', picPaths);
                        const imagePaths = picPaths.filter(p => p.includes('\\Image\\') && !p.includes('\\Thumb\\'));
                        logger.info('Filtered image paths:', {
                            total: picPaths.length,
                            filtered: imagePaths.length,
                            paths: imagePaths
                        });
                        
                        const firstImagePath = imagePaths[0];
                        if (firstImagePath) {
                            normalizedMsg.mediaInfo = {
                                type: "image",
                                timestamp: Date.now(),
                                originalPath: firstImagePath
                            };
                            logger.info('Set media info with path:', firstImagePath);
                        } else {
                            logger.warn('No valid image path found in:', picPaths);
                        }
                    }
                } catch (error) {
                    logger.error('Failed to process pic_msg:', error);
                }
            } else {
                logger.info('Skipping media info processing:', {
                    hasType: !!message.type,
                    includesImage: message.type?.includes('Image'),
                    hasPicMsg: !!message.pic_msg
                });
            }

            logger.info('Final normalized message:', {
                type: normalizedMsg.type,
                hasMediaInfo: !!normalizedMsg.mediaInfo,
                originalPath: normalizedMsg.mediaInfo?.originalPath,
                room_id: normalizedMsg.room_id
            });

            return normalizedMsg;
        } catch (error) {
            logger.error('Message normalization failed:', error);
            return message;
        }
    }

    public async handleMessage(message: Message): Promise<[boolean, boolean]> {
        logger.info('=== Start handleMessage ===');
        logger.info('Received message:', {
            type: message.type,
            hasPicMsg: !!message.pic_msg,
            room_id: message.room_id,
            content: message.content,
            rawType: typeof message.type,
            talker: message.talker
        });

        if (!message.type) {
            logger.warn('Message type is missing');
            return [false, false];
        }

        if (!message.room_id) {
            logger.warn('Room ID is missing');
            return [false, false];
        }

        try {
            logger.info('Calling normalizeMessage...');
            const normalizedMessage = this.normalizeMessage(message);
            logger.info('After normalization:', {
                type: normalizedMessage.type,
                hasMediaInfo: !!normalizedMessage.mediaInfo,
                hasPicMsg: !!normalizedMessage.pic_msg
            });
            
            const typeCheck = {
                exactMatch: normalizedMessage.type === "image",
                includesImage: normalizedMessage.type?.includes('Image'),
                originalType: normalizedMessage.type
            };
            logger.info('Type check results:', typeCheck);
            
            const isImageMessage = typeCheck.exactMatch || typeCheck.includesImage;
            logger.info('Is image message:', isImageMessage);
            
            let saveSuccess = true;
            if (isImageMessage) {
                logger.info('=== Processing image message ===');
                if (normalizedMessage.mediaInfo?.originalPath) {
                    logger.info('Using mediaInfo path:', normalizedMessage.mediaInfo.originalPath);
                    saveSuccess = await this.saveMediaMessage(normalizedMessage);
                } else if (normalizedMessage.pic_msg) {
                    logger.info('Using pic_msg:', {
                        isArray: Array.isArray(normalizedMessage.pic_msg),
                        content: normalizedMessage.pic_msg
                    });
                    
                    const imagePath = Array.isArray(normalizedMessage.pic_msg)
                        ? normalizedMessage.pic_msg.find(p => {
                            const isValid = p.includes('\\Image\\') && !p.includes('\\Thumb\\');
                            logger.info('Checking path:', { path: p, isValid });
                            return isValid;
                        })
                        : normalizedMessage.pic_msg;

                    if (imagePath) {
                        logger.info('Found valid image path:', imagePath);
                        saveSuccess = await this.saveMediaMessage({
                            ...normalizedMessage,
                            mediaInfo: {
                                type: "image",
                                timestamp: Date.now(),
                                originalPath: imagePath
                            }
                        });
                    } else {
                        logger.warn('No valid image path found in pic_msg array');
                        saveSuccess = false;
                    }
                } else {
                    logger.warn('Image message detected but no media info or pic_msg found');
                }
            } else {
                logger.info('Not an image message, skipping media save');
            }

            const logEntry: LogEntry = {
                timestamp: new Date().toISOString(),
                type: normalizedMessage.type,
                sender: normalizedMessage.sender_name,
                content: normalizedMessage.content,
                mediaInfo: normalizedMessage.mediaInfo
            };

            const roomId = normalizedMessage.room_id || "unknown_room";
            const dateStr = format(new Date(), "yyyy-MM");
            const logFile = path.join(this.baseDir, roomId, `${dateStr}.json`);

            await this.saveMessageLog(logFile, logEntry);

            return [saveSuccess, !isImageMessage];
        } catch (error) {
            logger.error('Failed to handle message:', error);
            return [false, false];
        }
    }

    private async saveMediaMessage(message: Message): Promise<boolean> {
        try {
            let originalPath: string | undefined;
            
            if (message.mediaInfo?.originalPath) {
                originalPath = message.mediaInfo.originalPath;
            } else if (message.pic_msg) {
                originalPath = Array.isArray(message.pic_msg)
                    ? message.pic_msg.find(p => p.includes('\\Image\\') && !p.includes('\\Thumb\\'))
                    : message.pic_msg;
            }

            if (!originalPath) {
                logger.warn('No valid image path found');
                return false;
            }

            const roomId = message.room_id || "unknown_room";
            const chatDir = path.join(this.baseDir, roomId);
            this.ensureDirectoryExists(chatDir);

            const dateStr = format(new Date(), "yyyy-MM");
            const mediaDir = path.join(chatDir, "media", "images", dateStr);
            this.ensureDirectoryExists(mediaDir);
            
            logger.info('Saving media to directory:', mediaDir);

            const sourcePath = originalPath.replace(/\\/g, '/');
            logger.info('Source path:', sourcePath);

            if (fs.existsSync(sourcePath)) {
                const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
                const newName = `${timestamp}_${path.basename(sourcePath)}`;
                const targetPath = path.join(mediaDir, newName);

                logger.info('Copying file from', sourcePath, 'to', targetPath);
                await fs.promises.copyFile(sourcePath, targetPath);

                if (fs.existsSync(targetPath)) {
                    const stats = fs.statSync(targetPath);
                    logger.info('File saved successfully:', {
                        path: targetPath,
                        size: stats.size
                    });
                    return true;
                } else {
                    logger.error('File save failed - target file does not exist');
                    return false;
                }
            } else {
                logger.error('Source file does not exist:', sourcePath);
                return false;
            }
        } catch (error) {
            logger.error('Failed to save media message:', error);
            return false;
        }
    }

    private async saveMessageLog(logFile: string, entry: LogEntry): Promise<void> {
        try {
            this.ensureDirectoryExists(path.dirname(logFile));
            
            if (await this.acquireLock(logFile)) {
                try {
                    let logs: LogEntry[] = [];
                    if (fs.existsSync(logFile)) {
                        const content = await fs.promises.readFile(logFile, 'utf-8');
                        logs = JSON.parse(content);
                    }

                    logs.push(entry);
                    await fs.promises.writeFile(logFile, JSON.stringify(logs, null, 2), 'utf-8');
                    logger.info('Message log saved:', logFile);
                } finally {
                    this.releaseLock(logFile);
                }
            }
        } catch (error) {
            logger.error('Failed to save message log:', error);
            throw error;
        }
    }
}