import { Buffer } from 'buffer';

// Make Buffer available globally
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  globalThis.Buffer = Buffer;
}

// Polyfill process.env if needed
if (typeof process === 'undefined') {
  globalThis.process = {
    env: {},
    nextTick: (fn) => setTimeout(fn, 0),
  };
}

export {};