import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createPlatform } from "@glass-dock/platform";
import { App } from "@glass-dock/ui";
import "@glass-dock/ui/src/styles/tokens.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App platform={createPlatform()} />
  </StrictMode>,
);
