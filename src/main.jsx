import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Web3AuthProvider } from "@web3auth/modal/react";
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
      }}
      enableLogging={true} // ✅ enables internal logging
    >
      <App />
    </Web3AuthProvider>
  </StrictMode>
);
