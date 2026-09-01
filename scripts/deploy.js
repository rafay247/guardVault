import {
  formatEth,
  getGuardVaultFactory,
  getProvider,
  getSigner,
  parseEthAmount,
  parseOwnerAddresses,
  printConnection
} from "./lib/guardVault.js";

async function main() {
  const provider = getProvider();
  const signer = getSigner(provider);
  const owners = parseOwnerAddresses();
  const requiredApprovals = BigInt(process.env.REQUIRED_APPROVALS ?? "2");
  const initialFunding = parseEthAmount(process.env.INITIAL_FUNDING_ETH ?? "0", "initial funding");

  await printConnection(signer);

  const factory = await getGuardVaultFactory(signer);
  const vault = await factory.deploy(owners, requiredApprovals, { value: initialFunding });

  await vault.waitForDeployment();

  console.log(`GuardVault deployed: ${await vault.getAddress()}`);
  console.log(`Required approvals: ${requiredApprovals.toString()} of ${owners.length}`);
  console.log(`Initial funding: ${formatEth(initialFunding)}`);
  console.log("Owners:");
  owners.forEach((owner, index) => console.log(`${index}: ${owner}`));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

