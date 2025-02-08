"use strict";
exports.__esModule = true;
exports.Config = exports.CHATIE_OFFICIAL_ACCOUNT_QRCODE = exports.qrCodeForChatie = exports.VERSION = void 0;
var file_box_1 = require("file-box");
var package_json_js_1 = require("./package-json.js");
var fs_1 = require("fs");
var yaml = require("js-yaml");
var VERSION = package_json_js_1.packageJson.version || '0.0.0';
exports.VERSION = VERSION;
var CHATIE_OFFICIAL_ACCOUNT_QRCODE = 'http://weixin.qq.com/r/qymXj7DEO_1ErfTs93y5';
exports.CHATIE_OFFICIAL_ACCOUNT_QRCODE = CHATIE_OFFICIAL_ACCOUNT_QRCODE;
function qrCodeForChatie() {
    return file_box_1.FileBox.fromQRCode(CHATIE_OFFICIAL_ACCOUNT_QRCODE);
}
exports.qrCodeForChatie = qrCodeForChatie;
// 从 YAML 文件加载配置
var loadConfig = function () {
    try {
        var configFile = fs_1["default"].readFileSync('config.yaml', 'utf8');
        return yaml.load(configFile);
    }
    catch (e) {
        console.error('Failed to load config.yaml:', e);
        throw e;
    }
};
// 加载配置
var config = loadConfig();
// 导出配置
exports.Config = {
    modelConfig: config.modelConfig,
    fallbackModel: config.fallbackModel,
    blacklist: config.blacklist || [],
    cozeTriggerKeyword: config.cozeTriggerKeyword || '',
    welcomeRoomIds: config.welcomeRoomIds || []
};
