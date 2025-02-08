"use strict";
exports.__esModule = true;
exports.ModelFactory = void 0;
var coze_js_1 = require("./models/coze.js");
var ModelFactory = /** @class */ (function () {
    function ModelFactory() {
    }
    ModelFactory.createModel = function (config) {
        switch (config.type) {
            case 'coze':
                return new coze_js_1.CozeService(config);
            default:
                throw new Error("Unsupported model type: ".concat(config.type));
        }
    };
    return ModelFactory;
}());
exports.ModelFactory = ModelFactory;
