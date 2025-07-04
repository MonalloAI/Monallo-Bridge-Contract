// scripts/transferToken.js

const TOKEN_ADDRESS = "0x2Ab892c26BEED9744E5a9d72fB50851E1876AD16"; 

async function main() {
    // 2. 从环境变量获取接收方地址和转账数量
    const recipientAddress = process.env.RECIPIENT_ADDRESS; 
    const amount = process.env.TRANSFER_AMOUNT;           

    // 3. 检查环境变量是否提供
    if (!recipientAddress || !amount) {
        console.error("错误：请通过环境变量 RECIPIENT_ADDRESS 和 TRANSFER_AMOUNT 提供接收方地址和转账数量。");
        console.error("用法示例 (PowerShell): $env:RECIPIENT_ADDRESS=\"0x...\" ; $env:TRANSFER_AMOUNT=\"100\" ; npx hardhat run scripts/transferToken.js --network sepolia");
        console.error("用法示例 (Bash/Zsh): RECIPIENT_ADDRESS=\"0x...\" TRANSFER_AMOUNT=\"100\" npx hardhat run scripts/transferToken.js --network sepolia");
        process.exit(1); // 退出脚本并报错
    }

    console.log(`\n--- 正在尝试将 ${amount} 个代币转账到 ${recipientAddress} (Sepolia 网络) ---`);

    try {
        // 4. 获取签名者 (部署账户将是发送方)
        const [owner] = await ethers.getSigners();
        console.log("使用发送方账户 (Owner):", owner.address);

        // 5. 获取 Token 合约的工厂并连接到已部署的合约实例
        const Token = await ethers.getContractFactory("Token");
        const token = await Token.attach(TOKEN_ADDRESS);
        console.log("已连接到代币合约，地址为:", token.target);

        // 6. 获取代币的小数位 (例如，ERC20 代币通常是 18)
        const decimals = await token.decimals();
        console.log("代币小数位 (Decimals):", decimals);

        // 7. 将人类可读的转账数量转换为合约所需的大整数格式
        // 使用 parseUnits 处理小数位，确保 amount 是字符串
        const amountToTransfer = ethers.parseUnits(amount.toString(), decimals); 
        console.log(`实际转账数量 (Raw Amount): ${amountToTransfer.toString()}`);

        // 8. 查询发送方 (owner) 的初始余额
        const ownerBalanceRaw = await token.balanceOf(owner.address);
        const ownerBalanceFormatted = ethers.formatUnits(ownerBalanceRaw, decimals);
        console.log("发送方 (Owner) 初始余额:", ownerBalanceFormatted, await token.symbol());

        // 9. 执行转账操作
        console.log(`正在发起转账交易...`);
        const tx = await token.transfer(recipientAddress, amountToTransfer);

        // 10. 等待交易被打包确认
        console.log("等待交易确认 (可能需要一些时间)...");
        await tx.wait(); // 等待交易被挖矿并确认
        console.log("转账交易已确认！交易哈希 (Transaction Hash):", tx.hash);

        // 11. 验证转账结果：查询接收方和发送方的最新余额
        const recipientBalanceRaw = await token.balanceOf(recipientAddress);
        const recipientBalanceFormatted = ethers.formatUnits(recipientBalanceRaw, decimals);
        console.log(`接收方 (${recipientAddress}) 转账后余额:`, recipientBalanceFormatted, await token.symbol());

        const ownerBalanceAfterTransferRaw = await token.balanceOf(owner.address);
        const ownerBalanceAfterTransferFormatted = ethers.formatUnits(ownerBalanceAfterTransferRaw, decimals);
        console.log("发送方 (Owner) 转账后余额:", ownerBalanceAfterTransferFormatted, await token.symbol());

        console.log("\n--- 代币转账成功完成！ ---");

    } catch (error) {
        console.error("\n--- 代币转账失败！ ---");
        console.error("错误详情:", error.message);
        // 如果是交易失败，可以尝试打印更多信息
        if (error.transactionHash) {
            console.error("交易哈希 (可能失败的交易):", error.transactionHash);
            console.error("请在 Sepolia Etherscan 上查看详情:", `https://sepolia.etherscan.io/tx/${error.transactionHash}`);
        }
        process.exit(1); // 退出脚本并报错
    }
}

// 调用主函数
main()
    .then(() => process.exit(0)) // 成功时退出
    .catch((error) => {
        console.error(error);
        process.exit(1); // 失败时退出
    });
