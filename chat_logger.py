import os
import json
import shutil
import fcntl
import logging
from datetime import datetime
from typing import Any, Dict, Optional, Union
from pathlib import Path
from contextlib import contextmanager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ChatLogger:
    # 消息类型映射
    MESSAGE_TYPES = {
        "Text": "text",
        "Image": "image",
        "Video": "video",
        "File": "file",
        "Audio": "audio",
        "Link": "link"
    }

    def __init__(self, base_dir: str = "chat_logs"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        
    @contextmanager
    def _file_lock(self, file_path: Path):
        """文件锁上下文管理器"""
        lock_file = file_path.with_suffix('.lock')
        try:
            with open(lock_file, 'w') as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                yield
        finally:
            if lock_file.exists():
                try:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)
                    lock_file.unlink()
                except Exception as e:
                    logger.error(f"释放文件锁失败: {e}")

    def normalize_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """标准化消息格式"""
        try:
            # 解析消息类型
            msg_type = "text"  # 默认类型
            if isinstance(message, dict):
                raw_type = message.get("type", "")
                if "#" in raw_type:
                    msg_type = raw_type.split("#")[1].split("[")[0]
                    msg_type = self.MESSAGE_TYPES.get(msg_type, "text")
            
            # 解析发送者信息
            sender_info = message.get("talker", {})
            if isinstance(sender_info, str) and "<" in sender_info:
                # 解析格式如 "Contact<Karl Qinlin>"
                sender_name = sender_info.split("<")[1].split(">")[0]
            else:
                sender_name = str(sender_info)
            
            # 解析群组信息
            room_info = message.get("room", {})
            if isinstance(room_info, str) and "<" in room_info:
                # 解析格式如 "Room<华工CS98小群>"
                room_name = room_info.split("<")[1].split(">")[0]
            else:
                room_name = str(room_info)
            
            # 构建标准化消息
            normalized_msg = {
                "type": msg_type,
                "timestamp": message.get("timestamp", datetime.now().isoformat()),
                "room_id": message.get("room_id", ""),
                "room_name": room_name,
                "sender_id": message.get("talker_id", ""),
                "sender_name": sender_name,
                "content": message.get("content", ""),
                "raw_message": message
            }
            
            # 处理媒体内容
            if msg_type in ["image", "video", "file", "audio"]:
                normalized_msg["media"] = {
                    "type": msg_type,
                    "file_name": message.get("file_name", f"{msg_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
                    "file_path": message.get("file_path", ""),
                    "size": message.get("file_size", 0),
                    "mime_type": message.get("mime_type", "")
                }
            
            return normalized_msg
            
        except Exception as e:
            logger.error(f"消息格式化失败: {e}", exc_info=True)
            return message

    def handle_message(self, message: Dict[str, Any]) -> bool:
        """处理所有接收到的消息"""
        try:
            # 标准化消息格式
            normalized_msg = self.normalize_message(message)
            
            # 确定消息类型（群聊/私聊）
            if "room_name" in normalized_msg and normalized_msg["room_name"]:
                return self.save_group_message(
                    normalized_msg,
                    group_id=normalized_msg.get("room_id", ""),
                    group_name=normalized_msg["room_name"]
                )
            elif "sender_name" in normalized_msg:
                return self.save_private_message(
                    normalized_msg,
                    user_id=normalized_msg.get("sender_id", ""),
                    user_name=normalized_msg["sender_name"]
                )
            else:
                logger.warning(f"无法确定消息类型: {normalized_msg}")
                return False
                
        except Exception as e:
            logger.error(f"处理消息失败: {e}", exc_info=True)
            return False
        
    def save_message(self, message: Dict[str, Any], chat_type: str, chat_id: str, chat_name: str) -> bool:
        """
        保存所有类型的消息到日志文件
        
        Args:
            message: 消息内容字典
            chat_type: 消息类型 (group/private)
            chat_id: 聊天ID
            chat_name: 群名称或用户名称
        Returns:
            bool: 是否成功保存
        """
        try:
            # 使用实际名称作为目录名（移除非法字符）
            safe_chat_name = self._get_safe_name(chat_name)
            chat_dir = self.base_dir / chat_type / safe_chat_name
            chat_dir.mkdir(parents=True, exist_ok=True)
            
            # 按年月组织日志文件
            date_str = datetime.now().strftime("%Y%m")
            log_file = chat_dir / f"{date_str}.log"
            
            # 添加消息元数据
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "chat_id": chat_id,
                "chat_name": chat_name,
                "message_id": message.get("message_id", ""),
                "sender_id": message.get("sender_id", ""),
                "sender_name": message.get("sender_name", ""),
                "content": message.get("content", ""),
                "raw_message": message  # 保存完整的原始消息
            }
            
            # 处理多媒体内容
            if "media" in message:
                media_info = message["media"]
                if not self._handle_media(media_info, chat_dir, log_entry):
                    logger.warning(f"处理媒体文件失败: {chat_id}")
            
            # 使用文件锁保证并发安全
            with self._file_lock(log_file):
                with log_file.open("a", encoding="utf-8", buffering=1) as f:  # buffering=1 表示行缓冲
                    f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
                    f.flush()  # 确保立即写入磁盘
                    os.fsync(f.fileno())  # 强制同步到磁盘
            
            logger.info(f"成功保存消息: {chat_type}/{safe_chat_name}/{message.get('message_id', '')}")
            return True
            
        except Exception as e:
            logger.error(f"保存消息失败: {e}", exc_info=True)
            return False
    
    def _handle_media(self, media_info: Dict[str, Any], chat_dir: Path, log_entry: Dict[str, Any]) -> bool:
        """处理媒体文件"""
        try:
            media_type = media_info.get("type", "other")
            media_date = datetime.now().strftime("%Y%m%d")
            media_dir = chat_dir / "media" / media_type / media_date
            media_dir.mkdir(parents=True, exist_ok=True)
            
            timestamp = datetime.now().strftime("%H%M%S")
            original_filename = media_info["file_name"]
            file_ext = Path(original_filename).suffix
            new_filename = f"{timestamp}_{self._get_safe_name(original_filename)}{file_ext}"
            media_path = media_dir / new_filename
            
            if "file_path" in media_info:
                source_path = Path(media_info["file_path"])
                if source_path.exists():
                    shutil.copy2(source_path, media_path)
            
            log_entry["media"] = {
                "type": media_type,
                "path": str(media_path.relative_to(self.base_dir)),
                "original_name": original_filename,
                "size": media_info.get("size", 0),
                "mime_type": media_info.get("mime_type", "")
            }
            return True
        except Exception as e:
            logger.error(f"处理媒体文件失败: {e}", exc_info=True)
            return False
    
    def save_group_message(self, message: Dict[str, Any], group_id: str, group_name: str) -> bool:
        """保存群聊消息"""
        return self.save_message(message, "groups", group_id, group_name)
    
    def save_private_message(self, message: Dict[str, Any], user_id: str, user_name: str) -> bool:
        """保存私聊消息"""
        return self.save_message(message, "private", user_id, user_name)
    
    def _get_safe_name(self, name: str) -> str:
        """转换名称为安全的目录名"""
        # 移除或替换不安全的字符
        unsafe_chars = '<>:"/\\|?*'
        safe_name = ''.join(c if c not in unsafe_chars else '_' for c in name)
        return safe_name.strip()
    
    def get_chat_history(self, chat_type: str, chat_name: str, 
                        start_date: Optional[str] = None,
                        end_date: Optional[str] = None) -> list:
        """获取指定聊天的历史记录"""
        history = []
        safe_chat_name = self._get_safe_name(chat_name)
        chat_dir = self.base_dir / chat_type / safe_chat_name
        
        if not chat_dir.exists():
            return history
            
        # 获取所有日志文件
        log_files = sorted(chat_dir.glob("*.log"))
        for log_file in log_files:
            # 从文件名获取年月 (YYYYMM)
            file_date = log_file.stem
            if not self._is_date_in_range(file_date, start_date, end_date):
                continue
                
            with log_file.open("r", encoding="utf-8") as f:
                for line in f:
                    history.append(json.loads(line))
        
        return history

    def _is_date_in_range(self, date_str: str, start_date: Optional[str], 
                         end_date: Optional[str]) -> bool:
        """检查日期是否在指定范围内"""
        if not (start_date or end_date):
            return True
        
        # 将YYYYMM转换为日期对象
        date = datetime.strptime(date_str, "%Y%m")
        
        if start_date:
            start = datetime.strptime(start_date[:6], "%Y%m")
            if date < start:
                return False
        if end_date:
            end = datetime.strptime(end_date[:6], "%Y%m")
            if date > end:
                return False
            
        return True 