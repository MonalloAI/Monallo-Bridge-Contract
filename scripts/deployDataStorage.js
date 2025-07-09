const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("正在使用账户部署 DataStorage (imua锁定器) 合约:", deployer.address); //  imua锁定器

  const DataStorage = await hre.ethers.getContractFactory("DataStorage"); 
  const dataStorage = await DataStorage.deploy();

  await dataStorage.waitForDeployment();

  // DataStorage (imua锁定器) 合约已部署，其地址是：
  console.log("DataStorage (imua锁定器) 合约已部署到地址:", dataStorage.target); // 明确指出是生成的合约地址
  console.log("部署者是合约的拥有者和费用接收者。");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

