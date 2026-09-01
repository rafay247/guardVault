import {
  formatEth,
  getArgument,
  getGuardVault,
  getOptionalArgument,
  getProvider,
  parseTxId,
  printConnection,
  requireAddress
} from "./lib/guardVault.js";

async function main() {
  const args = process.argv.slice(2);
  const vaultAddress = requireAddress(getArgument(args, 0, "GUARDVAULT_ADDRESS", "GuardVault address"), "GuardVault address");
  const txIdValue = getOptionalArgument(args, 1, "TX_ID");
  const provider = getProvider();
  const vault = await getGuardVault(vaultAddress, provider);

  await printConnection(provider);

  const [balance, owners, requiredApprovals, transactionCount] = await Promise.all([
    provider.getBalance(vaultAddress),
    vault.getOwners(),
    vault.requiredApprovals(),
    vault.getTransactionCount()
  ]);

  console.log(`GuardVault: ${vaultAddress}`);
  console.log(`Balance: ${formatEth(balance)}`);
  console.log(`Required approvals: ${requiredApprovals.toString()} of ${owners.length}`);
  console.log(`Transaction count: ${transactionCount.toString()}`);
  console.log("Owners:");
  owners.forEach((owner, index) => console.log(`${index}: ${owner}`));

  if (txIdValue !== undefined) {
    const txId = parseTxId(txIdValue);
    const [to, value, data, executed, approvals] = await vault.getTransaction(txId);
    const approvalsByOwner = await Promise.all(owners.map((owner) => vault.hasApproved(txId, owner)));

    console.log("");
    console.log(`Transaction ${txId.toString()}:`);
    console.log(`To: ${to}`);
    console.log(`Value: ${formatEth(value)}`);
    console.log(`Data: ${data}`);
    console.log(`Executed: ${executed}`);
    console.log(`Approvals: ${approvals.toString()} / ${requiredApprovals.toString()}`);
    console.log("Owner approvals:");
    approvalsByOwner.forEach((approved, index) => {
      console.log(`${owners[index]}: ${approved ? "approved" : "not approved"}`);
    });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

