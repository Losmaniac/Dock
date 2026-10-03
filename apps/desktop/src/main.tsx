import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createPlatform } from "@glass-dock/platform";
import { App } from "@glass-dock/ui";
import "@glass-dock/ui/src/styles/tokens.css";

const platform = createPlatform();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App platform={platform} dockId={platform.windowDockId()} />
  </StrictMode>,
);
