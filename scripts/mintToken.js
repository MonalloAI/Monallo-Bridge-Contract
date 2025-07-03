// scripts/mintToken.js

// 合约地址
const TOKEN_ADDRESS = "0x2Ab892c26BEED9744E5a9d72fB50851E1876AD16"; 

async function main() {
    // 检查命令行参数
    const recipientAddress = process.argv[2]; // 第一个参数是接收铸币代币的地址
    const amount = process.argv[3];           // 第二个参数是要铸造的代币数量 (例如 "100")

    if (!recipientAddress || !amount) {
        console.error("Usage: npx hardhat run scripts/mintToken.js --network sepolia <recipientAddress> <amount>");
        process.exit(1);
    }

    console.log(`--- 正在尝试铸造 ${amount} 个代币给 ${recipientAddress} (Sepolia 网络) ---`);

    // 1. 获取签名者 (合约所有者将是铸币方，因为 mint 函数是 onlyOwner)
    const [owner] = await ethers.getSigners();
    console.log("使用铸币账户 (Owner):", owner.address);

    // 2. 获取 Token 合约的工厂并连接到已部署的合约实例
    const Token = await ethers.getContractFactory("Token");
    const token = await Token.attach(TOKEN_ADDRESS);
    console.log("已连接到代币合约，地址为:", token.target);

    // 3. 获取代币的小数位
    const decimals = await token.decimals();
    console.log("代币小数位 (Decimals):", decimals);

    // 4. 查询接收方初始余额
    const initialBalanceRaw = await token.balanceOf(recipientAddress);
    const initialBalanceFormatted = ethers.formatUnits(initialBalanceRaw, decimals);
    console.log(`接收方 (${recipientAddress}) 初始余额: ${initialBalanceFormatted} ${await token.symbol()}`);

    // 5. 调用 mint 函数进行铸币
    // 它会在合约内部自动乘以 10^decimals。
    console.log(`正在铸造 ${amount} 个代币给 ${recipientAddress}...`);
    const tx = await token.mint(recipientAddress, BigInt(amount)); // 确保 amount 是 BigInt 类型
    console.log("等待交易确认 (可能需要一些时间)...");
    await tx.wait();
    console.log("铸币交易已确认！交易哈希 (Transaction Hash):", tx.hash);

    // 6. 查询接收方最终余额
    const finalBalanceRaw = await token.balanceOf(recipientAddress);
    const finalBalanceFormatted = ethers.formatUnits(finalBalanceRaw, decimals);
    console.log(`接收方 (${recipientAddress}) 铸币后余额: ${finalBalanceFormatted} ${await token.symbol()}`);

    console.log("--- 代币铸币成功完成！ ---");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
