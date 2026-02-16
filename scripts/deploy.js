const hre = require("hardhat");

function ceilDiv(a, b) {
  return (a + b - 1n) / b;
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const provider = hre.ethers.provider;

  const eventSigner = process.env.EVENT_SIGNER;
  const baseTokenURI = process.env.BASE_TOKEN_URI || "";
  const gasPriceGwei = process.env.SHARDEUM_GAS_PRICE_GWEI || "2";
  const gasLimitFromEnv = process.env.SHARDEUM_GAS_LIMIT;

  if (!eventSigner) {
    throw new Error("EVENT_SIGNER missing in .env");
  }

  const Factory = await hre.ethers.getContractFactory("AttendancePOAP");
  const deployTx = await Factory.getDeployTransaction(
    "Attendance POAP",
    "APOAP",
    baseTokenURI,
    eventSigner,
    deployer.address
  );

  const estimatedGas = await provider.estimateGas({
    from: deployer.address,
    data: deployTx.data
  });
  const gasLimit = gasLimitFromEnv
    ? BigInt(gasLimitFromEnv)
    : ceilDiv(estimatedGas * 12n, 10n); // +20% buffer

  let gasPrice = hre.ethers.parseUnits(gasPriceGwei, "gwei");
  const deployerBalance = await provider.getBalance(deployer.address);
  let maxCost = gasPrice * gasLimit;
  console.log("Deployer balance (wei):", deployerBalance.toString());
  console.log("Estimated gas (units):", estimatedGas.toString());
  console.log("Using gas limit (units):", gasLimit.toString());
  console.log("Using gas price (wei):", gasPrice.toString());
  console.log("Deploy max cost (wei):", maxCost.toString());

  async function attemptDeploy(useGasPrice) {
    return Factory.deploy(
      "Attendance POAP",
      "APOAP",
      baseTokenURI,
      eventSigner,
      deployer.address,
      {
        gasLimit,
        gasPrice: useGasPrice
      }
    );
  }

  let contract;
  try {
    if (deployerBalance < maxCost) {
      throw new Error("Insufficient funds for configured gas price/limit");
    }
    contract = await attemptDeploy(gasPrice);
  } catch (error) {
    const message = String(error?.message || "");
    const minFeeMatch = message.match(/minimum global fee \((\d+) < (\d+)\)/);
    if (!minFeeMatch) {
      throw error;
    }

    const minRequiredFee = BigInt(minFeeMatch[2]);
    const requiredGasPrice = ceilDiv(minRequiredFee, gasLimit);
    const requiredCost = requiredGasPrice * gasLimit;

    console.log("RPC minimum fee required (wei):", minRequiredFee.toString());
    console.log("Retry gas price (wei):", requiredGasPrice.toString());
    console.log("Retry max cost (wei):", requiredCost.toString());

    if (deployerBalance < requiredCost) {
      throw new Error(
        `Insufficient funds for RPC fee floor. Balance=${deployerBalance} Required=${requiredCost}`
      );
    }

    contract = await attemptDeploy(requiredGasPrice);
  }

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("AttendancePOAP deployed:", address);
  console.log("Deployer:", deployer.address);
  console.log("Event signer:", eventSigner);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
