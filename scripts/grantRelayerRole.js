const hre = require("hardhat");
require("dotenv").config();

const SEPOLIA_BRIDGE_ADDRESS = "0xE218189033593d5870228D8C3A15bC035730FEeA"; // SepoliaBridge 合约地址
// 需要被授予 RELAYER_ROLE 的地址列表
const RELAYER_ADDRESSES_TO_GRANT = [
    "0x3E7BaB615e5F8867c3d1a5Aa62C0BF6528642E39", 
    "0xC3ef35A3Cb11aa4c4Cb9FC82dCAABE222D78aF5E",
].filter(Boolean); 

async function main() {
  const { ethers } = hre;

  // 确保使用拥有 DEFAULT_ADMIN_ROLE 的账户来执行授权
  const [adminAccount] = await ethers.getSigners();
  console.log(`正在使用账户 (SepoliaBridge 合约 DEFAULT_ADMIN_ROLE): ${adminAccount.address}`);

  if (!SEPOLIA_BRIDGE_ADDRESS || SEPOLIA_BRIDGE_ADDRESS === "0x...") {
    console.error("错误: 请在 scripts/grantRelayerRole.js 中更新 SEPOLIA_BRIDGE_ADDRESS");
    process.exit(1);
  }
  if (RELAYER_ADDRESSES_TO_GRANT.length === 0) {
    console.error("错误: 请在 scripts/grantRelayerRole.js 中指定 RELAYER_ADDRESSES_TO_GRANT");
    process.exit(1);
  }

  const SepoliaBridge = await ethers.getContractFactory("contracts/double-bridge/v0.1/LockAssets.sol:SepoliaBridge");
  const sepoliaBridge = await SepoliaBridge.attach(SEPOLIA_BRIDGE_ADDRESS);

  // 获取 RELAYER_ROLE 的哈希值
  const RELAYER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("RELAYER_ROLE"));

  for (const addressToGrant of RELAYER_ADDRESSES_TO_GRANT) {
    console.log(`\n正在授予 ${addressToGrant} RELAYER_ROLE...`);

    try {
      const hasRoleBefore = await sepoliaBridge.hasRole(RELAYER_ROLE, addressToGrant);
      if (hasRoleBefore) {
        console.log(`${addressToGrant} 已经拥有 RELAYER_ROLE，跳过。`);
        continue;
      }

      // 使用 adminAccount 连接合约并授予角色
      const tx = await sepoliaBridge.connect(adminAccount).grantRole(RELAYER_ROLE, addressToGrant);
      await tx.wait();

      console.log(`RELAYER_ROLE 已成功授予 ${addressToGrant}!`);
      console.log(`交易哈希: ${tx.hash}`);

      const hasRoleAfter = await sepoliaBridge.hasRole(RELAYER_ROLE, addressToGrant);
      console.log(`${addressToGrant} 是否拥有 RELAYER_ROLE: ${hasRoleAfter}`);
    } catch (error) {
      console.error(`授予 ${addressToGrant} RELAYER_ROLE 失败:`, error.message);
    }
  }

  console.log("\n所有指定地址的 RELAYER_ROLE 授予操作已完成。");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
