import os
import json
import shutil
import msvcrt
import logging
from datetime import datetime
from typing import Any, Dict, Optional, Union, Tuple
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
        
        # 支持的媒体类型
        self.MEDIA_TYPES = {
            "Message#Image": "images",
            "Message#Video": "videos",
            "Message#File": "files",
            "Message#Voice": "voice",
            "Message#Link": "links"
        }

    @contextmanager
    def _file_lock(self, file_path: Path):
        """文件锁上下文管理器 - Windows 实现"""
        lock_file = file_path.with_suffix('.lock')
        lock_handle = None
        try:
            # 尝试创建或打开锁文件
            try:
                lock_handle = open(lock_file, 'w')
                # 在 Windows 上使用 msvcrt 进行文件锁定
                msvcrt.locking(lock_handle.fileno(), msvcrt.LK_NBLCK, 1)
            except IOError:
                if lock_handle:
                    lock_handle.close()
                raise
            yield
        finally:
            if lock_handle:
                try:
                    # 释放锁
                    msvcrt.locking(lock_handle.fileno(), msvcrt.LK_UNLCK, 1)
                    lock_handle.close()
                    if lock_file.exists():
                        lock_file.unlink()
                except Exception as e:
                    logger.error(f"释放文件锁失败: {e}")

    def normalize_message(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """标准化消息格式"""
        try:
            # 记录原始消息用于调试
            logger.debug(f"原始消息: {json.dumps(message, ensure_ascii=False)}")
            
            # 解析消息类型
            msg_type = "text"  # 默认类型
            if isinstance(message, dict):
                raw_type = message.get("type", "")
                if "#" in raw_type:
                    msg_type = raw_type.split("#")[1].split("[")[0]
                    msg_type = self.MESSAGE_TYPES.get(msg_type, "text")
            
            # 解析发送者和群组信息
            room_name = ""
            sender_name = ""
            
            # 解析消息头部信息，格式如：🗣Contact<name>@👥Room<group>
            if "talker" in message:
                header = str(message["talker"])
                if "@" in header:
                    parts = header.split("@")
                    contact_part = parts[0]
                    room_part = parts[1]
                    
                    # 提取发送者名称
                    if "<" in contact_part and ">" in contact_part:
                        sender_name = contact_part.split("<")[1].split(">")[0]
                    
                    # 提取群组名称
                    if "<" in room_part and ">" in room_part:
                        room_name = room_part.split("<")[1].split(">")[0]
                else:
                    # 私聊消息
                    if "<" in header and ">" in header:
                        sender_name = header.split("<")[1].split(">")[0]
            
            # 构建标准化消息
            normalized_msg = {
                "type": msg_type,
                "timestamp": datetime.now().isoformat(),
                "room_id": message.get("room_id", ""),
                "room_name": room_name,
                "sender_id": message.get("talker_id", ""),
                "sender_name": sender_name,
                "content": message.get("content", ""),
                "raw_message": message
            }
            
            # 处理图片消息
            if msg_type == "image":
                # 处理pic_msg字段
                if "pic_msg" in message:
                    try:
                        pic_paths = message["pic_msg"]
                        if isinstance(pic_paths, str):
                            pic_paths = json.loads(pic_paths)
                        
                        if isinstance(pic_paths, list):
                            # 过滤并优先使用Image目录下的原图
                            image_paths = [p for p in pic_paths if "\\Image\\" in p]
                            if not image_paths:
                                image_paths = pic_paths
                            
                            # 去重路径
                            image_paths = list(dict.fromkeys(image_paths))
                            
                            normalized_msg["media"] = {
                                "type": "image",
                                "file_paths": image_paths,
                                "file_name": f"image_{datetime.now().strftime('%Y%m%d_%H%M%S')}.dat",
                                "original_paths": pic_paths
                            }
                            logger.info(f"处理图片路径: {image_paths}")
                    except Exception as e:
                        logger.error(f"处理pic_msg失败: {e}", exc_info=True)
            
            return normalized_msg
            
        except Exception as e:
            logger.error(f"消息格式化失败: {e}", exc_info=True)
            return message

    def _save_media_message(self, message: Dict[str, Any]) -> bool:
        """保存媒体消息"""
        try:
            msg_type = message.get("type", "")
            media_type = self.MEDIA_TYPES.get(msg_type)
            
            if not media_type:
                logger.warning(f"未知的媒体类型: {msg_type}")
                return False
            
            # 获取聊天信息
            room_id = message.get("room_id", "unknown_room")
            chat_dir = self.base_dir / room_id
            chat_dir.mkdir(parents=True, exist_ok=True)
            
            # 创建媒体目录
            date_str = datetime.now().strftime("%Y%m")
            media_dir = chat_dir / "media" / media_type / date_str
            media_dir.mkdir(parents=True, exist_ok=True)
            
            # 保存媒体文件
            if msg_type == "Message#Image" and "pic_msg" in message:
                saved = self._save_image_files(message["pic_msg"], media_dir)
            elif "file_path" in message:
                saved = self._save_single_file(message["file_path"], media_dir)
            else:
                saved = True  # 如果没有文件需要保存，也认为是成功的
            
            # 保存消息记录到日志文件
            log_file = chat_dir / f"{date_str}.json"
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "type": msg_type,
                "sender": message.get("talker", ""),
                "media_type": media_type,
                "content": message.get("content", ""),
                "saved": saved
            }
            
            with log_file.open("a", encoding="utf-8") as f:
                json.dump(log_entry, f, ensure_ascii=False)
                f.write("\n")
            
            return True
            
        except Exception as e:
            logger.error(f"保存媒体消息失败: {e}", exc_info=True)
            return False
    
    def _save_image_files(self, pic_paths: list, media_dir: Path) -> bool:
        """保存图片文件"""
        try:
            for pic_path in pic_paths:
                if "\\Image\\" in pic_path:  # 只保存原图，忽略缩略图
                    source_path = Path(pic_path.replace("\\", "/"))
                    if source_path.exists():
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        new_name = f"{timestamp}_{source_path.name}"
                        target_path = media_dir / new_name
                        shutil.copy2(source_path, target_path)
                        logger.info(f"保存图片: {target_path}")
            return True
        except Exception as e:
            logger.error(f"保存图片失败: {e}", exc_info=True)
            return False
    
    def _save_single_file(self, file_path: str, media_dir: Path) -> bool:
        """保存单个文件"""
        try:
            source_path = Path(file_path.replace("\\", "/"))
            if source_path.exists():
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                new_name = f"{timestamp}_{source_path.name}"
                target_path = media_dir / new_name
                shutil.copy2(source_path, target_path)
                logger.info(f"保存文件: {target_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"保存文件失败: {e}", exc_info=True)
            return False
    
    def _save_text_message(self, message: Dict[str, Any]) -> bool:
        """保存文本消息"""
        try:
            room_id = message.get("room_id", "unknown_room")
            chat_dir = self.base_dir / room_id
            chat_dir.mkdir(parents=True, exist_ok=True)
            
            date_str = datetime.now().strftime("%Y%m")
            log_file = chat_dir / f"{date_str}.json"
            
            log_entry = {
                "timestamp": datetime.now().isoformat(),
                "type": "text",
                "sender": message.get("talker", ""),
                "content": message.get("content", "")
            }
            
            with log_file.open("a", encoding="utf-8") as f:
                json.dump(log_entry, f, ensure_ascii=False)
                f.write("\n")
            
            return True
            
        except Exception as e:
            logger.error(f"保存文本消息失败: {e}", exc_info=True)
            return False

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