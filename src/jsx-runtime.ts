declare global {
	namespace JSX {
		type IntrinsicElements = Record<
			keyof HTMLElementTagNameMap,
			Record<string, any>
		>;
	}
}

export type Component = (props: Record<string, any>) => any;

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

	const isProperty = (key: string) => key !== "children";

	Object.keys(fiber.props)
		.filter(isProperty)
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

function commitWork(fiber: any) {
	if (!fiber) {
		return;
	}

	let domParentFiber = fiber.parent;
	while (!domParentFiber.dom) {
		domParentFiber = domParentFiber.dom;
	}

	const domParent = fiber.parent.dom;

	if (fiber.effectTag === "PLACEMENT" && fiber.dom) {
		domParent.appendChild(fiber.dom);
	} else if (fiber.effectTag === "UPDATE" && fiber.dom) {
		updateDom(fiber.dom, fiber.alternate.props, fiber.props);
	}

	domParent.append(fiber.dom);
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
		updateHostComponent(fiber);
	}

	if (!fiber.dom) {
		fiber.dom = createDom(fiber);
	}

	const elements = fiber.props.children;
	reconcileChildren(fiber, elements);

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

let wipFiber: any = null;
let hookIndex = 0;

function updateFunctionComponent(fiber: any) {
	wipFiber = fiber;
	hookIndex = 0;
	wipFiber.hooks = [];

	const children = [fiber.type(fiber.props)];
	reconcileChildren(fiber, children);
}

export function useState(initialState: any) {
	const oldHook =
		wipFiber.alternate &&
		wipFiber.alternate.hooks &&
		wipFiber.alternate.hooks[hookIndex];

	const hook = {
		state: oldHook ? oldHook.state : initialState,
		queue: [],
	};

	const actions = oldHook ? oldHook.queue : [];
	actions.forEach((action) => action(hook.state));

	const setState = (action: any) => {
		hook.queue.push(action);
		wipRoot = {
			dom: currentRoot.dom,
			props: currentRoot.props,
			alternate: currentRoot,
		};
		nextUnitOfWork = wipRoot;
	};

	wipFiber.hooks.push(hook);
	hookIndex++;

	return [hook.state];
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
	let prevSibling = null;

	while (index < elements.length || oldFiber != null) {
		const element = elements[index];
		let newFiber = null;

		const sameType = oldFiber && element && element.type === oldFiber.type;

		if (sameType) {
			newFiber = {
				type: oldFiber.type,
				props: element.props,
				dom: oldFiber.dom,
				parent: wipFiber,
				alternate: oldFiber,
				effectTag: "UPDATE",
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
			};
		}

		if (oldFiber) {
			oldFiber = oldFiber.sibling;
		}

		if (index === 0) {
			wipFiber.child = newFiber;
		} else {
			prevSibling.sibling = newFiber;
		}

		prevSibling = newFiber;
		index++;
	}
}

const isEvent = (key: string) => key.startsWith("on");
const isProperty = (key: string) => key !== "children" && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (_prev, next) => (key) => !(key in next);
function updateDom(dom: any, prevProps: any, nextProps: any) {
	Object.keys(prevProps)
		.filter(isEvent)
		.filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
		.forEach((name) => {
			const eventName = name.toLowerCase().substring(2);
			dom.removeEventListener(eventName, prevProps[name]);
		});

	Object.keys(prevProps)
		.filter(isProperty)
		.filter(isGone(prevProps, nextProps))
		.forEach((name) => (dom[name] = ""));

	Object.keys(nextProps)
		.filter(isProperty)
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

const Framework = { createElement, render, useState };
export default Framework;
