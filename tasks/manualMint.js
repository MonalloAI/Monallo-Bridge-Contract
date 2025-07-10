const { task } = require("hardhat/config");

// Token 合约地址 (B链，即Sepolia) - 部署 Token 后需要更新此地址
const TOKEN_ADDRESS = "0x75891AA11AC45ab150e81AE744728d11C72c472B"; // <-- **重要：部署后更新此地址**

task("manual-mint", "根据A链事件数据在B链上手动铸造代币")
  .addParam("recipient", "B链上接收代币的地址 (来自A链事件)")
  .addParam("amount", "要铸造的代币数量 (人类可读格式, 来自A链事件)")
  .addParam("crosschainhash", "来自A链事件的唯一数据哈希 (例如: 0x...64个字符)")
  .setAction(async ({ recipient, amount, crosschainhash }, hre) => {
    // 运行此任务的账户需要是 Token 合约的 mintAdmin
    const signers = await hre.ethers.getSigners();
    const manualOperator = signers[1]; // 
    console.log("正在使用手动操作员账户 (需是 mintAdmin):", manualOperator.address);

    if (!TOKEN_ADDRESS || TOKEN_ADDRESS === "YOUR_TOKEN_ADDRESS_GOES_HERE") {
        console.error("错误: 请在 tasks/manualMint.js 中更新 TOKEN_ADDRESS");
        process.exit(1);
    }
    if (!hre.ethers.isHexString(crosschainhash, 32)) {
        console.error("错误: crosschainhash 必须是32字节的十六进制字符串 (例如: 0x...64个字符)。");
        process.exit(1);
    }
     if (!hre.ethers.isAddress(recipient)) { // 校验接收者地址
        console.error(`错误: 接收者地址 ${recipient} 格式无效。`);
        process.exit(1);
    }

    // 使用 getContractAt 连接到 MintTokens 合约
    const token = await hre.ethers.getContractAt("MintTokens", TOKEN_ADDRESS); // <-- 注意这里是 "MintTokens"

    const amountWei = hre.ethers.parseUnits(amount, 18); // 假设代币是18位小数

    console.log(`正在尝试在B链 (Sepolia) 上向 ${recipient} 铸造 ${amount} 代币，跨链哈希为 ${crosschainhash}...`);
    try {
        // 使用手动操作员账户连接合约并调用 mint 函数
        const tx = await token.connect(manualOperator).mint(recipient, amountWei, crosschainhash);
        await tx.wait();
        console.log("代币在B链上铸造成功! 交易哈希:", tx.hash);
        console.log(`已为跨链哈希 ${crosschainhash} 向 ${recipient} 铸造 ${amount} 代币。`);
    } catch (error) {
        console.error("铸造代币失败:", error.message);
        console.error("请确保运行此任务的账户在 Token 合约上是 mintAdmin。"); // <-- 修正提示
        console.error("同时，请验证 TOKEN_ADDRESS、recipient/amount 和 crosschainhash 参数是否正确。");
        // 检查是否是重复交易哈希错误
        if (error.message.includes("Transaction hash already processed")) { // <-- 修正错误信息匹配
             console.error("错误原因可能是: 此 crosschainhash 已经被处理过，代币已铸造。");
        } else if (error.message.includes("Caller is not mint admin")) { // <-- 修正错误信息匹配
             console.error("错误原因可能是: 运行此任务的账户不是 mintAdmin。");
        }
        process.exit(1);
    }
  });
