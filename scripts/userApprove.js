// scripts/userApprove.js
const hre = require("hardhat");
require("dotenv").config();

// 请替换为你的 MintTokens 合约在 Imua 链上的实际地址
const TOKEN_ADDRESS = "0x3C44c8b8A0A99fFAB40ffAe952bcC5A778ce0008"; // <-- 你的 MintTokens 新地址
// 运营方地址 (spender)，即 IMUA_PRIVATE_KEY 对应的地址
const OPERATOR_ADDRESS = "0x0cDf82Bb961397f01A1E3849ed5c424F07B3F858"; // <-- 你的运营方地址

// 用户要授权销毁的 maoETH 数量 (例如，与你铸造的金额相同，或一个更大的值)
const AMOUNT_TO_APPROVE = "0.0000992"; // 或者 "1000000000" (一个非常大的值)

async function main() {
  const { ethers } = hre;

  // 获取用户账户 (PRIVATE_KEY_ADDR1 对应的账户，即 signers[1])
  // 确保 hardhat.config.js 中 imua 网络的 accounts 数组顺序正确
  const userAccount = (await ethers.getSigners())[1]; // signers[1] 对应 PRIVATE_KEY_ADDR1
  console.log(`正在使用用户账户 (maoETH 持有者): ${userAccount.address}`);

  if (!TOKEN_ADDRESS || TOKEN_ADDRESS === "0x...") {
    console.error("错误: 请在 scripts/userApprove.js 中更新 TOKEN_ADDRESS (imua 链上的 MintTokens 地址)");
    process.exit(1);
  }
  if (!ethers.isAddress(OPERATOR_ADDRESS)) {
    console.error(`错误: 运营方地址 ${OPERATOR_ADDRESS} 格式无效。`);
    process.exit(1);
  }

  const mintTokens = await ethers.getContractAt(
    "contracts/double-bridge/v0.1/MintAssets.sol:MintTokens",
    TOKEN_ADDRESS
  );

  const amountWei = ethers.parseUnits(AMOUNT_TO_APPROVE, 18);

  console.log(`正在授权 ${OPERATOR_ADDRESS} 销毁 ${AMOUNT_TO_APPROVE} maoETH...`);
  try {
    // 用户账户连接合约并调用 approve 函数
    const tx = await mintTokens.connect(userAccount).approve(OPERATOR_ADDRESS, amountWei);
    await tx.wait();

    console.log("授权成功!");
    console.log("交易哈希:", tx.hash);

    // 验证授权是否成功
    const allowance = await mintTokens.allowance(userAccount.address, OPERATOR_ADDRESS);
    console.log(`用户 ${userAccount.address} 授权给运营方 ${OPERATOR_ADDRESS} 的额度: ${ethers.formatUnits(allowance, 18)} maoETH`);

  } catch (error) {
    console.error("授权失败:", error.message);
    console.error("请确保用户账户有足够的 Imua ETH 支付 Gas 费。");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
