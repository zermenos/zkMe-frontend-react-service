import React, { useState, useEffect, useRef } from "react";
import { Wallet, ChevronDown, LogOut } from "lucide-react";

const Header = ({
  walletData,
  balance,
  onConnect,
  onDisconnect,
  loading,
  canConnect,
  logoutInProgress,
  initialLoading,
  web3authReady,
  web3auth,
  web3authprovider,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const formatAddress = (address) => {
    return `0x${address.slice(2, 6).toUpperCase()}...${address
      .slice(-4)
      .toUpperCase()}`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const shouldDisable =
    initialLoading ||
    loading ||
    logoutInProgress ||
    !canConnect ||
    !web3auth ||
    !web3authprovider ||
    !web3authReady;

  return (
    <header className="bg-[#F1F0F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <img src="logo.PNG" alt="Everi Logo" className="h-8 w-auto" />
          </div>

          <div className="flex items-center space-x-4">
            {walletData ? (
              <>
                {balance && (
                  <div className="text-sm text-gray-700 font-medium">
                    Balance: {parseFloat(balance).toFixed(4)} ETH
                  </div>
                )}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 border border-gray-500 px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring focus:ring-green-300"
                  >
                    <span className="text-sm font-medium">
                      {formatAddress(walletData.address)}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                      <button
                        onClick={() => {
                          onDisconnect();
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Desconectar</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={onConnect} // Always attach handler
                disabled={shouldDisable}
                className={`flex items-center space-x-2 border border-gray-500 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  shouldDisable
                    ? "bg-gray-300 opacity-70 cursor-not-allowed pointer-events-none"
                    : "bg-[#F1F0F0] hover:bg-[#E2E1E1]"
                }`}
              >
                <Wallet className="text-[#282828] w-5 h-5" />
                <span className="text-sm">
                  {shouldDisable ? "Cargando..." : "Conectar Cartera"}
                </span>
                {shouldDisable && (
                  <span className="ml-2 inline-block h-4 w-4 border-2 border-t-transparent border-gray-700 rounded-full animate-spin" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
