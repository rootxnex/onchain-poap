// IMPORTANT: Update this address after every new deployment (must match CONTRACT_ADDRESS in .env)
export const CONTRACT_ADDRESS = "0xC5CF588EBf7927cf44eb2056B04C2F315D788a1c";
export const CHAIN_ID = 8119;

export const CONTRACT_ABI = [
  {
    "inputs": [{ "internalType": "bytes", "name": "signature", "type": "bytes" }],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "hasMinted",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "eventSigner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];