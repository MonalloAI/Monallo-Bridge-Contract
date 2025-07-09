const { task } = require("hardhat/config");

// (B链，即Sepolia)
const TOKEN_ADDRESS = "0xdce994Af87D537DcFA77F80bF0069BbA4Ec00baa"; 

task("manual-mint", "根据A链事件数据在B链上手动铸造代币") 
  .addParam("recipient", "B链上接收代币的地址 (来自A链事件)") 
  .addParam("amount", "要铸造的代币数量 (人类可读格式, 来自A链事件)") 
  .addParam("crosschainhash", "来自A链事件的唯一数据哈希 (例如: 0x...64个字符)") 
  .setAction(async ({ recipient, amount, crosschainhash }, hre) => { // 接收新参数
    const signers = await hre.ethers.getSigners();
    const manualOperator = signers[0];
    console.log("正在使用手动操作员账户:", manualOperator.address); 

    if (!TOKEN_ADDRESS || TOKEN_ADDRESS === "YOUR_TOKEN_ADDRESS_GOES_HERE") {
        console.error("错误: 请在 tasks/manualMint.js 中更新 TOKEN_ADDRESS"); 
        process.exit(1);
    }
    if (!hre.ethers.isHexString(crosschainhash, 32)) { // 校验 crossChainHash
        console.error("错误: crosschainhash 必须是32字节的十六进制字符串 (例如: 0x...64个字符)。"); 
        process.exit(1);
    }

    const token = await hre.ethers.getContractAt("Token", TOKEN_ADDRESS);

    const amountWei = hre.ethers.parseUnits(amount, 18);

    console.log(`正在尝试在B链 (Sepolia) 上向 ${recipient} 铸造 ${amount} 代币，跨链哈希为 ${crosschainhash}...`); 
    try {
        // 使用手动操作员账户连接合约并调用 mint 函数，传入 crossChainHash
        const tx = await token.connect(manualOperator).mint(recipient, amountWei, crosschainhash);
        await tx.wait();
        console.log("代币在B链上铸造成功! 交易哈希:", tx.hash); 
        console.log(`已为跨链哈希 ${crosschainhash} 向 ${recipient} 铸造 ${amount} 代币。`); 
    } catch (error) {
        console.error("铸造代币失败:", error.message); 
        console.error("请确保运行此任务的账户在 Token 合约上拥有 MINTER_ROLE 角色。"); 
        console.error("同时，请验证 TOKEN_ADDRESS、recipient/amount 和 crosschainhash 参数是否正确。"); 
        process.exit(1);
    }
  });

