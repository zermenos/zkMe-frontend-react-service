import React, { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { AlertCircle } from "lucide-react";
import { ZkMeWidget, verifyKycWithZkMeServices } from "@zkmelabs/widget";
import "@zkmelabs/widget/dist/style.css";
import Header from "./components/Header";
import "./index.css";
import {
  useWeb3Auth,
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
} from "@web3auth/modal/react";
import { CHAIN_NAMESPACES, WALLET_ADAPTERS } from "@web3auth/base";
import { MetamaskAdapter } from "@web3auth/metamask-adapter";
/*
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";

import { Web3Auth } from "@web3auth/modal";
*/
const App = () => {
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [verificationLevel, setVerificationLevel] = useState("");
  const [rawProvider, setRawProvider] = useState(null); // You'll need this too
  const [web3Provider, setWeb3Provider] = useState(null);
  const zkmeWidgetRef = useRef(null); // Ref to store widget instance
  const widgetEventHandlerRef = useRef(null);
  const [logoutInProgress, setLogoutInProgress] = useState(false);
  const [delay, setDelay] = useState(false);
  const { provider, isConnected, isInitialized } = useWeb3Auth();
  const { connect, loading: connecting } = useWeb3AuthConnect();
  const { disconnect } = useWeb3AuthDisconnect();
  const [connectRequested, setConnectRequested] = useState(false);
  const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID;
  const mchNo = import.meta.env.VITE_WEB3AUTH_ZKME_ID;

  const [debugLogs, setDebugLogs] = useState([]);
  const log = (msg) => setDebugLogs((prev) => [...prev, msg]);

  const useWalletInfo = () => {
    const getWalletInfo = async (prov) => {
      if (!isInitialized) throw new Error("Web3Auth not initialized");
      if (!isConnected) throw new Error("Wallet not connected");
      if (!prov) throw new Error("Web3Auth provider is not ready");

      const ethersProvider = new ethers.providers.Web3Provider(prov);

      const signer = ethersProvider.getSigner();
      const address = await signer.getAddress();
      const balance = await ethersProvider.getBalance(address);
      console.log("🧠 getWalletInfo: isInitialized", isInitialized);
      console.log("🧠 getWalletInfo: isConnected", isConnected);
      console.log("🧠 getWalletInfo: provider", prov);

      return {
        provider: ethersProvider,
        signer,
        address,
        balance: ethers.utils.formatEther(balance),
      };
    };

    return getWalletInfo;
  };

  console.log("Web3Auth state:");
  console.log("  isInitialized:", isInitialized);
  console.log("  isConnected:", isConnected);
  console.log("  provider:", provider);

  const isMobileDevice = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    );
  };
  const getWalletInfo = useWalletInfo();

  /////////////METHOD TO LISTEN TO METAMASK CONNECTION///////////

  const { web3auth } = useWeb3Auth();
  useEffect(() => {
    if (!web3auth || !isInitialized) return;

    const metamaskAdapter = new MetamaskAdapter({
      clientId, // ✅ use your Web3Auth client ID here
      sessionTime: 3600,
      web3AuthNetwork: "mainnet", // or "testnet" or "cyan"
    });

    web3auth.configureAdapter(metamaskAdapter);
  }, [web3auth, isInitialized]);

  useEffect(() => {
    if (!web3auth || !isInitialized) return;
    const metamaskAdapter = web3auth.adapterManager.getAdapter(
      WALLET_ADAPTERS.METAMASK
    );
    if (!metamaskAdapter) {
      log("❌ MetaMask adapter is not available");
      return;
    }
    metamaskAdapter?.subscribeAdapterEvents((event) => {
      const eventName = event?.name ?? "Unknown";
      log("🦊 MetaMask event received:", event);
      if (event.name === "CONNECTING") {
        const isMobile = isMobileDevice();
        if (isMobile) {
          log("📱 Is mobile:", isMobile);
          const dappUrl = window.location.host + window.location.pathname;
          const deeplink = `https://metamask.app.link/dapp/${dappUrl}`;
          log("🔗 Redirecting to MetaMask Deeplink:", deeplink);
          window.location.href = deeplink;
        }
      }
    });
  }, [web3auth, isInitialized]);
  ///////////////////////////////////////////////////////

  useEffect(() => {
    const fetchWallet = async () => {
      if (!connectRequested || !isConnected || !provider) return;

      try {
        const info = await getWalletInfo(provider);
        setWalletData(info);
        setBalance(info.balance);
        console.log("provider:" + info.provider);
        console.log("signer:" + info.signer);
        console.log("address:" + info.address);
        console.log("balance:" + info.balance);
      } catch (err) {
        console.error("Fetch wallet error:", err); // 🔍 get actual reason
        setError("Failed to fetch wallet info");
      } finally {
        setConnectRequested(false);
      }
    };

    fetchWallet();
  }, [connectRequested, isConnected, provider]);

  const handleConnect = async () => {
    if (!isInitialized) {
      console.warn("Web3Auth not initialized yet");
      return;
    }
    setLoading(true);

    try {
      // 🔥 Then trigger the login flow (will show the modal)
      await connect(); // 🔥 always force login
      setConnectRequested(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const wasPageReloaded = () => {
    const navEntries = performance.getEntriesByType("navigation");
    return navEntries.length > 0 && navEntries[0].type === "reload";
  };

  const safeLogout = async () => {
    if (!isConnected) {
      console.warn("Web3Auth not initialized, cannot logout");
      return;
    }

    try {
      setLogoutInProgress(true); // ✅ Begin tracking logout
      console.log("Initiating safeLogout");
      await disconnect();

      // Optional: Wait a bit to ensure state is fully reset
      //await new Promise((resolve) => setTimeout(resolve, 200));

      if (isMobileDevice() && wasPageReloaded()) {
        localStorage.removeItem("walletAddress");
        localStorage.removeItem("kycVerified");
        localStorage.setItem("forceLogout", "true");
      }

      // Optional but recommended: clear local storage
      localStorage.removeItem("walletAddress");
      //localStorage.removeItem("kycVerified");

      // Optional: reset any local app state here too
      setWalletData(null);
      setBalance(null);
      setKycStatus(null);
      setWeb3Provider(null);
      setRawProvider(null);
      setError("");

      // Destroy ZKMe widget if active
      if (zkmeWidgetRef.current) {
        zkmeWidgetRef.current.destroy();
        zkmeWidgetRef.current = null;
      }
    } catch (err) {
      console.error("safeLogout error:", err);
    } finally {
      setLogoutInProgress(false); // ✅ Done with logout
    }
  };

  const handleDisconnect = async () => {
    try {
      await safeLogout();
    } catch (err) {
      console.error("Error during disconnect:", err);
    }
  };

  const zkmeProvider = {
    async getAccessToken() {
      const res = await fetch("https://backend.everimx.com/api/zkme/token");
      const json = await res.json();
      return json.data.accessToken;
    },
    async getUserAccounts() {
      const { address } = await getWalletInfo();
      return [address];
    },
    async delegateTransaction(tx) {
      const { signer } = await getWalletInfo();
      const res = await signer.sendTransaction(tx);
      return res.hash;
    },
  };

  const handleLevel1Verification = async () => {
    try {
      if (!provider || !isConnected) {
        await handleConnect(); // wait until it's ready
        return;
      }

      if (!walletData) {
        await handleConnect();
        return;
      }

      const address = walletData.address;
      console.log("walletAddress from localStorage:", address);
      console.log("mchNo:", mchNo);
      //const { address } = await getWalletInfo();
      const { isGrant } = await verifyKycWithZkMeServices(
        mchNo,
        address
        // Optional configurations are detailed in the table below
        //options
      );

      console.log(isGrant);

      if (isGrant) {
        setKycStatus("success");
        //setInitialLoading(false);
      } else {
        launchKYCWidget("MeID");
      }
    } catch (err) {
      console.error("Error in handleLevel1Verification:", err);
      setError(
        err?.message || "Ocurrió un error durante la verificación de identidad."
      );
    }
  };
  /*
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
  */

  const launchKYCWidget = (level) => {
    if (zkmeWidgetRef.current) {
      if (widgetEventHandlerRef.current) {
        zkmeWidgetRef.current.off("kycFinished", widgetEventHandlerRef.current);
        widgetEventHandlerRef.current = null;
      }
      zkmeWidgetRef.current.destroy(); // ✅ Clean up previous instance
      zkmeWidgetRef.current = null;
    }
    const dynamicWidget = new ZkMeWidget(
      mchNo,
      "zKMe KYC",
      "137", // Polygon Mainnet
      zkmeProvider,
      {
        lv: level, // 🔥 directly use passed value instead of waiting for setState
        programNo: "202505220002",
        theme: "light",
        locale: "en",
      }
    );

    // Define handler once so you can remove it later
    const handleKycFinished = (result) => {
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
    };

    dynamicWidget.on("kycFinished", handleKycFinished);
    widgetEventHandlerRef.current = handleKycFinished;

    zkmeWidgetRef.current = dynamicWidget;

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

  /*
  useEffect(() => {
    log("Initial loading: " + initialLoading);
    log("canConnect: " + canConnect);
    log("web3authReady: " + web3authReady);
    log("logoutInProgress: " + logoutInProgress);
    log("loading: " + loading);
    log("Wallet: " + (walletData?.address ?? "Not connected"));
    log("web3auth: " + web3auth);
    //log("web3auth.provider: " + web3auth?.provider);
  }, [
    initialLoading,
    walletData,
    logoutInProgress,
    loading,
    canConnect,
    web3authReady,
    web3auth,
    web3auth?.provider,
  ]);
  */

  const shouldDisable = !isInitialized;
  useEffect(() => {
    let timer;
    if (!shouldDisable) {
      timer = setTimeout(() => {
        setDelay(false);
      }, 1000); // Delay for 1 second
    } else {
      setDelay(true); // Reset if conditions become invalid again
    }
    return () => clearTimeout(timer);
  }, [shouldDisable]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4" />
          <p className="text-lg font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <Header
        walletData={walletData}
        //balance={balance}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        loading={loading}
        //canConnect={canConnect}
        logoutInProgress={logoutInProgress}
        isInitialized={isInitialized}
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
          {/*
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
            */}
          {/*
          {walletData && (
            <div className="flex flex-col items-center space-y-2">
              <p className="p text-sm text-gray-600">
                Cartera conectada. Da click en Verificar para iniciar el proceso
              </p>
            </div>
          )}
            */}
          {/* 
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
*/}
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
              {!isInitialized && (
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
                    style={{
                      //opacity: delay ? 0.5 : 1,
                      pointerEvents: delay ? "none" : "auto", // disables interaction
                      //visibility: delay ? "hidden" : "visible", // OR hide it fully
                      //disabled={loading}
                    }}
                    className={`button bg-[#168E5D] hover:bg-[#127b50] py-3 px-4 rounded-lg ${
                      delay
                        ? "opacity-70 cursor-not-allowed pointer-events-none"
                        : "bg-[#168E5D] hover:bg-[#127b50]"
                    }`}
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

          <div className="fixed bottom-0 left-0 bg-white p-2 text-xs w-full max-h-40 overflow-auto border-t">
            {debugLogs.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

//INSERT AT INDEX.HTML
/*
<script src="https://cdn.jsdelivr.net/npm/@zkmelabs/widget/dist/zkme-widget.min.js"></script>
*/
