# GuardVault - Multi-Signature Wallet

GuardVault is a basic multi-signature wallet dApp. It holds ETH in a smart contract and only executes outgoing transactions after enough wallet owners approve them.

## Problem It Solves

A normal crypto wallet can lose all funds if one private key is stolen. GuardVault removes that single point of failure by requiring N-of-M approvals.

Example: in a 2-of-3 wallet, any 2 owners must approve before funds can move.

## Tech Stack

- Solidity
- Hardhat
- Foundry
- Anvil
- Ethers.js
- React
- Vite
- MetaMask

## Features

- Deploy a wallet with multiple owners
- Set required approval count
- Receive ETH deposits
- Submit outgoing ETH transactions
- Approve transactions as an owner
- Revoke approval before execution
- Execute only after enough approvals
- View vault balance, owners, transaction status, and approvals
- Test contract behavior with Foundry
- Interact locally with Ethers.js scripts

## Project Structure

```text
contracts/
  GuardVault.sol

test/
  GuardVault.t.sol

scripts/
  deploy.js
  fund.js
  submitTransaction.js
  approveTransaction.js
  revokeApproval.js
  executeTransaction.js
  status.js

src/
  App.jsx
  contract.js
  main.jsx
  styles.css
```

## Install

```bash
npm install
```

## Compile

```bash
npm run compile
npm run compile:foundry
```

## Test

```bash
npm test
```

Expected result:

```text
12 tests passed
```

## Run Local Blockchain

Start Anvil in one terminal:

```bash
npm run node
```

Anvil runs at:

```text
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
```

## Deploy Contract

In another terminal:

```bash
npm run deploy
```

Copy the deployed contract address:

```text
GuardVault deployed: 0x...
```

## Script Testing Flow

Set the deployed vault address:

```bash
VAULT=0xYourDeployedVaultAddress
```

Fund the vault:

```bash
npm run fund -- $VAULT 2
```

Submit a transaction:

```bash
npm run submit -- $VAULT 0x90F79bf6EB2c4f870365E785982E1f101E93b906 0.5
```

Approve with owner 1:

```bash
npm run approve -- $VAULT 0
```

Approve with owner 2:

```bash
SIGNER_INDEX=1 npm run approve -- $VAULT 0
```

Execute the transaction:

```bash
npm run execute -- $VAULT 0
```

Check status:

```bash
npm run status -- $VAULT 0
```

Expected result:

```text
Executed: true
Approvals: 2 / 2
```

## Frontend

Start the React app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

Frontend flow:

1. Connect MetaMask.
2. Switch to Anvil network.
3. Paste the deployed GuardVault contract address.
4. Click `Load`.
5. Click `Refresh`.
6. Deposit ETH into the vault.
7. Submit a transaction.
8. Approve from 2 owners.
9. Execute after approvals reach `2 / 2`.

## Local MetaMask Accounts

Use these only on local Anvil. Never use them with real funds.

Owner 1:

```text
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Owner 2:

```text
0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

Owner 3:

```text
0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

## Main Contract Functions

- `submitTransaction(address to, uint256 value, bytes data)`
- `approveTransaction(uint256 txId)`
- `revokeApproval(uint256 txId)`
- `executeTransaction(uint256 txId)`
- `getOwners()`
- `getTransaction(uint256 txId)`
- `getTransactionCount()`
- `hasApproved(uint256 txId, address owner)`

## Resume Summary

Built GuardVault, a Solidity multi-signature wallet requiring N-of-M owner approvals before executing ETH transactions. Implemented owner access control, transaction submission, approval revocation, execution thresholds, Foundry tests, Ethers.js scripts, and a React/MetaMask frontend dashboard.
