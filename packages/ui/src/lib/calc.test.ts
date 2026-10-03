import { describe, expect, it } from "vitest";
import { evaluate, formatNumber } from "./calc";

describe("calc", () => {
  it("respects precedence, parentheses and right-associative powers", () => {
    expect(evaluate("2+3*4")).toBe(14);
    expect(evaluate("(2+3)*4")).toBe(20);
    expect(evaluate("2^3^2")).toBe(512);
    expect(evaluate("-2^2")).toBe(-4);
    expect(evaluate("10-2-3")).toBe(5);
  });
  it("accepts decimal commas and spaces", () => expect(evaluate(" 1,5 * 4 ")).toBe(6));
  it("supports functions and percent", () => {
    expect(evaluate("sqrt(16)+abs(-2)")).toBe(6);
    expect(evaluate("50%")).toBe(0.5);
    expect(evaluate("200*10%")).toBe(20);
    expect(evaluate("10%3")).toBe(1);
  });
  it("rejects bad input instead of evaluating it", () => {
    for (const bad of ["", "2+", "alert(1)", "1/0", "2 $ 3", "((1)", "1)"])
      expect(() => evaluate(bad)).toThrow();
  });
  it("formats with comma and space separators", () => {
    expect(formatNumber(1234567.891)).toBe("1 234 567,891");
    expect(formatNumber(0.1 + 0.2)).toBe("0,3");
    expect(formatNumber(-5)).toBe("-5");
  });
});
