import { useState } from "~/jsx-runtime";

export default function App() {
	const [value, setValue] = useState<string>("");
	const [items, setItems] = useState<string[]>([]);

	return (
		<div>
			<input
				value={value}
				onChange={(e: Event) => setValue((e.target as HTMLInputElement).value)}
			/>
			<button type="button" onClick={() => setItems([...items, value])}>
				Add
			</button>
			<ul>
				{items.map((item, index) => (
					<li key={index}>
						{item}
						<button
							type="button"
							onClick={() => setItems(items.filter((_, i) => i !== index))}
						>
							X
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
