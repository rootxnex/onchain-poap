require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

let PRIVATE_KEY = process.env.PRIVATE_KEY || "";
if (PRIVATE_KEY && !PRIVATE_KEY.startsWith("0x")) {
  PRIVATE_KEY = `0x${PRIVATE_KEY}`;
}
const SHARDEUM_RPC_URL = process.env.SHARDEUM_RPC_URL || "";
const SHARDEUM_GAS_PRICE_GWEI = process.env.SHARDEUM_GAS_PRICE_GWEI || "2";
const SHARDEUM_GAS_LIMIT = process.env.SHARDEUM_GAS_LIMIT || "5000000";

module.exports = {
  solidity: "0.8.24",
  networks: {
    shardeum: {
      url: SHARDEUM_RPC_URL,
      chainId: 8119,
      gasPrice: Math.trunc(Number(SHARDEUM_GAS_PRICE_GWEI) * 1e9),
      gas: Number(SHARDEUM_GAS_LIMIT),
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  }
};
