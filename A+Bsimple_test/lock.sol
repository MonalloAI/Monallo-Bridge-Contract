// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LockContract {
    // 锁定事件
    event Locked(address indexed user, uint256 amount, string memo);
    
    // 模拟锁定函数
    function lockTokens(uint256 amount, string memory memo) public {
        emit Locked(msg.sender, amount, memo);
    }
    
    // 获取合约地址（用于测试）
    function getAddress() public view returns (address) {
        return address(this);
    }
}
