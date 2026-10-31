import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
afterEach(() => cleanup());
Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  value: function () {
    this.setAttribute("open", "");
  },
  writable: true,
});
Object.defineProperty(HTMLDialogElement.prototype, "close", {
  value: function () {
    this.removeAttribute("open");
  },
  writable: true,
});
