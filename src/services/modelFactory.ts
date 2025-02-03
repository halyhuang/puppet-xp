import { IModelService, IModelConfig } from '../interfaces/model.js';
import { CozeService } from './models/coze.js';

export class ModelFactory {
  static createModel(config: IModelConfig): IModelService {
    switch (config.type) {
      case 'coze':
        return new CozeService(config);
      default:
        throw new Error(`Unsupported model type: ${config.type}`);
    }
  }
} 