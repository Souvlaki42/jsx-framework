import Framework from "~/jsx-runtime";

export default function App() {
	const [count, setCount] = Framework.useState(0);

	return <h1 onClick={() => setCount(count + 1)}>Count: {count}</h1>;
}
