const hre = require("hardhat");

//合约地址 (B链，即Sepolia) 
const TOKEN_ADDRESS = "0xdce994Af87D537DcFA77F80bF0069BbA4Ec00baa"; 

// 想要授予 MINTER_ROLE 的地址列表
const MINTER_ADDRESSES = [
    "0xC4A9D75D8F80Da4750576493A8Cf270930C48137", 
    "0xf98814782f4daEF28bF8e85BA1d62Aa2d0b54c1E", 
    ""   
];

async function main() {
    const [deployer] = await hre.ethers.getSigners(); // 部署者账户，需要有 DEFAULT_ADMIN_ROLE
    console.log("正在使用部署者账户:", deployer.address); 

    if (!TOKEN_ADDRESS || TOKEN_ADDRESS === "0x...") {
        console.error("错误: 请在 grantMinterRole.js 中更新 TOKEN_ADDRESS"); 
        process.exit(1);
    }
    if (MINTER_ADDRESSES.length === 0) { // 检查地址列表是否为空
        console.error("错误: MINTER_ADDRESSES 列表为空。请在 grantMinterRole.js 中添加要授权的地址。"); 
        process.exit(1);
    }

    const token = await hre.ethers.getContractAt("Token", TOKEN_ADDRESS);
    const MINTER_ROLE = await token.MINTER_ROLE();

    for (const minterAddress of MINTER_ADDRESSES) {
        // 验证地址格式
        if (!hre.ethers.isAddress(minterAddress)) {
            console.error(`错误: 地址 ${minterAddress} 格式无效。请检查 MINTER_ADDRESSES 列表。`);
            continue; // 跳过当前无效地址，继续处理下一个
        }

        const hasRole = await token.hasRole(MINTER_ROLE, minterAddress);
        if (hasRole) {
            console.log(`${minterAddress} 已经拥有 MINTER_ROLE 角色。`); 
            continue; // 跳过已拥有角色的地址
        }

        console.log(`正在为 Token 合约 ${TOKEN_ADDRESS} 授予 ${minterAddress} MINTER_ROLE 角色...`); 
        try {
            // 部署者账户调用 grantRole，将 MINTER_ROLE 授予当前地址
            const tx = await token.connect(deployer).grantRole(MINTER_ROLE, minterAddress);
            await tx.wait();
            console.log(`MINTER_ROLE 角色授予 ${minterAddress} 成功!`); 
        } catch (error) {
            console.error(`授予 ${minterAddress} MINTER_ROLE 角色失败:`, error.message);
            // 可以在这里添加更详细的错误处理，例如记录到日志
        }
    }
    console.log("\n所有指定地址的 MINTER_ROLE 授予尝试已完成。");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
