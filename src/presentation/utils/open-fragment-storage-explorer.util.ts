type FragmentElectronApi = {
  openStorageInExplorer?: (id: string) => Promise<unknown>;
  openFragmentsJsonDirInExplorer?: (vaultId: string) => Promise<unknown>;
};

function getFragmentApi(): FragmentElectronApi | undefined {
  return (window as unknown as { electronAPI?: { fragment?: FragmentElectronApi } }).electronAPI
    ?.fragment;
}

/**
 * 片段资源目录：getDataPath()/fragments/assets/{fragmentId}/（图片等，与 FileSystemImageStorageService 一致）
 */
export async function openFragmentStorageInExplorer(
  fragmentId: string,
): Promise<{ ok: boolean; error?: string }> {
  const fn = getFragmentApi()?.openStorageInExplorer;
  if (typeof fn !== 'function') {
    return { ok: false, error: 'no-electron' };
  }
  try {
    const result = (await fn(fragmentId)) as { ok?: boolean; error?: string } | undefined;
    if (result?.ok) return { ok: true };
    return { ok: false, error: result?.error || '打开失败' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * 当前项目数据目录：getDataPath()/.mdnote-fragments-{vaultId}/（knowledge-fragments.json，与 FileSystemKnowledgeFragmentRepository 一致）
 */
export async function openFragmentsJsonDirInExplorer(
  vaultId: string,
): Promise<{ ok: boolean; error?: string }> {
  const fn = getFragmentApi()?.openFragmentsJsonDirInExplorer;
  if (typeof fn !== 'function') {
    return { ok: false, error: 'no-electron' };
  }
  try {
    const result = (await fn(vaultId)) as { ok?: boolean; error?: string } | undefined;
    if (result?.ok) return { ok: true };
    return { ok: false, error: result?.error || '打开失败' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
