// tasks/manualUnlockSepolia.js
const { task } = require("hardhat/config");
require("dotenv").config();

// 请替换为你的 LockTokens 合约在 Sepolia 链上的实际地址
const LOCK_TOKENS_ADDRESS = "0x3e8f3802d51D3D848a8560e25E9B960aa7Edf881";

task("manual-unlock-sepolia", "根据B链事件数据在A链 (Sepolia) 上手动解锁 ETH")
  .addParam("recipient", "A链 (Sepolia) 上接收 ETH 的地址 (来自B链事件)")
  .addParam("amount", "要解锁的 ETH 数量 (人类可读格式, 来自B链事件)")
  .addParam("crosschainhash", "来自B链事件的唯一数据哈希 (例如: 0x...64个字符)")
  .setAction(async ({ recipient, amount, crosschainhash }, hre) => {
    // 运行此任务的账户需要是 LockTokens 合约的 owner
    const [owner] = await hre.ethers.getSigners();
    console.log("正在使用手动操作员账户 (需是 LockTokens 的 owner):", owner.address);

    if (!LOCK_TOKENS_ADDRESS || LOCK_TOKENS_ADDRESS === "0x...") {
        console.error("错误: 请在 tasks/manualUnlockSepolia.js 中更新 LOCK_TOKENS_ADDRESS (Sepolia 链上的 LockTokens 地址)");
        process.exit(1);
    }
    if (!hre.ethers.isHexString(crosschainhash, 32)) {
        console.error("错误: crosschainhash 必须是32字节的十六进制字符串 (例如: 0x...64个字符)。");
        process.exit(1);
    }
    if (!hre.ethers.isAddress(recipient)) {
        console.error(`错误: 接收者地址 ${recipient} 格式无效。`);
        process.exit(1);
    }

    const LockTokens = await hre.ethers.getContractFactory("contracts/double-bridge/v0.1/LockAssets.sol:LockTokens");    const lockTokens = await LockTokens.attach(LOCK_TOKENS_ADDRESS);
    const amountWei = hre.ethers.parseEther(amount); // ETH 是 18 位小数

    console.log(`正在尝试在A链 (Sepolia) 上向 ${recipient} 解锁 ${amount} ETH，跨链哈希为 ${crosschainhash} (来自B链)...`);
    try {
        // 使用 owner 账户连接合约并调用 unlock 函数
        const tx = await lockTokens.connect(owner).unlock(recipient, amountWei, crosschainhash);
        await tx.wait();
        console.log("ETH 在A链 (Sepolia) 上解锁成功! 交易哈希:", tx.hash);
        console.log(`已为跨链哈希 ${crosschainhash} 向 ${recipient} 解锁 ${amount} ETH。`);
    } catch (error) {
        console.error("解锁 ETH 失败:", error.message);
        console.error("请确保运行此任务的账户是 LockTokens 合约的 owner。");
        console.error("同时，请验证 LOCK_TOKENS_ADDRESS、recipient/amount 和 crosschainhash 参数是否正确。");
        // 检查是否是重复交易哈希错误
        if (error.message.includes("Cross-chain hash already processed for unlock")) {
             console.error("错误原因可能是: 此 crosschainhash 已经被处理过，ETH 已解锁。");
        } else if (error.message.includes("Only owner can unlock")) {
             console.error("错误原因可能是: 运行此任务的账户不是 LockTokens 合约的 owner。");
        } else if (error.message.includes("Insufficient contract balance to unlock")) {
             console.error("错误原因可能是: LockTokens 合约中没有足够的 ETH 可供解锁。");
        }
        process.exit(1);
    }
  });
