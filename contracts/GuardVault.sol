// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title GuardVault
/// @notice Basic N-of-M multi-signature wallet for holding and moving ETH.
contract GuardVault {
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 approvals;
    }

    error OwnersRequired();
    error InvalidOwner(address owner);
    error DuplicateOwner(address owner);
    error InvalidRequiredApprovals(uint256 ownerCount, uint256 requiredApprovals);
    error NotOwner(address account);
    error InvalidRecipient();
    error TransactionDoesNotExist(uint256 txId);
    error TransactionAlreadyExecuted(uint256 txId);
    error TransactionAlreadyApproved(uint256 txId, address owner);
    error TransactionNotApproved(uint256 txId, address owner);
    error NotEnoughApprovals(uint256 txId, uint256 approvals, uint256 requiredApprovals);
    error TransactionExecutionFailed(uint256 txId);

    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(address indexed owner, uint256 indexed txId, address indexed to, uint256 value, bytes data);
    event ApproveTransaction(address indexed owner, uint256 indexed txId);
    event RevokeApproval(address indexed owner, uint256 indexed txId);
    event ExecuteTransaction(address indexed executor, uint256 indexed txId);

    address[] private s_owners;
    Transaction[] private s_transactions;
    mapping(uint256 txId => mapping(address owner => bool approved)) private s_hasApproved;

    mapping(address owner => bool allowed) public isOwner;
    uint256 public immutable requiredApprovals;

    modifier onlyOwner() {
        if (!isOwner[msg.sender]) {
            revert NotOwner(msg.sender);
        }
        _;
    }

    modifier transactionExists(uint256 txId) {
        if (txId >= s_transactions.length) {
            revert TransactionDoesNotExist(txId);
        }
        _;
    }

    modifier notExecuted(uint256 txId) {
        if (s_transactions[txId].executed) {
            revert TransactionAlreadyExecuted(txId);
        }
        _;
    }

    constructor(address[] memory owners, uint256 requiredApprovals_) payable {
        if (owners.length == 0) {
            revert OwnersRequired();
        }

        if (requiredApprovals_ == 0 || requiredApprovals_ > owners.length) {
            revert InvalidRequiredApprovals(owners.length, requiredApprovals_);
        }

        for (uint256 i = 0; i < owners.length; i++) {
            address owner = owners[i];

            if (owner == address(0)) {
                revert InvalidOwner(owner);
            }

            if (isOwner[owner]) {
                revert DuplicateOwner(owner);
            }

            isOwner[owner] = true;
            s_owners.push(owner);
        }

        requiredApprovals = requiredApprovals_;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    fallback() external payable {
        if (msg.value > 0) {
            emit Deposit(msg.sender, msg.value, address(this).balance);
        }
    }

    function submitTransaction(address to, uint256 value, bytes calldata data)
        external
        onlyOwner
        returns (uint256 txId)
    {
        if (to == address(0)) {
            revert InvalidRecipient();
        }

        txId = s_transactions.length;
        s_transactions.push(Transaction({to: to, value: value, data: data, executed: false, approvals: 0}));

        emit SubmitTransaction(msg.sender, txId, to, value, data);
    }

    function approveTransaction(uint256 txId) external onlyOwner transactionExists(txId) notExecuted(txId) {
        if (s_hasApproved[txId][msg.sender]) {
            revert TransactionAlreadyApproved(txId, msg.sender);
        }

        s_hasApproved[txId][msg.sender] = true;
        s_transactions[txId].approvals++;

        emit ApproveTransaction(msg.sender, txId);
    }

    function revokeApproval(uint256 txId) external onlyOwner transactionExists(txId) notExecuted(txId) {
        if (!s_hasApproved[txId][msg.sender]) {
            revert TransactionNotApproved(txId, msg.sender);
        }

        s_hasApproved[txId][msg.sender] = false;
        s_transactions[txId].approvals--;

        emit RevokeApproval(msg.sender, txId);
    }

    function executeTransaction(uint256 txId) external transactionExists(txId) notExecuted(txId) {
        Transaction storage transaction = s_transactions[txId];

        if (transaction.approvals < requiredApprovals) {
            revert NotEnoughApprovals(txId, transaction.approvals, requiredApprovals);
        }

        transaction.executed = true;

        (bool success,) = transaction.to.call{value: transaction.value}(transaction.data);
        if (!success) {
            revert TransactionExecutionFailed(txId);
        }

        emit ExecuteTransaction(msg.sender, txId);
    }

    function getOwners() external view returns (address[] memory) {
        return s_owners;
    }

    function getTransactionCount() external view returns (uint256) {
        return s_transactions.length;
    }

    function getTransaction(uint256 txId)
        external
        view
        transactionExists(txId)
        returns (address to, uint256 value, bytes memory data, bool executed, uint256 approvals)
    {
        Transaction storage transaction = s_transactions[txId];

        return (transaction.to, transaction.value, transaction.data, transaction.executed, transaction.approvals);
    }

    function hasApproved(uint256 txId, address owner) external view transactionExists(txId) returns (bool) {
        return s_hasApproved[txId][owner];
    }
}
