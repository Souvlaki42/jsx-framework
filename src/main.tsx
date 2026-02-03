import { render } from "~/jsx-runtime";
import App from "./App";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) throw new Error("Could not find #app element");

render(<App />, app);
