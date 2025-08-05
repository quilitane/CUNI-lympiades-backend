import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Import global styles here if necessary
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);