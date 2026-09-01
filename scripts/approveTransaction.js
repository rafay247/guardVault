import {
  getArgument,
  getGuardVault,
  getProvider,
  getSigner,
  parseTxId,
  printConnection,
  requireAddress,
  waitForTransaction
} from "./lib/guardVault.js";

async function main() {
  const args = process.argv.slice(2);
  const vaultAddress = requireAddress(getArgument(args, 0, "GUARDVAULT_ADDRESS", "GuardVault address"), "GuardVault address");
  const txId = parseTxId(getArgument(args, 1, "TX_ID", "transaction id"));
  const provider = getProvider();
  const signer = getSigner(provider);
  const vault = await getGuardVault(vaultAddress, signer);

  await printConnection(signer);

  const transaction = await vault.approveTransaction(txId);
  await waitForTransaction(transaction);

  console.log(`Approved transaction id: ${txId.toString()}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

