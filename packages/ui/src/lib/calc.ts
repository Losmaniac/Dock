/**
 * Safe arithmetic evaluator (no eval). Grammar: + - * / % ^, unary minus, parentheses,
 * decimals with "." or ",", and the functions sqrt, abs, round, floor, ceil.
 * A trailing "%" after a number means percent (50% = 0,5).
 */
type Tok = { t: "num"; v: number } | { t: "op"; v: string } | { t: "fn"; v: string };

const FNS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
};

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  const s = src.replace(/\s+/g, "");
  for (let i = 0; i < s.length;) {
    const c = s[i]!;
    const num = /^\d*[.,]?\d+(?:[eE][+-]?\d+)?|^\d+[.,]?/.exec(s.slice(i));
    if (num) {
      out.push({ t: "num", v: Number(num[0].replace(",", ".")) });
      i += num[0].length;
    } else if (/[a-z]/i.test(c)) {
      const m = /^[a-z]+/i.exec(s.slice(i))![0].toLowerCase();
      if (!(m in FNS)) throw new Error(`Unknown function ${m}`);
      out.push({ t: "fn", v: m });
      i += m.length;
    } else if ("+-*/%^()".includes(c)) {
      out.push({ t: "op", v: c });
      i++;
    } else throw new Error(`Unexpected "${c}"`);
  }
  return out;
}

export function evaluate(src: string): number {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const eat = (v: string) => {
    const t = peek();
    if (t?.t === "op" && t.v === v) return (pos++, true);
    return false;
  };

  function primary(): number {
    const t = toks[pos++];
    if (!t) throw new Error("Unexpected end");
    if (t.t === "num") {
      let v = t.v;
      // "50%" is a percentage only when no operand follows the sign (otherwise it is modulo).
      const next = peek();
      const after = toks[pos + 1];
      if (
        next?.t === "op" &&
        next.v === "%" &&
        (!after || (after.t === "op" && !"(".includes(after.v)))
      ) {
        pos++;
        v /= 100;
      }
      return v;
    }
    if (t.t === "fn") {
      if (!eat("(")) throw new Error(`Expected ( after ${t.v}`);
      const v = expr();
      if (!eat(")")) throw new Error("Missing )");
      return FNS[t.v]!(v);
    }
    if (t.v === "(") {
      const v = expr();
      if (!eat(")")) throw new Error("Missing )");
      return v;
    }
    if (t.v === "-") return -power();
    if (t.v === "+") return power();
    throw new Error(`Unexpected "${t.v}"`);
  }
  function power(): number {
    const base = primary();
    return eat("^") ? base ** power() : base; // right associative
  }
  function term(): number {
    let v = power();
    for (;;) {
      if (eat("*")) v *= power();
      else if (eat("/")) v /= power();
      else if (eat("%")) v %= power();
      else return v;
    }
  }
  function expr(): number {
    let v = term();
    for (;;) {
      if (eat("+")) v += term();
      else if (eat("-")) v -= term();
      else return v;
    }
  }

  const result = expr();
  if (pos < toks.length) throw new Error("Unexpected input");
  if (!Number.isFinite(result)) throw new Error("Not a finite number");
  return result;
}

/** Display with a decimal comma and a space as thousands separator, trimming float noise. */
export function formatNumber(n: number): string {
  const rounded = Number(n.toPrecision(12));
  const [int = "", frac] = String(Math.abs(rounded)).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${rounded < 0 ? "-" : ""}${grouped}${frac ? "," + frac : ""}`;
}
