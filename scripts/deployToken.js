// scripts/deployToken.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("正在使用账户部署 MintTokens (MON代币) 合约:", deployer.address);
  console.log("此账户将成为合约的 owner。");

  // 获取 MintTokens 合约工厂
  const MintTokens = await hre.ethers.getContractFactory("MintTokens");
  // 部署 MintTokens 合约
  const mintTokens = await MintTokens.deploy();

  await mintTokens.waitForDeployment();

  // MintTokens (MON代币) 合约已部署，其地址是：
  console.log("MintTokens (MON代币) 合约已部署到地址:", mintTokens.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
