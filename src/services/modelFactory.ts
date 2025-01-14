import { IModelService, IModelConfig } from '../interfaces/model.js';
import { CozeService } from './models/coze.js';
import { OpenAIService } from './models/openai.js';
import { QwenService } from './models/qwen.js';

export class ModelFactory {
  static createModel(config: IModelConfig): IModelService {
    switch (config.type) {
      case 'coze':
        return new CozeService(config);
      case 'openai':
        return new OpenAIService(config);
      case 'qwen':
        return new QwenService(config);
      default:
        throw new Error(`Unsupported model type: ${config.type}`);
    }
  }
} 