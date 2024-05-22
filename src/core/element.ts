// Function to escape special HTML characters
const escapeHtml = (str: string): string =>
	str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

export const createElementToString = (
	element: React.JSX.Element | string | number
): string => {
	if (typeof element === "string" || typeof element === "number")
		return escapeHtml(element.toString());

	let html = "";
	const type = typeof element.type === "function" ? "" : element.type;
	if (type) {
		html += `<${type}`;

		for (const [key, value] of Object.entries(element.props)) {
			if (key === "children") continue;
			else if (typeof value === "function") {
				const eventName = key.toLowerCase();
				html += ` ${eventName}="${escapeHtml(
					value
						.toString()
						.replaceAll(/\(\s*\)\s*=>\s*/g, "")
						.trim()
				)}"`;
			} else html += ` ${key}="${String(value).trim()}"`;
		}
		html += ">";
	}
	const children = element.props.children;
	if (Array.isArray(children) && children.length !== 0) {
		children.forEach(
			(child: React.JSX.Element) => (html += createElementToString(child))
		);
	} else html += createElementToString(children);

	if (type) html += `</${type}/>`;

	return html;
};
