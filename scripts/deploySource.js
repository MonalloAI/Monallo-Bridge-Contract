const { ethers } = require("hardhat");
const fs = require('fs'); 
const path = require('path'); 

// 存储部署的地址
const DEPLOYED_ADDRESSES_FILE = path.join(__dirname, 'deployed_addresses.json');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const networkName = hre.network.name; 

    let deployedAddresses = {};
    if (fs.existsSync(DEPLOYED_ADDRESSES_FILE)) {
        deployedAddresses = JSON.parse(fs.readFileSync(DEPLOYED_ADDRESSES_FILE, 'utf8'));
    }

    let sourceAddress = deployedAddresses[networkName]?.source;
    let source;

    if (sourceAddress) {
        console.log(`Source contract already deployed on ${networkName} at: ${sourceAddress}`);
        source = await ethers.getContractAt("Source", sourceAddress);
    } else {
        console.log(`Deploying Source contract on ${networkName}...`);
        const Source = await ethers.getContractFactory("Source");
        source = await Source.deploy();
        await source.waitForDeployment();
        sourceAddress = source.target;
        console.log("Source contract deployed to:", sourceAddress);

        // 保存部署的地址
        if (!deployedAddresses[networkName]) {
            deployedAddresses[networkName] = {};
        }
        deployedAddresses[networkName].source = sourceAddress;
        fs.writeFileSync(DEPLOYED_ADDRESSES_FILE, JSON.stringify(deployedAddresses, null, 2));
        console.log("Deployed Source address saved.");
    }


    const relayerSignerAddress = "0xC3ef35A3Cb11aa4c4Cb9FC82dCAABE222D78aF5E"; // 替换为你的中继器地址
    console.log("Setting relayer signer to:", relayerSignerAddress);
    // 检查当前 relayerSigner 是否已经设置，避免重复交易
    const currentRelayerSigner = await source.relayerSigner();
    if (currentRelayerSigner.toLowerCase() !== relayerSignerAddress.toLowerCase()) {
        const tx = await source.setRelayerSigner(relayerSignerAddress);
        await tx.wait(); // 等待交易确认
        console.log("Relayer signer set.");
    } else {
        console.log("Relayer signer already set to the correct address.");
    }


    // 设置手续费配置
    const isPercentageFee = false;
    const feeValue = 1000000000000000; 
    console.log("Setting fee config...");
    // 检查当前 feeConfig 是否已经设置，避免重复交易
    const currentFeeConfig = await source.feeConfig();
    if (currentFeeConfig.isPercentage !== isPercentageFee || currentFeeConfig.value !== feeValue) {
        const tx = await source.setFeeConfig(isPercentageFee, feeValue);
        await tx.wait(); // 等待交易确认
        console.log("Fee config set.");
    } else {
        console.log("Fee config already set to the correct values.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
