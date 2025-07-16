// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MintTokens is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    mapping(bytes32 => bool) public processedTx; // 用于铸币

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender); // 授予部署者 MINTER_ROLE
    }

    function mint(address recipient, uint256 amount, bytes32 txHash) public onlyRole(MINTER_ROLE) {
        require(!processedTx[txHash], "Transaction hash already processed");
        processedTx[txHash] = true;
        _mint(recipient, amount);
    }

    // 允许被授权的地址（例如 BurnManager）销毁指定账户的代币
    function burnFrom(address account, uint256 amount) public virtual {
        // 检查调用者（msg.sender，即 BurnManager）是否被 'account' 授权了足够的金额
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");

        // 减少授权金额
        _approve(account, msg.sender, currentAllowance - amount);

        // 执行销毁
        _burn(account, amount);
    }
}
