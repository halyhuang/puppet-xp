const axios = require('axios');

async function testAnythingLLM() {
  try {
    const response = await axios({
      method: 'post',
      url: 'http://47.112.174.16/api/v1/openai/chat/completions',
      headers: {
        'Authorization': '8EJRT5T-AC5461A-MHN1110-K6GP9HZ',
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      data: {
        messages: [{
          role: 'user',
          content: '你好，请介绍一下你自己'
        }],
        model: 'deepseek-r1:7b',
        stream: true,
        temperature: 0.7
      },
      responseType: 'stream'
    });

    console.log('接收到响应：');
    
    // 处理流式响应
    response.data.on('data', chunk => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            console.log('\n流式响应结束');
            return;
          }
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              process.stdout.write(content);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    });

    response.data.on('end', () => {
      console.log('\n响应完成');
    });

    response.data.on('error', error => {
      console.error('流处理错误:', error);
    });

  } catch (error) {
    if (error.response) {
      // 服务器返回了错误状态码
      console.error('服务器错误:', error.response.status);
      if (error.response.data) {
        error.response.data.on('data', chunk => {
          console.error('错误详情:', chunk.toString());
        });
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('无响应:', error.message);
    } else {
      // 请求配置出错
      console.error('请求错误:', error.message);
    }
  }
}

console.log('开始测试 AnythingLLM API...');
testAnythingLLM(); 