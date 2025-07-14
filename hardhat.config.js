require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

require("./tasks/lockSepolia.js");
require("./tasks/manualMintIma.js");
require("./tasks/burnIma.js"); 
require("./tasks/manualUnlockSepolia.js"); 

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    // imua 网络配置 (现在是B链，部署MintTokens)
    imua: {
      url: process.env.IMUA_RPC_URL,
      // 部署MintTokens合约的账户 (DEFAULT_ADMIN_ROLE)
      // 另一个账户 (PRIVATE_KEY_ADDR1) 将被授予 MINTER_ROLE
      accounts: [
        process.env.IMUA_PRIVATE_KEY,    
        process.env.PRIVATE_KEY_ADDR1,   
      ].filter(Boolean), // 过滤掉空的私钥
      chainId: parseInt(process.env.IMUA_CHAIN_ID),
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      // 部署LockTokens合约的账户 (owner)
      accounts: [
        process.env.PRIVATE_KEY,         
      ],
      chainId: 11155111, // Sepolia的Chain ID
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY, // Sepolia的API Key (用于LockTokens验证)
      imua: process.env.IMUASCAN_API_KEY,     // imua的API Key (用于MintTokens验证)
    },
    customChains: [
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
