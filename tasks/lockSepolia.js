const { task } = require("hardhat/config");

// LockTokens 合约在 Sepolia 链上的实际地址
const LOCK_TOKENS_ADDRESS = "0x8413b42F0811db62C10eC806bCE1A86775775ec3"; 

task("lock-sepolia", "在A链(sepolia)上锁定 ETH 并触发跨链事件")
  .addParam("receiver", "B链 (imua) 上接收代币的地址")
  .addParam("amount", "要锁定的Sepolia ETH数量 (人类可读格式, 例如: '0.1' 代表 0.1 Sepolia ETH)")
  .setAction(async ({ receiver, amount }, hre) => {
    const [sender] = await hre.ethers.getSigners(); // 发送者账户
    console.log("正在使用账户:", sender.address);

    if (!LOCK_TOKENS_ADDRESS || LOCK_TOKENS_ADDRESS === "0x...") {
        console.error("错误: 请在 tasks/lockSepolia.js 中更新 LOCK_TOKENS_ADDRESS (Sepolia 链上的 LockTokens 地址)");
        process.exit(1);
    }
     if (!hre.ethers.isAddress(receiver)) { // 校验接收者地址
        console.error(`错误: 接收者地址 ${receiver} 格式无效。`);
        process.exit(1);
    }

    const LockTokens = await hre.ethers.getContractFactory("contracts/double-bridge/v0.1/LockAssets.sol:LockTokens"); 
    // 使用 attach 连接到已部署的合约
    const lockTokens = await LockTokens.attach(LOCK_TOKENS_ADDRESS);

    const amountWei = hre.ethers.parseEther(amount);

    console.log(`正在锁定 ${amount} Sepolia ETH，并请求在B链 (imua) 上铸造到 ${receiver}...`);
    try {
        // 调用 lock 函数，通过 value 传递 Sepolia ETH 数量
        const tx = await lockTokens.lock(receiver, { value: amountWei });
        const receipt = await tx.wait(); // 获取交易回执

        console.log("Sepolia ETH 已锁定，跨链事件已触发! 交易哈希:", tx.hash);
        console.log("请在A链 (Sepolia) 上监控 'Locked' 事件。");
        console.log(`B链 (imua) 上的接收者: ${receiver}, 锁定的Sepolia ETH (扣费前): ${amount}`);

        // 解析 Locked 事件
        let lockedEvent;
        for (const log of receipt.logs) {
            try {
                const parsedLog = lockTokens.interface.parseLog(log);
                if (parsedLog && parsedLog.name === "Locked") {
                    lockedEvent = parsedLog;
                    break;
                }
            } catch (e) {
                // 忽略无法解析的日志
            }
        }

        if (lockedEvent) {
            const eventArgs = lockedEvent.args;
            const actualAmount = hre.ethers.formatEther(eventArgs.amount);
            const crosschainHash = eventArgs.crosschainHash;
            const eventReceiver = eventArgs.receiver;

            console.log("\n--- Locked 事件数据 (用于下一步铸币) ---");
            console.log(`接收者 (Imua): ${eventReceiver}`);
            console.log(`实际铸币金额 (maoETH): ${actualAmount}`);
            console.log(`跨链哈希 (crosschainHash): ${crosschainHash}`);
            console.log("----------------------------------------");
            console.log("请使用上述数据运行 'manual-mint-imua' 任务。");
        } else {
            console.warn("警告: 未找到 'Locked' 事件。请手动检查交易回执。");
        }

    } catch (error) {
        console.error("锁定Sepolia ETH失败:", error.message);
        console.error("请确保 LOCK_TOKENS_ADDRESS 正确且您有足够的Sepolia ETH。");
        process.exit(1);
    }
  });
