/** @type {import("hardhat/config").HardhatUserConfig} */
export default {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    anvil: {
      type: "http",
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  }
};

