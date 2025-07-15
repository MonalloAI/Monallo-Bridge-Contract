// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MintTokens is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    mapping(bytes32 => bool) public processedTx; // 用于铸币
    // processedBurnTx 映射可以移除，因为它只在 LockTokens 中使用 processedUnlockTx
    // 并且在 MintTokens 合约中没有直接使用它来防止重放攻击（因为 crosschainHash 是在函数内部生成的）

    event Burned(address indexed burner, uint256 amount, address indexed sepoliaRecipient, bytes32 crosschainHash);

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender); // 授予部署者 MINTER_ROLE
    }

    function mint(address recipient, uint256 amount, bytes32 txHash) public onlyRole(MINTER_ROLE) {
        require(!processedTx[txHash], "Transaction hash already processed");
        processedTx[txHash] = true;
        _mint(recipient, amount);
    }

    // 重新添加：用户自己销毁 maoETH 代币，并触发跨链解锁事件
    // 用户调用此函数将 maoETH 销毁，并指定在 Sepolia 链上接收 ETH 的地址
    function burn(uint256 amount, address sepoliaRecipient) external {
        require(amount > 0, "Amount must be greater than 0");
        // 从调用者地址销毁指定数量的代币
        _burn(msg.sender, amount);

        // 生成一个唯一的哈希，用于在 Sepolia 链上防止重复解锁
        // 组合了销毁者、销毁数量、Sepolia 接收者、当前时间戳、当前区块号和原始交易发起者
        bytes32 uniqueBurnHash = keccak256(abi.encodePacked(msg.sender, amount, sepoliaRecipient, block.timestamp, block.number, tx.origin));

        // 发出 Burned 事件，链下服务将监听此事件并在 Sepolia 链上触发解锁
        emit Burned(msg.sender, amount, sepoliaRecipient, uniqueBurnHash);
    }


    // AccessControl 提供的函数保持不变
    // function grantRole(bytes32 role, address account) public virtual onlyRole(DEFAULT_ADMIN_ROLE)
    // function revokeRole(bytes32 role, address account) public virtual onlyRole(DEFAULT_ADMIN_ROLE)
    // function renounceRole(bytes32 role, address account) public virtual
    // function hasRole(bytes32 role, address account) public view virtual returns (bool)
}
