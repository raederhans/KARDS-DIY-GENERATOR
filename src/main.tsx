import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SpeedInsights } from "@vercel/speed-insights/react";
import "@fontsource/libre-franklin/latin-800.css";
import "@fontsource/libre-franklin/latin-900.css";
import "@fontsource/yantramanav/latin-700.css";
import "@fontsource/yantramanav/latin-900.css";
import App from "./App";

const shouldCollectSpeedInsights =
  import.meta.env.VITE_VERCEL_ENV === "production" ||
  import.meta.env.VITE_VERCEL_ENV === "preview";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    {shouldCollectSpeedInsights ? <SpeedInsights /> : null}
  </StrictMode>,
);
