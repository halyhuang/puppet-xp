export interface Message {
    type: string;
    content?: string;
    talker?: string;
    room?: string;
    pic_msg?: string | string[];
    note_type?: string;
    room_id?: string;
    room_name?: string;
    sender_id?: string;
    sender_name?: string;
    mediaInfo?: {
        type: string;
        timestamp: number;
        originalPath: string;
    };
}

export interface LogEntry {
    timestamp: string;
    type: string;
    sender?: string;
    content?: string;
    mediaInfo?: {
        type: string;
        timestamp: number;
        originalPath: string;
    };
    media?: {
        type: string;
        file_paths: string[];
        file_name: string;
        original_paths: string[];
    };
}

export interface ChatLoggerConfig {
    baseDir?: string;
    maxCacheSize?: number;
    ttlSeconds?: number;
}

export const MESSAGE_TYPES = {
    Text: "text",
    Image: "image",
    Video: "video",
    File: "file",
    Audio: "audio",
    Link: "link"
} as const;

export type MessageTypeKeys = keyof typeof MESSAGE_TYPES;
export type MessageTypeValues = typeof MESSAGE_TYPES[MessageTypeKeys];

export const MEDIA_TYPES = {
    "Message#Image": "images",
    "Message#Video": "videos",
    "Message#File": "files",
    "Message#Voice": "voice",
    "Message#Link": "links"
} as const;

export type MediaTypeKeys = keyof typeof MEDIA_TYPES;
export type MediaTypeValues = typeof MEDIA_TYPES[MediaTypeKeys]; 