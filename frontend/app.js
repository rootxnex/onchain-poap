import { CONTRACT_ADDRESS, CONTRACT_ABI, CHAIN_ID } from "./config.js";

/* ─── Constants ─── */
const CHAIN_ID_HEX = "0x" + CHAIN_ID.toString(16);

/* ─── DOM refs ─── */
const tabBtns = document.querySelectorAll(".tab-btn");

// Organizer
const orgConnectBtn = document.getElementById("org-connectBtn");
const orgSignBtn = document.getElementById("org-signBtn");
const orgWalletEl = document.getElementById("org-wallet");
const orgOutput = document.getElementById("org-output");
const orgStatus = document.getElementById("org-status");
const orgSignerWarning = document.getElementById("org-signer-warning");
const attendeeAddrInput = document.getElementById("attendee-addr");

// Attendee
const attConnectBtn = document.getElementById("att-connectBtn");
const mintBtn = document.getElementById("mintBtn");
const attWalletEl = document.getElementById("att-wallet");
const signatureInput = document.getElementById("signature");
const attStatus = document.getElementById("att-status");

/* ─── State ─── */
let orgProvider, orgSigner, orgAccount;
let attProvider, attSigner, attAccount;
let onChainEventSigner = null; // fetched once from the contract

/* ─── Helpers ─── */
function showStatus(el, msg, type) {
  el.textContent = msg;
  el.className = "status visible " + type;
}
function hideStatus(el) {
  el.className = "status";
}

function shortenAddr(a) {
  return a.slice(0, 6) + "..." + a.slice(-4);
}

function extractErrorMessage(err) {
  const candidates = [
    err?.reason,
    err?.shortMessage,
    err?.data?.message,
    err?.error?.data?.message,
    err?.error?.message,
    err?.message
  ];
  const raw = candidates.find((v) => typeof v === "string" && v.trim().length > 0);
  if (!raw) return "Something went wrong.";
  return raw.replace(/^execution reverted:\s*/i, "").trim();
}

async function ensureShardeum(provider) {
  const chainIdHex = await provider.send("eth_chainId", []);
  if (chainIdHex.toLowerCase() !== CHAIN_ID_HEX.toLowerCase()) {
    try {
      await provider.send("wallet_switchEthereumChain", [{ chainId: CHAIN_ID_HEX }]);
    } catch {
      throw new Error("Please switch your wallet to Shardeum (Chain ID " + CHAIN_ID + ").");
    }
  }
}

async function fetchOnChainSigner(provider) {
  if (onChainEventSigner) return onChainEventSigner;
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  onChainEventSigner = (await contract.eventSigner()).toLowerCase();
  return onChainEventSigner;
}

/* ─── Tabs ─── */
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    document.getElementById("panel-" + btn.dataset.tab).classList.add("active");
  });
});

/* ═══════════════════════════════════════
   ORGANIZER — connect & sign in browser
   ═══════════════════════════════════════ */

async function orgConnect() {
  if (!window.ethereum) { showStatus(orgStatus, "Install MetaMask first.", "error"); return; }
  try {
    orgProvider = new ethers.BrowserProvider(window.ethereum);
    await ensureShardeum(orgProvider);
    const accounts = await orgProvider.send("eth_requestAccounts", []);
    orgAccount = accounts[0];
    orgSigner = await orgProvider.getSigner();
    orgWalletEl.innerHTML = "<strong>" + shortenAddr(orgAccount) + "</strong>";

    // Check if connected wallet is the on-chain event signer
    const expected = await fetchOnChainSigner(orgProvider);
    if (orgAccount.toLowerCase() !== expected) {
      orgSignerWarning.textContent =
        "This wallet is NOT the event signer. Switch to " + shortenAddr(expected) + " to sign attendees.";
      orgSignerWarning.style.display = "block";
      orgSignBtn.disabled = true;
    } else {
      orgSignerWarning.style.display = "none";
      orgSignBtn.disabled = false;
    }
    hideStatus(orgStatus);
  } catch (err) {
    showStatus(orgStatus, extractErrorMessage(err), "error");
  }
}

async function orgSign() {
  hideStatus(orgStatus);
  const attendee = attendeeAddrInput.value.trim();
  if (!attendee || !ethers.isAddress(attendee)) {
    showStatus(orgStatus, "Enter a valid attendee wallet address.", "error");
    return;
  }

  try {
    orgSignBtn.disabled = true;
    orgSignBtn.innerHTML = '<span class="spinner"></span> Signing...';

    // Build the same digest the contract expects:
    //   keccak256(abi.encodePacked(contractAddress, chainId, attendee))
    const digest = ethers.solidityPackedKeccak256(
      ["address", "uint256", "address"],
      [CONTRACT_ADDRESS, CHAIN_ID, attendee]
    );

    // Sign with MetaMask (produces EIP-191 personal_sign = toEthSignedMessageHash on-chain)
    const signature = await orgSigner.signMessage(ethers.getBytes(digest));

    orgOutput.classList.remove("empty");
    orgOutput.innerHTML =
      signature +
      '<button class="btn btn-outline btn-sm copy-btn" id="copyBtn">Copy</button>';

    document.getElementById("copyBtn").addEventListener("click", () => {
      navigator.clipboard.writeText(signature);
      document.getElementById("copyBtn").textContent = "Copied!";
      setTimeout(() => { document.getElementById("copyBtn").textContent = "Copy"; }, 1500);
    });

    showStatus(orgStatus, "Signature generated! Share it with the attendee.", "success");
  } catch (err) {
    showStatus(orgStatus, extractErrorMessage(err), "error");
  } finally {
    orgSignBtn.disabled = false;
    orgSignBtn.textContent = "Sign in Wallet";
  }
}

orgConnectBtn.addEventListener("click", orgConnect);
orgSignBtn.addEventListener("click", orgSign);

/* ═══════════════════════════════════════
   ATTENDEE — connect & mint
   ═══════════════════════════════════════ */

async function attConnect() {
  if (!window.ethereum) { showStatus(attStatus, "Install MetaMask first.", "error"); return; }
  try {
    attProvider = new ethers.BrowserProvider(window.ethereum);
    await ensureShardeum(attProvider);
    const accounts = await attProvider.send("eth_requestAccounts", []);
    attAccount = accounts[0];
    attSigner = await attProvider.getSigner();
    attWalletEl.innerHTML = "<strong>" + shortenAddr(attAccount) + "</strong>";
    mintBtn.disabled = false;
    hideStatus(attStatus);

    // Check if already minted
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, attProvider);
    const already = await contract.hasMinted(attAccount);
    if (already) {
      showStatus(attStatus, "This wallet already minted its attendance NFT.", "info");
      mintBtn.disabled = true;
    }
  } catch (err) {
    showStatus(attStatus, extractErrorMessage(err), "error");
  }
}

async function mintAttendance() {
  if (!attSigner) { showStatus(attStatus, "Connect wallet first.", "error"); return; }

  const signature = signatureInput.value.trim();
  if (!signature) { showStatus(attStatus, "Paste the signature from the organizer.", "error"); return; }
  if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
    showStatus(attStatus, "Invalid signature format — must be a 0x hex string.", "error");
    return;
  }

  try {
    mintBtn.disabled = true;
    mintBtn.innerHTML = '<span class="spinner"></span> Minting...';

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, attSigner);

    // Check already minted
    const already = await contract.hasMinted(attAccount);
    if (already) {
      showStatus(attStatus, "This wallet already minted its attendance NFT.", "info");
      return;
    }

    // Dry-run to surface revert reasons before gas prompt
    await contract.mint.staticCall(signature);

    showStatus(attStatus, "Confirm the transaction in your wallet...", "info");
    const tx = await contract.mint(signature);
    showStatus(attStatus, "Transaction sent. Waiting for confirmation...", "info");
    await tx.wait();
    showStatus(attStatus, "Minted successfully! Tx: " + tx.hash, "success");
  } catch (err) {
    showStatus(attStatus, extractErrorMessage(err), "error");
  } finally {
    mintBtn.disabled = false;
    mintBtn.textContent = "Mint Attendance NFT";
  }
}

attConnectBtn.addEventListener("click", attConnect);
mintBtn.addEventListener("click", mintAttendance);
