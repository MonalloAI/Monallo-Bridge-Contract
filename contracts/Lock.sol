// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19; // 建议更新到 0.8.20 或更高，与 hardhat.config.js 保持一致

contract LockTokens {
    address public owner;
    uint256 public feeRate = 8; // 0.8% => 8 / 1000
    uint256 public totalFeesCollected; // 累积的费用

    // 防止重复铸币
    event Locked(address indexed sender, address indexed receiver, uint256 amount, uint256 fee, bytes32 crosschainHash);
    // 费用提取事件
    event FeesWithdrawn(address indexed recipient, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    function lock(address receiver) external payable {
        require(msg.value > 0, "No imua sent");

        uint256 fee = (msg.value * feeRate) / 1000;
        uint256 amountAfterFee = msg.value - fee;

        // 将费用累加到合约内部，而不是立即转账
        totalFeesCollected += fee;

        // 生成一个唯一的 crosschainHash
        // 组合了发送者、接收者、实际金额、当前时间戳、当前区块号和原始交易发起者
        bytes32 uniqueHash = keccak256(abi.encodePacked(msg.sender, receiver, amountAfterFee, block.timestamp, block.number, tx.origin));

        // 发出带有 crosschainHash 的 Locked 事件
        emit Locked(msg.sender, receiver, amountAfterFee, fee, uniqueHash);
    }

    // 允许 owner 提取累积的费用
    function withdrawFees() external {
        require(msg.sender == owner, "Only owner can withdraw fees");
        require(totalFeesCollected > 0, "No fees to withdraw");

        uint256 amountToWithdraw = totalFeesCollected;
        totalFeesCollected = 0; // 重置累积费用

        // 使用 call 替代 transfer，更灵活，并检查成功
        (bool success, ) = payable(msg.sender).call{value: amountToWithdraw}("");
        require(success, "Fee withdrawal failed");

        emit FeesWithdrawn(msg.sender, amountToWithdraw);
    }

    // 如果需要，可以动态修改收取的手续费比例
    // function setFeeRate(uint256 _newFeeRate) external {
    //     require(msg.sender == owner, "Only owner can set fee rate");
    //     require(_newFeeRate <= 100, "Fee rate too high (max 10%)"); // 例如，限制最高10%
    //     feeRate = _newFeeRate;
    // }
}
