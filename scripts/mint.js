import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
  // Адрес получателя
  const recipientAddress = "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
  
  // Количество токенов для минта (1 миллион USDC)
  const amount = ethers.parseUnits("1000000", 6); // 6 decimals для USDC

  // Получаем контракт MockERC20
  const mockToken = await ethers.getContractAt("MockERC20", "0x5FbDB2315678afecb367f032d93F642f64180aa3");

  console.log(`Minting ${ethers.formatUnits(amount, 6)} USDC to ${recipientAddress}...`);

  // Минтим токены
  const tx = await mockToken.mint(recipientAddress, amount);
  await tx.wait();

  console.log("Mint successful!");
  
  // Проверяем баланс
  const balance = await mockToken.balanceOf(recipientAddress);
  console.log(`New balance: ${ethers.formatUnits(balance, 6)} USDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 