"use strict";
exports.__esModule = true;
exports.ImageDecrypt = void 0;
var fs_1 = require("fs");
var xorCache = null;
// let xor = '9a9a'   // 异或值(十六进制)
// xor = hexToBin(xor)
var xorLen = 2;
function ImageDecrypt(dataPath, messageId) {
    // 读取文件，获取到十六进制数据
    try {
        var data = fs_1["default"].readFileSync(dataPath, 'hex');
        var res = handleEncrypted(data); // 解密后的十六进制数据
        var extension = getNameExtension(res.substring(0, 4));
        // console.debug(extension)
        var imageInfo = {
            base64: Buffer.from(res, 'hex').toString('base64'),
            extension: extension,
            fileName: "message-".concat(messageId, "-url-thumb.").concat(extension)
        };
        // console.debug(imageInfo)
        return imageInfo;
    }
    catch (err) {
        console.error(err);
    }
    throw new Error('ImageDecrypt fail');
    // return {}
    // fs.readFile(dataPath, { encoding: 'hex' }, function (err, data) {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         var res = handleEncrypted(data);
    //         var extension = getNameExtension(res.substring(0, 2));
    //         console.debug(extension)
    //         var hex = Buffer.from(res, 'hex');
    //         console.debug(hex)
    //         fs.writeFile(resPath + extension, hex, function (err) {
    //             if (err) {
    //                 console.log('出错：', err);
    //             }
    //             console.timeEnd('完成，耗时');
    //         })
    //         const imageInfo = {
    //             base64: res,
    //             fileName: messageId + '.' + extension
    //         }
    //         console.debug(imageInfo)
    //         return imageInfo
    //     }
    // })
}
exports.ImageDecrypt = ImageDecrypt;
// 解密加密数据
function handleEncrypted(strEncrypted) {
    // 先获取异或值(仅限于jpg文件)
    var code = getXor(strEncrypted.substring(0, 4));
    var strLength = strEncrypted.length;
    var source = '';
    var list = [];
    for (var i = 0; i < strLength; i = i + xorLen) {
        var str = strEncrypted.substring(0, xorLen);
        strEncrypted = strEncrypted.substring(xorLen);
        var res = hexXor(str, code);
        list.push(res);
    }
    source = list.join('');
    // console.debug(source)
    return source;
}
// 获取异或值
/**
 *
 * @param str strEncrypted.substring(0, 4)
 * @return xor
 */
function getXor(str) {
    if (typeof xorCache === 'string') {
        return xorCache;
    }
    var str01 = str.substring(0, 2);
    var str23 = str.substring(2);
    for (var _i = 0, dataHead_1 = dataHead; _i < dataHead_1.length; _i++) {
        var head = dataHead_1[_i];
        var h = head.hex;
        var h01 = h.substring(0, 2);
        var h23 = h.substring(2);
        var code = hexXor(h01, str01);
        var testResult = hexXor(str23, code);
        if (testResult === h23) {
            xorCache = code;
            return xorCache;
        }
    }
    throw new Error('getXor error');
}
void getXor;
// 获取文件名后缀
function getNameExtension(hex) {
    // console.debug(hex)
    var res = dataHead.find(function (item) {
        return item.hex === hex;
    }).name;
    return res;
}
// 十六进制转二进制
function hexToBin(str) {
    var hexArray = [
        { bin: '0000', hex: '0' },
        { bin: '0001', hex: '1' },
        { bin: '0010', hex: '2' },
        { bin: '0011', hex: '3' },
        { bin: '0100', hex: '4' },
        { bin: '0101', hex: '5' },
        { bin: '0110', hex: '6' },
        { bin: '0111', hex: '7' },
        { bin: '1000', hex: '8' },
        { bin: '1001', hex: '9' },
        { bin: '1010', hex: 'a' },
        { bin: '1011', hex: 'b' },
        { bin: '1100', hex: 'c' },
        { bin: '1101', hex: 'd' },
        { bin: '1110', hex: 'e' },
        { bin: '1111', hex: 'f' },
    ];
    var value = '';
    var _loop_1 = function (i) {
        value += hexArray.find(function (item) {
            return item.hex === str[i];
        }).bin;
    };
    for (var i = 0; i < str.length; i++) {
        _loop_1(i);
    }
    return value;
}
// 二进制转十六进制
function binToHex(str) {
    var hexArray = [
        { bin: '0000', hex: '0' },
        { bin: '0001', hex: '1' },
        { bin: '0010', hex: '2' },
        { bin: '0011', hex: '3' },
        { bin: '0100', hex: '4' },
        { bin: '0101', hex: '5' },
        { bin: '0110', hex: '6' },
        { bin: '0111', hex: '7' },
        { bin: '1000', hex: '8' },
        { bin: '1001', hex: '9' },
        { bin: '1010', hex: 'a' },
        { bin: '1011', hex: 'b' },
        { bin: '1100', hex: 'c' },
        { bin: '1101', hex: 'd' },
        { bin: '1110', hex: 'e' },
        { bin: '1111', hex: 'f' },
    ];
    var value = '';
    var list = [];
    while (str.length > 4) {
        list.push(str.substring(0, 4));
        str = str.substring(4);
    }
    list.push(str);
    var _loop_2 = function (i) {
        value += hexArray.find(function (item) {
            return item.bin === list[i];
        }).hex;
    };
    for (var i = 0; i < list.length; i++) {
        _loop_2(i);
    }
    return value;
}
// 获取计算结果
// function getResult (a: string) {
//   const A = hexToBin(a)
//   const B = xor
//   let d = ''
//   for (let i = 0; i < A.length; i++) {
//     if (A[i] === B[i]) {
//       d = d.concat('0')
//     } else {
//       d = d.concat('1')
//     }
//   }
//   return binToHex(d)
// }
function hexXor(a, b) {
    var A = hexToBin(a);
    var B = hexToBin(b);
    var d = '';
    for (var i = 0; i < A.length; i++) {
        if (A[i] === B[i]) {
            d = d.concat('0');
        }
        else {
            d = d.concat('1');
        }
    }
    return binToHex(d);
}
// 扩展名-十六进制表
var dataHead = [
    {
        hex: 'ffd8',
        name: 'jpg'
    },
    {
        hex: '8950',
        name: 'png'
    },
    {
        hex: '4749',
        name: 'gif'
    },
    {
        hex: '424d',
        name: 'bmp'
    },
];
