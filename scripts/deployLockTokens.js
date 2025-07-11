const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("正在使用账户部署 LockTokens (Sepolia 锁定器) 合约:", deployer.address);

  // 获取 LockTokens 合约工厂 - 使用完全限定名称
  const LockTokens = await hre.ethers.getContractFactory("contracts/simple-bridge/LockAssets.sol:LockTokens"); // <--- 修改这里
  // 部署 LockTokens 合约
  const lockTokens = await LockTokens.deploy();

  await lockTokens.waitForDeployment();

  console.log("LockTokens (Sepolia 锁定器) 合约已部署到地址:", lockTokens.target);
  console.log("部署者是合约的拥有者和费用接收者。");
  console.log(`默认费用比例: ${await lockTokens.feeRate()}/1000`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
