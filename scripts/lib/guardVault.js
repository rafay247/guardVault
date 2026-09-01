import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  Contract,
  ContractFactory,
  formatEther,
  getAddress,
  isAddress,
  JsonRpcProvider,
  parseEther,
  Wallet
} from "ethers";

export const DEFAULT_RPC_URL = "http://127.0.0.1:8545";

export const ANVIL_PRIVATE_KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
];

export function getProvider() {
  return new JsonRpcProvider(process.env.RPC_URL ?? DEFAULT_RPC_URL);
}

export function getSigner(provider = getProvider()) {
  const signerIndex = Number(process.env.SIGNER_INDEX ?? "0");
  const privateKey = process.env.PRIVATE_KEY ?? ANVIL_PRIVATE_KEYS[signerIndex];

  if (!privateKey) {
    throw new Error("Missing signer. Set PRIVATE_KEY or choose an Anvil SIGNER_INDEX between 0 and 9.");
  }

  return new Wallet(privateKey, provider);
}

export async function loadGuardVaultArtifact() {
  const artifactPath = resolve(process.cwd(), "artifacts/contracts/GuardVault.sol/GuardVault.json");

  try {
    const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode
    };
  } catch (error) {
    throw new Error(`Could not load GuardVault artifact at ${artifactPath}. Run: npm run compile`);
  }
}

export async function getGuardVault(address, runner) {
  const { abi } = await loadGuardVaultArtifact();
  return new Contract(requireAddress(address, "GuardVault address"), abi, runner);
}

export async function getGuardVaultFactory(signer) {
  const { abi, bytecode } = await loadGuardVaultArtifact();
  return new ContractFactory(abi, bytecode, signer);
}

export function getArgument(args, index, envName, label, fallback) {
  const value = args[index] ?? process.env[envName] ?? fallback;

  if (value === undefined || value === "") {
    throw new Error(`Missing ${label}. Pass it as an argument or set ${envName}.`);
  }

  return value;
}

export function getOptionalArgument(args, index, envName, fallback) {
  return args[index] ?? process.env[envName] ?? fallback;
}

export function requireAddress(value, label) {
  if (!value || !isAddress(value)) {
    throw new Error(`Invalid ${label}: ${value ?? "<empty>"}`);
  }

  return getAddress(value);
}

export function parseEthAmount(value, label = "ETH amount") {
  try {
    return parseEther(String(value));
  } catch (error) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

export function parseTxId(value) {
  if (!/^\d+$/.test(String(value))) {
    throw new Error(`Invalid transaction id: ${value}`);
  }

  return BigInt(value);
}

export function parseData(value = "0x") {
  if (!String(value).startsWith("0x")) {
    throw new Error("Transaction data must be hex and start with 0x.");
  }

  return value;
}

export function defaultOwnerAddresses(count = 3) {
  if (count < 1 || count > ANVIL_PRIVATE_KEYS.length) {
    throw new Error(`OWNER_COUNT must be between 1 and ${ANVIL_PRIVATE_KEYS.length}.`);
  }

  return ANVIL_PRIVATE_KEYS.slice(0, count).map((privateKey) => new Wallet(privateKey).address);
}

export function parseOwnerAddresses() {
  if (process.env.OWNER_ADDRESSES) {
    return process.env.OWNER_ADDRESSES.split(",")
      .map((owner) => owner.trim())
      .filter(Boolean)
      .map((owner) => requireAddress(owner, "owner address"));
  }

  return defaultOwnerAddresses(Number(process.env.OWNER_COUNT ?? "3"));
}

export async function waitForTransaction(transaction) {
  console.log(`Transaction hash: ${transaction.hash}`);
  const receipt = await transaction.wait();
  console.log(`Mined in block: ${receipt.blockNumber}`);
  return receipt;
}

export async function printConnection(signerOrProvider) {
  const provider = signerOrProvider.provider ?? signerOrProvider;
  const network = await provider.getNetwork();

  console.log(`Network: chain ${network.chainId}`);

  if (signerOrProvider.address) {
    console.log(`Signer: ${signerOrProvider.address}`);
  }
}

export function formatEth(value) {
  return `${formatEther(value)} ETH`;
}
