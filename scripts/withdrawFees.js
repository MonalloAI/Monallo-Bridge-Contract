const hre = require("hardhat");
require("dotenv").config();
const readline = require('readline'); // 导入 readline 模块

// 辅助函数：用于获取用户输入
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

const LOCK_TOKENS_ADDRESS = "0xA960259959584C308c87e8c06119e902cCBf88C8"; // 你的 LockTokens 合约地址 (在 Sepolia 链上)

async function main() {
  const [owner] = await hre.ethers.getSigners(); // 获取合约 owner 的 signer
  console.log("正在使用账户 (LockTokens 合约 owner):", owner.address);

  if (!LOCK_TOKENS_ADDRESS || LOCK_TOKENS_ADDRESS === "0x...") {
    console.error("错误: 请在 scripts/withdrawFees.js 中更新 LOCK_TOKENS_ADDRESS (Sepolia 链上的 LockTokens 地址)");
    process.exit(1);
  }

  // 获取 LockTokens 合约实例 - 使用完全限定名称
  const LockTokens = await hre.ethers.getContractFactory("contracts/simple-bridge/LockAssets.sol:LockTokens");
  const lockTokens = await LockTokens.attach(LOCK_TOKENS_ADDRESS);

  try {
    // 查询当前累积的费用
    const currentFees = await lockTokens.totalFeesCollected();
    const formattedFees = hre.ethers.formatEther(currentFees); // 格式化为人类可读的ETH数量

    console.log(`当前 LockTokens 合约中累积的费用: ${formattedFees} Sepolia ETH`);

    if (currentFees == 0) {
      console.log("没有费用可供提取。");
      return; // 如果没有费用，直接退出
    }

    // 询问用户是否要提取
    const answer = await askQuestion(`是否要提取这 ${formattedFees} Sepolia ETH 费用？ (y/n): `);

    if (answer.toLowerCase() === 'y') {
      console.log(`正在从 LockTokens 合约提取 ${formattedFees} Sepolia ETH 费用...`);

      // 调用 withdrawFees 函数
      const tx = await lockTokens.connect(owner).withdrawFees();
      await tx.wait();

      console.log("费用提取成功!");
      console.log("交易哈希:", tx.hash);

      // 再次查询确认费用已清零
      const remainingFees = await lockTokens.totalFeesCollected();
      console.log(`提取后 LockTokens 合约中剩余的费用: ${hre.ethers.formatEther(remainingFees)} Sepolia ETH`);

    } else if (answer.toLowerCase() === 'n') {
      console.log("费用提取已取消。");
    } else {
      console.log("无效输入，费用提取已取消。");
    }

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
