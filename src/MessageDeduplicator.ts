import { Message } from './types';
import { Logger } from './logger';

const logger = new Logger('MessageDeduplicator');

interface CacheEntry {
    message: Message;
    timestamp: number;
}

interface DeduplicatorConfig {
    maxSize?: number;
    ttlSeconds?: number;
}

export class MessageDeduplicator {
    private cache: Map<string, CacheEntry>;
    private maxSize: number;
    private ttlSeconds: number;

    constructor(config: DeduplicatorConfig = {}) {
        this.cache = new Map();
        this.maxSize = config.maxSize || 1000;
        this.ttlSeconds = config.ttlSeconds || 300;
    }

    private generateMessageKey(message: Message): string {
        const keyParts = [
            String(message.type || ''),
            String(message.talker || ''),
            String(message.content || ''),
            String(message.room || '')
        ];

        if (message.pic_msg) {
            const paths = Array.isArray(message.pic_msg) 
                ? message.pic_msg 
                : [message.pic_msg];
            keyParts.push(...paths.map(String));
        }

        return keyParts.join('|');
    }

    private cleanExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttlSeconds * 1000) {
                this.cache.delete(key);
            }
        }
    }

    public isDuplicate(message: Message): boolean {
        this.cleanExpired();

        const messageKey = this.generateMessageKey(message);
        const now = Date.now();

        if (this.cache.has(messageKey)) {
            logger.info('Detected duplicate message:', messageKey);
            return true;
        }

        this.cache.set(messageKey, { message, timestamp: now });

        if (this.cache.size > this.maxSize) {
            const keys = Array.from(this.cache.keys());
            if (keys.length > 0) {
                const oldestKey = keys[0];
                if (oldestKey) {
                    this.cache.delete(oldestKey);
                }
            }
        }

        return false;
    }
} 