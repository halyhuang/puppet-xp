const axios = require('axios');

async function testAnythingLLM() {
  const config = {
    method: 'post',
    url: 'http://47.112.174.16/api/v1/openai/chat/completions',
    headers: {
      'Authorization': 'Bearer 8EJRT5T-AC5461A-MHN1110-K6GP9HZ',
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    },
    data: {
      messages: [{
        role: 'user',
        content: '你好，请介绍一下你自己'
      }],
      model: 'deepseek-r1:1.5b',
      stream: true,
      temperature: 0.7
    },
    responseType: 'stream'
  };

  console.log('发送请求配置：', JSON.stringify(config, null, 2));

  try {
    const response = await axios(config);

    console.log('响应头：', response.headers);
    console.log('响应状态：', response.status);
    
    // 处理流式响应
    response.data.on('data', chunk => {
      console.log('收到数据块：', chunk.toString());
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
            console.log('解析响应数据失败：', e.message);
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
    console.error('请求失败：');
    if (error.response) {
      console.error('状态码：', error.response.status);
      console.error('响应头：', error.response.headers);
      if (error.response.data) {
        if (typeof error.response.data === 'string') {
          console.error('错误详情：', error.response.data);
        } else {
          error.response.data.on('data', chunk => {
            console.error('错误详情：', chunk.toString());
          });
        }
      }
    } else if (error.request) {
      console.error('无响应：', error.message);
    } else {
      console.error('请求错误：', error.message);
    }
    if (error.config) {
      console.error('请求配置：', JSON.stringify(error.config, null, 2));
    }
  }
}

console.log('开始测试 AnythingLLM API...');
testAnythingLLM(); 