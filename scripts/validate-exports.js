/**
 * 导入导出验证脚本
 *
 * 用途：
 * 1. 检查所有从 GitEntities.ts 导出的类型是否被正确导出
 * 2. 检查所有使用这些类型的文件是否可以成功导入
 * 3. 防止运行时的 "does not provide an export" 错误
 *
 * 使用方法：
 * node scripts/validate-exports.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const GIT_ENTITIES_FILE = path.join(ROOT_DIR, 'src/domain/entities/git/GitEntities.ts');

// 预期应该导出的所有类型
const EXPECTED_EXPORTS = [
  'GitCommit',
  'GitStatus',
  'GitDiff',
  'GitBranch',
  'GitRemote',
  'DiffHunk',
  'DiffLine',
];

/**
 * 从文件中提取所有导出的接口/类型
 */
function extractExports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const exports = [];

  // 匹配 export interface 和 export type 定义
  const exportRegex = /export\s+(?:interface|type)\s+(\w+)/g;
  let match;

  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  return exports;
}

/**
 * 查找所有导入 GitEntities 的文件
 */
function findFilesImportingGitEntities(dir) {
  const files = [];

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // 跳过 node_modules 和 __tests__ 目录
        if (entry.name !== 'node_modules' && entry.name !== '__tests__' && entry.name !== '.git') {
          traverse(fullPath);
        }
      } else if (entry.isFile() && (/\.(ts|tsx|vue)$/.test(entry.name))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // 检查是否导入了 GitEntities
        if (content.includes('GitEntities') || content.includes('from.*entities/git')) {
          files.push(fullPath);
        }
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * 验证文件的导入语句
 */
function validateImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const errors = [];

  // 提取所有从 Git 相关的导入
  const importRegex = /import\s+(?:type\s+)?{([^}]+)}\s+from\s+['"]([^'"]*entities\/git[^'"]*)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const imports = match[1].split(',').map(s => s.trim());
    const source = match[2];

    // 检查每个导入的类型是否在 EXPECTED_EXPORTS 中
    for (const imp of imports) {
      // 移除可能的类型修饰符（如 type 关键字在单独导入时）
      const typeName = imp.replace(/^type\s+/, '');

      // 如果从 GitEntities.ts 导入，检查类型是否存在
      if (source.includes('GitEntities') || source.endsWith('git"') || source.endsWith("git'")) {
        if (!EXPECTED_EXPORTS.includes(typeName)) {
          errors.push(`  - 导入了未定义的类型: ${typeName}`);
        }
      }
    }
  }

  return errors;
}

/**
 * 主验证函数
 */
function validate() {
  console.log('🔍 开始验证 Git 实体的导入导出...\n');

  // 1. 检查 GitEntities.ts 的导出
  console.log('📄 检查 GitEntities.ts 的导出...');
  const actualExports = extractExports(GIT_ENTITIES_FILE);

  console.log(`  预期导出: ${EXPECTED_EXPORTS.length} 个类型`);
  console.log(`  实际导出: ${actualExports.length} 个类型`);

  const missingExports = EXPECTED_EXPORTS.filter(e => !actualExports.includes(e));
  const extraExports = actualExports.filter(e => !EXPECTED_EXPORTS.includes(e));

  if (missingExports.length > 0) {
    console.log('\n❌ 缺失的导出:');
    missingExports.forEach(e => console.log(`  - ${e}`));
  }

  if (extraExports.length > 0) {
    console.log('\n⚠️  额外的导出（可能需要更新 EXPECTED_EXPORTS）:');
    extraExports.forEach(e => console.log(`  - ${e}`));
  }

  if (missingExports.length === 0 && extraExports.length === 0) {
    console.log('✅ GitEntities.ts 导出正确\n');
  }

  // 2. 检查所有导入 Git 实体的文件
  console.log('🔍 检查导入 Git 实体的文件...');
  const files = findFilesImportingGitEntities(path.join(ROOT_DIR, 'src'));

  console.log(`  找到 ${files.length} 个文件\n`);

  let hasErrors = false;

  for (const file of files) {
    const relativePath = path.relative(ROOT_DIR, file);
    const errors = validateImports(file);

    if (errors.length > 0) {
      hasErrors = true;
      console.log(`❌ ${relativePath}:`);
      errors.forEach(err => console.log(err));
    }
  }

  if (!hasErrors) {
    console.log('✅ 所有文件的导入都是正确的\n');
  }

  // 3. 总结
  console.log('─────────────────────────────────────');

  if (missingExports.length > 0 || hasErrors) {
    console.log('❌ 验证失败！请修复上述错误。');
    process.exit(1);
  } else {
    console.log('✅ 验证通过！所有导入导出都是正确的。');
    process.exit(0);
  }
}

// 运行验证
validate();
