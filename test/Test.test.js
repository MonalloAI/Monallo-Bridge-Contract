const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TEST", function () {

    describe("init", function () {        
        it("初始化状态应该为0", async function () {
            const Test = await ethers.getContractFactory("Test");
            const test = await Test.deploy();
            const num = await test.getNum();
            expect(num).to.equal(0);
        });
    });

    describe("add", function () {              
        it("num + 3 = 3 and num + 1 = 4", async function () {
            const Test = await ethers.getContractFactory("Test");
            const test = await Test.deploy();
            await test.add(3n);
            let num = await test.getNum();
            expect(num).to.equal(3n);

            await test.add(1n);
            num = await test.getNum();
            expect(num).to.equal(4n);
        });
    });
})
