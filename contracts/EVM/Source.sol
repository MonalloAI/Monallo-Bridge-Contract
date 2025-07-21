// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts@4.9.3/access/AccessControl.sol";
import "@openzeppelin/contracts@4.9.3/security/Pausable.sol";
import "@openzeppelin/contracts@4.9.3/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts@4.9.3/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts@4.9.3/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts@4.9.3/utils/cryptography/ECDSA.sol";

/**
 * @title Source - Monallo 桥源链合约
 * @author Monallo Protocol
 * @notice 此合约在源链上管理资产的锁定与解锁，支持原生代币（如ETH）和ERC20代币。
 *         它通过基于角色的访问控制、暂停功能和重入保护来确保安全。
 * @dev 继承自 OpenZeppelin 的 AccessControl, Pausable, 和 ReentrancyGuard。
 *      所有外部交互严格遵循“检查-生效-交互”模式。
 */
contract Source is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // =============================================================
    //                           常量
    // =============================================================

    // 定义费用管理员的角色标识符
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    // =============================================================
    //                             事件
    // =============================================================

    /**
     * @notice 当用户成功锁定资产时触发。
     * @param transactionId 跨链交易的唯一标识符。
     * @param user 发起锁定的用户地址。
     * @param destinationChainId 目标网络的链ID。
     * @param recipientAddress 在目标链上接收铸造资产的地址。
     * @param tokenAddress 锁定的ERC20代币地址，原生代币为 address(0)。
     * @param amount 锁定的代币数量（不含手续费）。
     * @param fee 从交易中扣除的手续费。
     */
    event AssetLocked(
        bytes32 indexed transactionId,
        address indexed user,
        uint256 destinationChainId,
        address recipientAddress,
        address tokenAddress,
        uint256 amount,
        uint256 fee
    );

    /**
     * @notice 当中继器成功为用户解锁资产时触发。
     * @param transactionId 原始锁定交易的唯一标识符。
     * @param recipient 接收解锁资产的地址。
     * @param tokenAddress 解锁的ERC20代币地址，原生代币为 address(0)。
     * @param amount 解锁的代币数量。
     */
    event AssetUnlocked(
        bytes32 indexed transactionId,
        address indexed recipient,
        address tokenAddress,
        uint256 amount
    );

    // =============================================================
    //                             结构体
    // =============================================================

    /**
     * @notice 定义计算桥接费用的配置。
     * @param isPercentage 如果费用是百分比则为 true，固定值为 false。
     * @param value 费用值，可以是基点（万分之一）或以wei为单位的绝对值。
     */
    struct FeeConfig {
        bool isPercentage;
        uint256 value;
    }

    // =============================================================
    //                          状态变量
    // =============================================================

    FeeConfig public feeConfig; // 手续费配置
    mapping(bytes32 => bool) public processedUnlockTxs; // 跟踪已处理的解锁交易，防止重放攻击
    address public relayerSigner; // 受信任的中继器签名者地址

    mapping(address => uint256) public accumulatedFees; // 按代币地址累计的手续费
    uint256 private _nonce; // 用于生成唯一交易ID的内部计数器

    // =============================================================
    //                           构造函数
    // =============================================================

    /**
     * @notice 初始化合约并设置初始角色。
     * @dev 部署者被授予 DEFAULT_ADMIN_ROLE 和 FEE_MANAGER_ROLE。
     *      随后，DEFAULT_ADMIN_ROLE 的持有者可以管理其他角色和合约配置。
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FEE_MANAGER_ROLE, msg.sender);
    }

    // =============================================================
    //                         核心功能函数
    // =============================================================

    /**
     * @notice 锁定指定数量的ERC20代币以进行桥接。
     * @dev 用户必须事先批准本合约可支配其代币。成功后会触发 AssetLocked 事件。
     * @param _token 要锁定的ERC20代币地址。
     * @param _amount 要锁定的代币数量。
     * @param _destinationChainId 目标网络的链ID。
     * @param _recipient 在目标链上接收资产的地址。
     */
    function lock(address _token, uint256 _amount, uint256 _destinationChainId, address _recipient)
        external
        whenNotPaused
        nonReentrant
    {
        require(_amount > 0, "Source: amount must be greater than zero");
        require(_recipient != address(0), "Source: invalid recipient address");

        uint256 fee = _calculateFee(_amount);
        uint256 amountAfterFee = _amount - fee;
        require(amountAfterFee > 0, "Source: amount must be greater than fee");

        accumulatedFees[_token] += fee;
        
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        bytes32 txId = _generateTransactionId();
        emit AssetLocked(txId, msg.sender, _destinationChainId, _recipient, _token, amountAfterFee, fee);
    }

    /**
     * @notice 锁定原生代币（如ETH）以进行桥接。
     * @dev 锁定金额由 `msg.value` 决定。成功后会触发 AssetLocked 事件。
     * @param _destinationChainId 目标网络的链ID。
     * @param _recipient 在目标链上接收资产的地址。
     */
    function lockNative(uint256 _destinationChainId, address _recipient)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        require(msg.value > 0, "Source: amount must be greater than zero");
        require(_recipient != address(0), "Source: invalid recipient address");

        uint256 fee = _calculateFee(msg.value);
        uint256 amountAfterFee = msg.value - fee;
        require(amountAfterFee > 0, "Source: amount must be greater than fee");

        accumulatedFees[address(0)] += fee;

        bytes32 txId = _generateTransactionId();
        emit AssetLocked(txId, msg.sender, _destinationChainId, _recipient, address(0), amountAfterFee, fee);
    }

    /**
     * @notice 根据中继器的签名消息解锁资产。
     * @dev 此函数由中继器在目标链资产被销毁后调用。
     *      它验证中继器的签名以授权转账。
     * @param _txId 原始锁定交易的唯一ID。
     * @param _token 要解锁的代币地址（原生代币为 address(0)）。
     * @param _recipient 接收解锁资产的地址。
     * @param _amount 要解锁的资产数量。
     * @param _signature 中继器的签名，证明解锁请求的有效性。
     */
    function unlock(bytes32 _txId, address _token, address _recipient, uint256 _amount, bytes memory _signature)
        external
        whenNotPaused
        nonReentrant
    {
        require(!processedUnlockTxs[_txId], "Source: transaction already processed");
        require(relayerSigner != address(0), "Source: relayer signer not set");

        bytes32 messageHash = keccak256(abi.encodePacked(_txId, _token, _recipient, _amount));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        
        address signer = ethSignedMessageHash.recover(_signature);
        require(signer == relayerSigner, "Source: invalid signature");

        processedUnlockTxs[_txId] = true;

        if (_token == address(0)) {
            (bool success, ) = _recipient.call{value: _amount}("");
            require(success, "Source: native token transfer failed");
        } else {
            IERC20(_token).safeTransfer(_recipient, _amount);
        }

        emit AssetUnlocked(_txId, _recipient, _token, _amount);
    }

    // =============================================================
    //                       管理员功能函数
    // =============================================================
    
    /**
     * @notice 设置桥接费用的配置。
     * @dev 仅限拥有 DEFAULT_ADMIN_ROLE 的地址调用。
     * @param _isPercentage 百分比费用为 true，固定费用为 false。
     * @param _value 费用值（基点或绝对值）。
     */
    function setFeeConfig(bool _isPercentage, uint256 _value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_isPercentage) {
            require(_value <= 10000, "Source: The percentage fee cannot exceed 100%");
        }
        feeConfig = FeeConfig(_isPercentage, _value);
    }

    /**
     * @notice 设置受信任的中继器签名者地址。
     * @dev 仅限拥有 DEFAULT_ADMIN_ROLE 的地址调用。
     *      解锁交易需要中继器的签名授权。
     * @param _newSigner 新的中继器签名者地址。
     */
    function setRelayerSigner(address _newSigner) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_newSigner != address(0), "Source: Invalid signer address");
        relayerSigner = _newSigner;
    }

    /**
     * @notice 从合约中提取累计的手续费。
     * @dev 仅限拥有 FEE_MANAGER_ROLE 的地址调用，确保职责分离。
     * @param _tokenAddress 要提取费用的代币地址（原生代币为 address(0)）。
     * @param _recipient 接收提取费用的地址。
     * @param _amount 要提取的费用金额。
     */
    function withdrawFees(address _tokenAddress, address _recipient, uint256 _amount)
        external
        onlyRole(FEE_MANAGER_ROLE)
        nonReentrant
    {
        require(_recipient != address(0), "Source: Invalid receiving address");
        uint256 feesAvailable = accumulatedFees[_tokenAddress];
        require(_amount > 0 && _amount <= feesAvailable, "Source: Invalid withdrawal amount");

        accumulatedFees[_tokenAddress] = feesAvailable - _amount;

        if (_tokenAddress == address(0)) {
            (bool success, ) = _recipient.call{value: _amount}("");
            require(success, "Source: Native token fee transfer failed");
        } else {
            IERC20(_tokenAddress).safeTransfer(_recipient, _amount);
        }
    }

    /**
     * @notice 暂停合约的所有核心功能。
     * @dev 仅限拥有 DEFAULT_ADMIN_ROLE 的地址调用。用于紧急情况或升级。
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice 解除合约暂停状态，恢复正常操作。
     * @dev 仅限拥有 DEFAULT_ADMIN_ROLE 的地址调用。
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // =============================================================
    //                       内部功能函数
    // =============================================================

    /**
     * @notice 根据当前 feeConfig 计算给定金额的手续费。
     * @param _amount 用于计算手续费的总金额。
     * @return 计算出的手续费金额。
     */
    function _calculateFee(uint256 _amount) internal view returns (uint256) {
        if (feeConfig.isPercentage) {
            return (_amount * feeConfig.value) / 10000;
        }
        return feeConfig.value;
    }

    /**
     * @notice 为新的锁定交易生成一个唯一的交易ID。
     * @dev 使用链ID、合约地址和递增的nonce组合来确保从本合约发起的每笔交易都具有全局唯一性。
     * @return 一个唯一的 bytes32 交易ID。
     */
    function _generateTransactionId() internal returns (bytes32) {
        uint256 nonce = _nonce++;
        return keccak256(abi.encodePacked(block.chainid, address(this), nonce));
    }
}
