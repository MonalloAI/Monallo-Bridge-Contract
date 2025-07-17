const hre = require("hardhat");
require("dotenv").config();
const readline = require('readline');

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

// SepoliaBridge 合约在 Sepolia 链上的实际地址
const SEPOLIA_BRIDGE_ADDRESS = "0xE218189033593d5870228D8C3A15bC035730FEeA"; //SepoliaBridge 合约地址

async function main() {
  // 获取 SepoliaBridge 的 DEFAULT_ADMIN_ROLE 账户
  const [adminAccount] = await hre.ethers.getSigners();
  console.log("正在使用账户 (SepoliaBridge 的 DEFAULT_ADMIN_ROLE):", adminAccount.address);

  if (!SEPOLIA_BRIDGE_ADDRESS || SEPOLIA_BRIDGE_ADDRESS === "0x...") {
    console.error("错误: 请在 scripts/withdrawFees.js 中更新 SEPOLIA_BRIDGE_ADDRESS");
    process.exit(1);
  }

  const SepoliaBridge = await hre.ethers.getContractFactory("contracts/double-bridge/v0.1/LockAssets.sol:SepoliaBridge");
  const sepoliaBridge = await SepoliaBridge.attach(SEPOLIA_BRIDGE_ADDRESS);

  try {
    // 查询当前累积的费用
    const currentFees = await sepoliaBridge.totalFeesCollected();
    const formattedFees = hre.ethers.formatEther(currentFees);

    console.log(`当前 SepoliaBridge 合约中累积的费用: ${formattedFees} Sepolia ETH`);

    if (currentFees == 0) {
      console.log("没有费用可供提取。");
      return;
    }

    const answer = await askQuestion(`是否要提取这 ${formattedFees} Sepolia ETH 费用？ (y/n): `);

    if (answer.toLowerCase() === 'y') {
      console.log(`正在从 SepoliaBridge 合约提取 ${formattedFees} Sepolia ETH 费用...`);

      // 使用拥有 DEFAULT_ADMIN_ROLE 的账户连接 SepoliaBridge 并调用 withdrawFees
      const tx = await sepoliaBridge.connect(adminAccount).withdrawFees();
      await tx.wait();

      console.log("费用提取成功!");
      console.log("交易哈希:", tx.hash);

      const remainingFees = await sepoliaBridge.totalFeesCollected();
      console.log(`提取后 SepoliaBridge 合约中剩余的费用: ${hre.ethers.formatEther(remainingFees)} Sepolia ETH`);

    } else if (answer.toLowerCase() === 'n') {
      console.log("费用提取已取消。");
    } else {
      console.log("无效输入，费用提取已取消。");
    }

  } catch (error) {
    console.error("提取费用失败:", error.message);
    console.error("请确保运行此脚本的账户是 SepoliaBridge 合约的 DEFAULT_ADMIN_ROLE，并且有足够的 Sepolia ETH 支付 Gas 费。");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
