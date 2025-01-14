/**
 *   Wechaty - https://github.com/wechaty/wechaty
 *
 *   @copyright 2021 Wechaty Contributors <https://github.com/wechaty>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import { ScanStatus, WechatyBuilder } from 'wechaty'
import CozeBot from '../src/coze.js'
import QRCode from 'qrcode'
import { PuppetXp } from '../src/mod.js'

/**
 *
 * 1. Declare your Bot!
 *
 */
const puppet = new PuppetXp()

// Wechaty instance
const wechatBot = WechatyBuilder.build({
  name: 'wechat-coze-bot',
  puppet
});

// CozeBot instance
const cozeBot = new CozeBot();

/**
 *
 * 7. Output the Welcome Message
 *
 */


// 错误重试函数
async function retryOperation(operation: () => Promise<any>, maxRetries = 3, delay = 5000): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Operation failed, retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}


async function main() {
      const welcomeBot = `
    Puppet Version: ${wechatBot.version()}

    Please wait... I'm trying to login in...

    `
    console.info(welcomeBot)
  // 全局错误处理
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    try {
      await wechatBot.stop();
      console.log('Bot stopped due to error, restarting in 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      await main();
    } catch (e) {
      console.error('Failed to restart bot:', e);
    }
  });

  wechatBot
    .on('scan', async (qrcode, status) => {
      if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
        const url = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;
        console.log(`💡 Scan QR Code to login: ${status}\n${url}`);
        console.log(await QRCode.toString(qrcode, { type: 'terminal', small: true }));
      } else {
        console.log(`Scan status: ${status}`);
      }
    })
    .on('login', async (user) => {
      console.log(`✅ User ${user} has logged in`);
      await retryOperation(async () => {
        cozeBot.setBotName(user.name());
        await cozeBot.startCozeBot();
      });
    })
    .on('message', async (message) => {
      try {
        const msgDate = message.date();
        if (msgDate.getTime() <= cozeBot.startTime.getTime()) {
          return;
        }

        console.log(`📨 ${message}`);
        if (/ding/i.test(message.text())) {
          await puppet.messageSendText(message.room()?.id || message.talker().id, 'dong')
        }
        await retryOperation(() => cozeBot.onMessage(message));
      } catch (e) {
        console.error(`❌ Message handling error:`, e);
      }
    })
    .on('error', async (error) => {
      console.error('Bot error:', error);
      // 不要在这里重启，让全局错误处理来处理
    });

  try {
    await wechatBot.start();
  } catch (e) {
    console.error(`❌ Bot failed to start:`, e);
    console.log('Retrying in 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await main();
  }
}

// 启动主程序
main().catch(console.error);

/**
 *
 * 4. You are all set. ;-]
 *
 */

/**
 *
 * 5. Define Event Handler Functions for:
 *  `scan`, `login`, `logout`, `error`, and `message`
 *
 */



