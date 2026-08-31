// Preload for ./test. Deno ships a real Web Storage
// global: assigning globalThis.sessionStorage is ignored,
// and the store persists for the life of the process. One
// test file stubs sessionStorage by assignment. Installing
// a writable in-memory fake first makes that stub take
// effect and keeps the test off persistent storage.
// Node-neutral.
const store = new Map<string, string>();

Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
        removeItem: (key: string) => {
            store.delete(key);
        },
        clear: () => {
            store.clear();
        },
        key: (index: number) => [...store.keys()][index] ?? null,
        get length() {
            return store.size;
        },
    },
    writable: true,
    configurable: true,
});

// Force module scope: this file and
// local-storage-stub.ts both declare a top-level
// `store` with no import/export of their own, so
// without this, tsc's default module detection treats
// both as one shared global script and rejects the
// second `store` as a redeclaration.
export {};
