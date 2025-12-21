import { inject, injectable } from 'inversify';
import { TYPES } from '../../core/container/container.types';
import type { KnowledgeFragmentRepository } from '../../domain/repositories/knowledge-fragment.repository.interface';
import type { ImageStorageService } from '../../domain/services/image-storage.interface';
import { KnowledgeFragment } from '../../domain/entities/knowledge-fragment.entity';
import { createNodeFromJSON, ImageNode } from '../../domain/entities/ast-nodes';
import type { ASTNode } from '../../domain/entities/ast-node.interface';
import { NodeType } from '../../domain/types/knowledge-fragment.types';
import type {
  CreateKnowledgeFragmentRequest,
  UpdateKnowledgeFragmentRequest,
  KnowledgeFragmentResponse
} from '../dto/knowledge-fragment.dto';
import { FileSystemImageStorageService } from '../../infrastructure/services/image-storage.service';

/**
 * 知识片段用例
 */
@injectable()
export class KnowledgeFragmentUseCases {
  private readonly imageStorage: ImageStorageService;

  constructor(
    @inject(TYPES.KnowledgeFragmentRepository)
    private readonly repository: KnowledgeFragmentRepository
  ) {
    // 暂时直接实例化，后续可以通过DI注入
    this.imageStorage = new FileSystemImageStorageService();
  }

  /**
   * 创建知识片段
   * 如果片段包含图片，会将图片复制到知识片段的存储目录
   */
  async createFragment(request: CreateKnowledgeFragmentRequest): Promise<KnowledgeFragmentResponse> {
    let nodes = request.nodes.map(nodeData => createNodeFromJSON(nodeData));

    // 创建知识片段（临时，用于获取ID）
    const fragment = KnowledgeFragment.create(
      { value: request.title },
      nodes,
      request.tags || []
    );

    const fragmentId = fragment.getId().value;

    // 处理图片：复制到知识片段存储目录
    nodes = await this.copyImagesToFragmentStorage(
      fragmentId,
      nodes,
      request.sourceDocumentId,
      request.sourceFilePath
    );

    // 更新节点
    fragment.updateNodes(nodes);

    await this.repository.save(fragment);
    return this.mapToResponse(fragment);
  }

  /**
   * 查找所有图片节点
   */
  private findImageNodes(nodes: ASTNode[]): ImageNode[] {
    const imageNodes: ImageNode[] = [];

    const traverse = (nodeList: ASTNode[]) => {
      for (const node of nodeList) {
        if (node.type === NodeType.IMAGE) {
          imageNodes.push(node as ImageNode);
        }
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };

    traverse(nodes);
    return imageNodes;
  }

  /**
   * 更新知识片段
   */
  async updateFragment(
    id: string,
    request: UpdateKnowledgeFragmentRequest
  ): Promise<KnowledgeFragmentResponse> {
    const fragment = await this.repository.findById({ value: id });
    if (!fragment) {
      throw new Error(`Knowledge fragment with id ${id} not found`);
    }

    if (request.title !== undefined) {
      fragment.updateTitle({ value: request.title });
    }

    if (request.nodes !== undefined) {
      const nodes = request.nodes.map(nodeData => createNodeFromJSON(nodeData));
      fragment.updateNodes(nodes);
    }

    if (request.tags !== undefined) {
      fragment.updateTags(request.tags);
    }

    await this.repository.save(fragment);
    return this.mapToResponse(fragment);
  }

  /**
   * 获取知识片段
   */
  async getFragment(id: string): Promise<KnowledgeFragmentResponse | null> {
    const fragment = await this.repository.findById({ value: id });
    if (!fragment) {
      return null;
    }
    return this.mapToResponse(fragment);
  }

  /**
   * 获取所有知识片段
   */
  async getAllFragments(): Promise<KnowledgeFragmentResponse[]> {
    const fragments = await this.repository.findAll();
    return fragments.map(f => this.mapToResponse(f));
  }

  /**
   * 根据标签查找知识片段
   */
  async getFragmentsByTag(tag: string): Promise<KnowledgeFragmentResponse[]> {
    const fragments = await this.repository.findByTag(tag);
    return fragments.map(f => this.mapToResponse(f));
  }

  /**
   * 根据多个标签查找知识片段
   */
  async getFragmentsByTags(tags: string[]): Promise<KnowledgeFragmentResponse[]> {
    const fragments = await this.repository.findByTags(tags);
    return fragments.map(f => this.mapToResponse(f));
  }

  /**
   * 搜索知识片段
   */
  async searchFragments(query: string): Promise<KnowledgeFragmentResponse[]> {
    const fragments = await this.repository.search(query);
    return fragments.map(f => this.mapToResponse(f));
  }

  /**
   * 删除知识片段
   * 同时删除对应的存储目录（fragments/assets/{fragmentId}）
   */
  async deleteFragment(id: string): Promise<void> {
    // 删除知识片段数据
    await this.repository.delete({ value: id });

    // 删除对应的存储目录
    try {
      const fragmentStoragePath = this.imageStorage.getFragmentStoragePath(id);
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.file && electronAPI.file.deleteNode) {
        // 获取完整路径（使用字符串拼接，因为浏览器环境没有path模块）
        const dataPath = await electronAPI.file.getDataPath();
        // 规范化路径分隔符
        const normalizedDataPath = dataPath.replace(/\\/g, '/');
        const normalizedFragmentPath = fragmentStoragePath.replace(/\\/g, '/');
        const fullPath = `${normalizedDataPath}/${normalizedFragmentPath}`.replace(/\/+/g, '/');
        // 删除目录
        await electronAPI.file.deleteNode(fullPath);
        console.log('已删除知识片段存储目录:', fullPath);
      }
    } catch (error) {
      console.error('删除知识片段存储目录失败:', error);
      // 不抛出错误，因为数据已经删除，目录删除失败不影响主要功能
    }
  }

  /**
   * 将知识片段插入到文档
   * 返回引用标志 {{ref:fragmentId}}，而不是片段内容
   * 片段内容会在预览和导出时自动解析
   */
  async insertFragmentToDocument(
    fragmentId: string,
    documentId: string
  ): Promise<string> {
    const fragment = await this.repository.findById({ value: fragmentId });
    if (!fragment) {
      throw new Error(`Knowledge fragment with id ${fragmentId} not found`);
    }

    // 返回引用标志，而不是片段内容
    // 标志格式：{{ref:fragmentId}} 或 {{ref:fragmentId:connected}}
    return `{{ref:${fragmentId}}}`;
  }

  /**
   * 复制图片到知识片段存储目录
   * 注意：这个方法需要知道源文档ID或源文件路径才能正确复制图片
   * 如果无法确定源路径，图片将不会被复制
   */
  private async copyImagesToFragmentStorage(
    fragmentId: string,
    nodes: ASTNode[],
    sourceDocumentId?: string,
    sourceFilePath?: string
  ): Promise<ASTNode[]> {
    const fragmentStoragePath = this.imageStorage.getFragmentStoragePath(fragmentId);
    const updatedNodes: ASTNode[] = [];

    for (const node of nodes) {
      if (node.type === NodeType.IMAGE) {
        const imageNode = node as ImageNode;
        const sourcePath = imageNode.src;

        // 如果是相对路径（来自文档），需要复制
        if (sourcePath.startsWith('./assets/')) {
          const fileName = sourcePath.replace('./assets/', '');

          try {
            // 确定源图片的完整路径
            let sourceImagePath: string;

            if (sourceDocumentId) {
              // 从文档的assets目录复制
              const documentAssetsPath = this.imageStorage.getDocumentAssetsPath(sourceDocumentId);
              sourceImagePath = `${documentAssetsPath}/${fileName}`;
            } else if (sourceFilePath) {
              // 从外部文件的assets目录复制
              // 规范化路径分隔符，统一使用正斜杠
              const normalizedSourcePath = sourceFilePath.replace(/\\/g, '/');
              const fileDir = normalizedSourcePath.split('/').slice(0, -1).join('/');
              sourceImagePath = `${fileDir}/assets/${fileName}`;
            } else {
              // 无法确定源路径
              console.warn('无法确定图片源路径，sourceDocumentId和sourceFilePath都未提供:', fileName);
              // 保持原节点，不复制图片
              updatedNodes.push(node);
              continue;
            }

            // 确保目标目录存在（通过electronAPI）
            const electronAPI = (window as any).electronAPI;
            if (electronAPI && electronAPI.file && electronAPI.file.mkdir) {
              try {
                await electronAPI.file.mkdir(fragmentStoragePath);
              } catch {
                // 目录可能已存在，忽略错误
              }
            }

            // 复制图片到知识片段存储目录
            const destImagePath = `${fragmentStoragePath}/${fileName}`;
            const success = await this.imageStorage.copyImage(sourceImagePath, destImagePath);

            if (success) {
              // 更新节点路径
              const nodeData = imageNode.toJSON();
              nodeData.src = `./assets/${fileName}`;
              updatedNodes.push(createNodeFromJSON(nodeData));
            } else {
              console.error('图片复制失败:', sourceImagePath, '->', destImagePath);
              // 复制失败，保持原节点
              updatedNodes.push(node);
            }
          } catch (error) {
            console.error('复制图片时出错:', error, 'sourcePath:', sourcePath);
            // 出错时保持原节点
            updatedNodes.push(node);
          }
        } else {
          // 绝对路径或其他格式，直接使用
          updatedNodes.push(node);
        }
      } else {
        // 递归处理子节点
        const children = (node.children && Array.isArray(node.children)) ? node.children : [];
        if (children.length > 0) {
          const updatedChildren = await this.copyImagesToFragmentStorage(
            fragmentId,
            children,
            sourceDocumentId,
            sourceFilePath
          );
          // 重新创建节点以确保是 ASTNode 实例
          const nodeData = node.toJSON();
          nodeData.children = updatedChildren.map(child => child.toJSON());
          updatedNodes.push(createNodeFromJSON(nodeData));
        } else {
          updatedNodes.push(node);
        }
      }
    }

    return updatedNodes;
  }

  /**
   * 从节点中提取所有图片路径
   */
  private extractImagePaths(nodes: any[]): string[] {
    const paths: string[] = [];

    const traverse = (nodeList: any[]) => {
      for (const node of nodeList) {
        if (node.type === NodeType.IMAGE) {
          const imageNode = node as ImageNode;
          if (imageNode.src) {
            paths.push(imageNode.src);
          }
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };

    traverse(nodes);
    return paths;
  }

  /**
   * 从节点中提取第一个图片或Mermaid图表作为预览
   */
  private extractPreview(nodes: ASTNode[]): { previewImage?: string; previewType?: 'image' | 'mermaid'; previewMermaidCode?: string } {
    const traverse = (nodeList: ASTNode[]): { previewImage?: string; previewType?: 'image' | 'mermaid'; previewMermaidCode?: string } | null => {
      for (const node of nodeList) {
        // 检查图片节点
        if (node.type === NodeType.IMAGE) {
          const imageNode = node as ImageNode;
          if (imageNode.src) {
            return {
              previewImage: imageNode.src,
              previewType: 'image'
            };
          }
        }

        // 检查Mermaid代码块
        if (node.type === NodeType.CODE_BLOCK) {
          const codeBlock = node as any;
          // 检查是否是Mermaid图表（通过language属性或isMermaid方法）
          const isMermaid = (codeBlock.language && codeBlock.language.toLowerCase() === 'mermaid') ||
                           (codeBlock.isMermaid && typeof codeBlock.isMermaid === 'function' && codeBlock.isMermaid());
          if (isMermaid && codeBlock.content) {
            return {
              previewType: 'mermaid',
              previewMermaidCode: codeBlock.content
            };
          }
        }

        // 递归检查子节点
        if (node.children && Array.isArray(node.children) && node.children.length > 0) {
          const result = traverse(node.children);
          if (result) {
            return result;
          }
        }
      }
      return null;
    };

    const preview = traverse(nodes);
    return preview || {};
  }

  /**
   * 将领域实体映射为响应DTO
   */
  private mapToResponse(fragment: KnowledgeFragment): KnowledgeFragmentResponse {
    const nodes = fragment.getNodes();
    const preview = this.extractPreview(nodes);

    // 如果是图片预览，需要转换为完整路径
    let previewImage = preview.previewImage;
    if (previewImage && preview.previewType === 'image') {
      // 如果是相对路径（./assets/xxx.png），需要转换为完整路径
      if (previewImage.startsWith('./assets/')) {
        const fileName = previewImage.replace('./assets/', '');
        const fragmentId = fragment.getId().value;
        const fragmentAssetsPath = this.imageStorage.getFragmentStoragePath(fragmentId);
        // 返回相对路径，前端会通过app://协议访问
        previewImage = `${fragmentAssetsPath}/${fileName}`;
      }
    }

    return {
      id: fragment.getId().value,
      title: fragment.getTitle().value,
      tags: fragment.getTags().value,
      markdown: fragment.toMarkdown(),
      assetDependencies: fragment.getAssetDependencies().value,
      sourceDocumentId: fragment.getSourceDocumentId(),
      referencedDocuments: fragment.getReferencedDocuments().map(ref => ({
        documentId: ref.documentId,
        documentTitle: ref.documentTitle,
        referencedAt: ref.referencedAt.toISOString(),
        isConnected: ref.isConnected
      })),
      createdAt: fragment.getCreatedAt().toISOString(),
      updatedAt: fragment.getUpdatedAt().toISOString(),
      previewImage,
      previewType: preview.previewType,
      previewMermaidCode: preview.previewMermaidCode
    };
  }
}

