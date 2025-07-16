import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Web3AuthProvider } from "@web3auth/modal/react";
import { CHAIN_NAMESPACES, WALLET_ADAPTERS } from "@web3auth/base";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Web3AuthProvider
      config={{
        web3AuthOptions: {
          clientId: import.meta.env.VITE_WEB3AUTH_CLIENT_ID,
          web3AuthNetwork: "sapphire_devnet",
        },
        modalConfig: {
          [WALLET_ADAPTERS.METAMASK]: {
            label: "metamask",
            showOnModal: false,
          },
        },
      }}
      enableLogging={true} // ✅ enables internal logging
      uiConfig={{
        appName: "Everi", // 🟢 required for modal
      }}
    >
      <App />
    </Web3AuthProvider>
  </StrictMode>
);
