export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export function parseTodos(raw: string | undefined): TodoItem[] {
  try {
    const v = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (t): t is TodoItem =>
          !!t &&
          typeof t.id === "string" &&
          typeof t.text === "string" &&
          typeof t.done === "boolean",
      )
      .slice(0, 100);
  } catch {
    return [];
  }
}

export const serializeTodos = (t: TodoItem[]): string => JSON.stringify(t);

export const addTodo = (t: TodoItem[], text: string, id: string): TodoItem[] =>
  text.trim() ? [...t, { id, text: text.trim().slice(0, 200), done: false }].slice(0, 100) : t;

export const toggleTodo = (t: TodoItem[], id: string): TodoItem[] =>
  t.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
export const removeTodo = (t: TodoItem[], id: string): TodoItem[] => t.filter((x) => x.id !== id);
export const clearDone = (t: TodoItem[]): TodoItem[] => t.filter((x) => !x.done);
export const openCount = (t: TodoItem[]): number => t.filter((x) => !x.done).length;
