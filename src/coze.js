"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var modelFactory_js_1 = require("./services/modelFactory.js");
var config_js_1 = require("./config.js");
var wechaty_puppet_1 = require("wechaty-puppet");
var fs = require("fs");
var path = require("path");
var tesseract_js_1 = require("tesseract.js");
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Unknown"] = 0] = "Unknown";
    MessageType[MessageType["Attachment"] = 1] = "Attachment";
    MessageType[MessageType["Audio"] = 2] = "Audio";
    MessageType[MessageType["Contact"] = 3] = "Contact";
    MessageType[MessageType["ChatHistory"] = 4] = "ChatHistory";
    MessageType[MessageType["Emoticon"] = 5] = "Emoticon";
    MessageType[MessageType["Image"] = 6] = "Image";
    MessageType[MessageType["Text"] = 7] = "Text";
    MessageType[MessageType["Location"] = 8] = "Location";
    MessageType[MessageType["MiniProgram"] = 9] = "MiniProgram";
    MessageType[MessageType["GroupNote"] = 10] = "GroupNote";
    MessageType[MessageType["Transfer"] = 11] = "Transfer";
    MessageType[MessageType["RedEnvelope"] = 12] = "RedEnvelope";
    MessageType[MessageType["Recalled"] = 13] = "Recalled";
    MessageType[MessageType["Url"] = 14] = "Url";
    MessageType[MessageType["Video"] = 15] = "Video";
    MessageType[MessageType["Post"] = 16] = "Post";
})(MessageType || (MessageType = {}));
/**
 * CozeBot - Wechaty Coze Bot Implementation
 * @description 基于 Wechaty 的 Coze 机器人实现
 */
var CozeBot = /** @class */ (function () {
    function CozeBot(bot) {
        var _this = this;
        this.bot = bot;
        // chatbot name (WeChat account name)
        this.botName = '';
        // chatbot start time (prevent duplicate response on restart)
        this.startTime = new Date();
        // self-chat may cause some issue for some WeChat Account
        // please set to true if self-chat cause some errors
        this.disableSelfChat = false;
        // chatbot trigger keyword
        this.cozeTriggerKeyword = config_js_1.Config.cozeTriggerKeyword;
        // Coze error response
        this.cozeErrorMessage = '🤖️：AI智能体摆烂了，请稍后再试～';
        // Coze system content configuration (guided by OpenAI official document)
        this.currentDate = new Date().toISOString().split('T')[0] || '';
        // message size for a single reply by the bot
        this.SINGLE_MESSAGE_MAX_SIZE = 800;
        // 存储用户历史消息
        this.messageHistory = new Map();
        // 历史消息的最大条数
        this.MAX_HISTORY_LENGTH = 10;
        // 清理超时的历史记录（默认30分钟）
        this.HISTORY_TIMEOUT = 30 * 60 * 1000;
        // 记录最后活动时间
        this.lastActiveTime = new Map();
        // 历史消息文件存储目录
        this.HISTORY_DIR = 'chat_history';
        // 文件同步间隔（5分钟）
        this.SYNC_INTERVAL = 5 * 60 * 1000;
        // 定时任务的目标群聊ID
        this.TARGET_ROOM_ID = '49030987852@chatroom';
        // 定时任务的消息内容
        this.DAILY_MESSAGE = '深圳梧山，新的一天开始了';
        // 保存定时器引用
        this.scheduleTimer = null;
        // 群聊消息保存目录
        this.CHAT_LOGS_DIR = 'chat_logs';
        // 多媒体文件保存目录
        this.MEDIA_DIR = 'media';
        // OCR Worker
        this.ocrWorker = null;
        this.isInitializingOcr = false;
        this.maxOcrRetries = 3;
        this.ocrRetryDelay = 5000;
        this.OCR_DATA_DIR = 'ocr_data';
        this.modelService = modelFactory_js_1.ModelFactory.createModel(config_js_1.Config.modelConfig);
        this.startTime = new Date();
        // 创建历史记录目录
        if (!fs.existsSync(this.HISTORY_DIR)) {
            fs.mkdirSync(this.HISTORY_DIR, { recursive: true });
        }
        // 创建群聊消息保存目录
        if (!fs.existsSync(this.CHAT_LOGS_DIR)) {
            fs.mkdirSync(this.CHAT_LOGS_DIR, { recursive: true });
        }
        // 创建多媒体文件保存目录
        if (!fs.existsSync(this.MEDIA_DIR)) {
            fs.mkdirSync(this.MEDIA_DIR, { recursive: true });
        }
        // 创建 OCR 数据目录
        if (!fs.existsSync(this.OCR_DATA_DIR)) {
            fs.mkdirSync(this.OCR_DATA_DIR, { recursive: true });
        }
        // 加载历史消息
        this.loadHistoryFromFiles();
        // 定期清理过期的历史记录
        setInterval(function () { return _this.cleanExpiredHistory(); }, this.HISTORY_TIMEOUT);
        // 定期同步历史记录到文件
        setInterval(function () { return _this.syncHistoryToFiles(); }, this.SYNC_INTERVAL);
        // 启动定时任务
        this.scheduleDailyMessage();
        // 初始化 OCR Worker（使用异步方式）
        this.initOcrWorker().then(function () {
            // 测试 OCR
            _this.testOcr('media/48909592840@chatroom/2025-02-08/1738951974788_message-cm6v33v5i00007w9y15l934um-url-1.jpg');
        })["catch"](function (e) {
            wechaty_puppet_1.log.error('CozeBot', 'OCR Worker 初始化失败（构造函数）:', e);
        });
        // 监听群成员加入事件
        this.bot.on('room-join', function (room, inviteeList, _inviter) { return __awaiter(_this, void 0, void 0, function () {
            var newMemberNames, welcomeMessage, userId, chatgptReplyMessage, wholeReplyMessage, e_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 7, , 8]);
                        // 检查是否是目标群聊
                        if (!config_js_1.Config.welcomeRoomIds.includes(room.id)) {
                            wechaty_puppet_1.log.info('CozeBot', "\u7FA4 ".concat(room.id, " \u4E0D\u5728\u6B22\u8FCE\u8BED\u76EE\u6807\u7FA4\u5217\u8868\u4E2D\uFF0C\u8DF3\u8FC7\u6B22\u8FCE"));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Promise.all(inviteeList.map(function (contact) { return __awaiter(_this, void 0, void 0, function () {
                                var name, alias;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            name = contact.name();
                                            return [4 /*yield*/, room.alias(contact)];
                                        case 1:
                                            alias = _a.sent();
                                            return [2 /*return*/, alias || name];
                                    }
                                });
                            }); }))];
                    case 1:
                        newMemberNames = _a.sent();
                        welcomeMessage = "\u6B22\u8FCE\u65B0\u6210\u5458 ".concat(newMemberNames.join('、'), " \u52A0\u5165\u7FA4\uFF0C\u53D1\u73B0\u751F\u547D\u4E4B\u7F8E\uFF01");
                        wechaty_puppet_1.log.info('CozeBot', "\u53D1\u9001\u6B22\u8FCE\u6D88\u606F: ".concat(welcomeMessage));
                        // 保存欢迎消息到群聊记录
                        return [4 /*yield*/, this.saveGroupMessage(room, this.bot.currentUser, welcomeMessage)];
                    case 2:
                        // 保存欢迎消息到群聊记录
                        _a.sent();
                        userId = "group_".concat(room.id, "_welcome");
                        return [4 /*yield*/, this.onChat(welcomeMessage, userId)];
                    case 3:
                        chatgptReplyMessage = _a.sent();
                        if (!chatgptReplyMessage) return [3 /*break*/, 6];
                        wholeReplyMessage = "".concat(welcomeMessage, "\n----------\n").concat(chatgptReplyMessage);
                        return [4 /*yield*/, this.reply(room, wholeReplyMessage)];
                    case 4:
                        _a.sent();
                        // 保存AI回复到群聊记录
                        return [4 /*yield*/, this.saveGroupMessage(room, this.bot.currentUser, chatgptReplyMessage)];
                    case 5:
                        // 保存AI回复到群聊记录
                        _a.sent();
                        wechaty_puppet_1.log.info('CozeBot', '欢迎消息发送成功');
                        _a.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        e_1 = _a.sent();
                        wechaty_puppet_1.log.error('CozeBot', '处理新成员加入事件失败:', e_1);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        }); });
    }
    // set bot name during login stage
    CozeBot.prototype.setBotName = function (botName) {
        this.botName = botName;
    };
    Object.defineProperty(CozeBot.prototype, "chatGroupTriggerKeyword", {
        // get trigger keyword in group chat: (@Name <keyword>)
        // in group chat, replace the special character after "@username" to space
        // to prevent cross-platfrom mention issue
        get: function () {
            return "@".concat(this.botName, " ").concat(this.cozeTriggerKeyword || '');
        },
        enumerable: false,
        configurable: true
    });
    // configure API with model API keys and run an initial test
    CozeBot.prototype.startCozeBot = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    // Hint user the trigger keyword in private chat and group chat
                    console.log("\uD83E\uDD16\uFE0F Coze name is: ".concat(this.botName));
                    console.log("\uD83C\uDFAF Trigger keyword in private chat is: ".concat(this.cozeTriggerKeyword));
                    console.log("\uD83C\uDFAF Trigger keyword in group chat is: ".concat(this.chatGroupTriggerKeyword));
                    // Run an initial test to confirm API works fine
                    // await this.onChat("Say Hello World");
                    console.log("\u2705 Coze starts success, ready to handle message!");
                }
                catch (e) {
                    console.error("\u274C ".concat(e));
                }
                return [2 /*return*/];
            });
        });
    };
    // 添加字符集检测函数
    CozeBot.prototype.isUtf8mb4 = function (str) {
        return /[\u{10000}-\u{10FFFF}]/u.test(str);
    };
    // 添加字符集处理函数
    CozeBot.prototype.handleUtf8mb4Text = function (text) {
        if (!text)
            return text;
        // 检测是否包含 utf8mb4 字符
        var hasUtf8mb4 = this.isUtf8mb4(text);
        if (hasUtf8mb4) {
            console.log('检测到 utf8mb4 字符');
        }
        return text;
    };
    // check whether Coze bot can be triggered
    CozeBot.prototype.triggerCozeMessage = function (text, isPrivateChat) {
        if (isPrivateChat === void 0) { isPrivateChat = false; }
        return __awaiter(this, void 0, void 0, function () {
            var returnText, triggered, textMention, startsWithMention, endsWithMention, textWithoutMention, textWithoutMention;
            return __generator(this, function (_a) {
                returnText = '';
                triggered = false;
                if (isPrivateChat) {
                    returnText = text;
                }
                else {
                    textMention = "@".concat(this.botName);
                    startsWithMention = text.startsWith(textMention);
                    endsWithMention = text.endsWith(textMention);
                    if (startsWithMention) {
                        textWithoutMention = text.slice(textMention.length).trim();
                        if (textWithoutMention) {
                            triggered = true;
                            returnText = textWithoutMention;
                        }
                    }
                    else if (endsWithMention) {
                        textWithoutMention = text.slice(0, -textMention.length).trim();
                        if (textWithoutMention) {
                            triggered = true;
                            returnText = textWithoutMention;
                        }
                    }
                    // 保留特殊关键词触发
                    else if (text.includes('恭喜发财')) {
                        triggered = true;
                        returnText = "恭喜发财！介绍一下自己，你有什么能力";
                    }
                }
                if (triggered) {
                    console.log("\uD83C\uDFAF Coze triggered: ".concat(returnText));
                }
                return [2 /*return*/, returnText];
            });
        });
    };
    // filter out the message that does not need to be processed
    CozeBot.prototype.isNonsense = function (talker, _messageType, text) {
        return ((this.disableSelfChat && talker.self()) ||
            // 虽然可能误伤，但是更全面地过滤
            talker.name().includes('微信') ||
            // video or voice reminder
            text.includes('收到一条视频/语音聊天消息，请在手机上查看') ||
            // red pocket reminder
            text.includes('收到红包，请在手机上查看') ||
            // location information
            text.includes('/cgi-bin/mmwebwx-bin/webwxgetpubliclinkimg'));
    };
    // 从文件加载历史消息
    CozeBot.prototype.loadHistoryFromFiles = function () {
        try {
            var files = fs.readdirSync(this.HISTORY_DIR);
            for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                var file = files_1[_i];
                if (file.endsWith('.json')) {
                    var userId = file.replace('.json', '');
                    var filePath = path.join(this.HISTORY_DIR, file);
                    var content = fs.readFileSync(filePath, 'utf-8');
                    try {
                        var data = JSON.parse(content);
                        if (data.messages && Array.isArray(data.messages)) {
                            this.messageHistory.set(userId, data.messages);
                            this.lastActiveTime.set(userId, data.lastActiveTime || Date.now());
                        }
                    }
                    catch (e) {
                        wechaty_puppet_1.log.error('CozeBot', "Failed to parse history file ".concat(file, ":"), e);
                    }
                }
            }
            wechaty_puppet_1.log.info('CozeBot', "Loaded history for ".concat(this.messageHistory.size, " users"));
        }
        catch (e) {
            wechaty_puppet_1.log.error('CozeBot', 'Failed to load history files:', e);
        }
    };
    // 同步历史记录到文件
    CozeBot.prototype.syncHistoryToFiles = function () {
        try {
            for (var _i = 0, _a = this.messageHistory.entries(); _i < _a.length; _i++) {
                var _b = _a[_i], userId = _b[0], messages = _b[1];
                var lastActiveTime = this.lastActiveTime.get(userId) || Date.now();
                var filePath = path.join(this.HISTORY_DIR, "".concat(userId, ".json"));
                var data = {
                    userId: userId,
                    messages: messages,
                    lastActiveTime: lastActiveTime,
                    lastSync: Date.now()
                };
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
            }
            wechaty_puppet_1.log.info('CozeBot', "Synced history for ".concat(this.messageHistory.size, " users"));
        }
        catch (e) {
            wechaty_puppet_1.log.error('CozeBot', 'Failed to sync history to files:', e);
        }
    };
    // 清理过期的历史记录（同时清理文件）
    CozeBot.prototype.cleanExpiredHistory = function () {
        var now = Date.now();
        for (var _i = 0, _a = this.lastActiveTime.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], userId = _b[0], lastTime = _b[1];
            if (now - lastTime > this.HISTORY_TIMEOUT) {
                this.messageHistory["delete"](userId);
                this.lastActiveTime["delete"](userId);
                // 删除过期的历史文件
                try {
                    var filePath = path.join(this.HISTORY_DIR, "".concat(userId, ".json"));
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
                catch (e) {
                    wechaty_puppet_1.log.error('CozeBot', "Failed to delete expired history file for ".concat(userId, ":"), e);
                }
            }
        }
    };
    // create messages for Coze API request
    CozeBot.prototype.createMessages = function (text, userId) {
        // 获取历史消息
        var history = this.messageHistory.get(userId) || [];
        // 创建新消息
        var newMessage = {
            role: 'user',
            content: text,
            content_type: 'text'
        };
        // 更新历史消息
        var updatedHistory = __spreadArray(__spreadArray([], history, true), [newMessage], false);
        // 如果超过最大长度，只保留最近的消息
        var trimmedHistory = updatedHistory.slice(-this.MAX_HISTORY_LENGTH);
        // 更新存储
        this.messageHistory.set(userId, trimmedHistory);
        this.lastActiveTime.set(userId, Date.now());
        return trimmedHistory;
    };
    // 添加AI回复到历史记录（同时触发文件同步）
    CozeBot.prototype.addAssistantMessageToHistory = function (userId, content) {
        return __awaiter(this, void 0, void 0, function () {
            var history, assistantMessage, updatedHistory, trimmedHistory, filePath, data, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        history = this.messageHistory.get(userId) || [];
                        assistantMessage = {
                            role: 'assistant',
                            content: content,
                            content_type: 'text'
                        };
                        updatedHistory = __spreadArray(__spreadArray([], history, true), [assistantMessage], false);
                        trimmedHistory = updatedHistory.slice(-this.MAX_HISTORY_LENGTH);
                        this.messageHistory.set(userId, trimmedHistory);
                        this.lastActiveTime.set(userId, Date.now());
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        filePath = path.join(this.HISTORY_DIR, "".concat(userId, ".json"));
                        data = {
                            userId: userId,
                            messages: trimmedHistory,
                            lastActiveTime: Date.now(),
                            lastSync: Date.now()
                        };
                        return [4 /*yield*/, fs.promises.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_2 = _a.sent();
                        wechaty_puppet_1.log.error('CozeBot', "Failed to sync history file for ".concat(userId, ":"), e_2);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // send question to Coze with OpenAI API and get answer
    CozeBot.prototype.onChat = function (text, userId) {
        return __awaiter(this, void 0, void 0, function () {
            var inputMessages, response, e_3, fallbackService, response, fallbackError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!userId) {
                            wechaty_puppet_1.log.warn('CozeBot', 'Missing user id, using default');
                            userId = 'default_user';
                        }
                        inputMessages = this.createMessages(text, userId);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 12]);
                        return [4 /*yield*/, this.modelService.chat(inputMessages, userId)];
                    case 2:
                        response = _a.sent();
                        console.log("\uD83E\uDD16\uFE0F AI says: ".concat(response.message));
                        if (!response.message) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.addAssistantMessageToHistory(userId, response.message)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/, response.message || this.cozeErrorMessage];
                    case 5:
                        e_3 = _a.sent();
                        console.error("\u274C ".concat(e_3));
                        if (!config_js_1.Config.fallbackModel) return [3 /*break*/, 11];
                        _a.label = 6;
                    case 6:
                        _a.trys.push([6, 10, , 11]);
                        fallbackService = modelFactory_js_1.ModelFactory.createModel(config_js_1.Config.fallbackModel);
                        return [4 /*yield*/, fallbackService.chat(inputMessages, userId)];
                    case 7:
                        response = _a.sent();
                        if (!response.message) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.addAssistantMessageToHistory(userId, response.message)];
                    case 8:
                        _a.sent();
                        _a.label = 9;
                    case 9: return [2 /*return*/, response.message || this.cozeErrorMessage];
                    case 10:
                        fallbackError_1 = _a.sent();
                        console.error('Fallback model failed:', fallbackError_1);
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/, this.cozeErrorMessage];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    // reply with the segmented messages from a single-long message
    CozeBot.prototype.reply = function (talker, message) {
        return __awaiter(this, void 0, void 0, function () {
            var messages, _i, messages_1, msg;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // 添加 utf8mb4 处理
                        message = this.handleUtf8mb4Text(message);
                        messages = [];
                        while (message.length > this.SINGLE_MESSAGE_MAX_SIZE) {
                            messages.push(message.slice(0, this.SINGLE_MESSAGE_MAX_SIZE));
                            message = message.slice(this.SINGLE_MESSAGE_MAX_SIZE);
                        }
                        messages.push(message);
                        _i = 0, messages_1 = messages;
                        _a.label = 1;
                    case 1:
                        if (!(_i < messages_1.length)) return [3 /*break*/, 5];
                        msg = messages_1[_i];
                        // 添加延迟
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                    case 2:
                        // 添加延迟
                        _a.sent();
                        return [4 /*yield*/, talker.say(msg)];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 1];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // reply to private message
    CozeBot.prototype.onPrivateMessage = function (talker, text) {
        return __awaiter(this, void 0, void 0, function () {
            var userId, chatgptReplyMessage, e_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        userId = "private_".concat(talker.id || talker.name() || 'unknown');
                        return [4 /*yield*/, this.onChat(text, userId)];
                    case 1:
                        chatgptReplyMessage = _a.sent();
                        if (!chatgptReplyMessage) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.reply(talker, chatgptReplyMessage)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_4 = _a.sent();
                        wechaty_puppet_1.log.error('CozeBot', 'Failed to handle private message:', e_4);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // reply to group message
    CozeBot.prototype.onGroupMessage = function (room, text, name) {
        return __awaiter(this, void 0, void 0, function () {
            var roomInfo, userId, chatgptReplyMessage, wholeReplyMessage, sendInfo, e_5;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        _a = {
                            roomId: room.id,
                            isReady: room.isReady
                        };
                        return [4 /*yield*/, room.memberAll()];
                    case 1:
                        roomInfo = (_a.memberCount = (_b.sent()).length,
                            _a.roomType = room.toString(),
                            _a);
                        wechaty_puppet_1.log.info('CozeBot', '[正常群聊] Room详细信息: ' + JSON.stringify(roomInfo, null, 2));
                        userId = "group_".concat(room.id, "_user_").concat(name);
                        return [4 /*yield*/, this.onChat(text, userId)];
                    case 2:
                        chatgptReplyMessage = _b.sent();
                        if (!chatgptReplyMessage) {
                            return [2 /*return*/];
                        }
                        wholeReplyMessage = "".concat(text, "\n----------\n").concat(chatgptReplyMessage);
                        sendInfo = {
                            roomId: room.id,
                            messageLength: wholeReplyMessage.length,
                            isReady: room.isReady
                        };
                        wechaty_puppet_1.log.info('CozeBot', '[正常群聊] 准备发送回复，Room状态: ' + JSON.stringify(sendInfo, null, 2));
                        return [4 /*yield*/, this.reply(room, wholeReplyMessage)];
                    case 3:
                        _b.sent();
                        // 保存AI回复到群聊记录
                        return [4 /*yield*/, this.saveGroupMessage(room, this.bot.currentUser, chatgptReplyMessage)];
                    case 4:
                        // 保存AI回复到群聊记录
                        _b.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_5 = _b.sent();
                        wechaty_puppet_1.log.error('CozeBot', 'Failed to handle group message:', e_5);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    // Check if the talker is in the blacklist
    CozeBot.prototype.isBlacklisted = function (talkerName) {
        return !!config_js_1.Config.blacklist && config_js_1.Config.blacklist.includes(talkerName);
    };
    // 检查群聊ID是否有效
    CozeBot.prototype.isValidRoomId = function (roomId) {
        return typeof roomId === 'string' && roomId.length > 0;
    };
    // 格式化日期为 YYYY-MM-DD 格式
    CozeBot.prototype.formatDate = function (date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return "".concat(year, "-").concat(month, "-").concat(day);
    };
    // 保存群聊消息到本地文件
    CozeBot.prototype.saveGroupMessage = function (room, talker, message) {
        return __awaiter(this, void 0, void 0, function () {
            var roomId, now, dateStr, timestamp, talkerName, roomAlias, logEntry, msg, text, mediaPath, fileName, filePath, roomDir, logs, content, e_6;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 7, , 8]);
                        // 检查必要的参数
                        if (!room || !talker) {
                            wechaty_puppet_1.log.error('CozeBot', '无效的房间或发送者');
                            return [2 /*return*/];
                        }
                        roomId = room.id;
                        // 确保 roomId 存在且为字符串类型
                        if (!this.isValidRoomId(roomId)) {
                            wechaty_puppet_1.log.error('CozeBot', '无效的群聊ID');
                            return [2 /*return*/];
                        }
                        now = new Date();
                        dateStr = this.formatDate(now);
                        timestamp = now.toLocaleString();
                        talkerName = talker.name();
                        return [4 /*yield*/, room.alias(talker)];
                    case 1:
                        roomAlias = (_b.sent()) || talkerName;
                        _a = {
                            timestamp: timestamp,
                            roomId: roomId
                        };
                        return [4 /*yield*/, room.topic()];
                    case 2:
                        logEntry = (_a.roomTopic = _b.sent(),
                            _a.senderId = talker.id,
                            _a.senderName = talkerName,
                            _a.senderAlias = roomAlias,
                            _a);
                        if (!(typeof message === 'string')) return [3 /*break*/, 3];
                        // 文本消息
                        logEntry.type = 'text';
                        logEntry.content = message;
                        return [3 /*break*/, 5];
                    case 3:
                        msg = message;
                        logEntry.type = MessageType[msg.type()];
                        logEntry.messageId = msg.id;
                        text = msg.text();
                        if (text && text.length > 0) { // 确保文本内容存在且不为空
                            logEntry.text = text;
                        }
                        return [4 /*yield*/, this.saveMediaFile(msg, roomId)];
                    case 4:
                        mediaPath = _b.sent();
                        if (mediaPath) {
                            logEntry.mediaPath = mediaPath;
                        }
                        _b.label = 5;
                    case 5:
                        fileName = "".concat(dateStr, ".json");
                        filePath = path.join(this.CHAT_LOGS_DIR, roomId, fileName);
                        roomDir = path.join(this.CHAT_LOGS_DIR, roomId);
                        if (!fs.existsSync(roomDir)) {
                            fs.mkdirSync(roomDir, { recursive: true });
                        }
                        logs = [];
                        if (fs.existsSync(filePath)) {
                            content = fs.readFileSync(filePath, 'utf-8');
                            logs = JSON.parse(content);
                        }
                        // 添加新消息
                        logs.push(logEntry);
                        // 保存到文件
                        return [4 /*yield*/, fs.promises.writeFile(filePath, JSON.stringify(logs, null, 2), 'utf-8')];
                    case 6:
                        // 保存到文件
                        _b.sent();
                        wechaty_puppet_1.log.info('CozeBot', "\u7FA4\u804A\u6D88\u606F\u5DF2\u4FDD\u5B58: ".concat(filePath));
                        return [3 /*break*/, 8];
                    case 7:
                        e_6 = _b.sent();
                        wechaty_puppet_1.log.error('CozeBot', '保存群聊消息失败:', e_6);
                        return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    // 初始化 OCR Worker
    CozeBot.prototype.initOcrWorker = function (retryCount) {
        if (retryCount === void 0) { retryCount = 0; }
        return __awaiter(this, void 0, void 0, function () {
            var _a, langError_1, engError_1, e_7, termError_1;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // 如果已经在初始化中，直接返回
                        if (this.isInitializingOcr) {
                            wechaty_puppet_1.log.info('CozeBot', 'OCR Worker 正在初始化中...');
                            return [2 /*return*/];
                        }
                        // 如果已经初始化成功，直接返回
                        if (this.ocrWorker) {
                            wechaty_puppet_1.log.info('CozeBot', 'OCR Worker 已经初始化');
                            return [2 /*return*/];
                        }
                        this.isInitializingOcr = true;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 13, , 21]);
                        wechaty_puppet_1.log.info('CozeBot', "\u5F00\u59CB\u521D\u59CB\u5316 OCR Worker (\u5C1D\u8BD5 ".concat(retryCount + 1, "/").concat(this.maxOcrRetries, ")"));
                        _a = this;
                        return [4 /*yield*/, (0, tesseract_js_1.createWorker)()];
                    case 2:
                        _a.ocrWorker = _b.sent();
                        // 加载中文和英文训练数据
                        wechaty_puppet_1.log.info('CozeBot', '正在加载 OCR 语言数据...');
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 6, , 12]);
                        return [4 /*yield*/, this.ocrWorker.loadLanguage('chi_sim+eng')];
                    case 4:
                        _b.sent();
                        return [4 /*yield*/, this.ocrWorker.initialize('chi_sim+eng')];
                    case 5:
                        _b.sent();
                        wechaty_puppet_1.log.info('CozeBot', 'OCR Worker 初始化成功');
                        this.isInitializingOcr = false;
                        return [3 /*break*/, 12];
                    case 6:
                        langError_1 = _b.sent();
                        // 如果加载中文失败，尝试只加载英文
                        wechaty_puppet_1.log.warn('CozeBot', '加载中文训练数据失败，尝试只加载英文:', langError_1);
                        _b.label = 7;
                    case 7:
                        _b.trys.push([7, 10, , 11]);
                        return [4 /*yield*/, this.ocrWorker.loadLanguage('eng')];
                    case 8:
                        _b.sent();
                        return [4 /*yield*/, this.ocrWorker.initialize('eng')];
                    case 9:
                        _b.sent();
                        wechaty_puppet_1.log.info('CozeBot', 'OCR Worker 初始化成功 (仅英文)');
                        this.isInitializingOcr = false;
                        return [3 /*break*/, 11];
                    case 10:
                        engError_1 = _b.sent();
                        throw new Error("\u65E0\u6CD5\u52A0\u8F7D\u4EFB\u4F55\u8BED\u8A00\u6570\u636E: ".concat(engError_1));
                    case 11: return [3 /*break*/, 12];
                    case 12: return [3 /*break*/, 21];
                    case 13:
                        e_7 = _b.sent();
                        this.isInitializingOcr = false;
                        if (!this.ocrWorker) return [3 /*break*/, 17];
                        _b.label = 14;
                    case 14:
                        _b.trys.push([14, 16, , 17]);
                        return [4 /*yield*/, this.ocrWorker.terminate()];
                    case 15:
                        _b.sent();
                        return [3 /*break*/, 17];
                    case 16:
                        termError_1 = _b.sent();
                        wechaty_puppet_1.log.error('CozeBot', 'Worker 终止失败:', termError_1);
                        return [3 /*break*/, 17];
                    case 17:
                        this.ocrWorker = null;
                        wechaty_puppet_1.log.error('CozeBot', "OCR Worker \u521D\u59CB\u5316\u5931\u8D25 (\u5C1D\u8BD5 ".concat(retryCount + 1, "/").concat(this.maxOcrRetries, "):"), e_7);
                        if (!(retryCount < this.maxOcrRetries - 1)) return [3 /*break*/, 19];
                        wechaty_puppet_1.log.info('CozeBot', "".concat(this.ocrRetryDelay / 1000, " \u79D2\u540E\u91CD\u8BD5\u521D\u59CB\u5316 OCR Worker..."));
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, _this.ocrRetryDelay); })];
                    case 18:
                        _b.sent();
                        return [2 /*return*/, this.initOcrWorker(retryCount + 1)];
                    case 19:
                        wechaty_puppet_1.log.error('CozeBot', 'OCR Worker 初始化失败，已达到最大重试次数');
                        _b.label = 20;
                    case 20: return [3 /*break*/, 21];
                    case 21: return [2 /*return*/];
                }
            });
        });
    };
    // 对图片进行 OCR 识别
    CozeBot.prototype.performOcr = function (imagePath) {
        return __awaiter(this, void 0, void 0, function () {
            var result, text, error_1, e;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 7]);
                        wechaty_puppet_1.log.info('CozeBot', "\u5F00\u59CB\u5BF9\u56FE\u7247\u8FDB\u884C OCR \u8BC6\u522B: ".concat(imagePath));
                        // 检查文件是否存在
                        if (!fs.existsSync(imagePath)) {
                            wechaty_puppet_1.log.error('CozeBot', "\u56FE\u7247\u6587\u4EF6\u4E0D\u5B58\u5728: ".concat(imagePath));
                            return [2 /*return*/, null];
                        }
                        if (!!this.ocrWorker) return [3 /*break*/, 2];
                        wechaty_puppet_1.log.info('CozeBot', 'OCR Worker 未初始化，正在初始化...');
                        return [4 /*yield*/, this.initOcrWorker()];
                    case 1:
                        _a.sent();
                        if (!this.ocrWorker) {
                            wechaty_puppet_1.log.error('CozeBot', 'OCR Worker 初始化失败');
                            return [2 /*return*/, null];
                        }
                        _a.label = 2;
                    case 2:
                        wechaty_puppet_1.log.info('CozeBot', '开始识别图片...');
                        return [4 /*yield*/, this.ocrWorker.recognize(imagePath)];
                    case 3:
                        result = _a.sent();
                        text = result.data.text.trim();
                        if (text) {
                            wechaty_puppet_1.log.info('CozeBot', "OCR \u8BC6\u522B\u6210\u529F\uFF0C\u6587\u672C\u957F\u5EA6: ".concat(text.length, " \u5B57\u7B26"));
                            wechaty_puppet_1.log.info('CozeBot', "OCR \u8BC6\u522B\u7ED3\u679C: ".concat(text));
                        }
                        else {
                            wechaty_puppet_1.log.info('CozeBot', 'OCR 识别完成，但未识别出文本');
                        }
                        return [2 /*return*/, text];
                    case 4:
                        error_1 = _a.sent();
                        e = error_1;
                        wechaty_puppet_1.log.error('CozeBot', 'OCR 识别失败:', e);
                        if (!(e.message && (e.message.includes('terminated') || e.message.includes('destroyed')))) return [3 /*break*/, 6];
                        wechaty_puppet_1.log.info('CozeBot', 'Worker 已终止，尝试重新初始化...');
                        this.ocrWorker = null;
                        return [4 /*yield*/, this.initOcrWorker()];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [2 /*return*/, null];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    // 保存多媒体文件
    CozeBot.prototype.saveMediaFile = function (msg, roomId) {
        return __awaiter(this, void 0, void 0, function () {
            var file, thumbnailFile, type, now, dateStr, timestamp, _a, image, artworkError_1, thumbnailError_1, thumbnailError_2, imageError_1, e_8, e_9, e_10, e_11, roomDir, originalName, ext, baseFileName, filePath, saveError_1, thumbnailSaved, thumbnailPath, thumbnailError_3, ocrText, ocrError_1, relativePath, thumbnailRelativePath, e_12;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 44, , 45]);
                        // 验证参数
                        if (!msg || !this.isValidRoomId(roomId)) {
                            wechaty_puppet_1.log.error('CozeBot', '无效的消息或群聊ID');
                            return [2 /*return*/, null];
                        }
                        file = void 0;
                        thumbnailFile = void 0;
                        type = msg.type();
                        now = new Date();
                        dateStr = this.formatDate(now);
                        timestamp = now.getTime();
                        _a = type;
                        switch (_a) {
                            case MessageType.Image: return [3 /*break*/, 1];
                            case MessageType.Video: return [3 /*break*/, 14];
                            case MessageType.Audio: return [3 /*break*/, 18];
                            case MessageType.Attachment: return [3 /*break*/, 22];
                            case MessageType.Emoticon: return [3 /*break*/, 26];
                        }
                        return [3 /*break*/, 30];
                    case 1:
                        _b.trys.push([1, 13, , 14]);
                        image = msg.toImage();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 9]);
                        return [4 /*yield*/, image.artwork()];
                    case 3:
                        file = _b.sent();
                        return [3 /*break*/, 9];
                    case 4:
                        artworkError_1 = _b.sent();
                        wechaty_puppet_1.log.warn('CozeBot', '获取原图失败，尝试获取缩略图:', artworkError_1);
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, image.thumbnail()];
                    case 6:
                        file = _b.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        thumbnailError_1 = _b.sent();
                        wechaty_puppet_1.log.error('CozeBot', '获取缩略图也失败:', thumbnailError_1);
                        return [2 /*return*/, null];
                    case 8: return [3 /*break*/, 9];
                    case 9:
                        _b.trys.push([9, 11, , 12]);
                        return [4 /*yield*/, image.thumbnail()];
                    case 10:
                        thumbnailFile = _b.sent();
                        return [3 /*break*/, 12];
                    case 11:
                        thumbnailError_2 = _b.sent();
                        wechaty_puppet_1.log.warn('CozeBot', '获取缩略图失败:', thumbnailError_2);
                        return [3 /*break*/, 12];
                    case 12: return [3 /*break*/, 31];
                    case 13:
                        imageError_1 = _b.sent();
                        wechaty_puppet_1.log.error('CozeBot', '处理图片消息失败:', imageError_1);
                        return [2 /*return*/, null];
                    case 14:
                        _b.trys.push([14, 16, , 17]);
                        return [4 /*yield*/, msg.toFileBox()];
                    case 15:
                        file = _b.sent();
                        return [3 /*break*/, 17];
                    case 16:
                        e_8 = _b.sent();
                        wechaty_puppet_1.log.error('CozeBot', '获取视频文件失败:', e_8);
                        return [2 /*return*/, null];
                    case 17: return [3 /*break*/, 31];
                    case 18:
                        _b.trys.push([18, 20, , 21]);
                        return [4 /*yield*/, msg.toFileBox()];
                    case 19:
                        file = _b.sent();
                        return [3 /*break*/, 21];
                    case 20:
                        e_9 = _b.sent();
                        wechaty_puppet_1.log.error('CozeBot', '获取音频文件失败:', e_9);
                        return [2 /*return*/, null];
                    case 21: return [3 /*break*/, 31];
                    case 22:
                        _b.trys.push([22, 24, , 25]);
                        return [4 /*yield*/, msg.toFileBox()];
                    case 23:
                        file = _b.sent();
                        return [3 /*break*/, 25];
                    case 24:
                        e_10 = _b.sent();
                        wechaty_puppet_1.log.error('CozeBot', '获取附件失败:', e_10);
                        return [2 /*return*/, null];
                    case 25: return [3 /*break*/, 31];
                    case 26:
                        _b.trys.push([26, 28, , 29]);
                        return [4 /*yield*/, msg.toFileBox()];
                    case 27:
                        file = _b.sent();
                        return [3 /*break*/, 29];
                    case 28:
                        e_11 = _b.sent();
                        wechaty_puppet_1.log.error('CozeBot', '获取表情文件失败:', e_11);
                        return [2 /*return*/, null];
                    case 29: return [3 /*break*/, 31];
                    case 30: return [2 /*return*/, null];
                    case 31:
                        if (!file || !file.name) {
                            wechaty_puppet_1.log.warn('CozeBot', '文件或文件名为空');
                            return [2 /*return*/, null];
                        }
                        roomDir = path.join(this.MEDIA_DIR, roomId, dateStr);
                        if (!fs.existsSync(roomDir)) {
                            fs.mkdirSync(roomDir, { recursive: true });
                        }
                        originalName = file.name;
                        ext = path.extname(originalName) || this.getDefaultExtension(type);
                        baseFileName = "".concat(timestamp, "_").concat(path.basename(originalName, ext));
                        filePath = path.join(roomDir, "".concat(baseFileName).concat(ext));
                        _b.label = 32;
                    case 32:
                        _b.trys.push([32, 34, , 35]);
                        return [4 /*yield*/, file.toFile(filePath, true)];
                    case 33:
                        _b.sent();
                        wechaty_puppet_1.log.info('CozeBot', "\u539F\u59CB\u6587\u4EF6\u5DF2\u4FDD\u5B58: ".concat(filePath));
                        return [3 /*break*/, 35];
                    case 34:
                        saveError_1 = _b.sent();
                        wechaty_puppet_1.log.error('CozeBot', "\u4FDD\u5B58\u539F\u59CB\u6587\u4EF6\u5931\u8D25: ".concat(saveError_1));
                        return [2 /*return*/, null];
                    case 35:
                        thumbnailSaved = false;
                        if (!(type === MessageType.Image && thumbnailFile && thumbnailFile.name)) return [3 /*break*/, 39];
                        _b.label = 36;
                    case 36:
                        _b.trys.push([36, 38, , 39]);
                        thumbnailPath = path.join(roomDir, "".concat(baseFileName, "_thumbnail").concat(ext));
                        return [4 /*yield*/, thumbnailFile.toFile(thumbnailPath, true)];
                    case 37:
                        _b.sent();
                        wechaty_puppet_1.log.info('CozeBot', "\u7F29\u7565\u56FE\u5DF2\u4FDD\u5B58: ".concat(thumbnailPath));
                        thumbnailSaved = true;
                        return [3 /*break*/, 39];
                    case 38:
                        thumbnailError_3 = _b.sent();
                        wechaty_puppet_1.log.warn('CozeBot', '保存缩略图失败:', thumbnailError_3);
                        return [3 /*break*/, 39];
                    case 39:
                        ocrText = null;
                        if (!(type === MessageType.Image)) return [3 /*break*/, 43];
                        _b.label = 40;
                    case 40:
                        _b.trys.push([40, 42, , 43]);
                        return [4 /*yield*/, this.performOcr(filePath)];
                    case 41:
                        ocrText = _b.sent();
                        if (ocrText) {
                            wechaty_puppet_1.log.info('CozeBot', "\u56FE\u7247OCR\u7ED3\u679C: ".concat(ocrText));
                        }
                        return [3 /*break*/, 43];
                    case 42:
                        ocrError_1 = _b.sent();
                        wechaty_puppet_1.log.warn('CozeBot', 'OCR识别失败:', ocrError_1);
                        return [3 /*break*/, 43];
                    case 43:
                        relativePath = path.relative(process.cwd(), filePath);
                        // 如果是图片，返回包含原图、缩略图路径和OCR结果的对象字符串
                        if (type === MessageType.Image) {
                            thumbnailRelativePath = thumbnailSaved ?
                                path.relative(process.cwd(), path.join(roomDir, "".concat(baseFileName, "_thumbnail").concat(ext))) :
                                null;
                            return [2 /*return*/, JSON.stringify({
                                    original: relativePath,
                                    thumbnail: thumbnailRelativePath,
                                    ocrText: ocrText
                                })];
                        }
                        return [2 /*return*/, relativePath];
                    case 44:
                        e_12 = _b.sent();
                        wechaty_puppet_1.log.error('CozeBot', '保存多媒体文件失败:', e_12);
                        return [2 /*return*/, null];
                    case 45: return [2 /*return*/];
                }
            });
        });
    };
    // 根据消息类型获取默认文件扩展名
    CozeBot.prototype.getDefaultExtension = function (type) {
        switch (type) {
            case MessageType.Image:
                return '.jpg';
            case MessageType.Video:
                return '.mp4';
            case MessageType.Audio:
                return '.mp3';
            case MessageType.Emoticon:
                return '.gif';
            case MessageType.Attachment:
                return '.dat';
            default:
                return '.bin';
        }
    };
    // receive a message (main entry)
    CozeBot.prototype.onMessage = function (msg) {
        return __awaiter(this, void 0, void 0, function () {
            var talker, rawText, room, isPrivateChat, roomId, text, name_1, talkerId, alias, e_13;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        talker = msg.talker();
                        rawText = msg.text();
                        room = msg.room();
                        isPrivateChat = !room;
                        if (!(room && !this.isNonsense(talker, msg.type(), rawText))) return [3 /*break*/, 3];
                        roomId = room.id;
                        if (!this.isValidRoomId(roomId)) return [3 /*break*/, 2];
                        // 保存原始消息（包括图片等多媒体消息）
                        return [4 /*yield*/, this.saveGroupMessage(room, talker, msg)];
                    case 1:
                        // 保存原始消息（包括图片等多媒体消息）
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        wechaty_puppet_1.log.error('CozeBot', '无效的群聊ID，跳过消息保存');
                        _a.label = 3;
                    case 3:
                        // 检查黑名单和消息有效性
                        if (this.isBlacklisted(talker.name()) ||
                            this.isNonsense(talker, msg.type(), rawText)) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.triggerCozeMessage(rawText, isPrivateChat)];
                    case 4:
                        text = _a.sent();
                        if (!(text.length > 0)) return [3 /*break*/, 12];
                        name_1 = talker.name();
                        talkerId = talker.id;
                        if (!room) return [3 /*break*/, 8];
                        _a.label = 5;
                    case 5:
                        _a.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, room.alias(talker)];
                    case 6:
                        alias = _a.sent();
                        if (alias) {
                            name_1 = alias;
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        e_13 = _a.sent();
                        wechaty_puppet_1.log.warn('CozeBot', 'Failed to get room alias:', e_13);
                        return [3 /*break*/, 8];
                    case 8:
                        // 确保用户标识符不为空
                        if (!name_1 || !talkerId) {
                            wechaty_puppet_1.log.warn('CozeBot', 'Missing user info, using fallback', {
                                name: name_1,
                                talkerId: talkerId,
                                roomId: room === null || room === void 0 ? void 0 : room.id
                            });
                            name_1 = talkerId || 'unknown_user';
                        }
                        if (!isPrivateChat) return [3 /*break*/, 10];
                        return [4 /*yield*/, this.onPrivateMessage(talker, text)];
                    case 9:
                        _a.sent();
                        return [3 /*break*/, 12];
                    case 10:
                        if (!room) return [3 /*break*/, 12];
                        return [4 /*yield*/, this.onGroupMessage(room, text, name_1)];
                    case 11:
                        _a.sent();
                        _a.label = 12;
                    case 12:
                        // 检查发送者ID是否存在
                        if (!talker.id) {
                            wechaty_puppet_1.log.warn('CozeBot', 'Missing talker ID in message:', {
                                messageType: msg.type(),
                                messageId: msg.id,
                                text: rawText,
                                roomId: (room === null || room === void 0 ? void 0 : room.id) || '',
                                talkerName: talker.name()
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    // 设置定时任务
    CozeBot.prototype.scheduleDailyMessage = function () {
        var _this = this;
        var scheduleMessage = function () { return __awaiter(_this, void 0, void 0, function () {
            var room, roomInfo, allRooms, _i, allRooms_1, r, userId, chatgptReplyMessage, wholeReplyMessage, sendInfo, e_14;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 10, , 11]);
                        wechaty_puppet_1.log.info('CozeBot', "\u5F00\u59CB\u6267\u884C\u5B9A\u65F6\u4EFB\u52A1\uFF0C\u5F53\u524D\u65F6\u95F4: ".concat(new Date().toLocaleString()));
                        // 检查机器人是否在线
                        if (!this.bot.isLoggedIn) {
                            wechaty_puppet_1.log.error('CozeBot', '机器人未登录，无法发送消息');
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.bot.Room.find({ id: this.TARGET_ROOM_ID })];
                    case 1:
                        room = _c.sent();
                        if (!room) return [3 /*break*/, 3];
                        _a = {
                            roomId: room.id,
                            isReady: room.isReady
                        };
                        return [4 /*yield*/, room.memberAll()];
                    case 2:
                        roomInfo = (_a.memberCount = (_c.sent()).length,
                            _a.roomType = room.toString(),
                            _a);
                        wechaty_puppet_1.log.info('CozeBot', '[定时任务] Room详细信息: ' + JSON.stringify(roomInfo, null, 2));
                        _c.label = 3;
                    case 3: return [4 /*yield*/, this.bot.Room.findAll()];
                    case 4:
                        allRooms = _c.sent();
                        wechaty_puppet_1.log.info('CozeBot', "\u5F53\u524D\u53EF\u7528\u7FA4\u804A\u6570\u91CF: ".concat(allRooms.length));
                        wechaty_puppet_1.log.info('CozeBot', '所有可用群聊ID:');
                        for (_i = 0, allRooms_1 = allRooms; _i < allRooms_1.length; _i++) {
                            r = allRooms_1[_i];
                            wechaty_puppet_1.log.info('CozeBot', "\u7FA4ID: ".concat(r.id));
                            if (r.id === this.TARGET_ROOM_ID) {
                                wechaty_puppet_1.log.info('CozeBot', "\u2705 \u627E\u5230\u76EE\u6807\u7FA4\u804AID: ".concat(r.id));
                            }
                        }
                        if (!room) {
                            wechaty_puppet_1.log.error('CozeBot', "\u672A\u627E\u5230\u76EE\u6807\u7FA4\u804A\uFF0CID: ".concat(this.TARGET_ROOM_ID));
                            return [2 /*return*/];
                        }
                        userId = "group_".concat(this.TARGET_ROOM_ID, "_schedule");
                        // 保存定时消息到群聊记录
                        return [4 /*yield*/, this.saveGroupMessage(room, this.bot.currentUser, this.DAILY_MESSAGE)];
                    case 5:
                        // 保存定时消息到群聊记录
                        _c.sent();
                        return [4 /*yield*/, this.onChat(this.DAILY_MESSAGE, userId)];
                    case 6:
                        chatgptReplyMessage = _c.sent();
                        if (!chatgptReplyMessage) {
                            wechaty_puppet_1.log.error('CozeBot', 'Coze API 返回空回复');
                            return [2 /*return*/];
                        }
                        wholeReplyMessage = "".concat(this.DAILY_MESSAGE, "\n----------\n").concat(chatgptReplyMessage);
                        _b = {
                            roomId: room.id,
                            isReady: room.isReady,
                            messageLength: wholeReplyMessage.length,
                            roomType: room.toString()
                        };
                        return [4 /*yield*/, room.memberAll()];
                    case 7:
                        sendInfo = (_b.memberCount = (_c.sent()).length,
                            _b);
                        wechaty_puppet_1.log.info('CozeBot', '[定时任务] 准备发送消息，Room状态: ' + JSON.stringify(sendInfo, null, 2));
                        // 使用与正常群聊相同的发送方式
                        return [4 /*yield*/, this.reply(room, wholeReplyMessage)];
                    case 8:
                        // 使用与正常群聊相同的发送方式
                        _c.sent();
                        // 保存AI回复到群聊记录
                        return [4 /*yield*/, this.saveGroupMessage(room, this.bot.currentUser, chatgptReplyMessage)];
                    case 9:
                        // 保存AI回复到群聊记录
                        _c.sent();
                        wechaty_puppet_1.log.info('CozeBot', '定时消息发送成功');
                        return [3 /*break*/, 11];
                    case 10:
                        e_14 = _c.sent();
                        wechaty_puppet_1.log.error('CozeBot', '定时任务执行失败:', e_14);
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/];
                }
            });
        }); };
        // 计算到今天或明天早上8:00的毫秒数
        var calculateNextTime = function () {
            var now = new Date();
            var next = new Date(now);
            next.setHours(8, 0, 0, 0); // 设置为8:00
            // 如果当前时间已经过了今天的8:00，就设置为明天的8:00
            if (now >= next) {
                next.setDate(next.getDate() + 1);
            }
            return next.getTime() - now.getTime();
        };
        // 设置定时器
        var scheduleNext = function () {
            // 清除之前的定时器
            if (_this.scheduleTimer) {
                clearTimeout(_this.scheduleTimer);
            }
            var timeUntilNext = calculateNextTime();
            _this.scheduleTimer = setTimeout(function () {
                scheduleMessage() // 执行定时任务
                    .then(function () {
                    wechaty_puppet_1.log.info('CozeBot', 'Daily message task completed, scheduling next one');
                    scheduleNext(); // 设置下一次执行
                })["catch"](function (e) {
                    wechaty_puppet_1.log.error('CozeBot', 'Error in daily message task:', e);
                    scheduleNext(); // 即使出错也设置下一次执行
                });
            }, timeUntilNext);
            // 记录下一次执行的时间
            var nextTime = new Date(Date.now() + timeUntilNext);
            wechaty_puppet_1.log.info('CozeBot', "Daily message scheduled, next message will be sent at: ".concat(nextTime.toLocaleString()));
        };
        // 启动定时任务
        scheduleNext();
    };
    // 添加 OCR 测试方法
    CozeBot.prototype.testOcr = function (imagePath) {
        return __awaiter(this, void 0, void 0, function () {
            var text, e_15;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        wechaty_puppet_1.log.info('CozeBot', '开始测试 OCR...');
                        return [4 /*yield*/, this.performOcr(imagePath)];
                    case 1:
                        text = _a.sent();
                        if (text) {
                            wechaty_puppet_1.log.info('CozeBot', 'OCR 测试成功，识别结果:', text);
                        }
                        else {
                            wechaty_puppet_1.log.error('CozeBot', 'OCR 测试失败: 未能识别出文字');
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        e_15 = _a.sent();
                        wechaty_puppet_1.log.error('CozeBot', 'OCR 测试出错:', e_15);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 添加一个公共方法用于测试 OCR
    CozeBot.prototype.testImageOcr = function (imagePath) {
        return __awaiter(this, void 0, void 0, function () {
            var text, e_16;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        wechaty_puppet_1.log.info('CozeBot', '开始 OCR 测试...');
                        return [4 /*yield*/, this.performOcr(imagePath)];
                    case 1:
                        text = _a.sent();
                        if (text) {
                            wechaty_puppet_1.log.info('CozeBot', '=== OCR 测试结果 ===');
                            wechaty_puppet_1.log.info('CozeBot', text);
                            wechaty_puppet_1.log.info('CozeBot', '=== OCR 测试完成 ===');
                        }
                        else {
                            wechaty_puppet_1.log.error('CozeBot', 'OCR 测试失败: 未能识别出文字');
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        e_16 = _a.sent();
                        wechaty_puppet_1.log.error('CozeBot', 'OCR 测试出错:', e_16);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return CozeBot;
}());
exports["default"] = CozeBot;
