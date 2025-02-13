import { IModelConfig } from './interfaces/model.js';

export interface IConfig {
  apiKey: string;
  model: string;
  cozeTriggerKeyword: string;
  blacklist?: string[];
  modelConfig: IModelConfig;
  fallbackModel?: IModelConfig;
}
