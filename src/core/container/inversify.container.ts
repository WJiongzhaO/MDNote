import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './container.types';
import type { ServiceContainer } from './service-container.interface';

/**
 * 基于InversifyJS的依赖注入容器实现
 */
export class InversifyContainer implements ServiceContainer {
  private container: Container;

  constructor() {
    this.container = new Container();
    this.configureBindings();
  }

  get<T>(serviceIdentifier: symbol): T {
    return this.container.get<T>(serviceIdentifier);
  }

  bind<T>(serviceIdentifier: symbol): any {
    // 检查是否已经存在绑定
    if (this.container.isBound(serviceIdentifier)) {
      this.container.unbind(serviceIdentifier);
    }
    
    return {
      to: (constructor: new (...args: any[]) => T) => {
        this.container.bind<T>(serviceIdentifier).to(constructor);
      },
      toConstantValue: (value: T) => {
        this.container.bind<T>(serviceIdentifier).toConstantValue(value);
      },
      toSingleton: (constructor: new (...args: any[]) => T) => {
        this.container.bind<T>(serviceIdentifier).to(constructor).inSingletonScope();
      },
      toDynamicValue: (factory: (context: any) => T) => {
        this.container.bind<T>(serviceIdentifier).toDynamicValue(factory);
      }
    };
  }

  private configureBindings(): void {
    // 基础配置将在应用模块中完成
    // 这里只设置容器本身
    // 注意：ServiceContainer 不需要在 TYPES 中定义，因为它是容器本身
  }

  /**
   * 获取容器实例（单例模式）
   */
  private static instance: InversifyContainer;
  
  static getInstance(): InversifyContainer {
    if (!InversifyContainer.instance) {
      InversifyContainer.instance = new InversifyContainer();
    }
    return InversifyContainer.instance;
  }
}