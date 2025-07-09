// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Token is ERC20, AccessControl {
    // 定义 MINTER_ROLE
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // 记录已处理的跨链交易哈希，防止重复铸币
    mapping(bytes32 => bool) private processedCrossChainHashes;

    // 新增事件，用于记录铸币操作，包含跨链哈希
    event MintedFromCrossChain(
        address indexed to,
        uint256 amount,
        bytes32 indexed crossChainHash, // 对应A链的dataHash
        address indexed minter          // 执行铸币操作的地址
    );

    constructor(uint256 initialSupply) ERC20("M-token", "M") {
        // 部署者默认拥有 DEFAULT_ADMIN_ROLE，可以管理其他角色
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // 初始铸币给部署者
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev 铸造新代币。只有拥有 MINTER_ROLE 的账户才能调用此函数。
     * @param to 接收代币的地址。
     * @param amount 要铸造的代币数量（以代币的最小单位计）。
     * @param crossChainHash 来自A链的唯一数据哈希，用于防止重复铸币。
     */
    function mint(address to, uint256 amount, bytes32 crossChainHash) public onlyRole(MINTER_ROLE) {
        require(!processedCrossChainHashes[crossChainHash], "Cross-chain hash already processed");
        require(to != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than zero");

        processedCrossChainHashes[crossChainHash] = true; // 标记为已处理
        _mint(to, amount);

        emit MintedFromCrossChain(to, amount, crossChainHash, msg.sender);
    }

    /**
     * @dev 查询某个跨链哈希是否已被处理（即是否已为其铸币）。
     * @param crossChainHash 要查询的哈希。
     * @return 如果哈希已被处理，则返回 true；否则返回 false。
     */
    function isCrossChainHashProcessed(bytes32 crossChainHash) public view returns (bool) {
        return processedCrossChainHashes[crossChainHash];
    }

    // AccessControl 提供了 grantRole, revokeRole, hasRole 等函数，
    // 它们可以被 DEFAULT_ADMIN_ROLE 的账户调用来管理 MINTER_ROLE。
}

