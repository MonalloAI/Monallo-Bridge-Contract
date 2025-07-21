require("dotenv").config(); 
require("@nomicfoundation/hardhat-toolbox");

const PRIVATE_KEY = process.env.PRIVATE_KEY; 

module.exports = {
  solidity: "0.8.19",
  networks: {
    platon: {
      url: "https://openapi2.platon.network/rpc",
      chainId: 210425,
      accounts: [PRIVATE_KEY] 
    },
    zetachain: {
      url: "https://zeta-chain-testnet.drpc.org",
      chainId: 7001,
      accounts: [PRIVATE_KEY]
    },
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts: [PRIVATE_KEY],
      gasPrice: 24000000000, 
    },
    imua: {
      url: "https://api-eth.exocore-restaking.com",
      chainId: 233,
      accounts: [PRIVATE_KEY]
    }
  },
  paths: {
    sources: "./contracts/double-bridge/v0.2", 
  }
};
