// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// 导入你创建的任务文件
require("./tasks/storeData.js");
require("./tasks/manualMint.js");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    // imua 网络配置 (A链)
    imua: {
      url: process.env.IMUA_RPC_URL,
      accounts: [process.env.IMUA_PRIVATE_KEY], // 部署DataStorage合约的账户
      chainId: parseInt(process.env.IMUA_CHAIN_ID), // 从.env读取并转换为数字
    },
    // Sepolia 测试网配置 (B链)
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [
        process.env.PRIVATE_KEY,        // 部署Token合约的账户
        process.env.PRIVATE_KEY_ADDR1,   // 手动操作员账户 (用于在B链上铸币)
      ].filter(Boolean),
      chainId: 11155111, // Sepolia的Chain ID
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY, // Sepolia的API Key
      imua: process.env.IMUASCAN_API_KEY, // 如果imua有类似Etherscan的浏览器
    },
    customChains: [
      // imua网络的自定义链配置 (如果imua有类似Etherscan的浏览器)
      {
        network: "imua",
        chainId: parseInt(process.env.IMUA_CHAIN_ID),
        urls: {
          api: "YOUR_IMUASCAN_API_URL", // 替换为imua的API URL"
          browser: "https://exoscan.org/", // 替换为imua的浏览器URL"
        },
      },
    ],
  },
};
