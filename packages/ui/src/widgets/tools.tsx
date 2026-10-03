import { Calculator as CalcIcon, ListTodo, StickyNote, X } from "lucide-react";
import { useState } from "react";
import { evaluate, formatNumber } from "../lib/calc";
import * as todo from "../lib/todo";
import { useOption } from "./hooks";
import type { FaceProps, PanelProps } from "./types";
import { Big, Btn, Small, Stack } from "./ui";

export const CalculatorFace = () => <CalcIcon size={24} />;

const KEYS = [
  "7",
  "8",
  "9",
  "/",
  "4",
  "5",
  "6",
  "*",
  "1",
  "2",
  "3",
  "-",
  "0",
  ",",
  "%",
  "+",
  "(",
  ")",
  "^",
  "=",
];

export function CalculatorPanel() {
  const [expr, setExpr] = useState("");
  const [shown, setShown] = useState("");
  const run = () => {
    try {
      const v = formatNumber(evaluate(expr));
      setShown(v);
      setExpr(v.replace(/ /g, ""));
    } catch (e) {
      setShown(e instanceof Error ? e.message : "Error");
    }
  };
  return (
    <div className="space-y-2">
      <input
        aria-label="Expression"
        value={expr}
        onChange={(e) => {
          setExpr(e.target.value);
          setShown("");
        }}
        onKeyDown={(e) => e.key === "Enter" && run()}
        placeholder="2+2*3, sqrt(16), 15% …"
        className="w-full rounded-lg bg-white/15 px-3 py-2 text-lg outline-none"
      />
      <div className="h-6 truncate text-right text-sm opacity-80" aria-live="polite">
        {shown}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {KEYS.map((k) => (
          <button
            key={k}
            onClick={() => (k === "=" ? run() : setExpr((x) => x + k))}
            className={`rounded-lg py-1.5 ${k === "=" ? "bg-accent text-white" : "bg-white/15 hover:bg-white/25"}`}
          >
            {k}
          </button>
        ))}
        <button
          onClick={() => {
            setExpr("");
            setShown("");
          }}
          className="col-span-4 rounded-lg bg-white/10 py-1 text-sm hover:bg-white/20"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export function TodoFace({ item }: FaceProps) {
  const [raw] = useOption(item, "items");
  const open = todo.openCount(todo.parseTodos(raw));
  return (
    <Stack>
      <ListTodo size={18} />
      <Big>{open}</Big>
      <Small>open</Small>
    </Stack>
  );
}

export function TodoPanel({ item }: PanelProps) {
  const [raw, setRaw] = useOption(item, "items");
  const [text, setText] = useState("");
  const list = todo.parseTodos(raw);
  const save = (next: todo.TodoItem[]) => setRaw(todo.serializeTodos(next));
  return (
    <div className="flex h-full flex-col gap-2 text-sm">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save(todo.addTodo(list, text, crypto.randomUUID()));
          setText("");
        }}
      >
        <input
          aria-label="New task"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task"
          className="min-w-0 flex-1 rounded-lg bg-white/15 px-2 py-1 outline-none"
        />
        <Btn primary onClick={() => {}}>
          Add
        </Btn>
      </form>
      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {list.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => save(todo.toggleTodo(list, t.id))}
              aria-label={t.text}
            />
            <span className={`flex-1 truncate ${t.done ? "line-through opacity-50" : ""}`}>
              {t.text}
            </span>
            <button
              aria-label={`Delete ${t.text}`}
              onClick={() => save(todo.removeTodo(list, t.id))}
              className="rounded p-0.5 hover:bg-white/15"
            >
              <X size={14} />
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="opacity-60">Nothing to do.</li>}
      </ul>
      {list.some((t) => t.done) && (
        <Btn onClick={() => save(todo.clearDone(list))}>Clear completed</Btn>
      )}
    </div>
  );
}

export function NoteFace({ item, wide }: FaceProps) {
  const [text] = useOption(item, "text");
  const first = text.split("\n").find((l) => l.trim()) ?? "";
  return first ? (
    <span
      className={`px-1.5 text-left text-[11px] leading-tight ${wide ? "line-clamp-3" : "line-clamp-4"}`}
    >
      {first}
    </span>
  ) : (
    <StickyNote size={22} className="opacity-70" />
  );
}

export function NotePanel({ item }: PanelProps) {
  const [text, setText] = useOption(item, "text");
  return (
    <textarea
      aria-label="Note"
      value={text}
      onChange={(e) => setText(e.target.value.slice(0, 5000))}
      placeholder="Write a note…"
      className="h-full w-full resize-none rounded-lg bg-yellow-200/20 p-3 text-sm outline-none"
    />
  );
}
