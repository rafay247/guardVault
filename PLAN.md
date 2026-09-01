# GuardVault - Multi-Signature Wallet Plan

## Project Idea

GuardVault is a multi-signature crypto wallet. It protects funds by requiring approval from multiple trusted signers before any transaction can move money.

In simple words: one person alone cannot send funds. A transaction only happens when enough approved signers agree.

Example:

- There are 3 wallet owners.
- The wallet requires 2 approvals.
- If one owner creates a transaction, at least one more owner must approve it before it can be executed.

## Problem It Solves

Normal crypto wallets have one major risk: if one private key is stolen, all funds can be lost.

GuardVault reduces that risk by removing the single point of failure. It is useful for teams, DAOs, startup treasuries, and shared funds where money should not depend on only one person.

## Basic Tech Stack

- Solidity
- Hardhat
- Foundry
- Anvil
- Ethers.js
- React
- MetaMask

## Phase 1: Smart Contract Foundation

Goal: Build the core GuardVault smart contract.

Tasks:

- Set up the Hardhat and Foundry project.
- Create the `GuardVault.sol` contract.
- Store the list of wallet owners.
- Store the required approval count.
- Allow the contract to receive ETH.
- Add access control so only owners can create and approve transactions.
- Add basic events for deposits, transaction creation, approvals, revokes, and execution.

Main contract features:

- Create a transaction.
- Approve a transaction.
- Revoke approval.
- Execute a transaction after enough approvals.
- View owners, approval count, and transaction details.

## Phase 2: Testing and Local Scripts

Goal: Prove the wallet works correctly on a local blockchain.

Tasks:

- Write Foundry tests for the contract.
- Test wallet deployment with valid owners and approval count.
- Test ETH deposits into GuardVault.
- Test transaction creation by an owner.
- Test that non-owners cannot create or approve transactions.
- Test that one owner cannot approve the same transaction twice.
- Test that transactions cannot execute before enough approvals.
- Test successful execution after the required approvals.
- Test revoke approval behavior.
- Create Ethers.js scripts for local interaction.

Basic scripts:

- Deploy GuardVault.
- Fund GuardVault.
- Submit a transaction.
- Approve a transaction.
- Execute a transaction.
- Check wallet balance and transaction status.

## Phase 3: Basic Frontend dApp

Goal: Build a simple user interface for interacting with GuardVault.

Tasks:

- Set up a React frontend.
- Connect MetaMask.
- Show connected wallet address.
- Show GuardVault balance.
- Show wallet owners.
- Show required approvals.
- Add a form to create a transaction.
- Display pending transactions.
- Add buttons to approve, revoke, and execute transactions.
- Show transaction status as pending or executed.
- Connect the frontend to the smart contract using Ethers.js.

Main frontend screens:

- Connect wallet page.
- Vault dashboard.
- Create transaction form.
- Transaction list with approval and execution controls.

## Final MVP

The final basic version of GuardVault should be a 2-of-3 multi-signature wallet that can:

- hold ETH
- create transactions
- collect owner approvals
- execute transactions only after enough approvals
- show wallet status in a simple frontend

This MVP is enough to demonstrate smart contract security, access control, testing, and frontend blockchain integration.
