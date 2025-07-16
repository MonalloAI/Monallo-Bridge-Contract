const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("正在使用账户部署 BurnManager 合约:", deployer.address);

  const MINT_TOKENS_ADDRESS = "0xb168Df7e7B35741134745d0D0771Cdc55d06325d"; //  MintTokens 地址

  if (!MINT_TOKENS_ADDRESS || MINT_TOKENS_ADDRESS === "0x...") {
    console.error("错误: 请更新 MINT_TOKENS_ADDRESS");
    process.exit(1);
  }

  // 注意：这里路径指向 BurnAssets.sol，因为 BurnManager 合约现在在这个文件里
  const BurnManager = await hre.ethers.getContractFactory("contracts/double-bridge/v0.1/BurnAssets.sol:BurnManager");
  const burnManager = await BurnManager.deploy(MINT_TOKENS_ADDRESS);
  await burnManager.waitForDeployment();
  console.log("BurnManager 合约已部署到地址:", burnManager.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
