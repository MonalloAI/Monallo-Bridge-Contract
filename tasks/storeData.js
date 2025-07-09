const { task } = require("hardhat/config");

// DataStorage 合约地址 
const DATA_STORAGE_ADDRESS = "0xa45706C4c3Edb764E0CdA5addFDa9760721DE27c"; 

task("store-data", "在A链上锁定imua并请求在B链上铸造代币")
  .addParam("recipient", "B链上接收代币的地址")
  .addParam("amount", "要锁定的imua数量 (人类可读格式, 例如: '0.1' 代表 0.1 imua)")
  .setAction(async ({ recipient, amount }, hre) => { // 注意：datahash 不再是这里的参数
    const [owner] = await hre.ethers.getSigners();
    console.log("正在使用账户:", owner.address);

    // 自动生成 datahash
    const randomBytes = hre.ethers.randomBytes(32); // 生成32字节的随机数据
    const finalDataHash = hre.ethers.hexlify(randomBytes); // 转换为0x开头的十六进制字符串
    console.log("自动生成的数据哈希:", finalDataHash); 

    if (!DATA_STORAGE_ADDRESS) {
        console.error("错误: 请在 tasks/storeData.js 中更新 DATA_STORAGE_ADDRESS");
        process.exit(1);
    }

    const DataStorage = await hre.ethers.getContractFactory("DataStorage");
    const dataStorage = await DataStorage.attach(DATA_STORAGE_ADDRESS);

    const amountWei = hre.ethers.parseEther(amount);

    console.log(`正在锁定 ${amount} imua，数据哈希为 ${finalDataHash}，并请求在B链上铸造到 ${recipient}...`);
    try {
        const tx = await dataStorage.lockImaAndRequestMint(finalDataHash, recipient, { value: amountWei });
        await tx.wait();
        console.log("imua 已锁定，铸币请求已发送到A链! 交易哈希:", tx.hash);
        console.log("请在A链上监控 'ImaLockedAndMintRequested' 事件。");
        console.log(`B链 (Sepolia) 上的接收者: ${recipient}, 锁定的imua (扣费前): ${amount}`);
        console.log(`请记住此数据哈希用于B链铸币: ${finalDataHash}`); 
    } catch (error) {
        console.error("锁定imua并请求铸币失败:", error.message);
        console.error("请确保 DATA_STORAGE_ADDRESS 正确且您有足够的imua。");
        process.exit(1);
    }
  });
