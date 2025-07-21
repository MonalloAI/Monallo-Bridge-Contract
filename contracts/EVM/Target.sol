// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts@4.9.3/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts@4.9.3/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts@4.9.3/access/AccessControl.sol";
import "@openzeppelin/contracts@4.9.3/security/Pausable.sol";
import "@openzeppelin/contracts@4.9.3/utils/cryptography/ECDSA.sol";

/**
 * @title Target - Monallo 桥目标链合约
 * @dev 此合约作为跨链资产转移的目标链封装代币。它实现了标准的 ERC20 功能，
 *      并附加了由授权中继器控制的铸造功能和由用户发起的销毁功能。
 * 
 * 关键特性:
 * - 基于角色的访问控制，为中继器设置专用的铸币员(MINTER)角色
 * - 可暂停功能，用于紧急情况下的停机
 * - 交易ID跟踪，防止重放攻击
 * - 对铸币操作进行签名验证，确保安全
 * - 标准化事件，用于跨链通信
 */
contract Target is ERC20, ERC20Burnable, AccessControl, Pausable {
    using ECDSA for bytes32;
    
    // 角色定义
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    // 此封装代币对应的源链ID
    uint256 public immutable sourceChainId;
    
    // 受信任的中继器签名者地址
    address public relayerSigner;
    
    // 映射表，用于跟踪已处理的铸币交易，防止重放攻击
    mapping(bytes32 => bool) public processedMintTxs;
    
    // 用于为销毁操作生成唯一交易ID的计数器
    uint256 private burnTxCounter;
    
    // 用于跨链通信的事件
    event TokensMinted(
        bytes32 indexed transactionId,
        address indexed recipient,
        uint256 amount,
        address indexed minter
    );
    
    event TokensBurned(
        bytes32 indexed transactionId,
        address indexed burner,
        uint256 sourceChainId,
        address recipientAddress,
        uint256 amount
    );
    
    event RelayerSignerUpdated(
        address indexed oldSigner,
        address indexed newSigner,
        address indexed updatedBy
    );
    
    // 自定义错误，以提高Gas效率和可读性
    error InvalidSignature();
    error TransactionAlreadyProcessed();
    error InvalidAmount();
    error InvalidRecipient();
    error SignerCannotBeZero();
    
    /**
     * @dev 构造函数，用名称、符号、源链信息和中继器签名者初始化封装代币
     * @param name_ 封装代币的名称 (例如, "Wrapped Ethereum")
     * @param symbol_ 封装代币的符号 (例如, "WETH")
     * @param sourceChainId_ 原始资产所在的源链ID
     * @param relayerSigner_ 被授权签署铸币交易的地址
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 sourceChainId_,
        address relayerSigner_
    ) ERC20(name_, symbol_) {
        if (relayerSigner_ == address(0)) revert SignerCannotBeZero();
        
        sourceChainId = sourceChainId_;
        relayerSigner = relayerSigner_;
        
        // 将管理员角色授予部署者
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // 初始时将铸币员角色也授予部署者，以便于设置
        _grantRole(MINTER_ROLE, msg.sender);
    }
    
    /**
     * @dev 根据源链锁定的资产，在目标链上铸造封装代币
     * 此函数只能由拥有 MINTER_ROLE 的地址（通常是中继器）调用
     * @param txId 唯一的交易标识符，防止重放攻击
     * @param recipient 接收铸造代币的地址
     * @param amount 要铸造的代币数量
     * @param signature 来自受信任中继器的加密签名
     */
    function mint(
        bytes32 txId,
        address recipient,
        uint256 amount,
        bytes memory signature
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (processedMintTxs[txId]) revert TransactionAlreadyProcessed();
        
        // 构造用于签名验证的消息哈希
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(txId, recipient, amount, address(this)))
            )
        );
        
        // 验证签名是否来自受信任的中继器
        address recoveredSigner = messageHash.recover(signature);
        if (recoveredSigner != relayerSigner) revert InvalidSignature();
        
        // 标记交易为已处理，防止重放
        processedMintTxs[txId] = true;
        
        // 为接收者铸造代币
        _mint(recipient, amount);
        
        // 触发事件以供追踪和验证
        emit TokensMinted(txId, recipient, amount, msg.sender);
    }
    
    /**
     * @dev 销毁封装代币以在源链上启动赎回流程
     * 任何代币持有者都可以调用此函数来赎回其封装代币
     * @param amount 要销毁的代币数量
     * @param recipientOnSource 在源链上接收解锁资产的地址
     */
    function burn(
        uint256 amount,
        address recipientOnSource
    ) public whenNotPaused {
        if (amount == 0) revert InvalidAmount();
        if (recipientOnSource == address(0)) revert InvalidRecipient();
        
        // 为此销毁操作生成唯一的交易ID
        bytes32 burnTxId = keccak256(
            abi.encodePacked(
                block.timestamp,
                msg.sender,
                amount,
                burnTxCounter++,
                block.number
            )
        );
        
        // 从调用者余额中销毁代币
        _burn(msg.sender, amount);
        
        // 触发事件以通知中继器在源链执行解锁操作
        emit TokensBurned(
            burnTxId,
            msg.sender,
            sourceChainId,
            recipientOnSource,
            amount
        );
    }
    
    /**
     * @dev `burn`函数的便捷重载，将资产赎回到调用者在源链的同一地址
     * @param amount 要销毁的代币数量
     */
    function burn(uint256 amount) public override {
        burn(amount, msg.sender);
    }
    
    /**
     * @dev 更新中继器签名者地址（仅限管理员）
     * @param newSigner 新的中继器签名者地址
     */
    function setRelayerSigner(address newSigner) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newSigner == address(0)) revert SignerCannotBeZero();
        
        address oldSigner = relayerSigner;
        relayerSigner = newSigner;
        
        emit RelayerSignerUpdated(oldSigner, newSigner, msg.sender);
    }
    
    /**
     * @dev 暂停所有代币操作（仅限管理员）
     * 用于在紧急情况下停止所有合约功能
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev 解除暂停所有代币操作（仅限管理员）
     * 在紧急暂停后恢复正常的合约功能
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev 覆盖 Solidity 要求的多重继承函数
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev 内部函数，处理代币转移时增加了暂停功能检查
     * 覆盖 ERC20 的 _beforeTokenTransfer 以添加 whenNotPaused 检查
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
