// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MintContract {
    mapping(address => uint256) public balances;
    
    // 模拟铸造函数
    function mintTokens(address recipient, uint256 amount) public {
        balances[recipient] += amount;
    }
    
    // 查询余额
    function getBalance(address user) public view returns (uint256) {
        return balances[user];
    }
    
    // 获取合约地址（用于测试）
    function getAddress() public view returns (address) {
        return address(this);
    }
}
