const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Token", function () {
    let Token;
    let token;
    let owner;
    let addr1;
    let addr2;
    let initialSupply = 10000; // 初始铸造10000个代币

    beforeEach(async function () {
        // 每次测试前部署一个新的Token合约
        Token = await ethers.getContractFactory("Token");
        [owner, addr1, addr2] = await ethers.getSigners(); // 获取测试账户

        // 部署Token合约，并向owner铸造初始代币
        token = await Token.deploy(initialSupply);
        // 等待合约部署完成
        await token.waitForDeployment();
    });

    describe("Deployment", function () {
        it("应该将初始供应量分配给部署者", async function () {
            const ownerBalance = await token.balanceOf(owner.address);
            // 注意：ERC20代币通常有小数位，这里需要乘以10的decimals次方
            // OpenZeppelin ERC20默认是18位小数
            const expectedSupply = BigInt(initialSupply) * (10n ** await token.decimals());
            expect(ownerBalance).to.equal(expectedSupply);
        });

        it("代币名称和符号应该正确", async function () {
            expect(await token.name()).to.equal("TestToken");
            expect(await token.symbol()).to.equal("ttoken");
        });
    });

    describe("Transactions", function () {
        it("应该在账户之间转移代币", async function () {
            // 从 owner 转移 50 个代币到 addr1
            const transferAmount = 50n * (10n ** await token.decimals());
            await token.transfer(addr1.address, transferAmount);
            const addr1Balance = await token.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(transferAmount);

            // 尝试从 addr1 转移 50 个代币到 addr2
            // 使用 .connect(signer) 来指定交易发送者
            await token.connect(addr1).transfer(addr2.address, transferAmount);
            const addr2Balance = await token.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(transferAmount);
        });

        it("应该在余额不足时失败", async function () {
            // 尝试从 addr1 转移比其余额更多的代币 (addr1 初始余额为 0)
            const transferAmount = 1n * (10n ** await token.decimals());
            await expect(token.connect(addr1).transfer(owner.address, transferAmount))
                .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
        });

        it("应该在转移零地址时失败", async function () {
            const transferAmount = 1n * (10n ** await token.decimals());
            await expect(token.transfer(ethers.ZeroAddress, transferAmount))
                .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver");
        });
    });
});
