// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {

    // TestToken是代币名称 ttoken是代币简写  
    constructor(uint initialSupply) ERC20("TestToken","ttoken") {
        _mint(msg.sender, initialSupply  * 10 ** decimals());
    }

}

