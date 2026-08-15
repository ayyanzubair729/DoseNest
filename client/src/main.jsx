import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { faviconBird } from "./utils/assets.js";
import "./styles/global.css";

const faviconLink = document.createElement("link");
faviconLink.rel = "icon";
faviconLink.type = "image/png";
faviconLink.href = faviconBird;
document.head.appendChild(faviconLink);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);