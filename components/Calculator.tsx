"use client";

import { useEffect, useState } from "react";

type AngleMode = "DEG" | "RAD" | "GRAD";

// 6-column keypad. Every key is unique; "=" spans the last 4 columns.
const keys = [
  ["MC", "MR", "M+", "M-", "C", "⌫"],
  ["sin", "cos", "tan", "log", "ln", "√"],
  ["sin⁻¹", "cos⁻¹", "tan⁻¹", "x²", "xʸ", "1/x"],
  ["(", ")", "π", "e", "%", "!"],
  ["7", "8", "9", "÷", "Ans", "±"],
  ["4", "5", "6", "×", "EXP", "AC"],
  ["1", "2", "3", "−", "0", "."],
  ["+", "00", "="]
];

const BINARY_OPS = ["+", "−", "×", "÷", "^", "%", "!"];
const FUNCTION_KEYS = ["sin", "cos", "tan", "sin⁻¹", "cos⁻¹", "tan⁻¹", "log", "ln"];

/* ------------------------------------------------------------------ */
/* Math helpers                                                        */
/* ------------------------------------------------------------------ */

function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0 || n > 170) {
    throw new Error("Factorial requires an integer from 0 to 170.");
  }
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function toRad(value: number, mode: AngleMode) {
  if (mode === "RAD") return value;
  if (mode === "GRAD") return (value * Math.PI) / 200;
  return (value * Math.PI) / 180;
}

function fromRad(value: number, mode: AngleMode) {
  if (mode === "RAD") return value;
  if (mode === "GRAD") return (value * 200) / Math.PI;
  return (value * 180) / Math.PI;
}

const FUNCTION_TOKENS = new Set(["sin", "cos", "tan", "asin", "acos", "atan", "sqrt", "log", "ln"]);

function applyFunction(name: string, v: number, mode: AngleMode): number {
  const domainError = () => new Error("Math domain error.");
  let r: number;

  switch (name) {
    case "sin":
      r = Math.sin(toRad(v, mode));
      break;
    case "cos":
      r = Math.cos(toRad(v, mode));
      break;
    case "tan": {
      const rad = toRad(v, mode);
      if (Math.abs(Math.cos(rad)) < 1e-14) throw domainError();
      r = Math.tan(rad);
      break;
    }
    case "asin":
      if (v < -1 || v > 1) throw domainError();
      r = fromRad(Math.asin(v), mode);
      break;
    case "acos":
      if (v < -1 || v > 1) throw domainError();
      r = fromRad(Math.acos(v), mode);
      break;
    case "atan":
      r = fromRad(Math.atan(v), mode);
      break;
    case "sqrt":
      if (v < 0) throw domainError();
      r = Math.sqrt(v);
      break;
    case "log":
      if (v <= 0) throw domainError();
      r = Math.log10(v);
      break;
    case "ln":
      if (v <= 0) throw domainError();
      r = Math.log(v);
      break;
    default:
      throw new Error("Unknown function.");
  }

  if (!Number.isFinite(r)) throw domainError();
  // Remove floating point noise such as sin(180°) = 1.2e-16
  if (["sin", "cos", "tan"].includes(name) && Math.abs(r) < 1e-14) return 0;
  return r;
}

/* ------------------------------------------------------------------ */
/* Tokenizer                                                           */
/* ------------------------------------------------------------------ */

const WORDS: [string, string][] = [
  ["sin⁻¹", "asin"],
  ["cos⁻¹", "acos"],
  ["tan⁻¹", "atan"],
  ["sqrt", "sqrt"],
  ["sin", "sin"],
  ["cos", "cos"],
  ["tan", "tan"],
  ["log", "log"],
  ["ln", "ln"],
  ["√", "sqrt"],
  ["π", "PI"],
  ["e", "E"]
];

const OPERATORS: Record<string, string> = {
  "+": "+",
  "-": "-",
  "−": "-",
  "*": "*",
  "×": "*",
  "/": "/",
  "÷": "/",
  "^": "^",
  "(": "(",
  ")": ")",
  "%": "%",
  "!": "!"
};

function tokenize(src: string): string[] {
  const raw: string[] = [];
  let i = 0;

  outer: while (i < src.length) {
    const c = src[i];

    if (/\s/.test(c)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(c)) {
      const m = /^(?:\d+\.?\d*|\.\d+)/.exec(src.slice(i));
      if (!m) throw new Error("Invalid number.");
      raw.push(m[0]);
      i += m[0].length;
      if (src[i] === ".") throw new Error("Invalid number.");
      continue;
    }

    for (const [word, token] of WORDS) {
      if (src.startsWith(word, i)) {
        raw.push(token);
        i += word.length;
        continue outer;
      }
    }

    if (OPERATORS[c]) {
      raw.push(OPERATORS[c]);
      i++;
      continue;
    }

    throw new Error("Invalid expression.");
  }

  // Insert implicit multiplication: 2(3), 2π, (2)(3), 3sin(30), 50%2 ...
  const isNumber = (t: string) => /^[0-9.]/.test(t);
  const tokens: string[] = [];
  for (let idx = 0; idx < raw.length; idx++) {
    const curr = raw[idx];
    tokens.push(curr);
    const next = raw[idx + 1];
    if (next === undefined) continue;

    const endsValue = isNumber(curr) || curr === ")" || curr === "PI" || curr === "E" || curr === "%" || curr === "!";
    const startsValue =
      isNumber(next) || next === "(" || next === "PI" || next === "E" || FUNCTION_TOKENS.has(next);

    if (endsValue && startsValue) tokens.push("*");
  }

  return tokens;
}

/* ------------------------------------------------------------------ */
/* Parser / evaluator                                                  */
/* ------------------------------------------------------------------ */

function evaluateExpression(source: string, angleMode: AngleMode): number {
  const tokens = tokenize(source);
  if (tokens.length === 0) throw new Error("Empty expression.");

  // Auto-close any unclosed parentheses, e.g. "sin(30" -> "sin(30)"
  let depth = 0;
  for (const t of tokens) {
    if (t === "(") depth++;
    if (t === ")") depth--;
    if (depth < 0) throw new Error("Unexpected ).");
  }
  while (depth-- > 0) tokens.push(")");

  let i = 0;
  const peek = () => tokens[i];
  const take = () => tokens[i++];

  const parsePrimary = (): number => {
    const t = take();
    if (t === undefined) throw new Error("Incomplete expression.");

    if (t === "(") {
      const v = parseAddSub();
      if (take() !== ")") throw new Error("Missing ).");
      return v;
    }

    if (t === "PI") return Math.PI;
    if (t === "E") return Math.E;

    if (FUNCTION_TOKENS.has(t)) {
      // Argument: parenthesised group, or a (possibly signed) value
      const arg = peek() === "(" ? parsePrimary() : parseUnary();
      return applyFunction(t, arg, angleMode);
    }

    if (/^[0-9.]/.test(t)) {
      const n = Number(t);
      if (!Number.isFinite(n)) throw new Error("Invalid number.");
      return n;
    }

    throw new Error("Invalid expression.");
  };

  // Postfix operators: factorial (!) and percent (%)
  const parsePostfix = (): number => {
    let value = parsePrimary();
    while (peek() === "!" || peek() === "%") {
      const op = take();
      value = op === "!" ? factorial(value) : value / 100;
    }
    return value;
  };

  // Right-associative power: 2^3^2 = 2^(3^2); exponent may be signed: 2^-3
  const parsePower = (): number => {
    const base = parsePostfix();
    if (peek() === "^") {
      take();
      const exponent = parseUnary();
      const result = Math.pow(base, exponent);
      if (!Number.isFinite(result)) throw new Error("Math domain error.");
      return result;
    }
    return base;
  };

  // Unary minus binds looser than power: -2^2 = -4
  const parseUnary = (): number => {
    if (peek() === "-") {
      take();
      return -parseUnary();
    }
    if (peek() === "+") {
      take();
      return parseUnary();
    }
    return parsePower();
  };

  const parseMulDiv = (): number => {
    let left = parseUnary();
    while (peek() === "*" || peek() === "/") {
      const op = take();
      const right = parseUnary();
      if (op === "/") {
        if (right === 0) throw new Error("Cannot divide by zero.");
        left /= right;
      } else {
        left *= right;
      }
    }
    return left;
  };

  const parseAddSub = (): number => {
    let left = parseMulDiv();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const right = parseMulDiv();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };

  const value = parseAddSub();
  if (i !== tokens.length) throw new Error("Invalid expression.");
  if (!Number.isFinite(value)) throw new Error("Invalid result.");
  return value;
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

function formatResult(value: number) {
  if (!Number.isFinite(value)) return "Error";
  if (Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < 1e-9)) {
    return value.toExponential(10).replace(/\.?0+e/, "e");
  }
  return Number(value.toPrecision(12)).toString();
}

// Converts a number to text that can safely be inserted into an expression
// (no "e" notation, which would clash with Euler's constant).
function toExpr(value: number): string {
  const f = formatResult(value);
  if (f.includes("e")) {
    const [mantissa, exp] = f.split("e");
    return `(${mantissa}×10^${Number(exp)})`;
  }
  return value < 0 ? `(${f})` : f;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function Calculator() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");
  const [lastExpression, setLastExpression] = useState("");
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG");
  const [memory, setMemory] = useState(0);
  const [answer, setAnswer] = useState(0);
  const [fresh, setFresh] = useState(false); // true right after "="
  const [history, setHistory] = useState<{ expression: string; result: string }[]>([]);
  const [error, setError] = useState("");

  const display = expression || result;

  const calculate = () => {
    if (!expression.trim()) return;
    try {
      const value = evaluateExpression(expression, angleMode);
      const formatted = formatResult(value);
      setResult(formatted);
      setAnswer(value);
      setLastExpression(expression);
      setHistory(prev => [{ expression, result: formatted }, ...prev].slice(0, 12));
      setExpression("");
      setFresh(true);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation error.");
    }
  };

  const currentValue = () => (expression ? evaluateExpression(expression, angleMode) : answer);

  const press = (key: string) => {
    setError("");

    if (key === "=") return calculate();

    if (key === "C") {
      setExpression("");
      return;
    }
    if (key === "AC") {
      setExpression("");
      setResult("0");
      setAnswer(0);
      setLastExpression("");
      setFresh(false);
      return;
    }
    if (key === "⌫") {
      setExpression(v => v.slice(0, -1));
      return;
    }

    if (key === "MC") {
      setMemory(0);
      return;
    }
    if (key === "MR") {
      setExpression(v => (fresh && !v ? "" : v) + toExpr(memory));
      setFresh(false);
      return;
    }
    if (key === "M+" || key === "M-") {
      try {
        const value = currentValue();
        setMemory(m => (key === "M+" ? m + value : m - value));
      } catch {
        setError("Cannot store this expression.");
      }
      return;
    }

    // Anything below edits the expression
    const base = expression || toExpr(answer);
    const startsFromAnswer = !expression && fresh;

    if (key === "Ans") {
      setExpression(v => v + toExpr(answer));
    } else if (key === "±") {
      setExpression(() => {
        if (!expression) return toExpr(-answer);
        if (expression.startsWith("−(") && expression.endsWith(")")) return expression.slice(2, -1);
        return `−(${expression})`;
      });
    } else if (key === "x²") {
      setExpression(`(${base})^2`);
    } else if (key === "xʸ") {
      setExpression(`${base}^`);
    } else if (key === "1/x") {
      setExpression(`1/(${base})`);
    } else if (key === "EXP") {
      setExpression(v => (v ? v + "×10^" : v));
    } else if (key === "√") {
      setExpression(v => v + "√(");
    } else if (FUNCTION_KEYS.includes(key)) {
      setExpression(v => v + key + "(");
    } else if (BINARY_OPS.includes(key) && startsFromAnswer) {
      // Continue calculating from the previous answer
      setExpression(toExpr(answer) + key);
    } else {
      setExpression(v => v + key);
    }

    setFresh(false);
  };

  useEffect(() => {
    const keyMap: Record<string, string> = {
      "*": "×",
      "/": "÷",
      "-": "−",
      Enter: "=",
      "=": "=",
      Backspace: "⌫",
      Escape: "C"
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const k = event.key;
      const mapped = keyMap[k] ?? (k.length === 1 && "0123456789.+()^%!".includes(k) ? k : null);
      if (!mapped) return;

      event.preventDefault();
      press(mapped);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section className="calculatorShell" aria-label="Scientific calculator">
      <div className="calculatorMain">
        <div className="modeRow">
          <div className="modeGroup">
            {(["DEG", "RAD", "GRAD"] as AngleMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                className={mode === angleMode ? "mode active" : "mode"}
                onClick={() => setAngleMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="memoryIndicator">M {formatResult(memory)}</div>
        </div>

        <div className="display" aria-live="polite">
          <div className="expression">
            {expression ? "" : lastExpression ? `${lastExpression} =` : "Ready"}
          </div>
          <div className="result">{display}</div>
          {error && <div className="error">{error}</div>}
        </div>

        <div className="keypad">
          {keys.map(row =>
            row.map(key => {
              const isEquals = key === "=";
              const isOperator = ["÷", "×", "−", "+"].includes(key);
              const isAction = ["C", "AC", "⌫", "MC", "MR", "M+", "M-"].includes(key);
              return (
                <button
                  type="button"
                  key={key}
                  className={[
                    "calcKey",
                    isEquals ? "equals" : "",
                    isOperator ? "operator" : "",
                    isAction ? "action" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={isEquals ? { gridColumn: "span 4" } : undefined}
                  // Keep focus off the buttons so Enter/Space never double-fires
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => press(key)}
                >
                  {key}
                </button>
              );
            })
          )}
        </div>
      </div>

      <aside className="history">
        <div className="historyHead">
          <div>
            <p className="eyebrow">SESSION</p>
            <h2>History</h2>
          </div>
          <button type="button" onClick={() => setHistory([])}>
            Clear
          </button>
        </div>

        {history.length === 0 ? (
          <div className="emptyHistory">
            <div className="emptyIcon">∑</div>
            <p>Your calculations will appear here.</p>
          </div>
        ) : (
          <div className="historyList">
            {history.map((item, index) => (
              <button
                type="button"
                className="historyItem"
                key={`${item.expression}-${index}`}
                onClick={() => {
                  setExpression(item.expression);
                  setFresh(false);
                  setError("");
                }}
              >
                <span>{item.expression}</span>
                <strong>= {item.result}</strong>
              </button>
            ))}
          </div>
        )}

        <div className="keyboardHint">
          <strong>Keyboard supported</strong>
          <span>Enter = calculate • Esc = clear • Backspace = delete</span>
        </div>
      </aside>
    </section>
  );
}
