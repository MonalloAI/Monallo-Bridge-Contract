const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("正在使用账户部署 Token 合约:", deployer.address); 

  const initialSupply = hre.ethers.parseUnits("100000000000", 18); //初始供应量
  const Token = await hre.ethers.getContractFactory("Token");
  const token = await Token.deploy(initialSupply);

  await token.waitForDeployment();

  // Token 合约已部署，其地址是：
  console.log("Token 合约已部署到地址:", token.target); // 明确指出是生成的合约地址
  console.log("初始供应量:", hre.ethers.formatUnits(initialSupply, 18)); 
  console.log("部署者持有的代币余额:", hre.ethers.formatUnits(await token.balanceOf(deployer.address), 18)); 
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

