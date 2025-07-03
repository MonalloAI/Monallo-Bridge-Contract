// tasks/transfer.js
const { task } = require("hardhat/config");

//合约地址
const TOKEN_ADDRESS = "0x2Ab892c26BEED9744E5a9d72fB50851E1876AD16"; 

task("transfer", "Transfers tokens to a specified address")
  .addParam("to", "The address to transfer tokens to")
  .addParam("amount", "The amount of tokens to transfer (human-readable)")
  .setAction(async ({ to, amount }, hre) => {
    console.log(`--- 正在尝试将 ${amount} 个代币转账到 ${to} (Sepolia 网络) ---`);

    // 1. 获取签名者 (部署账户将是发送方)
    const [owner] = await hre.ethers.getSigners();
    console.log("使用发送方账户 (Owner):", owner.address);

    // 2. 获取 Token 合约的工厂并连接到已部署的合约实例
    const Token = await hre.ethers.getContractFactory("Token");
    const token = await Token.attach(TOKEN_ADDRESS);
    console.log("已连接到代币合约，地址为:", token.target);

    // 3. 获取代币的小数位
    const decimals = await token.decimals();
    console.log("代币小数位 (Decimals):", decimals);

    // 4. 将人类可读的转账数量转换为合约所需的大整数格式
    const amountToTransfer = hre.ethers.parseUnits(amount, decimals); 
    console.log("实际转账数量 (Raw Amount):", amountToTransfer);

    // 5. 查询发送方初始余额
    const ownerBalanceRaw = await token.balanceOf(owner.address);
    const ownerBalanceFormatted = hre.ethers.formatUnits(ownerBalanceRaw, decimals);
    console.log(`发送方 (Owner) 初始余额: ${ownerBalanceFormatted} ${await token.symbol()}`);

    // 6. 查询接收方初始余额
    const recipientInitialBalanceRaw = await token.balanceOf(to);
    const recipientInitialBalanceFormatted = hre.ethers.formatUnits(recipientInitialBalanceRaw, decimals);
    console.log(`接收方 (${to}) 初始余额: ${recipientInitialBalanceFormatted} ${await token.symbol()}`);


    // 7. 调用 transfer 函数进行转账
    console.log("正在发起转账交易...");
    const tx = await token.transfer(to, amountToTransfer);
    console.log("等待交易确认 (可能需要一些时间)...");
    await tx.wait();
    console.log("转账交易已确认！交易哈希 (Transaction Hash):", tx.hash);

    // 8. 查询接收方转账后余额
    const recipientFinalBalanceRaw = await token.balanceOf(to);
    const recipientFinalBalanceFormatted = hre.ethers.formatUnits(recipientFinalBalanceRaw, decimals);
    console.log(`接收方 (${to}) 转账后余额: ${recipientFinalBalanceFormatted} ${await token.symbol()}`);

    // 9. 查询发送方转账后余额
    const ownerBalanceAfterTransferRaw = await token.balanceOf(owner.address);
    const ownerBalanceAfterTransferFormatted = hre.ethers.formatUnits(ownerBalanceAfterTransferRaw, decimals);
    console.log(`发送方 (Owner) 转账后余额: ${ownerBalanceAfterTransferFormatted} ${await token.symbol()}`);

    console.log("--- 代币转账成功完成！ ---");
  });
