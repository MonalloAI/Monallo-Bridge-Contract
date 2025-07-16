const { task } = require("hardhat/config");

const MINT_TOKENS_ADDRESS = "0xb168Df7e7B35741134745d0D0771Cdc55d06325d"; // MintTokens 合约地址
const BURN_MANAGER_ADDRESS = "0xbA2FC6a9F71DCF87480Ab6f0f2A7D0CE1e8ca580"; //  BurnManager 合约地址

task("burn-imua-manager", "在A链 (imua) 上通过 BurnManager 销毁 maoETH 并触发跨链事件")
  .addParam("amount", "要销毁的 maoETH 数量 (人类可读格式, 例如: '100')")
  .addParam("sepoliarecipient", "B链 (Sepolia) 上接收 ETH 的地址")
  .setAction(async ({ amount, sepoliarecipient }, hre) => {

    const userAccount = (await hre.ethers.getSigners())[1];
    // --- END MODIFICATION ---
    console.log("正在使用账户:", userAccount.address);

    if (!MINT_TOKENS_ADDRESS || MINT_TOKENS_ADDRESS === "0x...") {
        console.error("错误: 请在 tasks/burnImaManager.js 中更新 MINT_TOKENS_ADDRESS");
        process.exit(1);
    }
    if (!BURN_MANAGER_ADDRESS || BURN_MANAGER_ADDRESS === "0x...") {
        console.error("错误: 请在 tasks/burnImaManager.js 中更新 BURN_MANAGER_ADDRESS");
        process.exit(1);
    }
    if (!hre.ethers.isAddress(sepoliarecipient)) {
        console.error(`错误: Sepolia 接收者地址 ${sepoliarecipient} 格式无效。`);
        process.exit(1);
    }

    const MintTokens = await hre.ethers.getContractFactory("contracts/double-bridge/v0.1/MintAssets.sol:MintTokens");
    const mintTokens = await MintTokens.attach(MINT_TOKENS_ADDRESS);

    const BurnManager = await hre.ethers.getContractFactory("contracts/double-bridge/v0.1/BurnAssets.sol:BurnManager");
    const burnManager = await BurnManager.attach(BURN_MANAGER_ADDRESS);

    const amountWei = hre.ethers.parseUnits(amount, 18);

    console.log(`\n--- 步骤 1: 授权 BurnManager 销毁 maoETH ---`);
    try {
        const currentAllowance = await mintTokens.allowance(userAccount.address, burnManager.target);
        if (currentAllowance < amountWei) {
            console.log(`当前授权金额不足 (${hre.ethers.formatUnits(currentAllowance, 18)} maoETH)。正在授权 ${amount} maoETH 给 BurnManager...`);
            const approveTx = await mintTokens.connect(userAccount).approve(burnManager.target, amountWei);
            await approveTx.wait();
            console.log("授权成功! 交易哈希:", approveTx.hash);
        } else {
            console.log(`BurnManager 已有足够的授权金额 (${hre.ethers.formatUnits(currentAllowance, 18)} maoETH)，跳过授权。`);
        }
    } catch (error) {
        console.error("授权 BurnManager 失败:", error.message);
        process.exit(1);
    }

    console.log(`\n--- 步骤 2: 检查余额并销毁 maoETH ---`);
    const userBalance = await mintTokens.balanceOf(userAccount.address);
    const formattedUserBalance = hre.ethers.formatUnits(userBalance, 18);
    console.log(`用户 ${userAccount.address} 当前 maoETH 余额: ${formattedUserBalance}`);
    console.log(`尝试销毁金额: ${amount} maoETH`);

    if (userBalance < amountWei) {
        console.error(`错误: 销毁金额 (${amount} maoETH) 超过账户余额 (${formattedUserBalance} maoETH)。`);
        console.error("请确保您的账户有足够的 maoETH 进行销毁。");
        process.exit(1);
    }

    console.log(`正在销毁 ${amount} maoETH，并请求在B链 (Sepolia) 上解锁到 ${sepoliarecipient}...`);
    try {
        const tx = await burnManager.connect(userAccount).burnCrossChain(amountWei, sepoliarecipient);
        const receipt = await tx.wait();

        console.log("maoETH 已通过 BurnManager 销毁，跨链事件已触发! 交易哈希:", tx.hash);
        console.log("请在 BurnManager 合约上监控 'Burned' 事件。");

        let burnedEvent;
        for (const log of receipt.logs) {
            try {
                const parsedLog = burnManager.interface.parseLog(log);
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
            console.log("请使用上述数据运行 'manual-unlock-sepolia-bridge' 任务。");
        } else {
            console.warn("警告: 未找到 'Burned' 事件。请手动检查交易回执。");
        }

    } catch (error) {
        console.error("通过 BurnManager 销毁 maoETH 失败:", error.message);
        console.error("请确保 BURN_MANAGER_ADDRESS 正确且用户已授权足够的 maoETH 给 BurnManager。");
        if (error.message.includes("ERC20: insufficient allowance")) {
             console.error("错误原因可能是: 未授权或授权金额不足。");
        } else if (error.message.includes("ERC20: transfer amount exceeds balance")) {
             console.error("错误原因可能是: 销毁账户的 maoETH 余额不足。");
        } else {
            console.error("其他可能的错误原因：请检查合约逻辑、网络连接或合约部署参数。");
            console.error("原始错误信息:", error); // 打印完整的错误对象，可能包含更多细节
        }
        process.exit(1);
    }
  });
