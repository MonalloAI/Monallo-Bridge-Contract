// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19; 

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MintTokens is ERC20, AccessControl { 
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    mapping(bytes32 => bool) public processedTx;

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        // 授予部署者 DEFAULT_ADMIN_ROLE，以便管理其他角色
        // AccessControl 的 DEFAULT_ADMIN_ROLE 相当于 Ownable 的 owner
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // 授予部署者 MINTER_ROLE，以便他也能铸币 (可选)
        _grantRole(MINTER_ROLE, msg.sender);
    }

    // 如果你需要可升级性，并且之前使用了 onlyOwner，现在应该使用 onlyRole(DEFAULT_ADMIN_ROLE)
    // function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function mint(address recipient, uint256 amount, bytes32 txHash) public onlyRole(MINTER_ROLE) {
        require(!processedTx[txHash], "Transaction hash already processed");
        processedTx[txHash] = true;
        _mint(recipient, amount);
    }

    // AccessControl 提供了以下函数，由 DEFAULT_ADMIN_ROLE 调用：
    // function grantRole(bytes32 role, address account) public virtual onlyRole(DEFAULT_ADMIN_ROLE)
    // function revokeRole(bytes32 role, address account) public virtual onlyRole(DEFAULT_ADMIN_ROLE)
    // function renounceRole(bytes32 role, address account) public virtual
    // function hasRole(bytes32 role, address account) public view virtual returns (bool)
} 
