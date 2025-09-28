import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply dark theme by default for Ethereal Obsidian design system
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);
