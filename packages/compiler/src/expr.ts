import { CompileError } from "./errors.js";

type Scope = Record<string, number>;
type Token = { kind: "num" | "id" | "op"; text: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      tokens.push({ kind: "num", text: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ kind: "id", text: src.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/()".includes(c)) {
      tokens.push({ kind: "op", text: c });
      i++;
      continue;
    }
    throw new CompileError(`invalid character "${c}" in expression "${src}" at position ${i}`);
  }
  return tokens;
}

/** Minimal +,-,*,/,() arithmetic evaluator for `"${...}"` template strings — deliberately not a general eval. */
function evaluate(tokens: Token[], scope: Scope, src: string): number {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr(): number {
    let value = parseTerm();
    while (peek() && peek().kind === "op" && (peek().text === "+" || peek().text === "-")) {
      const op = next().text;
      const rhs = parseTerm();
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseUnary();
    while (peek() && peek().kind === "op" && (peek().text === "*" || peek().text === "/")) {
      const op = next().text;
      const rhs = parseUnary();
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }

  function parseUnary(): number {
    if (peek()?.kind === "op" && peek().text === "-") {
      next();
      return -parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const token = next();
    if (!token) throw new CompileError(`unexpected end of expression: "${src}"`);
    if (token.kind === "num") return Number(token.text);
    if (token.kind === "id") {
      if (!(token.text in scope)) {
        throw new CompileError(`unknown identifier "${token.text}" in expression "${src}"`);
      }
      return scope[token.text];
    }
    if (token.kind === "op" && token.text === "(") {
      const value = parseExpr();
      const close = next();
      if (!close || close.text !== ")") throw new CompileError(`expected ")" in expression "${src}"`);
      return value;
    }
    throw new CompileError(`unexpected token "${token.text}" in expression "${src}"`);
  }

  const result = parseExpr();
  if (pos !== tokens.length) {
    throw new CompileError(`unexpected trailing tokens in expression "${src}"`);
  }
  return result;
}

export function evalExpr(src: string, scope: Scope): number {
  return evaluate(tokenize(src), scope, src);
}

const TEMPLATE_RE = /^\$\{(.+)\}$/s;

/** number as-is, or a `"${arithmetic expr}"` template evaluated against scope. */
export function resolveNumber(value: number | string, scope: Scope): number {
  if (typeof value === "number") return value;
  const match = TEMPLATE_RE.exec(value.trim());
  if (!match) {
    throw new CompileError(`expected a number or "\${expr}" template, got: "${value}"`);
  }
  return evalExpr(match[1], scope);
}

/** literal string as-is, or a `"${bareParamName}"` template substituted from scope (no concatenation in v1). */
export function resolveString(value: string, scope: Record<string, string | number>): string {
  const match = TEMPLATE_RE.exec(value.trim());
  if (!match) return value;
  const inner = match[1].trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(inner)) {
    throw new CompileError(`string templates only support a bare param reference, got: "\${${inner}}"`);
  }
  if (!(inner in scope)) {
    throw new CompileError(`unknown identifier "${inner}" in template "${value}"`);
  }
  return String(scope[inner]);
}
