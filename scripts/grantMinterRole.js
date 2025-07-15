const hre = require("hardhat");
require("dotenv").config();

const TOKEN_ADDRESS = "0xC220A5B9E5e81F4695dBA43Da7B1eAddc95AdAd9"; //  合约地址 (在 imua 链上)
// PRIVATE_KEY_ADDR1 
const MINTER_ADDRESS_TO_GRANT = [
    "0x3E7BaB615e5F8867c3d1a5Aa62C0BF6528642E39", 
    "0x3dF5422b897d608630C9F708548F7C9f1f5e81fA", 
].filter(Boolean);

async function main() {
  const { ethers } = hre;

  const [deployer] = await ethers.getSigners();
  console.log(`正在使用账户 (MintTokens 合约 DEFAULT_ADMIN_ROLE): ${deployer.address}`);

  if (!TOKEN_ADDRESS || TOKEN_ADDRESS === "0x...") {
    console.error("错误: 请在 scripts/grantMinterRole.js 中更新 TOKEN_ADDRESS (imua 链上的 MintTokens 地址)");
    process.exit(1);
  }
  if (MINTER_ADDRESS_TO_GRANT.length === 0) {
    console.error("错误: 请在 scripts/grantMinterRole.js 中指定 MINTER_ADDRESS_TO_GRANT");
    process.exit(1);
  }

  const Token = await ethers.getContractFactory("contracts/double-bridge/v0.1/MintAssets.sol:MintTokens");
  const token = await Token.attach(TOKEN_ADDRESS);

  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));

  for (const addressToGrant of MINTER_ADDRESS_TO_GRANT) {
    console.log(`\n正在授予 ${addressToGrant} MINTER_ROLE (在 imua 链上)...`);

    try {
      const hasRoleBefore = await token.hasRole(MINTER_ROLE, addressToGrant);
      if (hasRoleBefore) {
        console.log(`${addressToGrant} 已经拥有 MINTER_ROLE，跳过。`);
        continue;
      }

      const tx = await token.connect(deployer).grantRole(MINTER_ROLE, addressToGrant);
      await tx.wait();

      console.log(`MINTER_ROLE 已成功授予 ${addressToGrant} (在 imua 链上)!`);
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
