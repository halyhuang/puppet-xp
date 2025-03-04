from bot import handle_message
import logging

logger = logging.getLogger(__name__)

def on_message(message):
    """消息接收处理函数"""
    try:
        # 处理pic_msg特殊格式
        if isinstance(message, str) and message.startswith("pic msg"):
            logger.info("收到图片消息")
            # 直接传递原始消息字符串
            handle_message(message)
            return
            
        # 处理其他消息
        if isinstance(message, dict):
            if "type" in message and "#Image" in message["type"]:
                logger.info("收到图片消息对象")
            handle_message(message)
        else:
            logger.warning(f"未知消息格式: {message}")
            
    except Exception as e:
        logger.error(f"消息处理异常: {e}", exc_info=True) 