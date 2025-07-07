import React, { useState, useEffect, useRef } from "react";
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
  const [isMobile, setIsMobile] = useState(false);
  //const [isMetaMaskBrowser, setIsMetaMaskBrowser] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState("");
  const [rawProvider, setRawProvider] = useState(null); // You'll need this too
  const [web3Provider, setWeb3Provider] = useState(null);
  const [web3auth, setWeb3Auth] = useState(null);
  const zkmeWidgetRef = useRef(null); // Ref to store widget instance
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
      } finally {
        // ✅ Only now do we stop showing the loading state
        setInitialLoading(false);
      }
    };

    initWeb3Auth();
  }, []);

  useEffect(() => {
    if (web3auth?.provider) {
      // Override MetaMask fallback by forcing our provider
      window.ethereum = web3auth.provider;
    }
  }, [web3auth]);

  useEffect(() => {
    // Detect if user is on mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        );
      setIsMobile(isMobileDevice);
    };
    checkMobile();
  }, []);

  const handleConnect = async () => {
    if (web3auth) {
      await web3auth.logout(); // ✅ Disconnects the session from Web3Auth
    }
    if (!web3auth) return;
    try {
      await web3auth.connect(); // shows login modal
      const prov = web3auth.provider;
      setRawProvider(prov);
      const ethersProvider = new ethers.providers.Web3Provider(prov);
      setWeb3Provider(ethersProvider);
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

  const handleDisconnect = async () => {
    if (web3auth) {
      await web3auth.logout(); // ✅ Disconnects the session from Web3Auth
    }

    // 2. Clear ZKMe-related storage
    localStorage.removeItem("walletAddress");
    localStorage.removeItem("kycVerified");

    // Clear all wallet-related state
    setWalletData(null);
    setBalance(null);
    setKycStatus(null);
    setWeb3Provider(null);
    setError("");
    // ✅ Destroy ZKMe widget
    if (zkmeWidgetRef.current) {
      zkmeWidgetRef.current.destroy();
      zkmeWidgetRef.current = null;
    }
  };

  const provider = {
    async getAccessToken() {
      const res = await fetch("https://backend.everimx.com/api/zkme/token");
      const json = await res.json();
      return json.data.accessToken;
    },
    async getUserAccounts() {
      if (!web3auth || !web3auth.provider)
        throw new Error("Web3Auth not ready");
      /*
      const ethersProvider = new ethers.providers.Web3Provider(
        web3auth.provider
      ); // ✅ not window.ethereum
      const signer = ethersProvider.getSigner(); // ✅ Already wrapped
      return [await signer.getAddress()];
      */
      const signer = web3Provider.getSigner(); // ✅ Already wrapped
      return [await signer.getAddress()];
    },
    async delegateTransaction(tx) {
      if (!web3auth || !web3auth.provider)
        throw new Error("Web3Auth not ready");
      /*
      const ethersProvider = new ethers.providers.Web3Provider(
        web3auth.provider
      ); // ✅ same here
      const signer = ethersProvider.getSigner(); // ✅ Already wrapped
      const res = await signer.sendTransaction(tx);
      return res.hash;
      */
      const signer = web3Provider.getSigner(); // ✅ Already wrapped
      const res = await signer.sendTransaction(tx);
      return res.hash;
    },
  };

  const handleLevel1Verification = async () => {
    if (!web3auth || !web3auth.provider) {
      await handleConnect(); // wait until it's ready
      return;
    }

    if (!walletData) {
      await handleConnect();
      return;
    }

    launchKYCWidget("MeID");
  };

  const handleLevel2Verification = async () => {
    if (!web3auth || !web3auth.provider) {
      await handleConnect(); // wait until it's ready
      return;
    }

    if (!walletData) {
      await handleConnect();
      return;
    }

    launchKYCWidget("zkKYC");
  };

  const launchKYCWidget = (level) => {
    if (zkmeWidgetRef.current) {
      zkmeWidgetRef.current.destroy(); // ✅ Clean up previous instance
      zkmeWidgetRef.current = null;
    }
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
    zkmeWidgetRef.current = newWidget;
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
    if (!web3auth || !web3auth.provider) return;
    const isVerified = localStorage.getItem("kycVerified");
    if (isVerified === "true") {
      setKycStatus("success");
    }
  }, [web3auth]);
  useEffect(() => {
    const savedAddress = localStorage.getItem("walletAddress");
    const isVerified = localStorage.getItem("kycVerified") === "true";
    if (isVerified) setKycStatus("success");
    setInitialLoading(false);
  }, []);

  /*
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-lg font-medium">Cargando...</p>
        </div>
      </div>
    );
  }
*/
  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <Header
        walletData={walletData}
        //balance={balance}
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
                  <span className="span text-sm font-medium">Soy humano</span>
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
