import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "@/src/App";
import "@/src/globals.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("root element not found");
}

// StrictMode remounts in development and would drop the one-shot registration toast.
createRoot(root).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
