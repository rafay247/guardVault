import {
  formatEth,
  getArgument,
  getProvider,
  getSigner,
  parseEthAmount,
  printConnection,
  requireAddress,
  waitForTransaction
} from "./lib/guardVault.js";

async function main() {
  const args = process.argv.slice(2);
  const vaultAddress = requireAddress(getArgument(args, 0, "GUARDVAULT_ADDRESS", "GuardVault address"), "GuardVault address");
  const amount = parseEthAmount(getArgument(args, 1, "AMOUNT_ETH", "amount in ETH"), "amount in ETH");
  const provider = getProvider();
  const signer = getSigner(provider);

  await printConnection(signer);

  const transaction = await signer.sendTransaction({
    to: vaultAddress,
    value: amount
  });

  await waitForTransaction(transaction);

  const vaultBalance = await provider.getBalance(vaultAddress);
  console.log(`Funded: ${formatEth(amount)}`);
  console.log(`Vault balance: ${formatEth(vaultBalance)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

