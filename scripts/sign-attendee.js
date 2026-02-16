require("dotenv").config();
const { ethers } = require("ethers");

async function main() {
  const attendee = process.argv[2];
  if (!attendee || !ethers.isAddress(attendee)) {
    throw new Error("Usage: npm run sign:attendee -- <attendee_wallet_address>");
  }

  const eventSignerPk = process.env.PRIVATE_KEY;
  if (!eventSignerPk) {
    throw new Error("PRIVATE_KEY missing in .env");
  }

  const expectedEventSigner = process.env.EVENT_SIGNER;
  if (!expectedEventSigner || !ethers.isAddress(expectedEventSigner)) {
    throw new Error("EVENT_SIGNER missing/invalid in .env");
  }

  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    throw new Error("CONTRACT_ADDRESS missing/invalid in .env – deploy first, then paste the address");
  }
  const chainId = Number(process.env.CHAIN_ID || 8119);

  const wallet = new ethers.Wallet(eventSignerPk.startsWith("0x") ? eventSignerPk : `0x${eventSignerPk}`);
  if (wallet.address.toLowerCase() !== expectedEventSigner.toLowerCase()) {
    throw new Error(`PRIVATE_KEY does not match EVENT_SIGNER. wallet=${wallet.address} EVENT_SIGNER=${expectedEventSigner}`);
  }

  const digest = ethers.solidityPackedKeccak256(
    ["address", "uint256", "address"],
    [contractAddress, chainId, attendee]
  );
  const signature = await wallet.signMessage(ethers.getBytes(digest));

  console.log("Attendee:", attendee);
  console.log("Event signer:", wallet.address);
  console.log("Contract:", contractAddress);
  console.log("Chain ID:", chainId);
  console.log("Signature:", signature);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
