import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// No <StrictMode>: its development-only double mount makes the vendored
// React Bits WebGL backgrounds release their GL context and then reuse the
// lost one. Production rendering is identical either way.
createRoot(document.getElementById("root")!).render(<App />);
