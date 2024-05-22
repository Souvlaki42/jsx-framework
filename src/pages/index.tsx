import { state } from "@/core/signals.ts";

export default function Component() {
	let window = { count: state(0) };
	return (
		<>
			<div>Count: {window.count.get()}</div>
			<button
				onClick={() => {
					window.count.set(window.count.get() + 1);
					console.log(window.count.get());
				}}
			>
				+1
			</button>
		</>
	);
}
