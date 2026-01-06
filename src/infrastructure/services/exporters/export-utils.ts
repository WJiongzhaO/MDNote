/**
 * 导出工具函数
 * 用于处理导出过程中的图片、公式等资源
 */

// 类型守卫函数：确保值是字符串类型
function isString(value: unknown): value is string {
  return typeof value === 'string' && value !== null && value !== undefined;
}

/**
 * 将图片路径转换为 base64 data URL
 */
export async function convertImageToBase64(imagePath: string): Promise<string | null> {
  try {
    const electronAPI = (window as any).electronAPI;

    // 如果已经是 base64 或 data URL，直接返回
    if (imagePath.startsWith('data:') || imagePath.startsWith('base64:')) {
      return imagePath;
    }

    // 优先使用 Electron API 读取文件（适用于本地文件系统）
    if (electronAPI && electronAPI.file && electronAPI.file.readBinary) {
      try {
        // 如果是 file:// 协议，移除协议前缀
        let filePath = imagePath;
        if (filePath.startsWith('file://')) {
          filePath = filePath.substring(7); // 移除 'file://' 前缀
        }

        const buffer = await electronAPI.file.readBinary(filePath);
        if (buffer) {
          // 检测图片类型
          const mimeType = detectImageMimeType(filePath, buffer);
          return arrayBufferToBase64(buffer, mimeType);
        }
      } catch (error) {
        console.warn('Failed to read image via Electron API:', error);
        // 继续尝试其他方法
      }
    }

    // 如果是 HTTP/HTTPS 链接，使用 fetch
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
        try {
          const response = await fetch(imagePath);
          const blob = await response.blob();
          return await blobToBase64(blob);
        } catch (error) {
          console.warn('Failed to fetch image via fetch:', error);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

/**
 * 将 Blob 转换为 base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * 将 ArrayBuffer 转换为 base64 data URL
 */
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array, mimeType: string): string {
  let bytes: Uint8Array;
  if (buffer instanceof Uint8Array) {
    bytes = buffer;
  } else {
    bytes = new Uint8Array(buffer);
  }

  // 将字节数组转换为 base64 字符串
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  const base64 = btoa(binary);
  return `data:${mimeType};base64,${base64}`;
}

/**
 * 检测图片的 MIME 类型
 */
function detectImageMimeType(filePath: string, buffer: ArrayBuffer | Uint8Array): string {
  // 从文件扩展名判断
  const ext = filePath.toLowerCase().split('.').pop();
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp'
  };

  if (ext && mimeTypes[ext]) {
    return mimeTypes[ext];
  }

  // 尝试从文件头（magic number）判断
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length >= 4) {
    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return 'image/png';
    }
    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'image/jpeg';
    }
    // GIF: 47 49 46 38
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
      return 'image/gif';
    }
  }

  // 默认返回 PNG
  return 'image/png';
}

/**
 * 处理 HTML 中的图片路径，转换为 base64
 */
export async function processImagesInHTML(html: string, documentId?: string): Promise<string> {
  const imgRegex = /<img([^>]+)src="([^"]+)"/g;
  const processedSrcs = new Map<string, string>(); // 缓存已处理的路径
  const promises: Promise<void>[] = [];

  // 收集所有需要处理的图片
  const imageMatches: Array<{ fullMatch: string; attributes: string; src: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    const attributes = match[1];
    const srcValue = match[2];

    // 确保 src 存在且是字符串（使用类型守卫）
    if (!isString(srcValue)) {
      continue;
    }

    // 跳过已经是 base64 的图片
    if (srcValue.startsWith('data:') || srcValue.startsWith('base64:')) {
      continue;
    }

    // 跳过 http/https 链接（如果是外部链接，保持原样）
    if (srcValue.startsWith('http://') || srcValue.startsWith('https://')) {
      continue;
    }

    // 此时 srcValue 已经被类型守卫确认为 string 类型
    // 由于 TypeScript 的类型收窄可能不够，使用类型断言
    // @ts-ignore - 类型守卫已经确保了 srcValue 是 string 类型
    imageMatches.push({ fullMatch, attributes, src: srcValue });
  }

  // 处理每个图片
  for (const { fullMatch, attributes, src } of imageMatches) {
    const promise = (async () => {
      // 检查缓存
      if (processedSrcs.has(src)) {
        const base64Src = processedSrcs.get(src)!;
        html = html.replace(fullMatch, `<img${attributes}src="${base64Src}"`);
        return;
      }

      // 尝试获取完整路径
      let imagePath = src;
      const electronAPI = (window as any).electronAPI;

      // 如果是相对路径，尝试转换为绝对路径
      if (src.startsWith('./assets/') && documentId && electronAPI?.file?.getFullPath) {
        try {
          const fileName = src.replace('./assets/', '');
          if (!fileName) {
            return;
          }
          let relativePath: string;

          // 判断文档类型
          const isExternalFile = documentId.startsWith('file:') ||
                                 documentId.includes('/') ||
                                 documentId.includes('\\') ||
                                 (documentId.length > 0 && (documentId[1] === ':' || documentId.startsWith('/')));

          if (isExternalFile) {
            let filePath = documentId;
            if (filePath.startsWith('file:')) {
              filePath = filePath.substring(5);
            }

            // 判断是文件路径还是目录路径
            const commonExtensions = ['.md', '.txt', '.json', '.html', '.htm', '.css', '.js', '.ts', '.vue', '.jsx', '.tsx'];
            const isFilePath = commonExtensions.some(ext => filePath.toLowerCase().endsWith(ext));

            let fileDir: string;
            if (isFilePath) {
              // 是文件路径，提取文件所在目录
              const pathParts = filePath.split(/[/\\]/);
              pathParts.pop();
              fileDir = pathParts.join('/');
            } else {
              // 已经是目录路径，直接使用
              fileDir = filePath;
            }

            relativePath = `${fileDir}/assets/${fileName}`;
          } else if (documentId.startsWith('fragment:')) {
            const fragmentId = documentId.substring(9);
            relativePath = `fragments/assets/${fragmentId}/${fileName}`;
            // 知识片段使用全局路径
            if (electronAPI.fragment && electronAPI.fragment.getFullPath) {
              imagePath = await electronAPI.fragment.getFullPath(relativePath);
            } else {
              imagePath = await electronAPI.file.getFullPath(relativePath);
            }
          } else {
            relativePath = `documents/${documentId}/assets/${fileName}`;
            imagePath = await electronAPI.file.getFullPath(relativePath);
          }
        } catch (error) {
          console.warn('Failed to get full path for image:', src, error);
        }
      }

      // 转换为 base64
      const base64Src = await convertImageToBase64(imagePath);
      if (base64Src) {
        processedSrcs.set(src, base64Src);
        html = html.replace(fullMatch, `<img${attributes}src="${base64Src}"`);
      }
    })();

    promises.push(promise);
  }

  // 等待所有图片处理完成
  await Promise.all(promises);

  return html;
}

/**
 * 获取 KaTeX CSS 样式（内联版本）
 * 这里使用 CDN 链接，也可以内联完整的 CSS
 */
export function getKaTeXStyles(): string {
  // 使用 CDN 链接（更可靠）
  return `
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">
  `;

  // 如果需要内联 CSS（离线支持），可以读取 node_modules/katex/dist/katex.min.css
  // 但会增加 HTML 文件大小，这里使用 CDN 更合适
}

/**
 * 获取 KaTeX 内联样式（如果需要完全离线支持）
 * 注意：这会显著增加 HTML 文件大小
 */
export async function getKaTeXInlineStyles(): Promise<string> {
  try {
    // 尝试从 node_modules 读取
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.file?.readFileContent) {
      try {
        // 假设项目根目录有 node_modules
        const cssPath = 'node_modules/katex/dist/katex.min.css';
        const cssContent = await electronAPI.file.readFileContent(cssPath);
        return `<style>${cssContent}</style>`;
      } catch (error) {
        console.warn('Failed to read KaTeX CSS from file system:', error);
      }
    }
  } catch (error) {
    console.warn('Error getting KaTeX inline styles:', error);
  }

  // 降级到 CDN
  return getKaTeXStyles();
}

