"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
exports.__esModule = true;
exports.PuppetXp = void 0;
/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
var cuid_1 = require("cuid");
var path_1 = require("path");
var fs_1 = require("fs");
var promises_1 = require("fs/promises");
var xml2js_1 = require("xml2js");
var os_1 = require("os");
var PUPPET = require("wechaty-puppet");
var wechaty_puppet_1 = require("wechaty-puppet");
var file_box_1 = require("file-box");
var sidecar_1 = require("sidecar");
var config_js_1 = require("./config.js");
var wechat_sidecar_js_1 = require("./wechat-sidecar.js");
var image_decrypt_js_1 = require("./pure-functions/image-decrypt.js");
var xml_msgpayload_js_1 = require("./pure-functions/xml-msgpayload.js");
// import type { Contact } from 'wechaty'
// 定义一个延时方法
function wait(ms) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) { return setTimeout(resolve, ms); })];
        });
    });
}
var userInfo = os_1["default"].userInfo();
var rootPath = "".concat(userInfo.homedir, "\\Documents\\WeChat Files\\");
// 检查文本是否包含 utf8mb4 字符
function isUtf8mb4(text) {
    // 检查是否包含 Unicode 扩展字符(包括 emoji)
    return /[\u{10000}-\u{10FFFF}]/u.test(text);
}
// 处理文件名中的 utf8mb4 字符
function sanitizeFileName(fileName) {
    // 将 utf8mb4 字符替换为下划线
    return fileName.replace(/[\u{10000}-\u{10FFFF}]/gu, '_');
}
// 处理消息文本中的 utf8mb4 字符
function handleUtf8mb4Text(text) {
    if (isUtf8mb4(text)) {
        wechaty_puppet_1.log.info('PuppetXp', "\u68C0\u6D4B\u5230 utf8mb4 \u5B57\u7B26: ".concat(text));
    }
    return text;
}
var PuppetXp = /** @class */ (function (_super) {
    __extends(PuppetXp, _super);
    function PuppetXp(options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        wechaty_puppet_1.log.info('options...', JSON.stringify(options));
        _this = _super.call(this, options) || this;
        _this.options = options;
        _this.isReady = false;
        _PuppetXp_sidecar.set(_this, void 0);
        // 添加缓存
        _this.roomMemberCache = {};
        _this.roomInfoCache = {};
        wechaty_puppet_1.log.verbose('PuppetXp', 'constructor(%s)', JSON.stringify(options));
        // FIXME: use LRU cache for message store so that we can reduce memory usage
        _this.messageStore = {};
        _this.roomStore = {};
        _this.contactStore = {};
        _this.selfInfo = {};
        return _this;
    }
    Object.defineProperty(PuppetXp.prototype, "sidecar", {
        get: function () {
            return __classPrivateFieldGet(this, _PuppetXp_sidecar, "f");
        },
        enumerable: false,
        configurable: true
    });
    PuppetXp.prototype.version = function () {
        return config_js_1.VERSION;
    };
    PuppetXp.prototype.onStart = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wechaty_puppet_1.log.verbose('PuppetXp', 'onStart()');
                        if (__classPrivateFieldGet(this, _PuppetXp_sidecar, "f")) {
                            wechaty_puppet_1.log.warn('PuppetXp', 'onStart() this.#sidecar exists');
                            return [2 /*return*/];
                        }
                        __classPrivateFieldSet(this, _PuppetXp_sidecar, new wechat_sidecar_js_1.WeChatSidecar({
                            version: '3.9.2.23',
                            wechatVersion: '3.9.2.23'
                        }), "f");
                        return [4 /*yield*/, (0, sidecar_1.attach)(this.sidecar)
                            // await this.onLogin()
                        ];
                    case 1:
                        _a.sent();
                        // await this.onLogin()
                        return [4 /*yield*/, this.onAgentReady()];
                    case 2:
                        // await this.onLogin()
                        _a.sent();
                        this.sidecar.on('hook', function (_a) {
                            var method = _a.method, args = _a.args;
                            wechaty_puppet_1.log.verbose('PuppetXp', 'onHook(%s, %s)', method, JSON.stringify(args));
                            switch (method) {
                                case 'recvMsg':
                                    _this.onHookRecvMsg(args);
                                    break;
                                case 'checkQRLogin':
                                    _this.onScan(args);
                                    break;
                                case 'loginEvent':
                                    void _this.onLogin();
                                    break;
                                case 'agentReady':
                                    void _this.onAgentReady();
                                    break;
                                case 'logoutEvent':
                                    void _this.onLogout(args[0]);
                                    break;
                                default:
                                    wechaty_puppet_1.log.warn('PuppetXp', 'onHook(%s,...) lack of handing', method, JSON.stringify(args));
                                    break;
                            }
                        });
                        this.sidecar.on('error', function (e) {
                            try {
                                _this.emit('error', { data: JSON.stringify(e) });
                            }
                            catch (e) {
                                wechaty_puppet_1.log.error('emit error fail:', e);
                            }
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    PuppetXp.prototype.onAgentReady = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'onAgentReady()');
                this.isReady = true;
                this.emit('ready', this.selfInfo);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.onLogin = function () {
        return __awaiter(this, void 0, void 0, function () {
            var selfInfoRaw, _a, _b, selfInfo;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!!this.isLoggedIn) return [3 /*break*/, 5];
                        _b = (_a = JSON).parse;
                        return [4 /*yield*/, this.sidecar.getMyselfInfo()];
                    case 1:
                        selfInfoRaw = _b.apply(_a, [_c.sent()]);
                        selfInfo = {
                            alias: '',
                            avatar: selfInfoRaw.head_img_url,
                            friend: false,
                            gender: PUPPET.types.ContactGender.Unknown,
                            id: selfInfoRaw.id,
                            name: selfInfoRaw.name,
                            phone: [],
                            type: PUPPET.types.Contact.Individual
                        };
                        this.selfInfo = selfInfo;
                        this.contactStore[selfInfo.id] = selfInfo;
                        // 初始化联系人列表
                        return [4 /*yield*/, this.loadContactList()
                            // 初始化群列表
                        ];
                    case 2:
                        // 初始化联系人列表
                        _c.sent();
                        // 初始化群列表
                        return [4 /*yield*/, this.loadRoomList()
                            // 初始化机器人信息
                        ];
                    case 3:
                        // 初始化群列表
                        _c.sent();
                        // 初始化机器人信息
                        return [4 /*yield*/, _super.prototype.login.call(this, this.selfInfo.id)];
                    case 4:
                        // 初始化机器人信息
                        _c.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        wechaty_puppet_1.log.info('已处于登录状态，无需再次登录');
                        _c.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    PuppetXp.prototype.onLogout = function (reasonNum) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, _super.prototype.logout.call(this, reasonNum ? 'Kicked by server' : 'logout')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PuppetXp.prototype.onScan = function (args) {
        var _a;
        var statusMap = [
            PUPPET.types.ScanStatus.Waiting,
            PUPPET.types.ScanStatus.Scanned,
            PUPPET.types.ScanStatus.Confirmed,
            PUPPET.types.ScanStatus.Timeout,
            PUPPET.types.ScanStatus.Cancel,
        ];
        var status = args[0];
        var qrcodeUrl = args[1];
        var wxid = args[2];
        var avatarUrl = args[3];
        var nickname = args[4];
        var phoneType = args[5];
        var phoneClientVer = args[6];
        var pairWaitTip = args[7];
        wechaty_puppet_1.log.info('PuppetXp', 'onScan() data: %s', JSON.stringify({
            avatarUrl: avatarUrl,
            nickname: nickname,
            pairWaitTip: pairWaitTip,
            phoneClientVer: phoneClientVer.toString(16),
            phoneType: phoneType,
            qrcodeUrl: qrcodeUrl,
            status: status,
            wxid: wxid
        }, null, 2));
        if (pairWaitTip) {
            wechaty_puppet_1.log.warn('PuppetXp', 'onScan() pairWaitTip: "%s"', pairWaitTip);
        }
        this.scanEventData = {
            qrcode: qrcodeUrl,
            status: (_a = statusMap[args[0]]) !== null && _a !== void 0 ? _a : PUPPET.types.ScanStatus.Unknown
        };
        this.emit('scan', this.scanEventData);
    };
    PuppetXp.prototype.onHookRecvMsg = function (args) {
        var _a, _b, _c, _d, _e;
        return __awaiter(this, void 0, void 0, function () {
            var type, roomId, toId, talkerId, text, code, friendInfo, contact, memberNickname, e_1, userInfo, payload, modelData, inviteeList, inviter, arrInfo, name_1, inviterId, i, nickname, name_2, inviteeId, i, invitee, roomInfo;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        type = PUPPET.types.Message.Unknown;
                        roomId = '';
                        toId = '';
                        talkerId = '';
                        text = String(args[2]);
                        code = args[0];
                        // 处理消息类型
                        switch (code) {
                            case 1:
                                try {
                                    xml2js_1["default"].parseString(String(args[4]), { explicitArray: false, ignoreAttrs: true }, function (err, json) {
                                        var _a;
                                        wechaty_puppet_1.log.verbose('PuppetXp', 'xml2json err:%s', err);
                                        if (((_a = json === null || json === void 0 ? void 0 : json.msgsource) === null || _a === void 0 ? void 0 : _a.atuserlist) === 'atuserlist') {
                                            type = PUPPET.types.Message.GroupNote;
                                        }
                                        else {
                                            type = PUPPET.types.Message.Text;
                                        }
                                    });
                                }
                                catch (err) {
                                    wechaty_puppet_1.log.error('xml2js.parseString fail:', err);
                                    type = PUPPET.types.Message.Text;
                                }
                                break;
                            case 3:
                                type = PUPPET.types.Message.Image;
                                break;
                            case 37: // 好友请求消息
                                type = PUPPET.types.Message.Unknown;
                                // 解析好友请求信息
                                try {
                                    friendInfo = {
                                        type: 'friend_request',
                                        id: talkerId,
                                        hello: text
                                    };
                                    text = JSON.stringify(friendInfo);
                                }
                                catch (err) {
                                    wechaty_puppet_1.log.error('Parse friend request fail:', err);
                                }
                                break;
                            case 43:
                                type = PUPPET.types.Message.Video;
                                break;
                            case 47:
                                type = PUPPET.types.Message.Emoticon;
                                break;
                            case 49:
                                try {
                                    xml2js_1["default"].parseString(String(args[4]), { explicitArray: false, ignoreAttrs: true }, function (err, json) {
                                        var _a, _b, _c, _d, _e, _f;
                                        wechaty_puppet_1.log.verbose('PuppetXp', 'xml2json err:%s', err);
                                        if (((_b = (_a = json === null || json === void 0 ? void 0 : json.msg) === null || _a === void 0 ? void 0 : _a.appmsg) === null || _b === void 0 ? void 0 : _b.type) === '5') {
                                            type = PUPPET.types.Message.Url;
                                        }
                                        else if (((_d = (_c = json === null || json === void 0 ? void 0 : json.msg) === null || _c === void 0 ? void 0 : _c.appmsg) === null || _d === void 0 ? void 0 : _d.type) === '33') {
                                            type = PUPPET.types.Message.MiniProgram;
                                        }
                                        else if (((_f = (_e = json === null || json === void 0 ? void 0 : json.msg) === null || _e === void 0 ? void 0 : _e.appmsg) === null || _f === void 0 ? void 0 : _f.type) === '6') {
                                            type = PUPPET.types.Message.Attachment;
                                        }
                                        else {
                                            type = PUPPET.types.Message.Text;
                                        }
                                    });
                                }
                                catch (err) {
                                    wechaty_puppet_1.log.error('xml2js.parseString fail:', err);
                                }
                                break;
                            case 10000:
                                type = PUPPET.types.Message.GroupNote;
                                break;
                            default:
                                wechaty_puppet_1.log.info('Unknown message type:', code);
                                break;
                        }
                        // 处理发送者和接收者
                        if (String(args[1]).split('@').length !== 2) {
                            talkerId = String(args[1]);
                            toId = this.selfInfo.id;
                        }
                        else {
                            talkerId = String(args[3]) || String(args[1].split('@')[0]); // 如果 args[3] 为空，使用群ID的前缀作为备选
                            roomId = String(args[1]);
                        }
                        // 根据 isMyMsg 调整发送者和接收者
                        if (args[5] === 1) {
                            toId = talkerId;
                            talkerId = this.selfInfo.id;
                        }
                        // 确保 talkerId 不为空
                        if (!talkerId) {
                            wechaty_puppet_1.log.warn('PuppetXp', 'Missing talkerId, using fallback:', {
                                args: args,
                                text: text,
                                roomId: roomId
                            });
                            talkerId = this.selfInfo.id;
                        }
                        contact = this.contactStore[talkerId];
                        if (!!contact) return [3 /*break*/, 4];
                        // 如果 contactStore 中没有，创建一个新的联系人信息
                        contact = {
                            alias: '',
                            avatar: '',
                            friend: true,
                            gender: PUPPET.types.ContactGender.Unknown,
                            id: talkerId,
                            name: talkerId,
                            phone: [],
                            type: PUPPET.types.Contact.Individual
                        };
                        this.contactStore[talkerId] = contact;
                        if (!roomId) return [3 /*break*/, 4];
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.sidecar.getChatroomMemberNickInfo(talkerId, roomId)];
                    case 2:
                        memberNickname = _f.sent();
                        if (memberNickname) {
                            contact.name = memberNickname;
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _f.sent();
                        wechaty_puppet_1.log.warn('PuppetXp', 'Failed to get room member nickname:', e_1);
                        return [3 /*break*/, 4];
                    case 4:
                        userInfo = {
                            id: talkerId,
                            name: contact.name || talkerId,
                            roomId: roomId || '',
                            alias: contact.alias || '',
                            avatar: contact.avatar || '',
                            type: contact.type || PUPPET.types.Contact.Individual
                        };
                        payload = {
                            id: (0, cuid_1["default"])(),
                            listenerId: toId,
                            roomId: roomId,
                            talkerId: talkerId,
                            text: handleUtf8mb4Text(text),
                            timestamp: Date.now(),
                            toId: toId,
                            type: type
                        };
                        try {
                            if (this.isLoggedIn) {
                                // 存储消息
                                this.messageStore[payload.id] = payload;
                                if (this.isReady) {
                                    modelData = {
                                        message: __assign(__assign({}, payload), { type: PUPPET.types.Message[type] || 'Unknown' }),
                                        user: __assign(__assign({}, userInfo), { id: userInfo.id || talkerId, name: userInfo.name || talkerId, roomId: roomId || '' }),
                                        messageType: code,
                                        rawText: text,
                                        context: {
                                            isNewChat: !this.roomStore[roomId],
                                            isFriendRequest: code === 37,
                                            isRoomJoin: code === 10000
                                        }
                                    };
                                    // 发送消息事件
                                    this.emit('message', {
                                        messageId: payload.id,
                                        data: JSON.stringify(modelData)
                                    });
                                    // 记录调试信息
                                    wechaty_puppet_1.log.info('Message sent to model:', {
                                        from: userInfo.name,
                                        text: payload.text,
                                        userId: userInfo.id,
                                        roomId: userInfo.roomId,
                                        type: PUPPET.types.Message[type],
                                        messageType: code
                                    });
                                }
                                // 处理特殊消息类型
                                if (code === 10000) {
                                    if (text.indexOf('加入了群聊') !== -1) {
                                        inviteeList = [];
                                        inviter = this.selfInfo;
                                        arrInfo = text.split(/邀请|加入了群聊/);
                                        // 处理邀请者信息
                                        if (arrInfo[0]) {
                                            name_1 = ((_a = arrInfo[0]) === null || _a === void 0 ? void 0 : _a.split(/"|"/)[1]) || '';
                                            if (arrInfo[0] === '你') {
                                                inviter = this.selfInfo;
                                            }
                                            else {
                                                inviterId = '';
                                                for (i in this.contactStore) {
                                                    if (this.contactStore[i] && ((_b = this.contactStore[i]) === null || _b === void 0 ? void 0 : _b.name) === name_1) {
                                                        inviterId = i;
                                                        nickname = this.getMemberNickname(i, roomId);
                                                        inviter = __assign(__assign({}, this.contactStore[i]), { name: nickname });
                                                        break;
                                                    }
                                                }
                                                // 如果找不到邀请者信息，使用默认值
                                                if (!inviterId) {
                                                    inviter = {
                                                        alias: '',
                                                        avatar: '',
                                                        friend: false,
                                                        gender: PUPPET.types.ContactGender.Unknown,
                                                        id: name_1,
                                                        name: name_1,
                                                        phone: [],
                                                        type: PUPPET.types.Contact.Individual
                                                    };
                                                    this.contactStore[name_1] = inviter;
                                                }
                                            }
                                        }
                                        // 处理被邀请者信息
                                        if (arrInfo[1]) {
                                            name_2 = ((_c = arrInfo[1]) === null || _c === void 0 ? void 0 : _c.split(/"|"/)[1]) || '';
                                            if (arrInfo[1] === '你') {
                                                inviteeList.push(this.selfInfo.id);
                                            }
                                            else {
                                                inviteeId = '';
                                                for (i in this.contactStore) {
                                                    if (this.contactStore[i] && ((_d = this.contactStore[i]) === null || _d === void 0 ? void 0 : _d.name) === name_2) {
                                                        inviteeId = i;
                                                        if (roomId && ((_e = this.roomStore[roomId]) === null || _e === void 0 ? void 0 : _e.memberIdList.includes(i))) {
                                                            inviteeList.push(i);
                                                        }
                                                    }
                                                }
                                                // 如果找不到被邀请者信息，使用默认值
                                                if (!inviteeId) {
                                                    invitee = {
                                                        alias: '',
                                                        avatar: '',
                                                        friend: false,
                                                        gender: PUPPET.types.ContactGender.Unknown,
                                                        id: name_2,
                                                        name: name_2,
                                                        phone: [],
                                                        type: PUPPET.types.Contact.Individual
                                                    };
                                                    this.contactStore[name_2] = invitee;
                                                    inviteeList.push(name_2);
                                                }
                                            }
                                        }
                                        roomInfo = this.getRoomInfo(roomId);
                                        this.roomStore[roomId] = roomInfo;
                                        // 使用 loadRoomListSync 更新群列表
                                        this.loadRoomListSync();
                                        // 发出事件
                                        this.emit('room-join', { inviteeIdList: inviteeList, inviterId: inviter.id, roomId: roomId });
                                        // 异步预加载新成员信息
                                        void this.preloadRoomMember(roomId);
                                    }
                                }
                            }
                        }
                        catch (e) {
                            wechaty_puppet_1.log.error('emit message fail:', e, {
                                userId: userInfo.id,
                                messageId: payload.id,
                                type: PUPPET.types.Message[type],
                                code: code
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    // 同步获取群成员昵称
    PuppetXp.prototype.getMemberNickname = function (memberId, roomId) {
        // 先从缓存获取
        var roomCache = this.roomMemberCache[roomId];
        if (roomCache === null || roomCache === void 0 ? void 0 : roomCache[memberId]) {
            return roomCache[memberId] || memberId;
        }
        // 从 contactStore 获取
        for (var i in this.contactStore) {
            var contact = this.contactStore[i];
            if ((contact === null || contact === void 0 ? void 0 : contact.id) === memberId) {
                return contact.name || memberId;
            }
        }
        // 返回默认值
        return memberId;
    };
    // 同步获取群信息
    PuppetXp.prototype.getRoomInfo = function (roomId) {
        return this.roomStore[roomId] || {
            adminIdList: [''],
            avatar: '',
            external: false,
            id: roomId,
            memberIdList: [],
            ownerId: '',
            topic: ''
        };
    };
    // 预加载群成员信息
    PuppetXp.prototype.preloadRoomMember = function (roomId) {
        return __awaiter(this, void 0, void 0, function () {
            var memberInfo, roomList, roomKey, roomInfo, roomCache, memberList, _i, memberList_1, memberId, nickname, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.sidecar.getChatroomMemberInfo()];
                    case 1:
                        memberInfo = _a.sent();
                        roomList = JSON.parse(memberInfo);
                        for (roomKey in roomList) {
                            roomInfo = roomList[roomKey];
                            if (roomInfo.roomid === roomId) {
                                // 确保缓存对象存在
                                this.roomMemberCache[roomId] = this.roomMemberCache[roomId] || {};
                                roomCache = this.roomMemberCache[roomId];
                                memberList = roomInfo.roomMember || [];
                                for (_i = 0, memberList_1 = memberList; _i < memberList_1.length; _i++) {
                                    memberId = memberList_1[_i];
                                    try {
                                        nickname = this.sidecar.getChatroomMemberNickInfoSync(memberId, roomId);
                                        if (roomCache) {
                                            roomCache[memberId] = nickname || memberId;
                                        }
                                    }
                                    catch (err) {
                                        wechaty_puppet_1.log.error('Failed to load member nickname:', err);
                                        // 如果同步调用失败，使用默认值
                                        if (roomCache) {
                                            roomCache[memberId] = memberId;
                                        }
                                    }
                                }
                                this.roomInfoCache[roomId] = roomInfo;
                                break;
                            }
                        }
                        return [3 /*break*/, 3];
                    case 2:
                        err_1 = _a.sent();
                        wechaty_puppet_1.log.error('Failed to preload room member:', err_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    // 同步加载群列表
    PuppetXp.prototype.loadRoomListSync = function () {
        try {
            var ChatroomMemberInfo = this.sidecar.getChatroomMemberInfoSync();
            var roomList = JSON.parse(ChatroomMemberInfo);
            for (var roomKey in roomList) {
                var roomInfo = roomList[roomKey];
                var roomId = roomInfo.roomid;
                if (roomId.indexOf('@chatroom') !== -1) {
                    var roomMember = roomInfo.roomMember || [];
                    var contact = this.contactStore[roomId];
                    var topic = (contact === null || contact === void 0 ? void 0 : contact.name) || '';
                    var room = {
                        adminIdList: [roomInfo.admin || ''],
                        avatar: '',
                        external: false,
                        id: roomId,
                        memberIdList: roomMember,
                        ownerId: roomInfo.admin || '',
                        topic: topic
                    };
                    this.roomStore[roomId] = room;
                    if (contact) {
                        delete this.contactStore[roomId];
                    }
                }
            }
        }
        catch (err) {
            wechaty_puppet_1.log.error('loadRoomListSync fail:', err);
        }
    };
    PuppetXp.prototype.onStop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wechaty_puppet_1.log.verbose('PuppetXp', 'onStop()');
                        this.sidecar.removeAllListeners();
                        if (!this.logonoff()) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.logout()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, (0, sidecar_1.detach)(this.sidecar)];
                    case 3:
                        _a.sent();
                        __classPrivateFieldSet(this, _PuppetXp_sidecar, undefined, "f");
                        return [2 /*return*/];
                }
            });
        });
    };
    PuppetXp.prototype.login = function (contactId) {
        wechaty_puppet_1.log.verbose('PuppetXp', 'login()');
        _super.prototype.login.call(this, contactId);
    };
    PuppetXp.prototype.ding = function (data) {
        var _this = this;
        wechaty_puppet_1.log.silly('PuppetXp', 'ding(%s)', data || '');
        setTimeout(function () { return _this.emit('dong', { data: data || '' }); }, 1000);
    };
    PuppetXp.prototype.notSupported = function (name) {
        wechaty_puppet_1.log.info("".concat(name, " is not supported by PuppetXp yet."));
    };
    PuppetXp.prototype.loadContactList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var contactList, _a, _b, contactKey, contactInfo, contactType, contact;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = JSON).parse;
                        return [4 /*yield*/, this.sidecar.getContact()];
                    case 1:
                        contactList = _b.apply(_a, [_c.sent()]);
                        for (contactKey in contactList) {
                            contactInfo = contactList[contactKey];
                            wechaty_puppet_1.log.verbose('PuppetXp', 'contactInfo:%s', JSON.stringify(contactInfo));
                            contactType = PUPPET.types.Contact.Individual;
                            // log.info('contactInfo.id', contactInfo.id)
                            if (contactInfo.id.indexOf('gh_') !== -1) {
                                contactType = PUPPET.types.Contact.Official;
                            }
                            if (contactInfo.id.indexOf('@openim') !== -1) {
                                contactType = PUPPET.types.Contact.Corporation;
                            }
                            contact = {
                                alias: contactInfo.alias,
                                avatar: contactInfo.avatarUrl,
                                friend: true,
                                gender: contactInfo.gender,
                                id: contactInfo.id,
                                name: contactInfo.name || 'Unknow',
                                phone: [],
                                type: contactType
                            };
                            this.contactStore[contactInfo.id] = contact;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    PuppetXp.prototype.loadRoomList = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var roomList, ChatroomMemberInfo, err_2, _b, _c, _d, _i, roomKey, roomInfo, roomId, roomMember, topic, room, _e, _f, _g, _h, memberKey, memberId, memberNickName, contact, err_3;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        roomList = [];
                        _j.label = 1;
                    case 1:
                        _j.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.sidecar.getChatroomMemberInfo()];
                    case 2:
                        ChatroomMemberInfo = _j.sent();
                        roomList = JSON.parse(ChatroomMemberInfo);
                        return [3 /*break*/, 4];
                    case 3:
                        err_2 = _j.sent();
                        wechaty_puppet_1.log.error('loadRoomList fail:', err_2);
                        return [3 /*break*/, 4];
                    case 4:
                        _b = roomList;
                        _c = [];
                        for (_d in _b)
                            _c.push(_d);
                        _i = 0;
                        _j.label = 5;
                    case 5:
                        if (!(_i < _c.length)) return [3 /*break*/, 12];
                        _d = _c[_i];
                        if (!(_d in _b)) return [3 /*break*/, 11];
                        roomKey = _d;
                        roomInfo = roomList[roomKey];
                        roomId = roomInfo.roomid;
                        if (!(roomId.indexOf('@chatroom') !== -1)) return [3 /*break*/, 11];
                        roomMember = roomInfo.roomMember || [];
                        topic = ((_a = this.contactStore[roomId]) === null || _a === void 0 ? void 0 : _a.name) || '';
                        room = {
                            adminIdList: [roomInfo.admin || ''],
                            avatar: '',
                            external: false,
                            id: roomId,
                            memberIdList: roomMember,
                            ownerId: roomInfo.admin || '',
                            topic: topic
                        };
                        this.roomStore[roomId] = room;
                        delete this.contactStore[roomId];
                        _e = roomMember;
                        _f = [];
                        for (_g in _e)
                            _f.push(_g);
                        _h = 0;
                        _j.label = 6;
                    case 6:
                        if (!(_h < _f.length)) return [3 /*break*/, 11];
                        _g = _f[_h];
                        if (!(_g in _e)) return [3 /*break*/, 10];
                        memberKey = _g;
                        memberId = roomMember[memberKey];
                        if (!!this.contactStore[memberId]) return [3 /*break*/, 10];
                        _j.label = 7;
                    case 7:
                        _j.trys.push([7, 9, , 10]);
                        return [4 /*yield*/, this.sidecar.getChatroomMemberNickInfo(memberId, roomId)];
                    case 8:
                        memberNickName = _j.sent();
                        contact = {
                            alias: '',
                            avatar: '',
                            friend: false,
                            gender: PUPPET.types.ContactGender.Unknown,
                            id: memberId,
                            name: memberNickName || 'Unknown',
                            phone: [],
                            type: PUPPET.types.Contact.Individual
                        };
                        this.contactStore[memberId] = contact;
                        return [3 /*break*/, 10];
                    case 9:
                        err_3 = _j.sent();
                        wechaty_puppet_1.log.error('loadRoomList fail:', err_3);
                        return [3 /*break*/, 10];
                    case 10:
                        _h++;
                        return [3 /*break*/, 6];
                    case 11:
                        _i++;
                        return [3 /*break*/, 5];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     *
     * ContactSelf
     *
     *
     */
    PuppetXp.prototype.contactSelfQRCode = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'contactSelfQRCode()');
                return [2 /*return*/, config_js_1.CHATIE_OFFICIAL_ACCOUNT_QRCODE];
            });
        });
    };
    PuppetXp.prototype.contactSelfName = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'contactSelfName(%s)', name);
                if (!name) {
                    return [2 /*return*/, this.selfInfo.name];
                }
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.contactSelfSignature = function (signature) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'contactSelfSignature(%s)', signature);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.contactAlias = function (contactId, alias) {
        return __awaiter(this, void 0, void 0, function () {
            var contact;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wechaty_puppet_1.log.verbose('PuppetXp', 'contactAlias(%s, %s)', contactId, alias);
                        if (!alias) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.sidecar.modifyContactRemark(contactId, alias)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, alias];
                    case 2: return [4 /*yield*/, this.contactRawPayload(contactId)
                        // if (typeof alias === 'undefined') {
                        //   throw new Error('to be implement')
                        // }
                    ];
                    case 3:
                        contact = _a.sent();
                        // if (typeof alias === 'undefined') {
                        //   throw new Error('to be implement')
                        // }
                        return [2 /*return*/, contact.alias];
                }
            });
        });
    };
    PuppetXp.prototype.contactPhone = function (contactId, phoneList) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'contactPhone(%s, %s)', contactId, phoneList);
                if (typeof phoneList === 'undefined') {
                    return [2 /*return*/, []];
                }
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.contactCorporationRemark = function (contactId, corporationRemark) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'contactCorporationRemark(%s, %s)', contactId, corporationRemark);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.contactDescription = function (contactId, description) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'contactDescription(%s, %s)', contactId, description);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.contactList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var idList;
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'contactList()');
                idList = Object.keys(this.contactStore);
                return [2 /*return*/, idList];
            });
        });
    };
    PuppetXp.prototype.contactAvatar = function (contactId, file) {
        return __awaiter(this, void 0, void 0, function () {
            var WECHATY_ICON_PNG;
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'contactAvatar(%s)', contactId);
                /**
               * 1. set
               */
                if (file) {
                    return [2 /*return*/];
                }
                WECHATY_ICON_PNG = 'data:image/png;base64,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';
                return [2 /*return*/, file_box_1.FileBox.fromDataURL(WECHATY_ICON_PNG)];
            });
        });
    };
    PuppetXp.prototype.contactRawPayloadParser = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // log.verbose('PuppetXp', 'contactRawPayloadParser(%s)', JSON.stringify(payload))
                return [2 /*return*/, payload];
            });
        });
    };
    PuppetXp.prototype.contactRawPayload = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                //  log.verbose('PuppetXp----------------------', 'contactRawPayload(%s,%s)', id, this.contactStore[id]?.name)
                return [2 /*return*/, this.contactStore[id] || {}];
            });
        });
    };
    /**
   *
   * Conversation
   *
   */
    PuppetXp.prototype.conversationReadMark = function (conversationId, hasRead) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetService', 'conversationRead(%s, %s)', conversationId, hasRead);
                return [2 /*return*/];
            });
        });
    };
    /**
   *
   * Message
   *
   */
    PuppetXp.prototype.messageContact = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var message;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wechaty_puppet_1.log.verbose('PuppetXp', 'messageContact(%s)', messageId);
                        message = this.messageStore[messageId];
                        return [4 /*yield*/, (0, xml_msgpayload_js_1.XmlDecrypt)((message === null || message === void 0 ? void 0 : message.text) || '', (message === null || message === void 0 ? void 0 : message.type) || PUPPET.types.Message.Unknown)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    PuppetXp.prototype.messageImage = function (messageId, imageType) {
        return __awaiter(this, void 0, void 0, function () {
            var message, base64, fileName, imagePath, file, picData, filePath, dataPath, fileExist, count, imageInfo, paths, err_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        message = this.messageStore[messageId];
                        base64 = '';
                        fileName = '';
                        imagePath = '';
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 8, , 9]);
                        if (!(message === null || message === void 0 ? void 0 : message.text)) return [3 /*break*/, 7];
                        picData = JSON.parse(message.text);
                        filePath = picData[imageType];
                        dataPath = rootPath + filePath // 要解密的文件路径
                        ;
                        fileExist = fs_1["default"].existsSync(dataPath);
                        count = 0;
                        _a.label = 2;
                    case 2:
                        if (!!fileExist) return [3 /*break*/, 4];
                        return [4 /*yield*/, wait(500)];
                    case 3:
                        _a.sent();
                        fileExist = fs_1["default"].existsSync(dataPath);
                        if (count > 20) {
                            return [3 /*break*/, 4];
                        }
                        count++;
                        return [3 /*break*/, 2];
                    case 4: return [4 /*yield*/, promises_1["default"].access(dataPath)
                        // log.info('图片解密文件路径：', dataPath, true)
                    ];
                    case 5:
                        _a.sent();
                        imageInfo = (0, image_decrypt_js_1.ImageDecrypt)(dataPath, messageId);
                        // const imageInfo = ImageDecrypt('C:\\Users\\choogoo\\Documents\\WeChat Files\\wxid_pnza7m7kf9tq12\\FileStorage\\Image\\Thumb\\2022-05\\e83b2aea275460cd50352559e040a2f8_t.dat','cl34vez850000gkmw2macd3dw')
                        wechaty_puppet_1.log.info(dataPath, imageInfo.fileName, imageInfo.extension);
                        base64 = imageInfo.base64;
                        fileName = "message-".concat(messageId, "-url-").concat(imageType, ".").concat(imageInfo.extension);
                        file = file_box_1.FileBox.fromBase64(base64, fileName);
                        paths = dataPath.split('\\');
                        paths[paths.length - 1] = fileName;
                        imagePath = paths.join('\\');
                        wechaty_puppet_1.log.info('图片解密后文件路径：', imagePath, true);
                        return [4 /*yield*/, file.toFile(imagePath)];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        err_4 = _a.sent();
                        wechaty_puppet_1.log.error('messageImage fail:', err_4);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/, file_box_1.FileBox.fromBase64(base64, fileName)];
                }
            });
        });
    };
    PuppetXp.prototype.messageRecall = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'messageRecall(%s)', messageId);
                this.notSupported('messageRecall');
                return [2 /*return*/, false];
            });
        });
    };
    PuppetXp.prototype.messageFile = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var message, dataPath, fileName, parser, messageJson, curDate, year, month, filePath, err_5, text;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        message = this.messageStore[id];
                        dataPath = '';
                        fileName = '';
                        if ((message === null || message === void 0 ? void 0 : message.type) === PUPPET.types.Message.Image) {
                            return [2 /*return*/, this.messageImage(id, 
                                //  PUPPET.types.Image.Thumbnail,
                                PUPPET.types.Image.HD)];
                        }
                        if (!((message === null || message === void 0 ? void 0 : message.type) === PUPPET.types.Message.Attachment)) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        parser = new xml2js_1["default"].Parser({
                            explicitArray: false,
                            ignoreAttrs: true,
                            normalize: true,
                            normalizeTags: true
                        });
                        return [4 /*yield*/, parser.parseStringPromise(message.text || '')];
                    case 2:
                        messageJson = _a.sent();
                        curDate = new Date();
                        year = curDate.getFullYear();
                        month = curDate.getMonth() + 1;
                        if (month < 10) {
                            month = '0' + month;
                        }
                        // 处理文件名中的 utf8mb4 字符
                        fileName = '\\' + sanitizeFileName(messageJson.msg.appmsg[0].title[0]);
                        filePath = "".concat(this.selfInfo.id, "\\FileStorage\\File\\").concat(year, "-").concat(month);
                        dataPath = rootPath + filePath + fileName;
                        return [2 /*return*/, file_box_1.FileBox.fromFile(dataPath, fileName)];
                    case 3:
                        err_5 = _a.sent();
                        wechaty_puppet_1.log.error('messageFile fail:', err_5);
                        return [3 /*break*/, 4];
                    case 4:
                        if ((message === null || message === void 0 ? void 0 : message.type) === PUPPET.types.Message.Emoticon && message.text) {
                            text = JSON.parse(message.text);
                            try {
                                try {
                                    fileName = text.md5 + '.png';
                                    return [2 /*return*/, file_box_1.FileBox.fromUrl(text.cdnurl, { name: fileName })];
                                }
                                catch (err) {
                                    wechaty_puppet_1.log.error('messageFile fail:', err);
                                }
                            }
                            catch (err) {
                                wechaty_puppet_1.log.error('messageFile fail:', err);
                            }
                        }
                        if ([PUPPET.types.Message.Video, PUPPET.types.Message.Audio].includes((message === null || message === void 0 ? void 0 : message.type) || PUPPET.types.Message.Unknown)) {
                            this.notSupported('Video/`Audio');
                        }
                        return [2 /*return*/, file_box_1.FileBox.fromFile(dataPath, fileName)];
                }
            });
        });
    };
    PuppetXp.prototype.messageUrl = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var message;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wechaty_puppet_1.log.verbose('PuppetXp', 'messageUrl(%s)', messageId);
                        message = this.messageStore[messageId];
                        return [4 /*yield*/, (0, xml_msgpayload_js_1.XmlDecrypt)((message === null || message === void 0 ? void 0 : message.text) || '', (message === null || message === void 0 ? void 0 : message.type) || PUPPET.types.Message.Unknown)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    PuppetXp.prototype.messageMiniProgram = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var message;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wechaty_puppet_1.log.verbose('PuppetXp', 'messageMiniProgram(%s)', messageId);
                        message = this.messageStore[messageId];
                        return [4 /*yield*/, (0, xml_msgpayload_js_1.XmlDecrypt)((message === null || message === void 0 ? void 0 : message.text) || '', (message === null || message === void 0 ? void 0 : message.type) || PUPPET.types.Message.Unknown)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    PuppetXp.prototype.messageLocation = function (messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var message;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wechaty_puppet_1.log.verbose('PuppetXp', 'messageLocation(%s)', messageId);
                        message = this.messageStore[messageId];
                        return [4 /*yield*/, (0, xml_msgpayload_js_1.XmlDecrypt)((message === null || message === void 0 ? void 0 : message.text) || '', (message === null || message === void 0 ? void 0 : message.type) || PUPPET.types.Message.Unknown)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    PuppetXp.prototype.messageRawPayloadParser = function (payload) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // log.info(payload)
                return [2 /*return*/, payload];
            });
        });
    };
    PuppetXp.prototype.messageRawPayload = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var payload;
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'messageRawPayload(%s)', id);
                if (!this.isLoggedIn) {
                    throw new Error('not logged in');
                }
                payload = this.messageStore[id];
                if (!payload) {
                    throw new Error('no payload');
                }
                return [2 /*return*/, payload];
            });
        });
    };
    PuppetXp.prototype.messageSendText = function (conversationId, text, mentionIdList) {
        return __awaiter(this, void 0, void 0, function () {
            var wxid, contact;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // 检测并记录 utf8mb4 字符
                        if (isUtf8mb4(text)) {
                            wechaty_puppet_1.log.info('PuppetXp', '检测到消息包含 utf8mb4 字符');
                        }
                        if (!(conversationId.split('@').length === 2 && mentionIdList && mentionIdList[0])) return [3 /*break*/, 3];
                        wxid = mentionIdList[0];
                        return [4 /*yield*/, this.contactRawPayload(wxid)];
                    case 1:
                        contact = _a.sent();
                        return [4 /*yield*/, this.sidecar.sendAtMsg(conversationId, text, mentionIdList[0], contact.name)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.sidecar.sendMsg(conversationId, text)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    PuppetXp.prototype.messageSendFile = function (conversationId, file) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath, _a, err_6;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        filePath = path_1["default"].resolve(file.name);
                        wechaty_puppet_1.log.verbose('filePath===============', filePath);
                        return [4 /*yield*/, file.toFile(filePath, true)];
                    case 1:
                        _b.sent();
                        if (!(file.type === file_box_1.FileBoxType.Url)) return [3 /*break*/, 6];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.sidecar.sendPicMsg(conversationId, filePath)
                            // fs.unlinkSync(filePath)
                        ];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        _a = _b.sent();
                        fs_1["default"].unlinkSync(filePath);
                        return [3 /*break*/, 5];
                    case 5: return [3 /*break*/, 9];
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, this.sidecar.sendPicMsg(conversationId, filePath)
                            // fs.unlinkSync(filePath)
                        ];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        err_6 = _b.sent();
                        PUPPET.throwUnsupportedError(conversationId, file);
                        fs_1["default"].unlinkSync(filePath);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    PuppetXp.prototype.messageSendContact = function (conversationId, contactId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'messageSendUrl(%s, %s)', conversationId, contactId);
                this.notSupported('SendContact');
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.messageSendUrl = function (conversationId, urlLinkPayload) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'messageSendUrl(%s, %s)', conversationId, JSON.stringify(urlLinkPayload));
                this.notSupported('SendUrl');
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.messageSendMiniProgram = function (conversationId, miniProgramPayload) {
        return __awaiter(this, void 0, void 0, function () {
            var xmlstr;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wechaty_puppet_1.log.verbose('PuppetXp', 'messageSendMiniProgram(%s, %s)', conversationId, JSON.stringify(miniProgramPayload));
                        xmlstr = "<?xml version=\"1.0\" encoding=\"UTF-8\" ?>\n     <msg>\n       <fromusername>".concat(this.selfInfo.id, "</fromusername>\n       <scene>0</scene>\n       <appmsg appid=\"").concat(miniProgramPayload.appid, "\">\n         <title>").concat(miniProgramPayload.title, "</title>\n         <action>view</action>\n         <type>33</type>\n         <showtype>0</showtype>\n         <url>").concat(miniProgramPayload.pagePath, "</url>\n         <thumburl>").concat(miniProgramPayload.thumbUrl, "</thumburl>\n         <sourcedisplayname>").concat(miniProgramPayload.description, "</sourcedisplayname>\n         <appattach>\n           <totallen>0</totallen>\n         </appattach>\n         <weappinfo>\n           <username>").concat(miniProgramPayload.username, "</username>\n           <appid>").concat(miniProgramPayload.appid, "</appid>\n           <type>1</type>\n           <weappiconurl>").concat(miniProgramPayload.iconUrl, "</weappiconurl>\n           <appservicetype>0</appservicetype>\n           <shareId>2_wx65cc950f42e8fff1_875237370_").concat(new Date().getTime(), "_1</shareId>\n         </weappinfo>\n       </appmsg>\n       <appinfo>\n         <version>1</version>\n         <appname>Window wechat</appname>\n       </appinfo>\n     </msg>\n   ");
                        // const xmlstr=`<msg><fromusername>${this.selfInfo.id}</fromusername><scene>0</scene><commenturl></commenturl><appmsg appid="wx65cc950f42e8fff1" sdkver=""><title>腾讯出行服务｜加油代驾公交</title><des></des><action>view</action><type>33</type><showtype>0</showtype><content></content><url>https://mp.weixin.qq.com/mp/waerrpage?appid=wx65cc950f42e8fff1&amp;amp;type=upgrade&amp;amp;upgradetype=3#wechat_redirect</url><dataurl></dataurl><lowurl></lowurl><lowdataurl></lowdataurl><recorditem><![CDATA[]]></recorditem><thumburl>http://mmbiz.qpic.cn/mmbiz_png/NM1fK7leWGPaFnMAe95jbg4sZAI3fkEZWHq69CIk6zA00SGARbmsGTbgLnZUXFoRwjROelKicbSp9K34MaZBuuA/640?wx_fmt=png&amp;wxfrom=200</thumburl><messageaction></messageaction><extinfo></extinfo><sourceusername></sourceusername><sourcedisplayname>腾讯出行服务｜加油代驾公交</sourcedisplayname><commenturl></commenturl><appattach><totallen>0</totallen><attachid></attachid><emoticonmd5></emoticonmd5><fileext></fileext><aeskey></aeskey></appattach><weappinfo><pagepath></pagepath><username>gh_ad64296dc8bd@app</username><appid>wx65cc950f42e8fff1</appid><type>1</type><weappiconurl>http://mmbiz.qpic.cn/mmbiz_png/NM1fK7leWGPaFnMAe95jbg4sZAI3fkEZWHq69CIk6zA00SGARbmsGTbgLnZUXFoRwjROelKicbSp9K34MaZBuuA/640?wx_fmt=png&amp;wxfrom=200</weappiconurl><appservicetype>0</appservicetype><shareId>2_wx65cc950f42e8fff1_875237370_1644979747_1</shareId></weappinfo><websearch /></appmsg><appinfo><version>1</version><appname>Window wechat</appname></appinfo></msg>`
                        wechaty_puppet_1.log.info('SendMiniProgram is supported by xp, but only support send the MiniProgram-contact card.');
                        return [4 /*yield*/, this.sidecar.SendMiniProgram('', conversationId, xmlstr)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PuppetXp.prototype.messageSendLocation = function (conversationId, locationPayload) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'messageSendLocation(%s, %s)', conversationId, JSON.stringify(locationPayload));
                this.notSupported('SendLocation');
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.messageForward = function (conversationId, messageId) {
        return __awaiter(this, void 0, void 0, function () {
            var curMessage;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wechaty_puppet_1.log.verbose('PuppetXp', 'messageForward(%s, %s)', conversationId, messageId);
                        curMessage = this.messageStore[messageId];
                        if (!((curMessage === null || curMessage === void 0 ? void 0 : curMessage.type) === PUPPET.types.Message.Text)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.messageSendText(conversationId, curMessage.text || '')];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        wechaty_puppet_1.log.info('only Text message forward is supported by xp.');
                        PUPPET.throwUnsupportedError(conversationId, messageId);
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
   *
   * Room
   *
   */
    PuppetXp.prototype.roomRawPayloadParser = function (payload) {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, payload];
        }); });
    };
    PuppetXp.prototype.roomRawPayload = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // log.info('PuppetXp', 'roomRawPayload(%s)', id)
                //  log.verbose('PuppetXp----------------------', 'roomRawPayload(%s%s)', id, this.roomStore[id]?.topic)
                return [2 /*return*/, this.roomStore[id]];
            });
        });
    };
    PuppetXp.prototype.roomList = function () {
        return __awaiter(this, void 0, void 0, function () {
            var idList;
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'call roomList()');
                idList = Object.keys(this.roomStore);
                return [2 /*return*/, idList];
            });
        });
    };
    PuppetXp.prototype.roomDel = function (roomId, contactId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'roomDel(%s, %s)', roomId, contactId);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.roomAvatar = function (roomId) {
        return __awaiter(this, void 0, void 0, function () {
            var payload;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wechaty_puppet_1.log.verbose('PuppetXp', 'roomAvatar(%s)', roomId);
                        return [4 /*yield*/, this.roomPayload(roomId)];
                    case 1:
                        payload = _a.sent();
                        if (payload.avatar) {
                            return [2 /*return*/, file_box_1.FileBox.fromUrl(payload.avatar)];
                        }
                        wechaty_puppet_1.log.warn('PuppetXp', 'roomAvatar() avatar not found, use the chatie default.');
                        return [2 /*return*/, (0, config_js_1.qrCodeForChatie)()];
                }
            });
        });
    };
    PuppetXp.prototype.roomAdd = function (roomId, contactId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'roomAdd(%s, %s)', roomId, contactId);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.roomTopic = function (roomId, topic) {
        return __awaiter(this, void 0, void 0, function () {
            var payload;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wechaty_puppet_1.log.verbose('PuppetXp', 'roomTopic(%s, %s)', roomId, topic);
                        return [4 /*yield*/, this.roomPayload(roomId)];
                    case 1:
                        payload = _a.sent();
                        if (!topic) {
                            return [2 /*return*/, payload.topic];
                        }
                        else {
                            return [2 /*return*/, payload.topic];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    PuppetXp.prototype.roomCreate = function (contactIdList, topic) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'roomCreate(%s, %s)', contactIdList, topic);
                return [2 /*return*/, 'mock_room_id'];
            });
        });
    };
    PuppetXp.prototype.roomQuit = function (roomId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'roomQuit(%s)', roomId);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.roomQRCode = function (roomId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'roomQRCode(%s)', roomId);
                return [2 /*return*/, roomId + ' mock qrcode'];
            });
        });
    };
    PuppetXp.prototype.roomMemberList = function (roomId) {
        return __awaiter(this, void 0, void 0, function () {
            var roomRawPayload, memberIdList, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wechaty_puppet_1.log.verbose('PuppetXp', 'roomMemberList(%s)', roomId);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.roomRawPayload(roomId)];
                    case 2:
                        roomRawPayload = _a.sent();
                        memberIdList = roomRawPayload === null || roomRawPayload === void 0 ? void 0 : roomRawPayload.memberIdList;
                        return [2 /*return*/, memberIdList || []];
                    case 3:
                        e_2 = _a.sent();
                        wechaty_puppet_1.log.error('roomMemberList()', e_2);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PuppetXp.prototype.roomMemberRawPayload = function (roomId, contactId) {
        return __awaiter(this, void 0, void 0, function () {
            var contact, MemberRawPayload, member;
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'roomMemberRawPayload(%s, %s)', roomId, contactId);
                try {
                    contact = this.contactStore[contactId];
                    MemberRawPayload = {
                        avatar: '',
                        id: contactId,
                        inviterId: contactId,
                        name: (contact === null || contact === void 0 ? void 0 : contact.name) || 'Unknow',
                        roomAlias: (contact === null || contact === void 0 ? void 0 : contact.name) || ''
                    };
                    // log.info(MemberRawPayload)
                    return [2 /*return*/, MemberRawPayload];
                }
                catch (e) {
                    wechaty_puppet_1.log.error('roomMemberRawPayload()', e);
                    member = {
                        avatar: '',
                        id: contactId,
                        name: ''
                    };
                    return [2 /*return*/, member];
                }
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.roomMemberRawPayloadParser = function (rawPayload) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                //  log.verbose('PuppetXp---------------------', 'roomMemberRawPayloadParser(%s)', rawPayload)
                return [2 /*return*/, rawPayload];
            });
        });
    };
    PuppetXp.prototype.roomAnnounce = function (roomId, text) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (text) {
                    return [2 /*return*/];
                }
                return [2 /*return*/, 'mock announcement for ' + roomId];
            });
        });
    };
    /**
   *
   * Room Invitation
   *
   */
    PuppetXp.prototype.roomInvitationAccept = function (roomInvitationId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'roomInvitationAccept(%s)', roomInvitationId);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.roomInvitationRawPayload = function (roomInvitationId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'roomInvitationRawPayload(%s)', roomInvitationId);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.roomInvitationRawPayloadParser = function (rawPayload) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(rawPayload));
                return [2 /*return*/, rawPayload];
            });
        });
    };
    /**
   *
   * Friendship
   *
   */
    PuppetXp.prototype.friendshipRawPayload = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, { id: id }];
            });
        });
    };
    PuppetXp.prototype.friendshipRawPayloadParser = function (rawPayload) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, rawPayload];
            });
        });
    };
    PuppetXp.prototype.friendshipSearchPhone = function (phone) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'friendshipSearchPhone(%s)', phone);
                return [2 /*return*/, null];
            });
        });
    };
    PuppetXp.prototype.friendshipSearchWeixin = function (weixin) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'friendshipSearchWeixin(%s)', weixin);
                return [2 /*return*/, null];
            });
        });
    };
    PuppetXp.prototype.friendshipAdd = function (contactId, hello) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'friendshipAdd(%s, %s)', contactId, hello);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.friendshipAccept = function (friendshipId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'friendshipAccept(%s)', friendshipId);
                return [2 /*return*/];
            });
        });
    };
    /**
   *
   * Tag
   *
   */
    PuppetXp.prototype.tagContactAdd = function (tagId, contactId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'tagContactAdd(%s)', tagId, contactId);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.tagContactRemove = function (tagId, contactId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'tagContactRemove(%s)', tagId, contactId);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.tagContactDelete = function (tagId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'tagContactDelete(%s)', tagId);
                return [2 /*return*/];
            });
        });
    };
    PuppetXp.prototype.tagContactList = function (contactId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                wechaty_puppet_1.log.verbose('PuppetXp', 'tagContactList(%s)', contactId);
                return [2 /*return*/, []];
            });
        });
    };
    var _PuppetXp_sidecar;
    _PuppetXp_sidecar = new WeakMap();
    PuppetXp.VERSION = config_js_1.VERSION;
    return PuppetXp;
}(PUPPET.Puppet));
exports.PuppetXp = PuppetXp;
exports["default"] = PuppetXp;
