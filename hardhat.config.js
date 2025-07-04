require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); 

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    bsc_testnet: {
      url: "https://bsc-testnet-dataseed.bnbchain.org",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 97,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      // 修改这里，添加更多私钥
      accounts: [
        process.env.PRIVATE_KEY,
        process.env.PRIVATE_KEY_ADDR1, // 添加这个
        process.env.PRIVATE_KEY_ADDR2  // 添加这个
      ].filter(Boolean), // .filter(Boolean) 用于过滤掉可能为 undefined 的私钥（如果 .env 中没有配置）
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
      bscTestnet: process.env.BSCSCAN_API_KEY,
    },
    customChains: [
      {
        network: "bscTestnet",
        chainId: 97,
        urls: {
          api: "https://api-testnet.bscscan.com/api",
          browser: "https://testnet.bscscan.com",
        },
      },
    ],
  },
};
