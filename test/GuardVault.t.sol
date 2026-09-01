// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {GuardVault} from "../contracts/GuardVault.sol";

interface Vm {
    function deal(address account, uint256 newBalance) external;
    function expectRevert(bytes calldata revertData) external;
    function expectRevert(bytes4 revertData) external;
    function prank(address sender) external;
    function startPrank(address sender) external;
    function stopPrank() external;
}

contract GuardVaultTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    GuardVault private vault;

    address private owner1 = address(0xA11CE);
    address private owner2 = address(0xB0B);
    address private owner3 = address(0xCA11);
    address private recipient = address(0xDAD);
    address private stranger = address(0xBAD);

    function setUp() public {
        vault = new GuardVault(_owners(), 2);
    }

    function testDeploymentStoresOwnersAndRequiredApprovals() public view {
        address[] memory owners = vault.getOwners();

        _assertEq(owners.length, 3, "owner count");
        _assertEq(owners[0], owner1, "owner 1");
        _assertEq(owners[1], owner2, "owner 2");
        _assertEq(owners[2], owner3, "owner 3");
        _assertEq(vault.requiredApprovals(), 2, "required approvals");
        _assertTrue(vault.isOwner(owner1), "owner1 allowed");
        _assertTrue(vault.isOwner(owner2), "owner2 allowed");
        _assertTrue(vault.isOwner(owner3), "owner3 allowed");
        _assertFalse(vault.isOwner(stranger), "stranger blocked");
    }

    function testConstructorRejectsInvalidInputs() public {
        address[] memory emptyOwners = new address[](0);
        vm.expectRevert(GuardVault.OwnersRequired.selector);
        new GuardVault(emptyOwners, 1);

        address[] memory owners = _owners();
        vm.expectRevert(abi.encodeWithSelector(GuardVault.InvalidRequiredApprovals.selector, owners.length, 0));
        new GuardVault(owners, 0);

        vm.expectRevert(abi.encodeWithSelector(GuardVault.InvalidRequiredApprovals.selector, owners.length, 4));
        new GuardVault(owners, 4);

        address[] memory ownersWithZero = _owners();
        ownersWithZero[1] = address(0);
        vm.expectRevert(abi.encodeWithSelector(GuardVault.InvalidOwner.selector, address(0)));
        new GuardVault(ownersWithZero, 2);

        address[] memory ownersWithDuplicate = _owners();
        ownersWithDuplicate[2] = owner1;
        vm.expectRevert(abi.encodeWithSelector(GuardVault.DuplicateOwner.selector, owner1));
        new GuardVault(ownersWithDuplicate, 2);
    }

    function testWalletReceivesEth() public {
        uint256 amount = 1 ether;

        _fund(stranger, amount);

        _assertEq(address(vault).balance, amount, "vault balance");
    }

    function testOwnerCanSubmitTransaction() public {
        uint256 txId = _submitTransaction(owner1, recipient, 1 ether, "");

        _assertEq(txId, 0, "tx id");
        _assertEq(vault.getTransactionCount(), 1, "transaction count");

        (address to, uint256 value, bytes memory data, bool executed, uint256 approvals) = vault.getTransaction(txId);

        _assertEq(to, recipient, "recipient");
        _assertEq(value, 1 ether, "value");
        _assertEq(keccak256(data), keccak256(bytes("")), "data");
        _assertFalse(executed, "not executed");
        _assertEq(approvals, 0, "approvals");
    }

    function testNonOwnerCannotSubmitTransaction() public {
        vm.startPrank(stranger);
        vm.expectRevert(abi.encodeWithSelector(GuardVault.NotOwner.selector, stranger));
        vault.submitTransaction(recipient, 1 ether, "");
        vm.stopPrank();
    }

    function testOwnerCanApproveTransaction() public {
        uint256 txId = _submitTransaction(owner1, recipient, 1 ether, "");

        _approve(owner1, txId);

        _assertTrue(vault.hasApproved(txId, owner1), "owner approved");
        _assertEq(_approvalCount(txId), 1, "approval count");
    }

    function testNonOwnerCannotApproveTransaction() public {
        uint256 txId = _submitTransaction(owner1, recipient, 1 ether, "");

        vm.startPrank(stranger);
        vm.expectRevert(abi.encodeWithSelector(GuardVault.NotOwner.selector, stranger));
        vault.approveTransaction(txId);
        vm.stopPrank();
    }

    function testOwnerCannotApproveSameTransactionTwice() public {
        uint256 txId = _submitTransaction(owner1, recipient, 1 ether, "");

        _approve(owner1, txId);

        vm.startPrank(owner1);
        vm.expectRevert(abi.encodeWithSelector(GuardVault.TransactionAlreadyApproved.selector, txId, owner1));
        vault.approveTransaction(txId);
        vm.stopPrank();
    }

    function testCannotExecuteBeforeRequiredApprovals() public {
        _fund(stranger, 2 ether);
        uint256 txId = _submitTransaction(owner1, recipient, 1 ether, "");
        _approve(owner1, txId);

        vm.expectRevert(abi.encodeWithSelector(GuardVault.NotEnoughApprovals.selector, txId, 1, 2));
        vault.executeTransaction(txId);
    }

    function testExecutesAfterRequiredApprovals() public {
        _fund(stranger, 2 ether);
        uint256 txId = _submitTransaction(owner1, recipient, 1 ether, "");
        _approve(owner1, txId);
        _approve(owner2, txId);

        uint256 recipientBalanceBefore = recipient.balance;

        vault.executeTransaction(txId);

        _assertEq(recipient.balance, recipientBalanceBefore + 1 ether, "recipient balance");
        _assertTrue(_isExecuted(txId), "executed");
        _assertEq(_approvalCount(txId), 2, "approval count");
        _assertEq(address(vault).balance, 1 ether, "remaining vault balance");

        vm.expectRevert(abi.encodeWithSelector(GuardVault.TransactionAlreadyExecuted.selector, txId));
        vault.executeTransaction(txId);
    }

    function testOwnerCanRevokeApproval() public {
        uint256 txId = _submitTransaction(owner1, recipient, 1 ether, "");
        _approve(owner1, txId);

        vm.prank(owner1);
        vault.revokeApproval(txId);

        _assertFalse(vault.hasApproved(txId, owner1), "owner approval revoked");
        _assertEq(_approvalCount(txId), 0, "approval count");
    }

    function testCannotRevokeWithoutExistingApproval() public {
        uint256 txId = _submitTransaction(owner1, recipient, 1 ether, "");

        vm.startPrank(owner1);
        vm.expectRevert(abi.encodeWithSelector(GuardVault.TransactionNotApproved.selector, txId, owner1));
        vault.revokeApproval(txId);
        vm.stopPrank();
    }

    function _owners() private view returns (address[] memory owners) {
        owners = new address[](3);
        owners[0] = owner1;
        owners[1] = owner2;
        owners[2] = owner3;
    }

    function _submitTransaction(address submitter, address to, uint256 value, bytes memory data)
        private
        returns (uint256)
    {
        vm.prank(submitter);
        return vault.submitTransaction(to, value, data);
    }

    function _approve(address approver, uint256 txId) private {
        vm.prank(approver);
        vault.approveTransaction(txId);
    }

    function _fund(address sender, uint256 amount) private {
        vm.deal(sender, amount + 1 ether);
        vm.prank(sender);

        (bool success,) = payable(address(vault)).call{value: amount}("");
        _assertTrue(success, "funding success");
    }

    function _isExecuted(uint256 txId) private view returns (bool executed) {
        (,,, executed,) = vault.getTransaction(txId);
    }

    function _approvalCount(uint256 txId) private view returns (uint256 approvals) {
        (,,,, approvals) = vault.getTransaction(txId);
    }

    function _assertTrue(bool actual, string memory message) private pure {
        require(actual, message);
    }

    function _assertFalse(bool actual, string memory message) private pure {
        require(!actual, message);
    }

    function _assertEq(address actual, address expected, string memory message) private pure {
        require(actual == expected, message);
    }

    function _assertEq(uint256 actual, uint256 expected, string memory message) private pure {
        require(actual == expected, message);
    }

    function _assertEq(bytes32 actual, bytes32 expected, string memory message) private pure {
        require(actual == expected, message);
    }
}

