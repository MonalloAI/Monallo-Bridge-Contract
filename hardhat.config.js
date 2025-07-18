require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

require("./tasks/burnImaManager.js");
require("./tasks/SepoliaBridge.js");
require("./tasks/manualMintIma.js");
require("./tasks/manualUnlockSepolia.js");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20", 
  networks: {
    imua: {
      url: process.env.IMUA_RPC_URL,
      accounts: [
        process.env.IMUA_PRIVATE_KEY,    // signers[0] for imua: Imua 部署者/管理员
        process.env.PRIVATE_KEY_ADDR1,   // signers[1] for imua: Imua 用户/操作员
      ].filter(Boolean),
      chainId: parseInt(process.env.IMUA_CHAIN_ID),
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [
        process.env.PRIVATE_KEY,         // signers[0] for sepolia: Sepolia 部署者/管理员/中继者
      ],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
      imua: process.env.IMUASCAN_API_KEY,
    },
    customChains: [
      {
        network: "imua",
        chainId: parseInt(process.env.IMUA_CHAIN_ID),
        urls: {
          apiURL: "https://api-eth.exocore-restaking.com/api", 
          browserURL: "https://exoscan.org/", 
        },
      },
    ],
  },
};
