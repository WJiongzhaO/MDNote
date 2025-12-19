/**
 * 服务容器接口定义
 */
export interface ServiceContainer {
  get<T>(serviceIdentifier: symbol): T;
  bind<T>(serviceIdentifier: symbol): BindingToSyntax<T>;
}

export interface BindingToSyntax<T> {
  to(constructor: new (...args: any[]) => T): void;
  toConstantValue(value: T): void;
  toSingleton(constructor: new (...args: any[]) => T): void;
  toDynamicValue(factory: (context: any) => T): void;
}