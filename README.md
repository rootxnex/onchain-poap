# On-Chain Attendance / POAP NFT

Minimal dApp shipping target:
- ERC721 contract with `mint()` gated by `EVENT_SIGNER`
- Frontend: `Connect Wallet -> Mint`
- Shardeum EVM Testnet deployment script

## Network

- Network Name: `Shardeum EVM Testnet`
- RPC URL: `https://api-mezame.shardeum.org`
- Chain ID: `8119`
- Explorer: `https://explorer-mezame.shardeum.org`

## 1) Install

```bash
npm install
```

## 2) Configure env

```bash
copy .env.example .env
```

Fill values in `.env`:
- `SHARDEUM_RPC_URL`
- `PRIVATE_KEY`
- `EVENT_SIGNER`
- `BASE_TOKEN_URI`\n- `SHARDEUM_GAS_PRICE_GWEI` (default `2`)\n- `SHARDEUM_GAS_LIMIT` (default `5000000`)

## 3) Compile + deploy to Shardeum

```bash
npm run compile
npm run deploy:shardeum
```

Take deployed address and update `frontend/config.js`:
- `CONTRACT_ADDRESS`

## 4) Run frontend

```bash
npm run frontend
```

Open printed local URL (usually `http://localhost:3000`).

## Signature format used by contract

Signer must sign this digest:

```solidity
keccak256(abi.encodePacked(address(contract), chainId, attendeeAddress))
```

Then attendee uses that signature in frontend to mint once.

## Example signing snippet (backend/event tool)

```js
const digest = ethers.solidityPackedKeccak256(
  ["address", "uint256", "address"],
  [contractAddress, chainId, attendeeAddress]
);
const signature = await eventSignerWallet.signMessage(ethers.getBytes(digest));
```