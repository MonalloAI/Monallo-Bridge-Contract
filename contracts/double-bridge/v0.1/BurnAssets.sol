// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMintTokens {
    function burnFrom(address account, uint256 amount) external; 
}

contract BurnManager is Ownable {
    IMintTokens public immutable token; // maoETH 代币合约地址

    event Burned(address indexed burner, uint256 amount, address indexed sepoliaRecipient, bytes32 crosschainHash);

    constructor(address _tokenAddress) Ownable(msg.sender) {
        require(_tokenAddress != address(0), "Token address cannot be zero");
        token = IMintTokens(_tokenAddress);
    }

    function burnCrossChain(uint256 amount, address sepoliaRecipient) external {
        require(amount > 0, "Amount must be greater than 0");
        token.burnFrom(msg.sender, amount);
        bytes32 uniqueBurnHash = keccak256(abi.encodePacked(msg.sender, amount, sepoliaRecipient, block.timestamp, block.number, address(this)));
        emit Burned(msg.sender, amount, sepoliaRecipient, uniqueBurnHash);
    }
}
