import { ethers } from 'ethers';

export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask not installed!");
  }
  
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    
    // Check if we're on BSC Testnet
    if (network.chainId !== 97) {
      throw new Error("Please connect to BSC Testnet");
    }
    
    return { provider, signer, address };
  } catch (error) {
    throw new Error("Failed to connect wallet: " + error.message);
  }
};