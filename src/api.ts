import axios from 'axios';
import { Config } from './config';
import { IMessage } from './interfaces/model';

/**
 * https://www.coze.cn/docs/developer_guides/coze_api_overview
 * 根据 Coze 开发指南，会话 Conversation 和消息 Message 与对话 Chat 使用了不同的 API 版本，当前使用 Chat
 * Conversation vs Message vs Chat: https://www.coze.cn/docs/developer_guides/coze_api_overview#4a288f73
 */

const API_VERSION = 'https://api.coze.cn/v3/';

// 创建对话
const createConversation = async () => {
  try {
    const response = await axios.post(
      `${API_VERSION}conversation`,
      {},
      {
        headers: {
          Authorization: `Bearer ${Config.modelConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

// 创建消息
const createMessage = async (conversationId: string, content: string) => {
  try {
    const response = await axios.post(
      `${API_VERSION}message`,
      {
        conversation_id: conversationId,
        content,
      },
      {
        headers: {
          Authorization: `Bearer ${Config.modelConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
};

// 发送聊天请求
const chat = async (messages: IMessage[], userId: string) => {
  try {
    const response = await axios.post(
      `${API_VERSION}chat`,
      {
        bot_id: Config.modelConfig.model,
        user_id: userId,
        stream: true,
        additional_messages: messages,
      },
      {
        responseType: 'stream',
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error in chat:', error);
    throw error;
  }
};

const CozeApi = {
  createConversation,
  createMessage,
  chat,
};

export default CozeApi;
