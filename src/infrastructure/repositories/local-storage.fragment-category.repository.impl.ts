import type { FragmentCategoryRepository } from '../../domain/repositories/fragment-category.repository.interface';
import type { FragmentCategory, FragmentCategoryTreeNode } from '../../domain/types/fragment-category.types';
import type { DeleteCategoryOptions } from '../../domain/types/fragment-category.types';

const STORAGE_KEY_PREFIX = 'mdnote-fragment-categories-';

interface StoredCategory {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
}

/**
 * 按 vaultId 在 localStorage 中存储分类树，便于与工作1 路由合并后按知识库隔离
 */
export class LocalStorageFragmentCategoryRepository implements FragmentCategoryRepository {
  private getKey(vaultId: string): string {
    return `${STORAGE_KEY_PREFIX}${vaultId}`;
  }

  private async getFlatList(vaultId: string): Promise<StoredCategory[]> {
    try {
      const raw = localStorage.getItem(this.getKey(vaultId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async setFlatList(vaultId: string, list: StoredCategory[]): Promise<void> {
    localStorage.setItem(this.getKey(vaultId), JSON.stringify(list));
  }

  async getTree(vaultId: string): Promise<FragmentCategoryTreeNode[]> {
    const flat = await this.getFlatList(vaultId);
    const byId = new Map<string, FragmentCategoryTreeNode>();
    flat.forEach(c => {
      byId.set(c.id, { ...c, children: [] });
    });
    const roots: FragmentCategoryTreeNode[] = [];
    byId.forEach(node => {
      const parentId = node.parentId;
      if (!parentId) {
        roots.push(node);
      } else {
        const parent = byId.get(parentId);
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
    });
    roots.sort((a, b) => a.order - b.order);
    byId.forEach(n => n.children.sort((a, b) => a.order - b.order));
    return roots;
  }

  async create(vaultId: string, parentId: string | null, name: string): Promise<FragmentCategory> {
    const flat = await this.getFlatList(vaultId);
    const id = crypto.randomUUID();
    const maxOrder = flat.length === 0 ? 0 : Math.max(...flat.map(c => c.order), 0);
    const newCat: StoredCategory = { id, name, parentId, order: maxOrder + 1 };
    flat.push(newCat);
    await this.setFlatList(vaultId, flat);
    return newCat;
  }

  async rename(id: string, name: string): Promise<void> {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(STORAGE_KEY_PREFIX)) continue;
      const vaultId = key.slice(STORAGE_KEY_PREFIX.length);
      const flat = await this.getFlatList(vaultId);
      const idx = flat.findIndex(c => c.id === id);
      if (idx !== -1) {
        flat[idx] = { ...flat[idx], name };
        await this.setFlatList(vaultId, flat);
        return;
      }
    }
    throw new Error(`FragmentCategory not found: ${id}`);
  }

  async move(id: string, newParentId: string | null): Promise<void> {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(STORAGE_KEY_PREFIX)) continue;
      const vaultId = key.slice(STORAGE_KEY_PREFIX.length);
      const flat = await this.getFlatList(vaultId);
      const idx = flat.findIndex(c => c.id === id);
      if (idx !== -1) {
        flat[idx] = { ...flat[idx], parentId: newParentId };
        await this.setFlatList(vaultId, flat);
        return;
      }
    }
    throw new Error(`FragmentCategory not found: ${id}`);
  }

  async delete(id: string, options?: DeleteCategoryOptions): Promise<void> {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(STORAGE_KEY_PREFIX)) continue;
      const vaultId = key.slice(STORAGE_KEY_PREFIX.length);
      let flat = await this.getFlatList(vaultId);
      const idx = flat.findIndex(c => c.id === id);
      if (idx === -1) continue;

      if (options?.moveChildrenToParent) {
        const parentId = flat[idx].parentId;
        flat = flat.map(c => (c.parentId === id ? { ...c, parentId } : c));
      }
      flat = flat.filter(c => c.id !== id);
      await this.setFlatList(vaultId, flat);
      return;
    }
    throw new Error(`FragmentCategory not found: ${id}`);
  }

  async reorder(id: string, order: number): Promise<void> {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(STORAGE_KEY_PREFIX)) continue;
      const vaultId = key.slice(STORAGE_KEY_PREFIX.length);
      const flat = await this.getFlatList(vaultId);
      const idx = flat.findIndex(c => c.id === id);
      if (idx !== -1) {
        flat[idx] = { ...flat[idx], order };
        await this.setFlatList(vaultId, flat);
        return;
      }
    }
    throw new Error(`FragmentCategory not found: ${id}`);
  }

  async findById(id: string): Promise<FragmentCategory | null> {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(STORAGE_KEY_PREFIX)) continue;
      const flat = await this.getFlatList(key.slice(STORAGE_KEY_PREFIX.length));
      const c = flat.find(x => x.id === id);
      if (c) return c;
    }
    return null;
  }
}
