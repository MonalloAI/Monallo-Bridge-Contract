const { task } = require("hardhat/config");

// 你的 MintTokens 合约在 Imua 链上的实际地址
const TOKEN_ADDRESS = "0xC220A5B9E5e81F4695dBA43Da7B1eAddc95AdAd9"; // 你的 MintTokens 合约地址

task("burn-imua", "在A链 (imua) 上销毁 maoETH 并触发跨链事件")
  .addParam("amount", "要销毁的 maoETH 数量 (人类可读格式, 例如: '100')")
  .addParam("sepoliarecipient", "B链 (Sepolia) 上接收 ETH 的地址")
  .setAction(async ({ amount, sepoliarecipient }, hre) => {
    // 用户账户 (maoETH 持有者)
    // 假设 signers[1] 是用户账户 (PRIVATE_KEY_ADDR1)
    const userAccount = (await hre.ethers.getSigners())[1]; // <--- 用户账户
    console.log("正在使用账户:", userAccount.address);

    if (!TOKEN_ADDRESS || TOKEN_ADDRESS === "0x...") {
        console.error("错误: 请在 tasks/burnIma.js 中更新 TOKEN_ADDRESS (imua 链上的 MintTokens 地址)");
        process.exit(1);
    }
    if (!hre.ethers.isAddress(sepoliarecipient)) {
        console.error(`错误: Sepolia 接收者地址 ${sepoliarecipient} 格式无效。`);
        process.exit(1);
    }

    const MintTokens = await hre.ethers.getContractFactory("contracts/double-bridge/v0.1/MintAssets.sol:MintTokens");
    const mintTokens = await MintTokens.attach(TOKEN_ADDRESS);

    const amountWei = hre.ethers.parseUnits(amount, 18); // 假设 maoETH 是 18 位小数

    console.log(`正在销毁 ${amount} maoETH，并请求在B链 (Sepolia) 上解锁到 ${sepoliarecipient}...`);
    try {
        // 用户账户连接合约并调用 burn 函数
        const tx = await mintTokens.connect(userAccount).burn(amountWei, sepoliarecipient); // <--- 关键修改
        const receipt = await tx.wait(); // 获取交易回执

        console.log("maoETH 已销毁，跨链事件已触发! 交易哈希:", tx.hash);
        console.log("请在 MintTokens 合约上监控 'Burned' 事件。");

        // 解析 Burned 事件
        let burnedEvent;
        for (const log of receipt.logs) {
            try {
                const parsedLog = mintTokens.interface.parseLog(log);
                if (parsedLog && parsedLog.name === "Burned") {
                    burnedEvent = parsedLog;
                    break;
                }
            } catch (e) {
            }
        }

        if (burnedEvent) {
            const eventArgs = burnedEvent.args;
            const burnedAmount = hre.ethers.formatUnits(eventArgs.amount, 18);
            const crosschainHash = eventArgs.crosschainHash;
            const eventSepoliaRecipient = eventArgs.sepoliaRecipient;
            const eventBurner = eventArgs.burner;

            console.log("\n--- Burned 事件数据 (用于下一步解锁) ---");
            console.log(`实际销毁者 (Imua): ${eventBurner}`);
            console.log(`接收者 (Sepolia): ${eventSepoliaRecipient}`);
            console.log(`解锁金额 (ETH): ${burnedAmount}`);
            console.log(`跨链哈希 (crosschainHash): ${crosschainHash}`);
            console.log("----------------------------------------");
            console.log("请使用上述数据运行 'manual-unlock-sepolia' 任务。");
        } else {
            console.warn("警告: 未找到 'Burned' 事件。请手动检查交易回执。");
        }

    } catch (error) {
        console.error("销毁 maoETH 失败:", error.message);
        console.error("请确保 TOKEN_ADDRESS 正确且用户有足够的 maoETH 和 Gas 费。");
        if (error.message.includes("ERC20: burn amount exceeds balance")) {
            console.error("错误原因可能是: 销毁账户的 maoETH 余额不足。");
        }
        process.exit(1);
    }
  });
