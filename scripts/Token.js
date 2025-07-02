async function main() {
    const [deployer] = await ethers.getSigners(); // 这一行获取了部署者的账户
    console.log("Deploying contracts with account:", deployer.address); // 打印出部署者的地址

    const Token= await ethers.getContractFactory("Token");
    const token= await Token.deploy(10000);

    console.log("Contract address :", token.target);
}
  
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

