import { describe, expect, it } from "vitest";
import {
  addTodo,
  clearDone,
  openCount,
  parseTodos,
  removeTodo,
  serializeTodos,
  toggleTodo,
} from "./todo";

describe("todo", () => {
  it("adds trimmed items and ignores blanks", () => {
    let t = addTodo([], "  Buy milk ", "1");
    t = addTodo(t, "   ", "2");
    expect(t).toEqual([{ id: "1", text: "Buy milk", done: false }]);
  });
  it("toggles, counts, clears and removes", () => {
    let t = addTodo(addTodo([], "a", "1"), "b", "2");
    t = toggleTodo(t, "1");
    expect(openCount(t)).toBe(1);
    expect(clearDone(t).map((x) => x.id)).toEqual(["2"]);
    expect(removeTodo(t, "2").map((x) => x.id)).toEqual(["1"]);
  });
  it("survives corrupt stored data", () => {
    expect(parseTodos("{bad")).toEqual([]);
    expect(parseTodos('{"a":1}')).toEqual([]);
    expect(parseTodos('[{"id":"x","text":"ok","done":false},{"nope":1}]')).toHaveLength(1);
    expect(parseTodos(serializeTodos([{ id: "1", text: "t", done: true }]))).toHaveLength(1);
  });
});
