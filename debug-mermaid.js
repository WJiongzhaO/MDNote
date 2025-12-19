// 调试Mermaid渲染器
const debugMermaid = async () => {
  console.log('开始调试Mermaid渲染器...');
  
  try {
    // 动态导入Mermaid库
    console.log('动态导入Mermaid库...');
    const mermaidModule = await import('mermaid');
    const mermaid = mermaidModule.default;
    console.log('Mermaid库导入成功，版本:', mermaid.version);
    
    // 配置Mermaid
    console.log('配置Mermaid选项...');
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit'
    });
    
    console.log('Mermaid配置完成');
    
    // 测试渲染
    const testDiagram = `graph TD
      A[开始] --> B{条件判断}
      B -->|是| C[执行操作]
      B -->|否| D[结束]
      C --> D`;
    
    console.log('开始渲染测试图表...');
    console.log('图表代码:', testDiagram);
    
    // 生成唯一的ID
    const id = 'test-mermaid-' + Math.random().toString(36).substr(2, 9);
    console.log('图表ID:', id);
    
    // 测试渲染方法
    console.log('调用mermaid.render方法...');
    const result = await mermaid.render(id, testDiagram);
    console.log('渲染结果类型:', typeof result);
    console.log('渲染结果:', result);
    
    // 检查结果格式
    let svg;
    if (typeof result === 'string') {
      svg = result;
      console.log('结果直接是字符串');
    } else if (result.svg && typeof result.svg === 'string') {
      svg = result.svg;
      console.log('结果包含svg属性');
    } else if (result.bindFunctions) {
      svg = result.svg || '';
      console.log('结果包含bindFunctions');
    } else {
      console.error('无法识别的结果格式');
      return;
    }
    
    console.log('SVG长度:', svg.length);
    console.log('SVG预览:', svg.substring(0, 200));
    
    // 显示结果
    const container = document.createElement('div');
    container.innerHTML = svg;
    document.body.appendChild(container);
    
    console.log('Mermaid渲染测试完成');
    
  } catch (error) {
    console.error('Mermaid调试失败:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }
};

// 运行调试
debugMermaid();