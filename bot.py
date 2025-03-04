import json
import logging
import time
from typing import Dict, Any, Union
from collections import OrderedDict
from chat_logger import ChatLogger

# 配置日志
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MessageDeduplicator:
    def __init__(self, max_size: int = 1000, ttl_seconds: int = 300):
        """
        初始化消息去重器
        
        Args:
            max_size: 缓存的最大消息数
            ttl_seconds: 消息的生存时间（秒）
        """
        self.cache = OrderedDict()  # 使用OrderedDict来实现LRU缓存
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
    
    def _generate_message_key(self, message: Dict[str, Any]) -> str:
        """生成消息的唯一键"""
        key_parts = [
            str(message.get("type", "")),
            str(message.get("talker", "")),
            str(message.get("content", "")),
            str(message.get("room", ""))
        ]
        
        # 对于图片消息，添加图片路径
        if "pic_msg" in message:
            key_parts.extend([str(path) for path in message["pic_msg"]])
            
        return "|".join(key_parts)
    
    def _clean_expired(self):
        """清理过期的消息"""
        current_time = time.time()
        expired_keys = [
            k for k, (_, timestamp) in self.cache.items()
            if current_time - timestamp > self.ttl_seconds
        ]
        for k in expired_keys:
            self.cache.pop(k)
    
    def is_duplicate(self, message: Dict[str, Any]) -> bool:
        """
        检查消息是否是重复的
        
        Args:
            message: 消息对象
            
        Returns:
            bool: 是否是重复消息
        """
        # 清理过期消息
        self._clean_expired()
        
        # 生成消息键
        message_key = self._generate_message_key(message)
        current_time = time.time()
        
        # 检查是否存在
        if message_key in self.cache:
            logger.info(f"检测到重复消息: {message_key}")
            return True
            
        # 添加到缓存
        self.cache[message_key] = (message, current_time)
        
        # 如果超过最大大小，删除最早的消息
        if len(self.cache) > self.max_size:
            self.cache.popitem(last=False)
            
        return False

# 创建全局消息去重器实例
message_deduplicator = MessageDeduplicator(
    max_size=5000,      # 增加缓存容量到5000条
    ttl_seconds=60      # 降低去重时间到1分钟
)

def construct_message(raw_message: Union[str, Dict, Any]) -> Dict[str, Any]:
    """构造标准的消息对象"""
    try:
        logger.info("=== 开始构造消息对象 ===")
        logger.info(f"原始消息: {raw_message}")
        
        # 处理字符串类型的消息
        if isinstance(raw_message, str):
            if raw_message.startswith('pic msg'):
                # 处理图片消息字符串
                pic_paths = raw_message.replace('pic msg ', '')
                try:
                    pic_paths = json.loads(pic_paths)
                except:
                    pic_paths = [pic_paths]
                message = {
                    "type": "Message#Image",
                    "pic_msg": pic_paths
                }
            else:
                try:
                    message = json.loads(raw_message)
                except json.JSONDecodeError:
                    message = {"content": raw_message}
        else:
            message = raw_message

        # 处理群通知消息
        if isinstance(message.get("type"), str) and "GroupNote" in message.get("type", ""):
            content = message.get("content", "")
            if "拍了拍" in content:
                message["note_type"] = "pat"  # 拍一拍消息
            elif "邀请" in content and "加入了群聊" in content:
                message["note_type"] = "invite"  # 邀请入群
            elif "通过扫描二维码加入群聊" in content:
                message["note_type"] = "scan"  # 扫码入群
            else:
                message["note_type"] = "other"  # 其他群通知
            logger.info(f"群通知类型: {message['note_type']}, 内容: {content}")

        # 处理pic_msg字段
        if "pic_msg" in message:
            if isinstance(message["pic_msg"], str):
                try:
                    message["pic_msg"] = json.loads(message["pic_msg"])
                except json.JSONDecodeError:
                    message["pic_msg"] = [message["pic_msg"]]
            message["type"] = "Message#Image"

        # 处理消息头部信息
        if isinstance(message.get("talker"), str) and "@" in message["talker"]:
            parts = message["talker"].split("@")
            if len(parts) == 2:
                message["room"] = parts[1]

        # 确保基本字段存在
        if "type" not in message:
            message["type"] = "Message#Text"
        
        logger.info(f"构造完成的消息对象: {json.dumps(message, ensure_ascii=False)}")
        return message
        
    except Exception as e:
        logger.error(f"构造消息对象失败: {e}", exc_info=True)
        return {"type": "Message#Text", "content": str(raw_message)}

def should_ignore_message(message: Dict[str, Any]) -> bool:
    """判断是否应该忽略该消息"""
    # 检查是否是重复消息
    if message_deduplicator.is_duplicate(message):
        logger.info("忽略重复消息")
        return True
        
    # 获取发送者信息
    sender = str(message.get("talker", "")).lower()
    content = str(message.get("content", ""))
    msg_type = str(message.get("type", ""))

    # 忽略微信团队消息
    if "微信团队" in sender:
        logger.info("忽略微信团队消息")
        return True

    # 忽略系统消息
    if any(keyword in msg_type.lower() for keyword in ["sysmsg", "system", "groupnote"]):
        logger.info("忽略系统消息")
        return True
        
    # 忽略特定内容的系统消息
    system_keywords = [
        "收到红包",
        "发起了红包",
        "修改群名为",
        "群公告",
        "拍了拍",
        "撤回了一条消息",
        "开启了朋友验证",
        "加入了群聊",
        "邀请",
        "发起了群聊",
        "群成员"
    ]
    if any(keyword in content for keyword in system_keywords):
        logger.info(f"忽略系统相关消息: {content}")
        return True

    return False

def should_send_welcome_message(message: Dict[str, Any]) -> bool:
    """判断是否需要发送欢迎消息"""
    if message.get("type") == "Message#GroupNote":
        note_type = message.get("note_type")
        return note_type in ["invite", "scan"]  # 只对邀请入群和扫码入群发送欢迎语
    return False

def handle_message(raw_message: Any) -> None:
    """处理接收到的消息"""
    try:
        logger.info("=== 开始处理新消息 ===")
        logger.info(f"接收到原始消息: {raw_message}")
        
        # 1. 构造标准消息对象
        message = construct_message(raw_message)
        logger.info(f"标准化后的消息: {json.dumps(message, ensure_ascii=False)}")
        
        # 2. 检查是否需要忽略该消息
        if should_ignore_message(message):
            logger.info("消息被过滤，不处理")
            return
        
        # 3. 使用ChatLogger处理消息
        chat_logger = ChatLogger()
        save_success, should_send_to_model = chat_logger.handle_message(message)
        
        # 4. 处理结果
        if not save_success:
            logger.error("消息保存失败")
            return
            
        # 5. 处理群通知消息
        if message.get("type") == "Message#GroupNote":
            if should_send_welcome_message(message):
                logger.info("发送入群欢迎消息")
                # 这里添加发送欢迎消息的逻辑
            else:
                logger.info("跳过非入群通知消息")
            return
            
        # 6. 决定是否发送给模型
        if should_send_to_model:
            logger.info("发送文本消息给模型处理")
            send_to_model(message)
        else:
            logger.info("多媒体消息已保存，跳过模型处理")
        
        logger.info("=== 消息处理完成 ===")
            
    except Exception as e:
        logger.error(f"消息处理异常: {e}", exc_info=True)

def send_to_model(message: Dict[str, Any]) -> None:
    """发送消息给大模型处理"""
    try:
        if message.get("type") == "Message#Text":
            logger.info(f"发送文本消息给模型: {json.dumps(message, ensure_ascii=False)}")
            # 这里添加发送给模型的逻辑
        else:
            logger.warning(f"非文本消息不应发送给模型: {message.get('type')}")
    except Exception as e:
        logger.error(f"发送消息给模型失败: {e}", exc_info=True)

# 示例使用
if __name__ == "__main__":
    # 测试图片消息
    test_message = 'pic msg ["wxid_8hl5qh6q7hod22\\FileStorage\\MsgAttach\\test.dat"]'
    handle_message(test_message) 