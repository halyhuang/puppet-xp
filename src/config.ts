import {
  FileBox,
}                       from 'file-box'

import { packageJson }  from './package-json.js'
import fs from 'fs';
import * as yaml from 'js-yaml';
import { IModelConfig } from './interfaces/model';

const VERSION = packageJson.version || '0.0.0'

const CHATIE_OFFICIAL_ACCOUNT_QRCODE = 'http://weixin.qq.com/r/qymXj7DEO_1ErfTs93y5'

function qrCodeForChatie (): FileBox {
  return FileBox.fromQRCode(CHATIE_OFFICIAL_ACCOUNT_QRCODE)
}

export {
  VERSION,
  qrCodeForChatie,
  CHATIE_OFFICIAL_ACCOUNT_QRCODE,
}

interface ConfigType {
  modelConfig: IModelConfig;
  fallbackModel?: IModelConfig;
  blacklist?: string[];
  cozeTriggerKeyword?: string;
  welcomeRoomIds?: string[];
}

// 从 YAML 文件加载配置
const loadConfig = (): ConfigType => {
  try {
    const configFile = fs.readFileSync('config.yaml', 'utf8');
    return yaml.load(configFile) as ConfigType;
  } catch (e) {
    console.error('Failed to load config.yaml:', e);
    throw e;
  }
};

// 加载配置
const config = loadConfig();

// 导出配置
export const Config = {
  modelConfig: config.modelConfig,
  fallbackModel: config.fallbackModel,
  blacklist: config.blacklist || [],
  cozeTriggerKeyword: config.cozeTriggerKeyword || '',
  welcomeRoomIds: config.welcomeRoomIds || [],
};