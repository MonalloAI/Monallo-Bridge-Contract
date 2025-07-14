// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MintTokens is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    mapping(bytes32 => bool) public processedTx; // 用于铸币
    mapping(bytes32 => bool) public processedBurnTx; // 用于防止重复销毁/解锁的映射

    event Burned(address indexed burner, uint256 amount, address indexed sepoliaRecipient, bytes32 crosschainHash);

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender); // 授予部署者 MINTER_ROLE，运营方将使用此角色
    }

    function mint(address recipient, uint256 amount, bytes32 txHash) public onlyRole(MINTER_ROLE) {
        require(!processedTx[txHash], "Transaction hash already processed");
        processedTx[txHash] = true;
        _mint(recipient, amount);
    }

    // 新增：由桥运营者代为销毁用户的 maoETH
    // 只有拥有 MINTER_ROLE 的地址才能调用此函数 (假设运营者同时是 Minter)
    // 用户需要先调用 approve 授权给 msg.sender (运营者地址)
    function burnFromOperator(address from, uint256 amount, address sepoliaRecipient) public onlyRole(MINTER_ROLE) {
        require(amount > 0, "Amount must be greater than 0");
        // 检查调用者（msg.sender，即运营者）是否有权从 'from' 地址销毁 'amount' 数量的代币
        // 这会内部调用 _approve 和 _spendAllowance，并检查 allowance 是否足够
        _spendAllowance(from, msg.sender, amount); // OpenZeppelin ERC20 内部函数，检查并扣除 allowance
        _burn(from, amount); // 从 'from' 地址销毁代币

        // 生成一个唯一的哈希，用于在 Sepolia 链上防止重复解锁
        // 注意：这里 uniqueBurnHash 仍然包含 'from' 地址，以确保唯一性与用户相关
        bytes32 uniqueBurnHash = keccak256(abi.encodePacked(from, amount, sepoliaRecipient, block.timestamp, block.number, tx.origin));

        // 发出 Burned 事件，链下服务将监听此事件并在 Sepolia 链上触发解锁
        // 事件中的 burner 仍然是实际销毁代币的用户 'from'
        emit Burned(from, amount, sepoliaRecipient, uniqueBurnHash);
    }

    // AccessControl 提供了以下函数，由 DEFAULT_ADMIN_ROLE 调用：
    // function grantRole(bytes32 role, address account) public virtual onlyRole(DEFAULT_ADMIN_ROLE)
    // function revokeRole(bytes32 role, address account) public virtual onlyRole(DEFAULT_ADMIN_ROLE)
    // function renounceRole(bytes32 role, address account) public virtual
    // function hasRole(bytes32 role, address account) public view virtual returns (bool)
}
