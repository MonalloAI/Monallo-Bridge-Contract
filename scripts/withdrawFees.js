const hre = require("hardhat");
require("dotenv").config();

const LOCK_TOKENS_ADDRESS = "0x1658cF06F2774ac2be7BB4308E53a7D8BE4861F2"; // 你的 LockTokens 合约地址 (在 Sepolia 链上)
async function main() {
  const [owner] = await hre.ethers.getSigners(); // 获取合约 owner 的 signer
  console.log("正在使用账户 (LockTokens 合约 owner):", owner.address);

  if (!LOCK_TOKENS_ADDRESS || LOCK_TOKENS_ADDRESS === "0x...") {
    console.error("错误: 请在 scripts/withdrawFees.js 中更新 LOCK_TOKENS_ADDRESS (Sepolia 链上的 LockTokens 地址)"); 
    process.exit(1);
  }

  // 获取 LockTokens 合约实例
  const LockTokens = await hre.ethers.getContractFactory("LockTokens");
  const lockTokens = await LockTokens.attach(LOCK_TOKENS_ADDRESS);

  try {
    // 查询当前累积的费用
    const currentFees = await lockTokens.totalFeesCollected();
    console.log(`当前 LockTokens 合约中累积的费用: ${hre.ethers.formatEther(currentFees)} Sepolia ETH`); 

    if (currentFees == 0) {
      console.log("没有费用可供提取。");
      return;
    }

    console.log(`正在从 LockTokens 合约提取 ${hre.ethers.formatEther(currentFees)} Sepolia ETH 费用...`); 

    // 调用 withdrawFees 函数
    const tx = await lockTokens.connect(owner).withdrawFees();
    await tx.wait();

    console.log("费用提取成功!");
    console.log("交易哈希:", tx.hash);

    // 再次查询确认费用已清零
    const remainingFees = await lockTokens.totalFeesCollected();
    console.log(`提取后 LockTokens 合约中剩余的费用: ${hre.ethers.formatEther(remainingFees)} Sepolia ETH`); 

  } catch (error) {
    console.error("提取费用失败:", error.message);
    console.error("请确保运行此脚本的账户是 LockTokens 合约的 owner，并且有足够的 Sepolia ETH 支付 Gas 费。"); 
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
