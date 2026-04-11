import 'reflect-metadata'
import { InversifyContainer } from './container/inversify.container'
import { ApplicationModule } from './modules/application.module'
import { TYPES } from './container/container.types'
import type { ServiceContainer } from './container/service-container.interface'
import { ApplicationService } from '../application/services/application.service'
import { FragmentCategoryUseCases } from '../application/usecases/fragment-category.usecases'

/**
 * 应用启动器 - 负责初始化依赖注入容器和配置应用
 */
export class Application {
  private container: ServiceContainer
  private applicationService: ApplicationService
  private static isConfigured = false // 添加配置标志，避免重复配置

  constructor() {
    this.container = InversifyContainer.getInstance()
    // 只在第一次配置，避免 HMR 导致的重复绑定
    if (!Application.isConfigured) {
      this.configure()
      Application.isConfigured = true
    }
    this.applicationService = this.container.get<ApplicationService>(TYPES.ApplicationService)
  }

  /**
   * 启动应用 - 初始化所有必要的服务
   */
  async start(vaultId: string = 'default'): Promise<void> {
    await this.applicationService.initialize(vaultId)
  }

  /**
   * 切换知识库
   */
  switchVault(vaultId: string): void {
    this.applicationService.switchVault(vaultId)
  }

  /**
   * 获取当前知识库ID
   */
  getCurrentVaultId(): string {
    return this.applicationService.getCurrentVaultId()
  }

  /**
   * 配置应用模块和依赖关系
   */
  private configure(): void {
    ApplicationModule.configure(this.container)
  }

  /**
   * 获取应用服务实例
   */
  getApplicationService(): ApplicationService {
    return this.applicationService
  }

  /**
   * 获取文档用例实例
   */
  getDocumentUseCases() {
    return this.applicationService.getDocumentUseCases()
  }

  /**
   * 获取文件夹用例实例
   */
  getFolderUseCases() {
    return this.applicationService.getFolderUseCases()
  }

  /**
   * 获取知识片段用例实例
   */
  getKnowledgeFragmentUseCases() {
    return this.applicationService.getKnowledgeFragmentUseCases()
  }

  /**
   * 获取片段分类用例实例
   */
  getFragmentCategoryUseCases() {
    return this.applicationService.getFragmentCategoryUseCases()
  }

  /**
   * 获取知识健康度服务实例
   */
  getKnowledgeHealthService() {
    return this.applicationService.getKnowledgeHealthService()
  }

  /**
   * 获取推荐服务实例
   */
  getRecommendationService() {
    return this.applicationService.getRecommendationService()
  }

  /**
   * 获取导出用例实例
   */
  getExportUseCases() {
    return this.container.get(Symbol.for('ExportUseCases'))
  }

  /**
   * 获取应用实例（单例模式）
   */
  private static instance: Application

  static getInstance(): Application {
    if (!Application.instance) {
      Application.instance = new Application()
    }
    return Application.instance
  }
}
