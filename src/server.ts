import { serve } from "./core/serve.ts";

const development = Bun.env.NODE_ENV === "development";
const port = Bun.env.PORT ?? 3000;

export const router = new Bun.FileSystemRouter({
	style: "nextjs",
	dir: Bun.env.PAGES_DIR ?? "./src/pages",
});

Bun.serve({
	port,
	development,
	fetch: serve(router),
});

console.log(`Server listening on port ${port}...`);
