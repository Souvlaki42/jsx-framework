import type { FileSystemRouter } from "bun";
import type { JSX } from "preact";
import { createElementToString } from "./element.ts";

export const serve = (
	router: FileSystemRouter,
	metadata: { defaultTitle: string } = { defaultTitle: "App" }
) => {
	return async (req: Request) => {
		const path = new URL(req.url).pathname;
		const route = router.match(req.url);

		const publicFile = Bun.file(`./public${path}`);
		if (await publicFile.exists()) return new Response(publicFile);

		const comFile = Bun.file(`./src/pages${path}`);
		if (await comFile.exists()) return new Response(comFile);

		if (!route) return new Response("404!");

		const {
			default: code,
			title,
		}: { default: (props?: JSX.Element) => JSX.Element; title?: string } =
			await import(route.filePath);
		const component = code();
		const content = createElementToString(component);
		const html = await Bun.file("./src/index.html").text();
		const page = html
			.replace("PlaceTitleHere", title ?? metadata.defaultTitle)
			.replace("PlaceContentHere", content);
		return new Response(page, {
			headers: {
				"Content-Type": "text/html",
			},
		});
	};
};
