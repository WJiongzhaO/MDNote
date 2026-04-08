import { ref, nextTick } from 'vue';
import type { KnowledgeFragmentResponse } from '../../application/dto/knowledge-fragment.dto';
import {
  openFragmentStorageInExplorer,
  openFragmentsJsonDirInExplorer,
} from '../utils/open-fragment-storage-explorer.util';

export type FragmentContextMenuOptions = {
  /** 当前知识库 id，用于打开 JSON 数据目录 */
  getVaultId: () => string;
};

function alertOpenFailure(res: { ok: boolean; error?: string }) {
  if (res.ok || !res.error) return;
  if (res.error === 'no-electron') {
    window.alert('仅在 Electron 桌面版支持在文件管理器中打开');
  } else {
    window.alert('打开失败：' + res.error);
  }
}

export function useFragmentContextMenu(options: FragmentContextMenuOptions) {
  const fragmentContextMenu = ref<{
    show: boolean;
    x: number;
    y: number;
    fragment: KnowledgeFragmentResponse | null;
  }>({ show: false, x: 0, y: 0, fragment: null });

  let removeDocMouseDown: (() => void) | null = null;

  function closeFragmentContextMenu() {
    fragmentContextMenu.value = { show: false, x: 0, y: 0, fragment: null };
    removeDocMouseDown?.();
    removeDocMouseDown = null;
  }

  function onFragmentContextMenu(e: MouseEvent, fragment: KnowledgeFragmentResponse) {
    e.preventDefault();
    removeDocMouseDown?.();
    fragmentContextMenu.value = { show: true, x: e.clientX, y: e.clientY, fragment };
    nextTick(() => {
      const handler = () => closeFragmentContextMenu();
      document.addEventListener('mousedown', handler);
      removeDocMouseDown = () => document.removeEventListener('mousedown', handler);
    });
  }

  /** 全局目录：该片段的图片等资源 */
  async function confirmOpenFragmentAssetsInFileManager() {
    const id = fragmentContextMenu.value.fragment?.id;
    if (!id) return;
    const res = await openFragmentStorageInExplorer(id);
    closeFragmentContextMenu();
    alertOpenFailure(res);
  }

  /** 当前项目数据目录：knowledge-fragments.json 所在文件夹 */
  async function confirmOpenFragmentsJsonDirInFileManager() {
    const res = await openFragmentsJsonDirInExplorer(options.getVaultId());
    closeFragmentContextMenu();
    alertOpenFailure(res);
  }

  return {
    fragmentContextMenu,
    closeFragmentContextMenu,
    onFragmentContextMenu,
    confirmOpenFragmentAssetsInFileManager,
    confirmOpenFragmentsJsonDirInFileManager,
  };
}
