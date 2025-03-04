import { MessageHandler } from './MessageHandler';

const handler = new MessageHandler();

// 示例1：处理图片消息
async function handleImageMessage() {
    await handler.handleMessage('pic msg ["path/to/image.jpg"]');
}

// 示例2：处理文本消息
async function handleTextMessage() {
    await handler.handleMessage({
        type: "Message#Text",
        content: "Hello world",
        talker: "User<John>@Room<Group1>"
    });
}

// 示例3：处理群通知消息
async function handleGroupNotification() {
    await handler.handleMessage({
        type: "Message#GroupNote",
        content: "用户A邀请用户B加入了群聊",
        talker: "System@Room<TestGroup>",
        note_type: "invite"
    });
}

// 运行示例
async function runExamples() {
    try {
        console.log("=== 处理图片消息 ===");
        await handleImageMessage();

        console.log("\n=== 处理文本消息 ===");
        await handleTextMessage();

        console.log("\n=== 处理群通知消息 ===");
        await handleGroupNotification();
    } catch (error) {
        console.error("示例运行失败:", error);
    }
}

// 执行示例
runExamples(); 