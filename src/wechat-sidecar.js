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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
exports.__esModule = true;
exports.XpSidecar = exports.WeChatSidecar = void 0;
/**
 *   Sidecar - https://github.com/huan/sidecar
 *
 *   @copyright 2021 Huan LI (李卓桓) <https://github.com/huan>
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
var wechaty_puppet_1 = require("wechaty-puppet");
var sidecar_1 = require("sidecar");
var fs_1 = require("fs");
var path_1 = require("path");
var cjs_js_1 = require("./cjs.js");
var XpSidecar = /** @class */ (function () {
    function XpSidecar(options) {
        this.supportedVersions = {
            v330115: '3.3.0.115',
            v360000: '3.6.0.18',
            v39223: '3.9.2.23'
        };
        console.info('XpSidecar constructor()', options);
        if (options === null || options === void 0 ? void 0 : options.wechatVersion) {
            XpSidecar.currentVersion = options.wechatVersion;
        }
        console.info('XpSidecar currentVersion:', XpSidecar.currentVersion);
        var scriptPath = path_1["default"].join(cjs_js_1.codeRoot, 'src', 'agents', 'agent-script-3.6.0.18.js');
        try {
            switch (XpSidecar.currentVersion) {
                case this.supportedVersions.v330115:
                    scriptPath = path_1["default"].join(cjs_js_1.codeRoot, 'src', 'agents', 'agent-script-3.3.0.115.js');
                    break;
                case this.supportedVersions.v360000:
                    scriptPath = path_1["default"].join(cjs_js_1.codeRoot, 'src', 'agents', 'agent-script-3.6.0.18.js');
                    break;
                case this.supportedVersions.v39223:
                    scriptPath = path_1["default"].join(cjs_js_1.codeRoot, 'src', 'agents', 'agent-script-3.9.2.23.js');
                    break;
                default:
                    console.error("Wechat version not supported. \nWechat version: ".concat(XpSidecar.currentVersion, ", supported version: ").concat(JSON.stringify(this.supportedVersions)));
                    throw new Error("Wechat version not supported. \nWechat version: ".concat(XpSidecar.currentVersion, ", supported version: ").concat(JSON.stringify(this.supportedVersions)));
            }
            console.info('XpSidecar initAgentScript path:', scriptPath);
            XpSidecar.initAgentScript = fs_1["default"].readFileSync(scriptPath, 'utf-8');
        }
        catch (e) { }
    }
    XpSidecar.prototype.setinitAgentScript = function () {
        XpSidecar.initAgentScript = fs_1["default"].readFileSync(path_1["default"].join(cjs_js_1.codeRoot, 'src', "init-agent-script-".concat(XpSidecar.currentVersion, ".js")), 'utf-8');
    };
    XpSidecar.currentVersion = '3.9.2.23';
    XpSidecar.scriptPath = path_1["default"].join(cjs_js_1.codeRoot, 'src', 'init-agent-script.js');
    XpSidecar.initAgentScript = fs_1["default"].readFileSync(XpSidecar.scriptPath, 'utf-8');
    return XpSidecar;
}());
exports.XpSidecar = XpSidecar;
// console.info('XpSidecar initAgentScript:', XpSidecar.initAgentScript)
var WeChatSidecar = /** @class */ (function (_super) {
    __extends(WeChatSidecar, _super);
    function WeChatSidecar(options) {
        var _this = _super.call(this, options) || this;
        _this.agent = new XpSidecar(options);
        return _this;
    }
    // @Call(agentTarget('getTestInfoFunction'))
    // getTestInfo ():Promise<string> { return Ret() }
    WeChatSidecar.prototype.getLoginUrl = function () { return (0, sidecar_1.Ret)(); };
    WeChatSidecar.prototype.getChatroomMemberNickInfo = function (memberId, roomId) { return (0, sidecar_1.Ret)(memberId, roomId); };
    // 添加同步方法
    WeChatSidecar.prototype.getChatroomMemberNickInfoSync = function (memberId, roomId) {
        try {
            // 同步调用 frida 方法
            var result = this.agent.getChatroomMemberNickInfoSync(memberId, roomId);
            return result || memberId;
        }
        catch (e) {
            wechaty_puppet_1.log.error('Failed to get chatroom member nick info sync:', e);
            return memberId;
        }
    };
    WeChatSidecar.prototype.isLoggedIn = function () { return (0, sidecar_1.Ret)(); };
    WeChatSidecar.prototype.getMyselfInfo = function () { return (0, sidecar_1.Ret)(); };
    // @Call(agentTarget('GetContactOrChatRoomNickname'))
    // GetContactOrChatRoomNickname (
    //   wxId: string,
    // ): Promise<string> { return Ret(wxId) }
    WeChatSidecar.prototype.modifyContactRemark = function (contactId, text) { return (0, sidecar_1.Ret)(contactId, text); };
    WeChatSidecar.prototype.getChatroomMemberInfo = function () { return (0, sidecar_1.Ret)(); };
    // 添加同步方法
    WeChatSidecar.prototype.getChatroomMemberInfoSync = function () {
        try {
            // 同步调用 frida 方法
            var result = this.agent.getChatroomMemberInfoSync();
            return result || '[]';
        }
        catch (e) {
            wechaty_puppet_1.log.error('Failed to get chatroom member info sync:', e);
            return '[]';
        }
    };
    WeChatSidecar.prototype.getWeChatVersion = function () { return (0, sidecar_1.Ret)(); };
    WeChatSidecar.prototype.getWechatVersionString = function () { return (0, sidecar_1.Ret)(); };
    WeChatSidecar.prototype.checkSupported = function () { return (0, sidecar_1.Ret)(); };
    // @Call(agentTarget('callLoginQrcodeFunction'))
    // callLoginQrcode (
    //   forceRefresh: boolean,
    // ):Promise<null> { return Ret(forceRefresh) }
    WeChatSidecar.prototype.getContact = function () { return (0, sidecar_1.Ret)(); };
    WeChatSidecar.prototype.sendMsg = function (contactId, text) { return (0, sidecar_1.Ret)(contactId, text); };
    WeChatSidecar.prototype.sendAttatchMsg = function (contactId, path) { return (0, sidecar_1.Ret)(contactId, path); };
    WeChatSidecar.prototype.sendPicMsg = function (contactId, path) { return (0, sidecar_1.Ret)(contactId, path); };
    WeChatSidecar.prototype.sendAtMsg = function (roomId, text, contactId, nickname) { return (0, sidecar_1.Ret)(roomId, text, contactId, nickname); };
    WeChatSidecar.prototype.SendMiniProgram = function (BgPathStr, contactId, xmlstr) { return (0, sidecar_1.Ret)(BgPathStr, contactId, xmlstr); };
    WeChatSidecar.prototype.recvMsg = function (msgType, contactId, text, groupMsgSenderId, xmlContent, isMyMsg) { return (0, sidecar_1.Ret)(msgType, contactId, text, groupMsgSenderId, xmlContent, isMyMsg); };
    // @Hook(agentTarget('checkQRLoginNativeCallback'))
    // checkQRLogin (
    //   @ParamType('int32', 'U32') status: number,
    //   @ParamType('pointer', 'Utf8String') qrcodeUrl: string,
    //   @ParamType('pointer', 'Utf8String') wxid: string,
    //   @ParamType('pointer', 'Utf8String') avatarUrl: string,
    //   @ParamType('pointer', 'Utf8String') nickname: string,
    //   @ParamType('pointer', 'Utf8String') phoneType: string,
    //   @ParamType('int32', 'U32') phoneClientVer: number,
    //   @ParamType('pointer', 'Utf8String') pairWaitTip: string,
    // ) { return Ret(status, qrcodeUrl, wxid, avatarUrl, nickname, phoneType, phoneClientVer, pairWaitTip) }
    WeChatSidecar.prototype.logoutEvent = function (bySrv) { return (0, sidecar_1.Ret)(bySrv); };
    WeChatSidecar.prototype.loginEvent = function () { return (0, sidecar_1.Ret)(); };
    WeChatSidecar.prototype.agentReady = function () { return (0, sidecar_1.Ret)(); };
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('getLoginUrlFunction'))
    ], WeChatSidecar.prototype, "getLoginUrl");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('getChatroomMemberNickInfoFunction'))
    ], WeChatSidecar.prototype, "getChatroomMemberNickInfo");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('isLoggedInFunction'))
    ], WeChatSidecar.prototype, "isLoggedIn");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('getMyselfInfoFunction'))
    ], WeChatSidecar.prototype, "getMyselfInfo");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('modifyContactRemarkFunction'))
    ], WeChatSidecar.prototype, "modifyContactRemark");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('getChatroomMemberInfoFunction'))
    ], WeChatSidecar.prototype, "getChatroomMemberInfo");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('getWechatVersionFunction'))
    ], WeChatSidecar.prototype, "getWeChatVersion");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('getWechatVersionStringFunction'))
    ], WeChatSidecar.prototype, "getWechatVersionString");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('checkSupportedFunction'))
    ], WeChatSidecar.prototype, "checkSupported");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('getContactNativeFunction'))
    ], WeChatSidecar.prototype, "getContact");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('sendMsgNativeFunction'))
    ], WeChatSidecar.prototype, "sendMsg");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('sendPicMsgNativeFunction'))
    ], WeChatSidecar.prototype, "sendAttatchMsg");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('sendPicMsgNativeFunction'))
    ], WeChatSidecar.prototype, "sendPicMsg");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('sendAtMsgNativeFunction'))
    ], WeChatSidecar.prototype, "sendAtMsg");
    __decorate([
        (0, sidecar_1.Call)((0, sidecar_1.agentTarget)('SendMiniProgramNativeFunction'))
    ], WeChatSidecar.prototype, "SendMiniProgram");
    __decorate([
        (0, sidecar_1.Hook)((0, sidecar_1.agentTarget)('recvMsgNativeCallback')),
        __param(0, (0, sidecar_1.ParamType)('int32', 'U32')),
        __param(1, (0, sidecar_1.ParamType)('pointer', 'Utf16String')),
        __param(2, (0, sidecar_1.ParamType)('pointer', 'Utf16String')),
        __param(3, (0, sidecar_1.ParamType)('pointer', 'Utf16String')),
        __param(4, (0, sidecar_1.ParamType)('pointer', 'Utf16String')),
        __param(5, (0, sidecar_1.ParamType)('int32', 'U32'))
    ], WeChatSidecar.prototype, "recvMsg");
    __decorate([
        (0, sidecar_1.Hook)((0, sidecar_1.agentTarget)('hookLogoutEventCallback')),
        __param(0, (0, sidecar_1.ParamType)('int32', 'U32'))
    ], WeChatSidecar.prototype, "logoutEvent");
    __decorate([
        (0, sidecar_1.Hook)((0, sidecar_1.agentTarget)('hookLoginEventCallback'))
    ], WeChatSidecar.prototype, "loginEvent");
    __decorate([
        (0, sidecar_1.Hook)((0, sidecar_1.agentTarget)('agentReadyCallback'))
    ], WeChatSidecar.prototype, "agentReady");
    WeChatSidecar = __decorate([
        (0, sidecar_1.Sidecar)('WeChat.exe', XpSidecar.initAgentScript)
    ], WeChatSidecar);
    return WeChatSidecar;
}(sidecar_1.SidecarBody));
exports.WeChatSidecar = WeChatSidecar;
