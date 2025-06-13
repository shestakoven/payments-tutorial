const hre = require("hardhat");

async function main() {
  // Deploy mock USDC token first
  const MockToken = await hre.ethers.getContractFactory("MockERC20");
  const mockToken = await MockToken.deploy("Mock USDC", "USDC", 6);
  await mockToken.waitForDeployment();
  console.log("Mock USDC deployed to:", await mockToken.getAddress());

  // Deploy LinkPayment contract
  const LinkPayment = await hre.ethers.getContractFactory("LinkPayment");
  const linkPayment = await LinkPayment.deploy(await mockToken.getAddress());
  await linkPayment.waitForDeployment();

  console.log("LinkPayment deployed to:", await linkPayment.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 