import React from "react";
import "./index.css";

const ConnectWallet = ({ onConnect, isConnected, isLoading, address }) => {
  return (
    <button
      onClick={onConnect}
      disabled={isLoading}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition-colors duration-200"
    >
      {isLoading
        ? "Connecting..."
        : isConnected
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : "Connect Wallet"}
    </button>
  );
};

export default ConnectWallet;
