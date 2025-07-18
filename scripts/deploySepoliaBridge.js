const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("正在使用账户部署 SepoliaBridge 合约:", deployer.address);
  console.log("此账户将成为合约的 DEFAULT_ADMIN_ROLE 和 RELAYER_ROLE。");

  const SepoliaBridge = await hre.ethers.getContractFactory("contracts/double-bridge/v0.1/LockAssets.sol:SepoliaBridge");
  const sepoliaBridge = await SepoliaBridge.deploy();

  await sepoliaBridge.waitForDeployment();

  console.log("SepoliaBridge 合约已部署到地址:", sepoliaBridge.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
