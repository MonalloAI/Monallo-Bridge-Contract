// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol"; // 引入 Ownable 来管理费用接收者

contract DataStorage is Ownable { // 继承 Ownable
    // 定义一个事件，用于通知跨链铸币请求
    // 增加了 fee 和 msg.sender (作为锁定者)
    event ImaLockedAndMintRequested( // 事件名 ImaLockedAndMintRequested
        bytes32 indexed dataHash,       // 存储的数据哈希，作为跨链交易的唯一标识
        address indexed recipientBChain, // B链上的接收地址
        uint256 amountAfterFee,         // 扣除费用后，实际用于跨链的金额
        uint256 feeAmount,              // 收取的费用金额
        address indexed locker          // 在A链上锁定imua的地址
    );

    // 映射，用于记录已处理的 dataHash，防止重复处理（虽然这里是锁定，但dataHash仍是唯一标识）
    mapping(bytes32 => bool) public processedDataHashes;

    // 费用比例，例如 8 表示 0.8% (8 / 1000)
    uint256 public feeRate = 8; // 0.8% => 8 / 1000

    // 构造函数，设置合约部署者为 owner
    constructor() Ownable(msg.sender) {}

    /**
     * @dev 设置费用比例。只有 owner 可以调用。
     * @param _newFeeRate 新的费用比例 (例如 8 代表 0.8%)。
     */
    function setFeeRate(uint256 _newFeeRate) external onlyOwner {
        require(_newFeeRate <= 100, "Fee rate cannot exceed 10%"); // 限制最大费率，例如10%
        feeRate = _newFeeRate;
    }

    /**
     * @dev 锁定imua并发出跨链铸币请求事件。
     * @param _dataHash 唯一的数据哈希，例如源链交易ID或内容哈希，用于B链防重放。
     * @param _recipientBChain B链上接收代币的地址。
     */
    function lockImaAndRequestMint(bytes32 _dataHash, address _recipientBChain) external payable { // 函数名从 lockEthAndRequestMint 改为 lockImaAndRequestMint
        require(msg.value > 0, "No imua sent"); 
        require(!processedDataHashes[_dataHash], "Data hash already processed"); // 防止重复处理同一个跨链请求
        require(_recipientBChain != address(0), "Invalid recipient B chain address");

        processedDataHashes[_dataHash] = true;

        uint256 fee = (msg.value * feeRate) / 1000;
        uint256 amountAfterFee = msg.value - fee;

        // 将费用转账给 owner
        // 注意：在实际生产环境中，更推荐使用 pull-based 模式（允许 owner 提取费用）
        // 而不是 push-based (直接 transfer)，以避免 reentrancy 风险，
        // 但对于简单示例，transfer 足够。
        payable(owner()).transfer(fee);

        // 发出事件，包含B链铸币所需的所有信息
        emit ImaLockedAndMintRequested(_dataHash, _recipientBChain, amountAfterFee, fee, msg.sender); // 事件名更新
    }

    // 可选：检查某个数据哈希是否已被处理
    function isDataHashProcessed(bytes32 _dataHash) public view returns (bool) {
        return processedDataHashes[_dataHash];
    }
}

