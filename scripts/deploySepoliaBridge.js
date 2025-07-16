const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("正在使用账户部署 SepoliaBridge 合约:", deployer.address);

  // 路径指向 MintAssets.sol，因为 SepoliaBridge 合约现在在这个文件里
  const SepoliaBridge = await hre.ethers.getContractFactory("contracts/double-bridge/v0.1/LockAssets.sol:SepoliaBridge");
  const sepoliaBridge = await SepoliaBridge.deploy();
  await sepoliaBridge.waitForDeployment();
  console.log("SepoliaBridge 合约已部署到地址:", sepoliaBridge.target);
  console.log("部署者是合约的拥有者和费用接收者。");
  console.log(`默认费用比例: ${await sepoliaBridge.feeRate()}/1000`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
