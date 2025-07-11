// scripts/deployToken.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("正在使用账户部署 MintTokens (maoETH 代币) 合约:", deployer.address);
  console.log("此账户将成为合约的 owner (DEFAULT_ADMIN_ROLE)。");

  // 获取 MintTokens 合约工厂 - 使用完全限定名称
  const MintTokens = await hre.ethers.getContractFactory("contracts/simple-bridge/MintAssets.sol:MintTokens"); // <--- 修改这里
  // 部署 MintTokens 合约
  const mintTokens = await MintTokens.deploy("MonalloETH", "maoETH");

  await mintTokens.waitForDeployment();

  console.log("MintTokens (maoETH 代币) 合约已部署到地址:", mintTokens.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
