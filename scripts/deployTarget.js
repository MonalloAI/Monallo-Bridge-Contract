const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

const DEPLOYED_ADDRESSES_FILE = path.join(__dirname, 'deployed_addresses.json');

const CHAIN_IDS = {
    platon: 210425,
    zetachain: 7001,
    sepolia: 11155111,
    imua: 233,
};


const TARGET_CONFIGS = {
    platon: [
        { sourceChainId: CHAIN_IDS.sepolia, name: "Monallo ETH", symbol: "maoETH" },
        { sourceChainId: CHAIN_IDS.zetachain, name: "Monallo ZETA", symbol: "maoZETA" },
        { sourceChainId: CHAIN_IDS.imua, name: "Monallo USDC", symbol: "maoUSDC" },
    ],
    sepolia: [
        { sourceChainId: CHAIN_IDS.platon, name: "Monallo LAT", symbol: "maoLAT" },
        { sourceChainId: CHAIN_IDS.zetachain, name: "Monallo ZETA", symbol: "maoZETA" }, // 区分符号
        { sourceChainId: CHAIN_IDS.imua, name: "Monallo USDC", symbol: "maoUSDC" }, // 区分符号
    ],
    zetachain: [
        { sourceChainId: CHAIN_IDS.platon, name: "Monallo LAT", symbol: "maoLAT" },
        { sourceChainId: CHAIN_IDS.sepolia, name: "Monallo ETH", symbol: "maoETH" },
        { sourceChainId: CHAIN_IDS.imua, name: "Monallo USDC", symbol: "maoUSDC" },
    ],
    imua: [
        { sourceChainId: CHAIN_IDS.platon, name: "Monallo LAT", symbol: "maoLAT" },
        { sourceChainId: CHAIN_IDS.sepolia, name: "Monallo ETH", symbol: "maoETH" },
        { sourceChainId: CHAIN_IDS.zetachain, name: "Monallo ZETA", symbol: "maoZETA" },
    ],
};

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const networkName = hre.network.name;
    const currentChainId = CHAIN_IDS[networkName];

    if (!TARGET_CONFIGS[networkName]) {
        console.log(`No Target contract configurations found for network: ${networkName}`);
        return;
    }

    let deployedAddresses = {};
    if (fs.existsSync(DEPLOYED_ADDRESSES_FILE)) {
        deployedAddresses = JSON.parse(fs.readFileSync(DEPLOYED_ADDRESSES_FILE, 'utf8'));
    }
    if (!deployedAddresses[networkName]) {
        deployedAddresses[networkName] = {};
    }
    if (!deployedAddresses[networkName].targets) {
        deployedAddresses[networkName].targets = {};
    }

    const relayerSignerAddress = "0xC3ef35A3Cb11aa4c4Cb9FC82dCAABE222D78aF5E"; // 你的中继器地址

    for (const config of TARGET_CONFIGS[networkName]) {
        const targetKey = `target_${config.sourceChainId}`; // 例如: target_11155111
        let targetAddress = deployedAddresses[networkName].targets[targetKey];
        let target;

        if (targetAddress) {
            console.log(`Target contract for sourceChainId ${config.sourceChainId} already deployed on ${networkName} at: ${targetAddress}`);
            target = await ethers.getContractAt("Target", targetAddress);
        } else {
            console.log(`Deploying Target contract for ${config.name} (Source Chain ID: ${config.sourceChainId}) on ${networkName}...`);
            const Target = await ethers.getContractFactory("Target");
            target = await Target.deploy(config.name, config.symbol, config.sourceChainId, relayerSignerAddress);
            await target.waitForDeployment();
            targetAddress = target.target;
            console.log(`Target contract for ${config.name} deployed to:`, targetAddress);

            // 保存部署的地址
            deployedAddresses[networkName].targets[targetKey] = targetAddress;
            fs.writeFileSync(DEPLOYED_ADDRESSES_FILE, JSON.stringify(deployedAddresses, null, 2));
            console.log("Deployed Target address saved.");
        }

        // 授予 MINTER_ROLE 给中继器地址
        console.log(`Granting MINTER_ROLE to relayer signer ${relayerSignerAddress} for ${config.symbol}...`);
        const MINTER_ROLE = await target.MINTER_ROLE();
        const hasMinterRole = await target.hasRole(MINTER_ROLE, relayerSignerAddress);

        if (!hasMinterRole) {
            const tx = await target.grantRole(MINTER_ROLE, relayerSignerAddress);
            await tx.wait(); // 等待交易确认
            console.log("MINTER_ROLE granted.");
        } else {
            console.log("Relayer signer already has MINTER_ROLE.");
        }

    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
