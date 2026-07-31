import "@testing-library/jest-dom/vitest";

// jsdom does not implement the Pointer Events capture APIs (or scrollIntoView),
// which Radix UI's Select primitive calls when opening/positioning its content.
// Without these no-op polyfills, any test that opens a Select throws
// "target.hasPointerCapture is not a function" (Plan 03-05 — first use of Select
// in this test suite; RadioGroup/Checkbox don't call these APIs).
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
