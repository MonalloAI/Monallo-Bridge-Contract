const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("正在使用账户部署 LockTokens (imua锁定器) 合约:", deployer.address);

  // 获取 LockTokens 合约工厂
  const LockTokens = await hre.ethers.getContractFactory("LockTokens");
  // 部署 LockTokens 合约
  const lockTokens = await LockTokens.deploy();

  await lockTokens.waitForDeployment();

  // LockTokens (imua锁定器) 合约已部署，其地址是：
  console.log("LockTokens (imua锁定器) 合约已部署到地址:", lockTokens.target);
  console.log("部署者是合约的拥有者和费用接收者。");
  console.log(`默认费用比例: ${await lockTokens.feeRate()}/1000`); // 显示默认费用比例
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
