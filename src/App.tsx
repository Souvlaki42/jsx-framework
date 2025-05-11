import { useState } from "~/jsx-runtime";

export default function App() {
	const [value, setValue] = useState<string>("");
	const [items, setItems] = useState<string[]>([]);

	return (
		<div>
			<input value={value} onChange={(e: any) => setValue(e.target.value)} />
			<button onClick={() => setItems([...items, value])}>Add</button>
			<ul>
				{items.map((item, index) => (
					<li key={index}>
						{item}
						<button
							onClick={() => setItems(items.filter((_, i) => i !== index))}
						>
							Remove
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
