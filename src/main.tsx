function App() {
	return (
		<div className="test">
			Hello, World!
			<br />
			<button onclick="alert('Hello, There!')">Click Me!</button>
		</div>
	);
}

const app = document.querySelector("#app");

if (!app) throw new Error("Could not find #app element");

app.append(<App />);

