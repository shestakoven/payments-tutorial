import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  const user = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
  const linkPayment = await ethers.getContractAt(
    "LinkPayment",
    "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512"
  );
  const balance = await linkPayment.userBalances(user);
  console.log("User balance in contract:", balance.toString());
}

main().catch(console.error);