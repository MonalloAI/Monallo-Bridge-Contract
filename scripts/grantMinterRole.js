// scripts/grantMinterRole.js
const hre = require("hardhat");
require("dotenv").config();

const TOKEN_ADDRESS = "0x75891AA11AC45ab150e81AE744728d11C72c472B"; // 你的 MintTokens 合约地址
const MINTER_ADDRESS_TO_GRANT = [
    "0xC4A9D75D8F80Da4750576493A8Cf270930C48137",
    "0x86f07a6021088D3Bc091D4B18D1a3f90c867423B",
]; 

async function main() {
  const { ethers } = hre; 

  const [deployer] = await ethers.getSigners(); // 合约 owner
  console.log(`正在使用账户 (合约 owner): ${deployer.address}`);

  const Token = await ethers.getContractFactory("MintTokens"); 
  const token = await Token.attach(TOKEN_ADDRESS);

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  for (const addressToGrant of MINTER_ADDRESS_TO_GRANT) {
    console.log(`\n正在授予 ${addressToGrant} MINTER_ROLE...`);

    try {
      // 检查是否已经拥有权限，避免重复交易
      const hasRoleBefore = await token.hasRole(MINTER_ROLE, addressToGrant);
      if (hasRoleBefore) {
        console.log(`${addressToGrant} 已经拥有 MINTER_ROLE，跳过。`);
        continue; // 跳过当前循环，处理下一个地址
      }

      const tx = await token.connect(deployer).grantRole(MINTER_ROLE, addressToGrant);
      await tx.wait();

      console.log(`MINTER_ROLE 已成功授予 ${addressToGrant}!`);
      console.log(`交易哈希: ${tx.hash}`);

      const hasRoleAfter = await token.hasRole(MINTER_ROLE, addressToGrant);
      console.log(`${addressToGrant} 是否拥有 MINTER_ROLE: ${hasRoleAfter}`);
    } catch (error) {
      console.error(`授予 ${addressToGrant} MINTER_ROLE 失败:`, error.message);
      
    }
  }

  console.log("\n所有指定地址的 MINTER_ROLE 授予操作已完成。");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
