// tasks/lockSepolia.js
const { task } = require("hardhat/config");

const LOCK_TOKENS_ADDRESS = "0x1658cF06F2774ac2be7BB4308E53a7D8BE4861F2"; // LockTokens 合约地址 (Sepolia网络)

task("lock-sepolia", "在B链上锁定Sepolia ETH并触发跨链事件") 
  .addParam("receiver", "A链 (imua) 上接收代币的地址") 
  .addParam("amount", "要锁定的Sepolia ETH数量 (人类可读格式, 例如: '0.1' 代表 0.1 Sepolia ETH)") 
  .setAction(async ({ receiver, amount }, hre) => {
    const [sender] = await hre.ethers.getSigners(); // 发送者账户
    console.log("正在使用账户:", sender.address);

    if (!LOCK_TOKENS_ADDRESS || LOCK_TOKENS_ADDRESS === "0x...") {
        console.error("错误: 请在 tasks/lockSepolia.js 中更新 LOCK_TOKENS_ADDRESS (Sepolia 链上的 LockTokens 地址)"); 
        process.exit(1);
    }
     if (!hre.ethers.isAddress(receiver)) { // 校验接收者地址
        console.error(`错误: 接收者地址 ${receiver} 格式无效。`);
        process.exit(1);
    }

    const LockTokens = await hre.ethers.getContractFactory("LockTokens");
    // 使用 attach 连接到已部署的合约
    const lockTokens = await LockTokens.attach(LOCK_TOKENS_ADDRESS);

    const amountWei = hre.ethers.parseEther(amount);

    console.log(`正在锁定 ${amount} Sepolia ETH，并请求在A链 (imua) 上铸造到 ${receiver}...`); 
    try {
        // 调用 lock 函数，通过 value 传递 Sepolia ETH 数量
        const tx = await lockTokens.lock(receiver, { value: amountWei });
        await tx.wait();
        console.log("Sepolia ETH 已锁定，跨链事件已触发! 交易哈希:", tx.hash); 
        console.log("请在B链 (Sepolia) 上监控 'Locked' 事件。"); 
        console.log(`A链 (imua) 上的接收者: ${receiver}, 锁定的Sepolia ETH (扣费前): ${amount}`); 
        // 提示用户需要链下服务处理事件并在A链铸币
        console.log("请使用链下服务监听此交易的 'Locked' 事件，并使用事件数据在A链 (imua) 上调用 mint 函数。"); 

    } catch (error) {
        console.error("锁定Sepolia ETH失败:", error.message); 
        console.error("请确保 LOCK_TOKENS_ADDRESS 正确且您有足够的Sepolia ETH。"); 
        process.exit(1);
    }
  });
