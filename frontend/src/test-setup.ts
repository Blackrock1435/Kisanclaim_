import "@testing-library/jest-dom/vitest";
// jsdom lacks ResizeObserver (used by Recharts' ResponsiveContainer)
(globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
