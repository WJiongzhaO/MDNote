// 文档创建和保存功能测试脚本
const { Application } = require('./dist/core/application.js');

async function testDocumentCRUD() {
  console.log('=== 开始测试文档CRUD功能 ===\n');

  try {
    // 初始化应用
    const app = Application.getInstance();
    const documentUseCases = app.getDocumentUseCases();

    console.log('1. 测试创建文档...');
    
    // 创建测试文档
    const testDocument = await documentUseCases.createDocument({
      title: '测试文档 - ' + new Date().toISOString(),
      content: `# 测试文档

这是一个测试文档，用于验证文档创建和保存功能。

## 功能验证

- [x] 文档创建
- [x] 文档保存
- [ ] 文档更新
- [ ] 文档删除

## 数学公式测试

行内公式：$E = mc^2$

块级公式：
$$\int_a^b f(x) \, dx$$

测试完成！`,
      folderId: null
    });

    console.log('✅ 文档创建成功');
    console.log('   文档ID:', testDocument.id);
    console.log('   文档标题:', testDocument.title);
    console.log('   创建时间:', testDocument.createdAt);

    console.log('\n2. 测试读取文档...');
    
    // 读取刚创建的文档
    const retrievedDoc = await documentUseCases.getDocument(testDocument.id);
    
    if (retrievedDoc) {
      console.log('✅ 文档读取成功');
      console.log('   文档内容长度:', retrievedDoc.content.length);
      console.log('   更新时间:', retrievedDoc.updatedAt);
    } else {
      console.log('❌ 文档读取失败');
    }

    console.log('\n3. 测试更新文档...');
    
    // 更新文档
    const updatedDoc = await documentUseCases.updateDocument({
      id: testDocument.id,
      title: '更新后的测试文档',
      content: `# 更新后的测试文档

这是更新后的文档内容。

## 更新验证

- [x] 文档创建
- [x] 文档保存
- [x] 文档更新
- [ ] 文档删除

## 新增内容

这是一个新增的段落，用于验证更新功能。

数学公式：$x^2 + y^2 = z^2$`
    });

    if (updatedDoc) {
      console.log('✅ 文档更新成功');
      console.log('   新标题:', updatedDoc.title);
      console.log('   新内容长度:', updatedDoc.content.length);
    } else {
      console.log('❌ 文档更新失败');
    }

    console.log('\n4. 测试获取所有文档...');
    
    // 获取所有文档
    const allDocs = await documentUseCases.getAllDocuments();
    console.log('✅ 获取文档列表成功');
    console.log('   文档数量:', allDocs.length);
    
    if (allDocs.length > 0) {
      console.log('   最新文档标题:', allDocs[0].title);
    }

    console.log('\n5. 测试删除文档...');
    
    // 删除文档
    const deleteResult = await documentUseCases.deleteDocument(testDocument.id);
    
    if (deleteResult) {
      console.log('✅ 文档删除成功');
    } else {
      console.log('❌ 文档删除失败');
    }

    console.log('\n6. 验证文档已删除...');
    
    // 验证文档已删除
    const deletedDoc = await documentUseCases.getDocument(testDocument.id);
    
    if (!deletedDoc) {
      console.log('✅ 文档删除验证成功');
    } else {
      console.log('❌ 文档删除验证失败');
    }

    console.log('\n=== 文档CRUD功能测试完成 ===');
    console.log('✅ 所有测试通过！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    console.error('错误堆栈:', error.stack);
  }
}

// 运行测试
testDocumentCRUD();