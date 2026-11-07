import '@testing-library/jest-dom';

// Node 25+ ships its own Web Storage globals, which shadow jsdom's. Without
// --localstorage-file, Node's `localStorage` is undefined, so rebind both to jsdom's.
// Vitest exposes the jsdom instance as `globalThis.jsdom`. Its window comes from another
// realm, so check with `typeof` rather than `instanceof`.
const jsdom: unknown = Reflect.get(globalThis, 'jsdom');

if (typeof jsdom === 'object' && jsdom !== null && 'window' in jsdom) {
  const { window: jsdomWindow } = jsdom;
  for (const key of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      enumerable: true,
      get: () => Reflect.get(Object(jsdomWindow), key),
    });
  }
}
