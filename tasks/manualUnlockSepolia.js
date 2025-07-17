const { task } = require("hardhat/config");
require("dotenv").config();

const SEPOLIA_BRIDGE_ADDRESS = "0xE218189033593d5870228D8C3A15bC035730FEeA"; // SepoliaBridge 合约地址

task("manual-unlock-sepolia-bridge", "根据B链事件数据在A链 (Sepolia) 上通过 SepoliaBridge 手动解锁 ETH")
  .addParam("recipient", "A链 (Sepolia) 上接收 ETH 的地址 (来自B链事件)")
  .addParam("amount", "要解锁的 ETH 数量 (人类可读格式, 来自B链事件)")
  .addParam("crosschainhash", "来自B链事件的唯一数据哈希 (例如: 0x...64个字符)")
  .setAction(async ({ recipient, amount, crosschainhash }, hre) => {
    // 获取 Hardhat 配置中的第一个签名者，作为默认的中继者账户
    const [relayerAccount] = await hre.ethers.getSigners();
    console.log("正在使用手动操作员账户 (需是 SepoliaBridge 的 RELAYER_ROLE):", relayerAccount.address);

    if (!SEPOLIA_BRIDGE_ADDRESS || SEPOLIA_BRIDGE_ADDRESS === "0x...") {
        console.error("错误: 请在 tasks/manualUnlockSepolia.js 中更新 SEPOLIA_BRIDGE_ADDRESS");
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

    const SepoliaBridge = await hre.ethers.getContractFactory("contracts/double-bridge/v0.1/LockAssets.sol:SepoliaBridge");
    const sepoliaBridge = await SepoliaBridge.attach(SEPOLIA_BRIDGE_ADDRESS);
    const amountWei = hre.ethers.parseEther(amount);

    console.log(`正在尝试在A链 (Sepolia) 上通过 SepoliaBridge 向 ${recipient} 解锁 ${amount} ETH，跨链哈希为 ${crosschainhash} (来自B链)...`);
    try {
        // 使用 relayerAccount 连接合约并调用 unlock 函数
        const tx = await sepoliaBridge.connect(relayerAccount).unlock(recipient, amountWei, crosschainhash);
        await tx.wait();
        console.log("ETH 在A链 (Sepolia) 上通过 SepoliaBridge 解锁成功! 交易哈希:", tx.hash);
        console.log(`已为跨链哈希 ${crosschainhash} 向 ${recipient} 解锁 ${amount} ETH。`);
    } catch (error) {
        console.error("通过 SepoliaBridge 解锁 ETH 失败:", error.message);
        console.error("请确保运行此任务的账户在 SepoliaBridge 合约上是 RELAYER_ROLE。");
        console.error("同时，请验证 SEPOLIA_BRIDGE_ADDRESS、recipient/amount 和 crosschainhash 参数是否正确。");
        if (error.message.includes("Cross-chain hash already processed for unlock")) {
             console.error("错误原因可能是: 此 crosschainhash 已经被处理过，ETH 已解锁。");
        } else if (error.message.includes("AccessControl: account ")) { // 错误信息会包含 AccessControl
             console.error("错误原因可能是: 运行此任务的账户没有 RELAYER_ROLE。");
        } else if (error.message.includes("Insufficient contract balance to unlock")) {
             console.error("错误原因可能是: SepoliaBridge 合约中没有足够的 ETH 可供解锁。");
        }
        process.exit(1);
    }
  });
