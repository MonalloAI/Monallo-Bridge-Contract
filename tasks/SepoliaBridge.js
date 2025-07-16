const { task } = require("hardhat/config");

const SEPOLIA_BRIDGE_ADDRESS = "0xcFcE1E9e54207E7A031ef0DAB86e3BdF27e554c7"; //  Sepolia 地址

task("lock-sepolia-bridge", "在A链(sepolia)上通过 SepoliaBridge 锁定 ETH 并触发跨链事件")
  .addParam("receiver", "B链 (imua) 上接收代币的地址")
  .addParam("amount", "要锁定的Sepolia ETH数量 (人类可读格式, 例如: '0.1' 代表 0.1 Sepolia ETH)")
  .setAction(async ({ receiver, amount }, hre) => {
    const [sender] = await hre.ethers.getSigners();
    console.log("正在使用账户:", sender.address);

    if (!SEPOLIA_BRIDGE_ADDRESS || SEPOLIA_BRIDGE_ADDRESS === "0x...") {
        console.error("错误: 请在 tasks/sepoliaBridge.js 中更新 SEPOLIA_BRIDGE_ADDRESS");
        process.exit(1);
    }
     if (!hre.ethers.isAddress(receiver)) {
        console.error(`错误: 接收者地址 ${receiver} 格式无效。`);
        process.exit(1);
    }

    const SepoliaBridge = await hre.ethers.getContractFactory("contracts/double-bridge/v0.1/LockAssets.sol:SepoliaBridge");
    const sepoliaBridge = await SepoliaBridge.attach(SEPOLIA_BRIDGE_ADDRESS);

    const amountWei = hre.ethers.parseEther(amount);

    console.log(`正在通过 SepoliaBridge 锁定 ${amount} Sepolia ETH，并请求在B链 (imua) 上铸造到 ${receiver}...`);
    try {
        const tx = await sepoliaBridge.connect(sender).lock(receiver, { value: amountWei });
        const receipt = await tx.wait();

        console.log("Sepolia ETH 已通过 SepoliaBridge 锁定，跨链事件已触发! 交易哈希:", tx.hash);
        console.log("请在 SepoliaBridge 合约上监控 'Locked' 事件。");
        console.log(`B链 (imua) 上的接收者: ${receiver}, 锁定的Sepolia ETH (扣费前): ${amount}`);

        let lockedEvent;
        for (const log of receipt.logs) {
            try {
                const parsedLog = sepoliaBridge.interface.parseLog(log);
                if (parsedLog && parsedLog.name === "Locked") {
                    lockedEvent = parsedLog;
                    break;
                }
            } catch (e) {
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
        console.error("通过 SepoliaBridge 锁定Sepolia ETH失败:", error.message);
        console.error("请确保 SEPOLIA_BRIDGE_ADDRESS 正确且您有足够的Sepolia ETH。");
        process.exit(1);
    }
  });
  