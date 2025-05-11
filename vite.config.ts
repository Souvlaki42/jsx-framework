import { defineConfig } from "vite";

export default defineConfig({
	resolve: {
		alias: {
			"~": new URL("./src", import.meta.url).pathname,
		},
	},

	esbuild: {
		jsx: "transform",
		jsxDev: false,
		jsxImportSource: "~",
		jsxInject: `import { createElement } from "~/jsx-runtime";`,
		jsxFactory: "createElement",
	},
});
