import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Web3AuthProvider } from "@web3auth/modal/react";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Web3AuthProvider>
      <App />
    </Web3AuthProvider>
  </StrictMode>
);
