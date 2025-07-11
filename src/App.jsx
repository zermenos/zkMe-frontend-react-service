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
  const [web3authReady, setWeb3authReady] = useState(false);
  const [logoutInProgress, setLogoutInProgress] = useState(false);
  const [canConnect, setCanConnect] = useState(false);
  const clientId =
    "BGCPmDmIBwoWZWItt0e_Mh2W1pUarb8-TpQPcnq5CHlURvqbBobvO-fcvl70ME97Ze6KFvwRK-NsbPw7jVAbbQw";

  const [debugLogs, setDebugLogs] = useState([]);
  const log = (msg) => setDebugLogs((prev) => [...prev, msg]);

  const getEthersProvider = () => {
    if (!web3auth?.provider) throw new Error("Web3Auth provider not ready");
    return new ethers.providers.Web3Provider(web3auth.provider);
  };

  const getWalletInfo = async () => {
    const provider = getEthersProvider();
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    return {
      provider,
      signer,
      address,
      balance: ethers.utils.formatEther(balance),
    };
  };

  const isMobileDevice = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    );
  };

  //const canConnect = !!web3auth && !!web3auth.provider && web3authReady;

  useEffect(() => {
    const initWeb3Auth = async () => {
      const startTime = performance.now();
      log(`[Timer] 🟡 initWeb3Auth started at ${startTime.toFixed(2)}ms`);
      setInitialLoading(true); // ✅ Always begin in loading state
      const mobile = isMobileDevice();
      try {
        const w3a = new Web3Auth({
          clientId,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
          walletServicesConfig: {}, // optional services config
        });
        /*

        if (mobile && w3a.cachedAdapter) {
          console.log("Mobile reload detected, clearing session...");
          await safeLogout();
          await web3auth.clearCache();
          // Wait a bit to ensure it clears properly
          await new Promise((r) => setTimeout(r, 200));
          return;
        }
*/
        await w3a.init(); // always initialize here
        log(
          `[Timer] ⏱️ Web3Auth constructed at ${(
            performance.now() - startTime
          ).toFixed(2)}ms`
        );
        setWeb3Auth(w3a);
        /*
        // 🔁 Check for mobile reload logout flag
        if (localStorage.getItem("forceLogout") === "true") {
          log(
            `[Timer] ❌ Forced logout detected at ${(
              performance.now() - startTime
            ).toFixed(2)}ms`
          );
          console.log("📱🔁 Forced logout after reload");
          await w3a.logout();
          localStorage.removeItem("forceLogout");
          await new Promise((r) => setTimeout(r, 1000));
          return; // Exit early, avoid initializing Web3Auth
        }
          */

        // ✅ Check if session is valid
        if (w3a.cachedAdapter && w3a.provider) {
          log(
            `[Timer] ✅ Cached session found at ${(
              performance.now() - startTime
            ).toFixed(2)}ms`
          );
          try {
            const info = await getWalletInfo();
            log(
              `[Timer] 🪪 Wallet info loaded at ${(
                performance.now() - startTime
              ).toFixed(2)}ms`
            );
            setWeb3Provider(info.provider);
            setWalletData({
              provider: info.provider,
              signer: info.signer,
              address: info.address,
            });
            setBalance(info.balance);
            log(
              `[Timer] ✅ Wallet set at ${(
                performance.now() - startTime
              ).toFixed(2)}ms`
            );
          } catch (sessionErr) {
            console.warn("Stale session detected, logging out...");
            log(
              `[Timer] ❌ Failed to fetch wallet info at ${(
                performance.now() - startTime
              ).toFixed(2)}ms`
            );
            await w3a.logout();
          }
        }
      } catch (err) {
        console.error("Web3Auth init error:", err);
      } finally {
        setInitialLoading(false);
        setWeb3authReady(true);
        log(
          `[Timer] ✅ web3authReady set at ${(
            performance.now() - startTime
          ).toFixed(2)}ms`
        );
      }
    };

    initWeb3Auth();
  }, []);

  useEffect(() => {
    if (!initialLoading && web3auth && !logoutInProgress) {
      const start = performance.now();
      log(`[Timer] 🔌 canConnect started at ${start.toFixed(2)}ms`);
      const timeout = setTimeout(() => {
        setCanConnect(true);
      }, 1000); // 1-second delay
      log(
        `[Timer] 🟢 canConnect set to true at ${(
          performance.now() - start
        ).toFixed(2)}ms`
      );

      return () => clearTimeout(timeout); // Cleanup if dependencies change
    } else {
      // If conditions aren't met, disable the button
      setCanConnect(false);
    }
  }, [initialLoading, web3auth, logoutInProgress]);
  /*
  useEffect(() => {
    const wasPageReloaded = () => {
      const navEntries = performance.getEntriesByType("navigation");
      return navEntries.length > 0 && navEntries[0].type === "reload";
    };
    const clearSessionOnMobile = async () => {
      const isMobile = isMobileDevice();
      const reloaded = wasPageReloaded();
      if (isMobile && reloaded) {
        console.log("📱🔁 Mobile reload detected, logging out...");
        localStorage.setItem("forceLogout", "true");
        await new Promise((r) => setTimeout(r, 200)); // allow time for cleanup
      }
    };
    clearSessionOnMobile();
  }, []);
  */

  const handleConnect = async () => {
    const start = performance.now();
    log(`[Timer] 🔌 handleConnect started at ${start.toFixed(2)}ms`);
    if (!web3auth || initialLoading || !canConnect || !web3authReady) {
      console.warn("Web3Auth not initialized yet");
      return;
    }

    try {
      setLoading(true);

      // 🔥 Then trigger the login flow (will show the modal)
      const prov = await web3auth.connect(); // 🔥 always force login
      log(
        `[Timer] 🔐 web3auth.connect() completed at ${(
          performance.now() - start
        ).toFixed(2)}ms`
      );
      if (!prov) throw new Error("No provider returned after connect");
      setRawProvider(prov);
      const { provider, signer, address, balance } = await getWalletInfo();

      setWeb3Provider(provider);
      setWalletData({ provider, signer, address });
      setBalance(balance);
      localStorage.setItem("walletAddress", address);
    } catch (err) {
      console.error("handleConnect error:", err);
      setError(err.message || "Wallet connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleShowWallet = () => {
    if (web3auth) web3auth.showWalletUI();
  };

  const safeLogout = async () => {
    const start = performance.now();
    log(`[Timer] 🔌 handleDisconnect started at ${start.toFixed(2)}ms`);
    if (!web3auth) {
      console.warn("Web3Auth not initialized, cannot logout");
      log(
        `[Timer] 🔐 cannot logout at ${(performance.now() - start).toFixed(
          2
        )}ms`
      );
      return;
    }

    try {
      setLogoutInProgress(true); // ✅ Begin tracking logout
      console.log("Initiating safeLogout");
      log(
        `[Timer] 🔐 Initiating safeLogout at ${(
          performance.now() - start
        ).toFixed(2)}ms`
      );

      if (web3auth.provider) {
        await web3auth.logout();
      }
      await web3auth.clearCache?.();

      // Optional: Wait a bit to ensure state is fully reset
      //await new Promise((resolve) => setTimeout(resolve, 200));
      /*
      // Optional but recommended: clear local storage
      localStorage.removeItem("walletAddress");
      localStorage.removeItem("kycVerified");

      // Optional: reset any local app state here too
      setWalletData(null);
      setBalance(null);
      setKycStatus(null);
      setWeb3Provider(null);
      setError("");
*/
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
      //await web3auth.logout();
    } catch (err) {
      console.error("Error during disconnect:", err);
    }
    if (!web3auth || !web3authReady) {
      console.warn("Web3Auth not ready yet, cannot disconnect.");
      return;
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
      zkmeProvider,
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
    zkmeWidgetRef.current = dynamicWidget;
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

  /*
  useEffect(() => {
    const savedAddress = localStorage.getItem("walletAddress");
    const isVerified = localStorage.getItem("kycVerified") === "true";
    if (isVerified) setKycStatus("success");
    setInitialLoading(false);
  }, []);
  */

  useEffect(() => {
    log("Initial loading: " + initialLoading);
    log("canConnect: " + canConnect);
    log("web3authReady: " + web3authReady);
    log("logoutInProgress: " + logoutInProgress);
    log("loading: " + loading);
    log("Wallet: " + (walletData?.address ?? "Not connected"));
    log("web3auth: " + web3auth);
    log("web3auth.provider: " + web3auth?.provider);
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

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <Header
        walletData={walletData}
        //balance={balance}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        loading={loading}
        canConnect={canConnect}
        logoutInProgress={logoutInProgress}
        initialLoading={initialLoading}
        web3authReady={web3authReady}
        web3auth={web3auth}
        web3authprovider={web3auth.provider}
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
          {walletData && (
            <div className="flex flex-col items-center space-y-2">
              <p className="p text-sm text-gray-600">
                Cartera conectada. Da click en Verificar para iniciar el proceso
              </p>
            </div>
          )}
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
