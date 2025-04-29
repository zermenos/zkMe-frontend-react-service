import React, { useState } from 'react';
import { Wallet, ChevronDown, LogOut } from 'lucide-react';

const Header = ({ walletData, balance, onConnect, onDisconnect, loading }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <img 
              src="https://cdn.vectorstock.com/i/500p/11/96/badge-design-with-kyc-know-your-customer-vector-49941196.avif" 
              alt="KYC Logo" 
              className="h-12 w-auto"
            />
            <h1 className="text-xl font-bold text-gray-800"></h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {walletData ? (
              <>
                <div className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors duration-200">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    {parseFloat(balance).toFixed(4)} tBNB
                  </span>
                </div>
                <div className="relative">
                  <button
                    onClick={toggleDropdown}
                    className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors duration-200"
                  >
                    <span className="text-sm font-medium">{formatAddress(walletData.address)}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200">
                      <button
                        onClick={() => {
                          onDisconnect();
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={onConnect}
                disabled={loading}
                className="flex items-center space-x-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 px-4 py-2 rounded-lg transition-colors duration-200"
              >
                <Wallet className="w-5 h-5" />
                <span className="text-sm font-medium">{loading ? 'Connecting...' : 'Connect Wallet'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 