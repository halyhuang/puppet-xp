import axios from 'axios';
import { Config } from './config';

/**
 * https://www.coze.cn/docs/developer_guides/coze_api_overview
 * 根据 Coze 开发指南，会话 Conversation 和消息 Message 与对话 Chat 使用了不同的 API 版本，当前使用 Chat
 * Conversation vs Message vs Chat: https://www.coze.cn/docs/developer_guides/coze_api_overview#4a288f73
 */

const API_VERSIONS = {
  v1: 'https://api.coze.cn/v1/',
  v3: 'https://api.coze.cn/v3/',
};

const instanceV1 = axios.create({
  baseURL: API_VERSIONS.v1,
  timeout: 10000,
  headers: {
    Authorization: `Bearer ${Config.apiKey}`,
    'Content-Type': 'application/json',
  },
});

const instanceV3 = axios.create({
  baseURL: API_VERSIONS.v3,
  timeout: 100000,
  headers: {
    Authorization: `Bearer ${Config.apiKey}`,
    'Content-Type': 'application/json',
  },
});

export async function createConversation() {
  return instanceV1.post('/conversation/create', {});
}

export async function createMessage() {
  return instanceV1.post('/message/create', {});
}

export interface IMessage {
  role: 'user';
  content: string;
  content_type: 'text';
}
export async function chat(messages: IMessage[], name: string) {
  try {
    const response = await sendChatRequest(messages, name);
    const resolvedData = await collectStreamData(response.data);
    return resolvedData;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}

async function sendChatRequest(messages: IMessage[], name: string) {
  return instanceV3.post(
    '/chat',
    {
      bot_id: Config.model,
      user_id: name,
      stream: true,
      additional_messages: messages,
    },
    {
      responseType: 'stream', // 指定响应类型为流
    }
  );
}

async function collectStreamData(stream: NodeJS.ReadStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = ''; // 用于缓存未完整的部分
    let response = ''; // 用于存储最终的响应内容

    // 提取并处理一行数据
    const processLine = () => {
      const boundary = buffer.indexOf('\n'); // 查找换行符的位置
      if (boundary === -1) return false; // 如果没有找到换行符，返回 false

      const line = buffer.slice(0, boundary).trim(); // 提取一行数据
      buffer = buffer.slice(boundary + 1); // 更新 buffer，去掉已处理的部分

      // 检查是否是事件行和数据行
      if (line.startsWith('event:') && buffer.startsWith('data:')) {
        const eventLine = line;
        const dataLine = buffer.slice(0, buffer.indexOf('\n')).trim(); // 提取数据行
        buffer = buffer.slice(buffer.indexOf('\n') + 1); // 更新 buffer，去掉已处理的部分

        // 只处理特定事件类型
        if (eventLine !== 'event:conversation.message.completed') {
          return true; // 继续处理下一行
        }

        const jsonStr = dataLine.slice(5); // 提取 JSON 字符串部分
        try {
          const data = JSON.parse(jsonStr); // 解析 JSON 数据
          // 检查数据类型和内容
          if (data.type !== 'answer' || data.content === '{}') {
            return true; // 继续处理下一行
          }

          response = data.content; // 提取 content 字段
        } catch (error) {
          console.error('Error parsing JSON:', error); // 处理 JSON 解析错误
        }
      }

      return true; // 继续处理下一行
    };

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString(); // 将新的 chunk 拼接到 buffer 中
      console.log('buffer: ', buffer);

      while (processLine()); // 处理 buffer 中的所有完整行
    });

    stream.on('end', () => {
      console.log('Stream ended', response); // 流结束时输出响应内容
      resolve(response); // 解析 Promise，返回响应内容
    });

    stream.on('error', (error: Error) => {
      console.error('Stream error:', error); // 处理流错误
      reject(error); // 拒绝 Promise，返回错误
    });
  });
}

const CozeApi = {
  createConversation,
  createMessage,
  chat,
};

export default CozeApi;
