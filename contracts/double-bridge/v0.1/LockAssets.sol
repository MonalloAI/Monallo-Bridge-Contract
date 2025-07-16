// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SepoliaBridge is Ownable {
    uint256 public feeRate = 8; // 0.8% => 8 / 1000
    uint256 public totalFeesCollected; // 累积的费用

    // 防止重复解锁的映射
    mapping(bytes32 => bool) public processedUnlockTx;

    // 锁定事件
    event Locked(address indexed sender, address indexed receiver, uint256 amount, uint256 fee, bytes32 crosschainHash);
    // 解锁事件
    event Unlocked(address indexed recipient, uint256 amount, bytes32 crosschainHash);
    // 费用提取事件
    event FeesWithdrawn(address indexed recipient, uint256 amount);

    constructor() Ownable(msg.sender) {} // 部署者成为 owner

    // 用户调用此函数在 Sepolia 链上锁定 ETH
    function lock(address imuaRecipient) external payable {
        require(msg.value > 0, "No eth sent");

        uint256 fee = (msg.value * feeRate) / 1000; // 手续费
        uint256 amountAfterFee = msg.value - fee; // 实际用于跨链铸币的金额

        // 将费用累加到合约内部
        totalFeesCollected += fee;

        // 生成一个唯一的 crosschainHash
        // 组合了发送者、接收者、实际金额、当前时间戳、当前区块号和 SepoliaBridge 地址
        bytes32 uniqueHash = keccak256(abi.encodePacked(msg.sender, imuaRecipient, amountAfterFee, block.timestamp, block.number, address(this)));

        // 发出带有 crosschainHash 的 Locked 事件
        emit Locked(msg.sender, imuaRecipient, amountAfterFee, fee, uniqueHash);
    }

    //  Imua 链上的销毁事件解锁 ETH
    function unlock(address recipient, uint256 amount, bytes32 crosschainHash) external onlyOwner { // 暂时用 onlyOwner，实际应是 RELAYER_ROLE
        require(!processedUnlockTx[crosschainHash], "Cross-chain hash already processed for unlock");
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient contract balance to unlock"); // 确保合约有足够的 ETH

        processedUnlockTx[crosschainHash] = true; // 标记此跨链哈希已处理

        // 将 ETH 转账给接收者
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "ETH unlock failed");

        emit Unlocked(recipient, amount, crosschainHash);
    }

    // 允许 owner 提取累积的费用
    function withdrawFees() external onlyOwner {
        require(totalFeesCollected > 0, "No fees to withdraw");

        uint256 amountToWithdraw = totalFeesCollected;
        totalFeesCollected = 0; // 重置累积费用

        // 将费用转账给 owner
        (bool success, ) = payable(owner()).call{value: amountToWithdraw}("");
        require(success, "Fee withdrawal failed");

        emit FeesWithdrawn(owner(), amountToWithdraw);
    }

    // 接收 ETH 的 fallback/receive 函数，允许用户直接发送 ETH 到此合约
    receive() external payable {
        // 可以选择在这里拒绝，或者允许直接接收，但通常建议通过 lock 函数
        revert("Call lock function to deposit ETH");
    }
}
