import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";

import App from "./App";
import { useTheme } from "./lib/theme";

import "./index.css";
import "./i18n";

function Root() {
  const { theme } = useTheme();
  return (
    <>
      <App />
      <Toaster richColors position="bottom-right" theme={theme} />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
