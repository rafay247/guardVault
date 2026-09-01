import {
  formatEth,
  getArgument,
  getGuardVault,
  getOptionalArgument,
  getProvider,
  getSigner,
  parseData,
  parseEthAmount,
  printConnection,
  requireAddress,
  waitForTransaction
} from "./lib/guardVault.js";

async function main() {
  const args = process.argv.slice(2);
  const vaultAddress = requireAddress(getArgument(args, 0, "GUARDVAULT_ADDRESS", "GuardVault address"), "GuardVault address");
  const recipient = requireAddress(getArgument(args, 1, "TO_ADDRESS", "recipient address"), "recipient address");
  const amount = parseEthAmount(getArgument(args, 2, "AMOUNT_ETH", "amount in ETH"), "amount in ETH");
  const data = parseData(getOptionalArgument(args, 3, "TX_DATA", "0x"));
  const provider = getProvider();
  const signer = getSigner(provider);
  const vault = await getGuardVault(vaultAddress, signer);

  await printConnection(signer);

  const txId = await vault.submitTransaction.staticCall(recipient, amount, data);
  const transaction = await vault.submitTransaction(recipient, amount, data);

  await waitForTransaction(transaction);

  console.log(`Submitted transaction id: ${txId.toString()}`);
  console.log(`To: ${recipient}`);
  console.log(`Value: ${formatEth(amount)}`);
  console.log(`Data: ${data}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

