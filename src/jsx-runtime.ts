declare global {
	namespace JSX {
		type IntrinsicElements = Record<
			keyof HTMLElementTagNameMap,
			Record<string, any>
		>;
	}
}

type Props = {
	[key: string]: any;
	children?: VNode[];
};

type VNode = {
	type: string | Function;
	props: Props;
};

type Fiber = {
	type: string | Function;
	props: any;
	dom: HTMLElement | Text | null;
	parent: Fiber | null;
	child: Fiber | null;
	sibling: Fiber | null;
	alternate: Fiber | null;
	effectTag?: "UPDATE" | "PLACEMENT" | "DELETION";
	hooks?: any[];
};

type Hook = {
	state: any;
	queue: ((state: any) => any)[];
};

const isEvent = (key: string) => key.startsWith("on");
const isAttribute = (key: string) => key !== "children" && !isEvent(key);

function createTextElement(text: string) {
	return {
		type: "TEXT_ELEMENT",
		props: {
			nodeValue: text,
			children: [],
		},
	};
}

export function createElement(
	element: string | Function,
	props?: Record<string, any> | null,
	...children: any[]
) {
	return {
		type: element,
		props: {
			...props,
			children: children.map((child) =>
				typeof child === "object" ? child : createTextElement(child)
			),
		},
	};
}

function createDom(fiber: any) {
	const dom =
		fiber.type === "TEXT_ELEMENT"
			? document.createTextNode(fiber.props.nodeValue)
			: document.createElement(fiber.type);

	Object.keys(fiber.props)
		.filter(isEvent)
		.forEach((name) => {
			const eventType = name.toLowerCase().substring(2);
			dom.addEventListener(eventType, fiber.props[name]);
		});

	Object.keys(fiber.props)
		.filter(isAttribute)
		.forEach((name) => {
			dom[name] = fiber.props[name];
		});
	return dom;
}

export function render(element: any, container: HTMLElement) {
	wipRoot = {
		dom: container,
		props: {
			children: [element],
		},
		alternate: currentRoot,
	};
	nextUnitOfWork = wipRoot;
}

let nextUnitOfWork: any = null;
let wipRoot: any = null;
let currentRoot: any = null;

function commitRoot() {
	currentRoot = wipRoot;
	commitWork(wipRoot.child);
	wipRoot = null;
}

function commitWork(fiber: Fiber | null) {
	if (!fiber) {
		return;
	}

	let domParentFiber: Fiber | null = fiber.parent;
	while (domParentFiber && !domParentFiber.dom) {
		domParentFiber = domParentFiber.parent;
	}
	if (!domParentFiber) {
		throw new Error("commitWork: no parent DOM node found");
	}
	const domParent = domParentFiber.dom;

	if (fiber.effectTag === "PLACEMENT" && fiber.dom !== null) {
		domParent?.appendChild(fiber.dom);
	} else if (fiber.effectTag === "UPDATE" && fiber.dom) {
		updateDom(fiber.dom, fiber.alternate!.props, fiber.props);
		// } else if (fiber.effectTag === "DELETION") {
		//   // handle deletion if you’ve implemented it
		//   commitDeletion(fiber, domParent);
	}

	commitWork(fiber.child);
	commitWork(fiber.sibling);
}

function workLoop(deadline: IdleDeadline) {
	let shouldYield = false;
	while (nextUnitOfWork && !shouldYield) {
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
		shouldYield = deadline.timeRemaining() < 1;
	}

	if (!nextUnitOfWork && wipRoot) {
		commitRoot();
	}

	requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(fiber: any) {
	const functionComponent = fiber.type instanceof Function;

	if (functionComponent) {
		updateFunctionComponent(fiber);
	} else {
		if (!fiber.dom) {
			fiber.dom = createDom(fiber);
		}
		updateHostComponent(fiber);
	}

	if (fiber.child) {
		return fiber.child;
	}

	let nextFiber = fiber;
	while (nextFiber) {
		if (nextFiber.sibling) {
			return nextFiber.sibling;
		}
		nextFiber = nextFiber.parent;
	}
}

function updateFunctionComponent(fiber: any) {
	wipFiber = fiber;
	hookIndex = 0;

	if (!wipFiber) {
		throw new Error(
			"wipFiber is null. Ensure it's set before calling useState."
		);
	}

	wipFiber.hooks = [];

	const children = [fiber.type(fiber.props)];
	reconcileChildren(fiber, children);
}

let wipFiber: Fiber | null = null;
let hookIndex = 0;

export function useState<T>(
	initialState: T
): [T, (action: T | ((prevState: T) => T)) => void] {
	if (!wipFiber) {
		throw new Error(
			"useState must be called within a function component's render phase."
		);
	}

	const oldHook = wipFiber.alternate?.hooks?.[hookIndex] as Hook | undefined;

	const hook: Hook = {
		state: oldHook ? oldHook.state : initialState,
		queue: [],
	};

	const actions = oldHook ? oldHook.queue : [];
	actions.forEach((action) => {
		hook.state = typeof action === "function" ? action(hook.state) : action;
	});

	const setState = (action: T | ((prevState: T) => T)) => {
		hook.queue.push(action as (state: any) => any);
		wipRoot = {
			dom: currentRoot!.dom,
			props: currentRoot!.props,
			alternate: currentRoot,
			parent: null,
			child: null,
			sibling: null,
		};
		nextUnitOfWork = wipRoot;
	};

	wipFiber.hooks!.push(hook);
	hookIndex++;
	return [hook.state, setState];
}

function updateHostComponent(fiber: any) {
	if (!fiber.dom) {
		fiber.dom = createDom(fiber);
	}

	reconcileChildren(fiber, fiber.props.children);
}

function reconcileChildren(wipFiber: any, elements: any) {
	let index = 0;
	let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
	let prevSibling: Fiber | null = null;

	while (index < elements.length || oldFiber != null) {
		const element = elements[index];
		let newFiber: Fiber | null = null;

		const sameType = oldFiber && element && element.type === oldFiber.type;

		if (sameType) {
			newFiber = {
				type: oldFiber.type,
				props: element.props,
				dom: oldFiber.dom,
				parent: wipFiber,
				alternate: oldFiber,
				effectTag: "UPDATE",
				child: null,
				sibling: null,
			};
		}

		if (element && !sameType) {
			newFiber = {
				type: element.type,
				props: element.props,
				dom: null,
				parent: wipFiber,
				alternate: null,
				effectTag: "PLACEMENT",
				child: null,
				sibling: null,
			};
		}

		if (oldFiber) {
			oldFiber = oldFiber.sibling;
		}

		if (index === 0) {
			wipFiber.child = newFiber;
		} else if (prevSibling && newFiber) {
			prevSibling.sibling = newFiber;
		}

		prevSibling = newFiber;
		index++;
	}
}

const isNew = (prev: Props, next: Props) => (key: string) =>
	prev[key] !== next[key];
const isGone = (_prev: Props, next: Props) => (key: string) => !(key in next);
function updateDom(dom: any, prevProps: any, nextProps: any) {
	Object.keys(prevProps)
		.filter(isEvent)
		.filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
		.forEach((name) => {
			const eventName = name.toLowerCase().substring(2);
			dom.removeEventListener(eventName, prevProps[name]);
		});

	Object.keys(prevProps)
		.filter(isAttribute)
		.filter(isGone(prevProps, nextProps))
		.forEach((name) => (dom[name] = ""));

	Object.keys(nextProps)
		.filter(isAttribute)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => (dom[name] = nextProps[name]));

	Object.keys(nextProps)
		.filter(isEvent)
		.filter(isNew(prevProps, nextProps))
		.forEach((name) => {
			const eventName = name.toLowerCase().substring(2);
			dom.addEventListener(eventName, nextProps[name]);
		});
}
