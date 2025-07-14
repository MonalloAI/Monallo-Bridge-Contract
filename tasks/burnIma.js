// tasks/burnIma.js
const { task } = require("hardhat/config");

// 请替换为你的 MintTokens 合约在 Imua 链上的实际地址
const TOKEN_ADDRESS = "0x3C44c8b8A0A99fFAB40ffAe952bcC5A778ce0008"; // 你的 MintTokens 合约地址

task("burn-imua", "在A链 (imua) 上由运营者代为销毁 maoETH 并触发跨链事件")
  .addParam("from", "要销毁 maoETH 的用户地址 (即 maoETH 的持有者)") // 新增参数：实际销毁代币的用户
  .addParam("amount", "要销毁的 maoETH 数量 (人类可读格式, 例如: '100')")
  .addParam("sepoliarecipient", "B链 (Sepolia) 上接收 ETH 的地址")
  .setAction(async ({ from, amount, sepoliarecipient }, hre) => {
    const signers = await hre.ethers.getSigners();
    // 运营者账户，需要拥有 MintTokens 的 MINTER_ROLE
    // 根据你的 hardhat.config.js，signers[0] (IMUA_PRIVATE_KEY 对应的地址) 是部署者，也拥有 MINTER_ROLE
    const operatorAccount = signers[0]; // <--- 关键修改：使用运营者账户
    console.log("正在使用运营者账户 (需是 MintTokens 的 MINTER_ROLE):", operatorAccount.address);

    if (!TOKEN_ADDRESS || TOKEN_ADDRESS === "0x...") {
        console.error("错误: 请在 tasks/burnIma.js 中更新 TOKEN_ADDRESS (imua 链上的 MintTokens 地址)");
        process.exit(1);
    }
    if (!hre.ethers.isAddress(from)) {
        console.error(`错误: 'from' 地址 ${from} 格式无效。`);
        process.exit(1);
    }
    if (!hre.ethers.isAddress(sepoliarecipient)) {
        console.error(`错误: Sepolia 接收者地址 ${sepoliarecipient} 格式无效。`);
        process.exit(1);
    }

    const MintTokens = await hre.ethers.getContractFactory("contracts/double-bridge/v0.1/MintAssets.sol:MintTokens");
    const mintTokens = await MintTokens.attach(TOKEN_ADDRESS);

    const amountWei = hre.ethers.parseUnits(amount, 18); // 假设 maoETH 是 18 位小数

    console.log(`正在由运营者代为销毁 ${from} 的 ${amount} maoETH，并请求在B链 (Sepolia) 上解锁到 ${sepoliarecipient}...`);
    try {
        // 调用 burnFromOperator 函数，由运营者账户连接合约
        const tx = await mintTokens.connect(operatorAccount).burnFromOperator(from, amountWei, sepoliarecipient); // <--- 关键修改
        const receipt = await tx.wait(); // 获取交易回执

        console.log("maoETH 已销毁，跨链事件已触发! 交易哈希:", tx.hash);
        console.log("请在A链 (imua) 上监控 'Burned' 事件。");
        console.log(`B链 (Sepolia) 上的接收者: ${sepoliarecipient}, 销毁的 maoETH: ${amount}`);

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
                // 忽略无法解析的日志
            }
        }

        if (burnedEvent) {
            const eventArgs = burnedEvent.args;
            const burnedAmount = hre.ethers.formatUnits(eventArgs.amount, 18);
            const crosschainHash = eventArgs.crosschainHash;
            const eventSepoliaRecipient = eventArgs.sepoliaRecipient;
            const eventBurner = eventArgs.burner; // 实际销毁代币的用户

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
        console.error("请确保 TOKEN_ADDRESS 正确，运营者账户有 MINTER_ROLE，且用户已授权运营者销毁其 maoETH。");
        if (error.message.includes("ERC20: insufficient allowance")) {
            console.error("错误原因可能是: 用户未授权运营者销毁足够的 maoETH。请确保用户已执行 approve 操作。");
        } else if (error.message.includes("AccessControl: account ")) {
            console.error("错误原因可能是: 运营者账户没有 MINTER_ROLE。");
        } else if (error.message.includes("ERC20: burn amount exceeds balance")) {
            console.error("错误原因可能是: 用户账户的 maoETH 余额不足。");
        }
        process.exit(1);
    }
  });
