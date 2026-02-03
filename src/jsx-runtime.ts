declare global {
  namespace JSX {
    type IntrinsicElements = Record<
      keyof HTMLElementTagNameMap,
      Record<string, any>
    >;
  }
}

type Child = VNode | string | number | boolean | null | undefined;

type Children = Child | Child[];

type Component<P = {}> = (props: P & { children?: Children }) => Children;

type ComponentType<P = {}> = string | Component<P>;

type Props = {
  [key: string]: any;
  children?: Children;
};

type VNode = {
  type: ComponentType;
  props: Props;
};

type SetStateAction<S> = S | ((prevState: S) => S);

type Hook<S> = {
  state: S;
  queue: SetStateAction<S>[];
};

type Fiber = {
  type?: ComponentType;
  props: Props;
  dom: Node | null;
  parent: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  alternate: Fiber | null;
  deletions: Fiber[];
  effectTag?: "UPDATE" | "PLACEMENT" | "DELETION";
  hooks?: Hook<any>[];
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

export function Fragment(props: { children: Children }): Children {
  return props.children;
}

export function createElement(
  element: ComponentType,
  props?: Record<string, any> | null,
  ...children: Children[]
) {
  return {
    type: element,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" && child !== null && "type" in child
          ? child
          : createTextElement(child?.toString() ?? ""),
      ),
    },
  };
}

function createDom(fiber: Fiber) {
  if (!fiber.props) {
    console.error(fiber);
    throw new Error(`createDom called on fiber with no props: ${fiber.type}`);
  }

  if (typeof fiber.type !== "string") {
    throw new Error("createDom can only create DOM for string types");
  }

  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode(fiber.props.nodeValue)
      : document.createElement(fiber.type);

  if (!(dom instanceof HTMLElement)) return dom;

  Object.keys(fiber.props)
    .filter(isEvent)
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, fiber.props[name]);
    });

  Object.keys(fiber.props)
    .filter(isAttribute)
    .forEach((name) => {
      dom.setAttribute(name, fiber.props[name] ?? "");
    });
  return dom;
}

let nextUnitOfWork: Fiber | null = null;
let wipRoot: Fiber | null = null;
let currentRoot: Fiber | null = null;

export function render(element: VNode, container: HTMLElement) {
  wipRoot = {
    dom: container,
    props: { children: [element] },
    alternate: currentRoot,
    parent: null,
    child: null,
    sibling: null,
    deletions: [],
  };
  nextUnitOfWork = wipRoot;
}

function commitRoot() {
  wipRoot?.deletions.map((delFiber) =>
    commitDeletion(delFiber, wipRoot?.dom ?? null),
  );
  commitWork(wipRoot?.child ?? null);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber: Fiber | null) {
  if (!fiber) return;

  let domParentFiber: Fiber | null = fiber.parent;
  while (domParentFiber && !domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber?.dom;

  if (fiber.effectTag === "PLACEMENT" && fiber.dom !== null) {
    domParent?.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom) {
    updateDom(fiber.dom, fiber.alternate?.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    commitDeletion(fiber, domParent ?? null);
    return;
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber: Fiber | null, domParent: Node | null) {
  if (fiber?.dom) {
    domParent?.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber?.child ?? null, domParent);
  }
}

function workLoop(deadline: IdleDeadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork) ?? null;
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(fiber: Fiber) {
  const functionComponent = typeof fiber.type === "function";

  if (functionComponent) {
    updateFunctionComponent(fiber);
  } else {
    if (typeof fiber.type === "string" && !fiber.dom) {
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

    if (!nextFiber.parent) break;
    nextFiber = nextFiber.parent;
  }
}

function updateFunctionComponent(fiber: Fiber) {
  wipFiber = fiber;
  hookIndex = 0;

  if (!wipFiber) {
    throw new Error(
      "wipFiber is null. Ensure it's set before calling useState.",
    );
  }

  wipFiber.hooks = [];

  if (typeof fiber.type !== "function") {
    throw new Error("fiber.type is not a function");
  }

  const result = fiber.type(fiber.props);
  reconcileChildren(fiber, result);
}

let wipFiber: Fiber | null = null;
let hookIndex = 0;

export function useState<T>(
  initialState: T,
): [T, (action: SetStateAction<T>) => void] {
  if (!wipFiber) {
    throw new Error(
      "useState must be called within a function component's render phase.",
    );
  }

  const oldHook = wipFiber.alternate?.hooks?.[hookIndex] as Hook<T> | undefined;

  const hook: Hook<T> = {
    state: oldHook ? oldHook.state : initialState,
    queue: [],
  };

  const actions = oldHook?.queue ?? [];
  actions.forEach((action) => {
    hook.state =
      typeof action === "function"
        ? (action as (prevState: T) => T)(hook.state)
        : action;
  });

  const setState = (action: T | ((prevState: T) => T)) => {
    hook.queue.push(action);
    wipRoot = {
      dom: currentRoot?.dom ?? null,
      props: currentRoot?.props ?? {},
      alternate: currentRoot,
      parent: null,
      child: null,
      sibling: null,
      deletions: [],
    };
    nextUnitOfWork = wipRoot;
  };

  wipFiber.hooks?.push(hook);
  hookIndex++;
  return [hook.state, setState];
}

function updateHostComponent(fiber: Fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  reconcileChildren(fiber, fiber.props.children ?? []);
}

function normalizeChildren(children: Children): VNode[] {
  if (!children || typeof children === "boolean") return [];

  const childArray = Array.isArray(children) ? children : [children];

  return childArray.flatMap((child) => {
    if (!child || typeof child === "boolean") return [];

    if (typeof child === "string" || typeof child === "number") {
      return [createTextElement(child.toString())];
    }

    if (Array.isArray(child)) {
      return normalizeChildren(child);
    }

    return [child];
  });
}

function reconcileChildren(wipFiber: Fiber, elements: Children) {
  const flatElements: VNode[] = normalizeChildren(elements);

  let index = 0;
  let oldFiber = wipFiber.alternate?.child ?? null;
  let prevSibling: Fiber | null = null;

  wipFiber.deletions = [];

  while (index < flatElements.length || oldFiber != null) {
    const element = flatElements[index];
    let newFiber: Fiber | null = null;

    const sameType = oldFiber && element && element.type === oldFiber.type;

    if (sameType) {
      newFiber = {
        type: oldFiber?.type,
        props: element.props,
        dom: oldFiber?.dom ?? null,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
        child: null,
        sibling: null,
        deletions: [],
      };
    } else if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
        child: null,
        sibling: null,
        deletions: [],
      };
    }

    if (oldFiber && !sameType) {
      oldFiber.effectTag = "DELETION";
      wipFiber.deletions.push(oldFiber);
    }

    if (newFiber) {
      if (prevSibling) {
        prevSibling.sibling = newFiber;
      } else {
        wipFiber.child = newFiber;
      }
      prevSibling = newFiber;
    }

    index++;
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
  }
}

const isNew = (prev: Props, next: Props) => (key: string) =>
  prev[key] !== next[key];

const isGone = (_prev: Props, next: Props) => (key: string) => !(key in next);

function updateDom(dom: Node, prevProps: Props = {}, nextProps: Props) {
  if (!(dom instanceof HTMLElement)) return;

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
    .forEach((name) => {
      dom.removeAttribute(name);
    });

  Object.keys(nextProps)
    .filter(isAttribute)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      dom.setAttribute(name, nextProps[name]);
    });

  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventName = name.toLowerCase().substring(2);
      dom.addEventListener(eventName, nextProps[name]);
    });
}
