// tasks/storeData.js
const { task } = require("hardhat/config");

// LockTokens 合约地址 (A链，即imua网络) - 部署 LockTokens 后需要更新此地址
const LOCK_TOKENS_ADDRESS = "0x64FE7cac156E74Fd3437A26a2FcCEF0b2fE1B60B"; // <-- **重要：部署后更新此地址**

task("lock-imua", "在A链上锁定imua并触发跨链事件") // 更改任务名称和描述
  .addParam("receiver", "B链上接收代币的地址") // 参数名改为 receiver 与合约一致
  .addParam("amount", "要锁定的imua数量 (人类可读格式, 例如: '0.1' 代表 0.1 imua)")
  .setAction(async ({ receiver, amount }, hre) => { // 参数名改为 receiver
    const [sender] = await hre.ethers.getSigners(); // 发送者账户
    console.log("正在使用账户:", sender.address);

    if (!LOCK_TOKENS_ADDRESS || LOCK_TOKENS_ADDRESS === "YOUR_LOCK_TOKENS_ADDRESS_GOES_HERE") {
        console.error("错误: 请在 tasks/storeData.js 中更新 LOCK_TOKENS_ADDRESS");
        process.exit(1);
    }
     if (!hre.ethers.isAddress(receiver)) { // 校验接收者地址
        console.error(`错误: 接收者地址 ${receiver} 格式无效。`);
        process.exit(1);
    }


    const LockTokens = await hre.ethers.getContractFactory("LockTokens");
    // 使用 attach 连接到已部署的合约
    const lockTokens = await LockTokens.attach(LOCK_TOKENS_ADDRESS);

    const amountWei = hre.ethers.parseEther(amount);

    console.log(`正在锁定 ${amount} imua，并请求在B链上铸造到 ${receiver}...`);
    try {
        // 调用 lock 函数，通过 value 传递 imua 数量
        const tx = await lockTokens.lock(receiver, { value: amountWei });
        await tx.wait();
        console.log("imua 已锁定，跨链事件已触发! 交易哈希:", tx.hash);
        console.log("请在A链上监控 'Locked' 事件。");
        console.log(`B链 (Sepolia) 上的接收者: ${receiver}, 锁定的imua (扣费前): ${amount}`);
        // 提示用户需要链下服务处理事件并在B链铸币
        console.log("请使用链下服务监听此交易的 'Locked' 事件，并使用事件数据在B链上调用 mint 函数。");

    } catch (error) {
        console.error("锁定imua失败:", error.message);
        console.error("请确保 LOCK_TOKENS_ADDRESS 正确且您有足够的imua。");
        process.exit(1);
    }
  });
