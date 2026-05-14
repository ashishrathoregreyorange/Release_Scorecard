import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// Toggle a body class so the CSS print-mode rules kick in.
const params = new URLSearchParams(window.location.search);
if (params.get("print") === "true") {
  document.body.classList.add("print-mode");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
