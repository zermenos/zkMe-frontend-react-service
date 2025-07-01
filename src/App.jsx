import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Wallet, AlertCircle, RefreshCw, LogOut } from "lucide-react";
import { ZkMeWidget } from "@zkmelabs/widget";
import "@zkmelabs/widget/dist/style.css";
import Header from "./components/Header";
import "./index.css";
import { Web3Auth, WEB3AUTH_NETWORK } from "@web3auth/modal";

const App = () => {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [showMetaMaskDialog, setShowMetaMaskDialog] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(
    "https://metamask.io/download/"
  );
  const [isMobile, setIsMobile] = useState(false);
  const [isMetaMaskBrowser, setIsMetaMaskBrowser] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState("");
  const [web3Provider, setWeb3Provider] = useState(null); // You'll need this too
  const [web3auth, setWeb3Auth] = useState(null);
  const clientId =
    "BGCPmDmIBwoWZWItt0e_Mh2W1pUarb8-TpQPcnq5CHlURvqbBobvO-fcvl70ME97Ze6KFvwRK-NsbPw7jVAbbQw";

  useEffect(() => {
    const initWeb3Auth = async () => {
      try {
        const w3a = new Web3Auth({
          clientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
          walletServicesConfig: {}, // optional services config
        });
        await w3a.init();
        setWeb3Auth(w3a);
        if (w3a.provider) setWeb3Provider(w3a.provider);
      } catch (err) {
        console.error("Web3Auth init error:", err);
      }
    };

    initWeb3Auth();
  }, []);

  useEffect(() => {
    // Detect if user is on mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        );
      setIsMobile(isMobileDevice);

      // Check if we're in MetaMask's browser
      const isMetaMask = userAgent.includes("metamask");
      setIsMetaMaskBrowser(isMetaMask);
    };
    checkMobile();
  }, []);

  const handleConnect = async () => {
    if (!web3auth) return;
    try {
      await web3auth.connect(); // shows login modal
      const prov = web3auth.provider;
      const ethersProvider = new ethers.providers.Web3Provider(prov);
      const signer = ethersProvider.getSigner();
      const address = await signer.getAddress();
      const bal = await ethersProvider.getBalance(address);
      setWalletData({ provider: ethersProvider, signer, address });
      setBalance(ethers.utils.formatEther(bal));
      localStorage.setItem("walletAddress", address);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleShowWallet = () => {
    if (web3auth) web3auth.showWalletUI();
  };

  const handleDisconnect = () => {
    setWalletData(null);
    setBalance(null);
    setKycStatus(null);
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("kycVerified");

    // Force "reconnection" by reloading the page and clearing provider cache
    if (window.ethereum && window.ethereum._metamask) {
      // This just disables auto reloading on chain changes temporarily
      window.ethereum.autoRefreshOnNetworkChange = false;
    }
  };

  const provider = {
    async getAccessToken() {
      const res = await fetch("https://backend.everimx.com/api/zkme/token");
      const json = await res.json();
      return json.data.accessToken;
    },
    async getUserAccounts() {
      const signer = web3Provider.getSigner(); // <-- using the renamed state
      return [await signer.getAddress()];
    },
    async delegateTransaction(tx) {
      const ethersProvider = new ethers.providers.Web3Provider(web3Provider);
      const sig = ethersProvider.getSigner();
      const res = await sig.sendTransaction(tx);
      return res.hash;
    },
  };

  const handleLevel1Verification = async () => {
    if (!walletData) {
      await handleConnect();
    }
    if (walletData) {
      launchKYCWidget("MeID"); // 🔥 pass it here
    }
  };

  const handleLevel2Verification = async () => {
    if (!walletData) {
      await handleConnect();
    }
    if (walletData) {
      launchKYCWidget("zkKYC"); // 🔥 pass it here
    }
  };

  const launchKYCWidget = (level) => {
    const dynamicWidget = new ZkMeWidget(
      "M2025012255531684563023546877743",
      "zKMe KYC",
      "137", // Polygon Mainnet
      provider,
      {
        lv: level, // 🔥 directly use passed value instead of waiting for setState
        programNo: "202505220002",
        theme: "light",
        locale: "en",
      }
    );

    dynamicWidget.on("kycFinished", (result) => {
      const { isGrant, associatedAccount } = result;
      if (
        isGrant &&
        associatedAccount.toLowerCase() === walletData?.address.toLowerCase()
      ) {
        setKycStatus("success");
        localStorage.setItem("kycVerified", "true");
      } else {
        setKycStatus("fail");
        localStorage.removeItem("kycVerified");
      }
    });

    dynamicWidget.launch();
  };

  const handleVerification = async () => {
    if (!walletData) {
      // If wallet is not connected, connect it first
      await handleConnect();
    }
    // After wallet is connected (or was already connected), launch KYC
    if (walletData) {
      launchKYCWidget();
    }
  };

  useEffect(() => {
    const isVerified = localStorage.getItem("kycVerified");
    if (isVerified === "true") {
      setKycStatus("success");
    }
  }, []);
  useEffect(() => {
    const savedAddress = localStorage.getItem("walletAddress");
    const isVerified = localStorage.getItem("kycVerified") === "true";
    if (isVerified) setKycStatus("success");

    if (savedAddress && window.ethereum) {
      const autoConnect = async () => {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const currentAddress = await signer.getAddress();

          if (currentAddress.toLowerCase() === savedAddress.toLowerCase()) {
            const balance = await provider.getBalance(currentAddress);
            setBalance(ethers.utils.formatEther(balance));
            setWalletData({ provider, signer, address: currentAddress });
          } else {
            localStorage.removeItem("walletAddress");
          }
        } catch {
          localStorage.removeItem("walletAddress");
        }
        setInitialLoading(false);
      };

      autoConnect();
    } else {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          handleDisconnect();
        } else {
          handleConnect();
        }
      });
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  const MetaMaskDialog = () => (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#edffee] rounded-xl shadow-lg p-6 max-w-md w-full mx-4 border-2 border-green-500">
        <div className="flex items-center space-x-3 mb-4">
          <Wallet className="w-6 h-6 text-[#8fef56]" />
          <h3 className="text-lg font-semibold text-gray-800">
            MetaMask Not Found
          </h3>
        </div>
        <p className="text-gray-600 mb-6">
          {isMobile
            ? "To use this application, please open it in MetaMask's in-app browser."
            : "To use this application, you need to install MetaMask, a cryptocurrency wallet for your browser."}
        </p>
        <div className="flex space-x-3">
          {isMobile ? (
            <a
              href="https://metamask.app.link/dapp/zk-me.vercel.app"
              className="flex-1 bg-[#8fef56] hover:bg-[#7edf45] text-white font-bold py-3 px-4 rounded-lg transition-colors text-center"
            >
              Open in MetaMask
            </a>
          ) : (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-[#8fef56] hover:bg-[#7edf45] text-white font-bold py-3 px-4 rounded-lg transition-colors text-center"
            >
              Install MetaMask
            </a>
          )}
          <button onClick={handleShowWallet}>Show Wallet</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      {showMetaMaskDialog && <MetaMaskDialog />}
      <Header
        walletData={walletData}
        balance={balance}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        loading={loading}
      />
      <div className="p-4">
        <div className="max-w-[1000px] mx-auto space-y-6">
          <div className="space-y-4 mt-8">
            <h2 className="h2 text-4xl font-normal text-gray-800">
              Verifica tu identidad para continuar
            </h2>
            <p className="p text-gray-600 text-lg mt-8">
              Da click en Verificar y sigue los pasos indicados a continuación
            </p>
            {/* <p className="text-gray-600 text-lg mt-8">
              Passing both verifications is necessary to anchor your Proof of Uniqueness credential to the Verax attestation registry, making you eligible to participate in the LXP drop.
            </p> */}
          </div>

          {!walletData && !initialLoading && (
            <div className="flex flex-col items-center space-y-2">
              <p className="p text-sm text-gray-600">
                Es necesario tener una cuenta en MetaMask, si aún no la tienes
                descarga la aplicación haciendo click en Verificar o en Conectar
                Cartera. Al terminar el registro vuelve a presionar el botón.
                <br></br>
              </p>
            </div>
          )}
          {walletData && (
            <div className="flex flex-col items-center space-y-2">
              <p className="p text-sm text-gray-600">
                Cartera conectada. Da click en Verificar para iniciar el proceso
              </p>
            </div>
          )}
          <div className="flex flex-col items-center space-y-2">
            <p className="p text-sm text-gray-600"></p>
          </div>
          <div className="flex-1 bg-[#e2e1e1] rounded-xl shadow-lg p-6 space-y-6 border-2 border-[#b3b2b2]">
            {error && (
              <div className="bg-red-100 border border-red-600 rounded-lg p-4 text-red-800 flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <p className="p text-white text-sm">
              {String.fromCodePoint(0x24d8)} NOTA<br></br>MetaMask es una
              cartera de criptomonedas que te permite interactuar con
              aplicaciones Web3 y certificados blockchain como tokens o NFTs.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-[#F0F0F0] rounded-xl shadow-lg p-6 space-y-6 border-2 border-[#168E5D]">
              {error && (
                <div className="bg-red-100 border border-red-600 rounded-lg p-4 text-red-800 flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              {/*
              <h1 className="h1">Conecta tu cartera</h1>
*/}
              {initialLoading && (
                <div className="flex flex-col items-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="p text-sm text-gray-600">
                    Conectando cartera...
                  </p>
                </div>
              )}

              <div className="bg-white border border-gray-300 rounded-lg p-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-[#F5F86E] rounded-full animate-pulse" />
                  <span className="span text-sm font-medium">
                    Prueba que eres humano
                  </span>
                </div>
                <p className="p text-xs text-gray-400">Escaneo facial</p>
              </div>

              <div className="space-y-4">
                {/*
                <p className="p text-sm text-gray-600">
                  Una solución de identidad que prueba que eres humano sin
                  revelar información privada.
                </p>*/}
                {kycStatus !== "success" && (
                  <button
                    onClick={handleLevel1Verification}
                    disabled={loading}
                    className="button bg-[#168E5D] hover:bg-[#127b50] py-3 px-4 rounded-lg"
                  >
                    Verificar
                  </button>
                )}

                {kycStatus === "success" && (
                  <div className="div bg-green-100 border border-green-600 text-green-800 rounded p-3 text-center">
                    ✅ Verificación completada
                  </div>
                )}
                {kycStatus === "fail" && (
                  <div className="div bg-red-100 border border-red-600 text-red-800 rounded p-3 text-center">
                    ❌ Verificación fallida. Intenta de nuevo
                  </div>
                )}
              </div>
            </div>
            {/*
            <div className="flex-1 bg-[#F1F0F0] rounded-xl shadow-lg p-6 space-y-6 border-2 border-[#188F5E]">
              {error && (
                <div className="bg-red-100 border border-red-600 rounded-lg p-4 text-red-800 flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <h1 className="h1">Nivel 2</h1>

              {initialLoading && (
                <div className="flex flex-col items-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="p text-sm text-gray-600">
                    Conectando cartera...
                  </p>
                </div>
              )}

              <div className="bg-white border border-gray-300 rounded-lg p-4 space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-[#F1ED76] rounded-full animate-pulse" />
                  <span className="span text-sm font-medium">
                    Verificación de identidad
                  </span>
                </div>
                <p className="p text-xs text-gray-400">Escaneo de ID</p>
              </div>

              <div className="space-y-4">
                <p className="p text-sm text-gray-600">
                  Un token intransferible emitido al realizar una verificación
                  KYC, prueba atributos como edad o nacionalidad sin revelar
                  información privada.
                </p>
                {kycStatus !== "success" && (
                  <button
                    onClick={handleLevel2Verification}
                    disabled={loading}
                    className="bg-[#188F5E] hover:bg-[#168658]  py-3 px-4 rounded-lg"
                  >
                    Verificar
                  </button>
                )}

                {kycStatus === "success" && (
                  <div className="div bg-green-100 border border-green-600 text-green-800 rounded p-3 text-center">
                    ✅ Verificación completada
                  </div>
                )}
                {kycStatus === "fail" && (
                  <div className="div bg-red-100 border border-red-600 text-red-800 rounded p-3 text-center">
                    ❌ Verificación fallida. Intenta de nuevo
                  </div>
                )}
              </div>
            </div>*/}
          </div>
          <p className="p text-gray-600 text-lg mt-8">
            Ayúdanos a mejorar contestando una breve encuesta
            <a
              href="https://qualtricsxm2tmvtgt97.qualtrics.com/jfe/form/SV_0W0zPJT91WeybBk"
              className="p text-blue-600"
            >
              {" "}
              aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
