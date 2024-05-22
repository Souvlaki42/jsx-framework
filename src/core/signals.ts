import { Signal } from "signal-polyfill";

let enqueue = true;
const watcher = new Signal.subtle.Watcher(() => {
	if (enqueue) {
		enqueue = false;
		queueMicrotask(() => {
			enqueue = true;
			for (const computed of watcher.getPending()) {
				computed.get();
			}
			watcher.watch();
		});
	}
});

export const effect = (callback: () => unknown): (() => unknown) => {
	const computed = new Signal.Computed(() => {
		callback();
	});
	watcher.watch(computed);
	computed.get();

	return () => {
		watcher.unwatch(computed);
	};
};

export const state = <T>(
	initialValue: T,
	options?: Signal.Options<T>
): Signal.State<T> => {
	return new Signal.State<T>(initialValue, options);
};

export const computed = <T>(
	callback: () => T,
	options?: Signal.Options<T>
): Signal.Computed<T> => {
	return new Signal.Computed<T>(callback, options);
};
