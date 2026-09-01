import { BrowserProvider, Contract, formatEther, isAddress, parseEther } from "ethers";

export const GUARDVAULT_ABI = [
  "function approveTransaction(uint256 txId)",
  "function executeTransaction(uint256 txId)",
  "function getOwners() view returns (address[])",
  "function getTransaction(uint256 txId) view returns (address to, uint256 value, bytes data, bool executed, uint256 approvals)",
  "function getTransactionCount() view returns (uint256)",
  "function hasApproved(uint256 txId, address owner) view returns (bool)",
  "function isOwner(address owner) view returns (bool)",
  "function requiredApprovals() view returns (uint256)",
  "function revokeApproval(uint256 txId)",
  "function submitTransaction(address to, uint256 value, bytes data) returns (uint256)"
];

export const LOCAL_CHAIN = {
  id: 31337n,
  hexId: "0x7a69",
  name: "Anvil Localhost",
  rpcUrl: "http://127.0.0.1:8545",
  currency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  }
};

const VAULT_ADDRESS_KEY = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export function getInitialVaultAddress() {
  const envAddress = import.meta.env.VITE_GUARDVAULT_ADDRESS;

  if (isAddress(envAddress ?? "")) {
    return envAddress;
  }

  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(VAULT_ADDRESS_KEY) ?? "";
}

export function saveVaultAddress(address) {
  window.localStorage.setItem(VAULT_ADDRESS_KEY, address);
}

export function getInjectedProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not available.");
  }

  return new BrowserProvider(window.ethereum);
}

export async function getVaultContract(address, runner) {
  if (!isAddress(address)) {
    throw new Error("Invalid GuardVault address.");
  }

  return new Contract(address, GUARDVAULT_ABI, runner);
}

export async function switchToLocalChain() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not available.");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: LOCAL_CHAIN.hexId }]
    });
  } catch (error) {
    if (error.code !== 4902) {
      throw error;
    }

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: LOCAL_CHAIN.hexId,
          chainName: LOCAL_CHAIN.name,
          rpcUrls: [LOCAL_CHAIN.rpcUrl],
          nativeCurrency: LOCAL_CHAIN.currency
        }
      ]
    });
  }
}

export function shortenAddress(address) {
  if (!address) {
    return "";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatEth(value) {
  return `${trimDecimals(formatEther(value))} ETH`;
}

export function parseEth(value) {
  return parseEther(String(value || "0"));
}

export function normalizeData(value) {
  const data = String(value || "0x").trim();

  if (!data.startsWith("0x")) {
    throw new Error("Data must start with 0x.");
  }

  return data;
}

export function trimDecimals(value) {
  if (!value.includes(".")) {
    return value;
  }

  return value.replace(/(\.\d{1,6})\d+$/, "$1").replace(/\.0+$/, ".0");
}

export function isSameAddress(left, right) {
  return String(left).toLowerCase() === String(right).toLowerCase();
}

