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
exports.__esModule = true;
exports.XmlDecrypt = void 0;
var xml2js_1 = require("xml2js");
// import readXml from 'xmlreader'
var PUPPET = require("wechaty-puppet");
var wechaty_puppet_1 = require("wechaty-puppet");
// import type {
//     FileBoxInterface,
// } from 'file-box'
// import {
//     FileBox,
//     FileBoxType,
// } from 'file-box'
function XmlDecrypt(xml, msgType) {
    return __awaiter(this, void 0, void 0, function () {
        var res, parser, messageJson, location_1, LocationPayload, appmsg, MiniProgramPayload, appmsg, UrlLinkPayload;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    wechaty_puppet_1.log.verbose('PuppetXp', 'text xml:(%s)', xml);
                    parser = new xml2js_1["default"].Parser( /* options */);
                    return [4 /*yield*/, parser.parseStringPromise(xml || '')
                        // log.info(JSON.stringify(messageJson))
                    ];
                case 1:
                    messageJson = _a.sent();
                    // log.info(JSON.stringify(messageJson))
                    switch (msgType) {
                        case PUPPET.types.Message.Attachment:
                            break;
                        case PUPPET.types.Message.Audio:
                            break;
                        case PUPPET.types.Message.Contact: {
                            res = messageJson.msg['$'].username;
                            break;
                        }
                        case PUPPET.types.Message.ChatHistory:
                            break;
                        case PUPPET.types.Message.Emoticon:
                            break;
                        case PUPPET.types.Message.Image:
                            break;
                        case PUPPET.types.Message.Text:
                            break;
                        case PUPPET.types.Message.Location: {
                            location_1 = messageJson.msg.location[0]['$'];
                            LocationPayload = {
                                accuracy: location_1.scale,
                                address: location_1.label,
                                latitude: location_1.x,
                                longitude: location_1.y,
                                name: location_1.poiname
                            };
                            res = LocationPayload;
                            break;
                        }
                        case PUPPET.types.Message.MiniProgram: {
                            appmsg = messageJson.msg.appmsg[0];
                            MiniProgramPayload = {
                                appid: appmsg.weappinfo[0].appid[0],
                                description: appmsg.des[0],
                                iconUrl: appmsg.weappinfo[0].weappiconurl[0],
                                pagePath: appmsg.weappinfo[0].pagepath[0],
                                shareId: appmsg.weappinfo[0].shareId[0],
                                thumbKey: appmsg.appattach[0].cdnthumbaeskey[0],
                                thumbUrl: appmsg.appattach[0].cdnthumburl[0],
                                title: appmsg.title[0],
                                username: appmsg.weappinfo[0].username[0]
                            };
                            res = MiniProgramPayload;
                            break;
                        }
                        case PUPPET.types.Message.GroupNote:
                            break;
                        case PUPPET.types.Message.Transfer:
                            break;
                        case PUPPET.types.Message.RedEnvelope:
                            break;
                        case PUPPET.types.Message.Recalled:
                            break;
                        case PUPPET.types.Message.Url: {
                            appmsg = messageJson.msg.appmsg[0];
                            UrlLinkPayload = {
                                description: appmsg.des[0],
                                thumbnailUrl: appmsg.appattach[0].cdnthumburl,
                                title: appmsg.title[0],
                                url: appmsg.url[0]
                            };
                            res = UrlLinkPayload;
                            break;
                        }
                        case PUPPET.types.Message.Video:
                            break;
                        case PUPPET.types.Message.Post:
                            break;
                        default:
                            res = {};
                    }
                    return [2 /*return*/, res];
            }
        });
    });
}
exports.XmlDecrypt = XmlDecrypt;
