// Pure logic: exact rationals (BigInt), expression trees, question generation, distractors, rendering. No DOM.

const LIMIT = 1000000n;
const gcd = (a, b) => { if (a < 0n) a = -a; if (b < 0n) b = -b; while (b) [a, b] = [b, a % b]; return a; };

export const rat = (n, d = 1n) => {
  n = BigInt(n); d = BigInt(d);
  if (d === 0n) throw new RangeError('division by zero');
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d) || 1n;
  return { n: n / g, d: d / g };
};
export const add = (a, b) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a, b) => rat(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a, b) => rat(a.n * b.n, a.d * b.d);
export const div = (a, b) => rat(a.n * b.d, a.d * b.n);
export const cmp = (a, b) => { const x = a.n * b.d - b.n * a.d; return x > 0n ? 1 : x < 0n ? -1 : 0; };
export const eq = (a, b) => cmp(a, b) === 0;

export function parseDecimal(s) {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) throw new SyntaxError(`invalid decimal: ${s}`);
  const f = m[2] ?? '';
  return rat(BigInt(m[1] + f), 10n ** BigInt(f.length));
}

// A reduced denominator terminates iff it has only factors 2 and 5.
export function isTerminating({ d }) {
  while (d % 2n === 0n) d /= 2n;
  while (d % 5n === 0n) d /= 5n;
  return d === 1n;
}

// Exact ASCII decimal for a terminating rational: 55/2 -> "27.5".
export function toDecimal(r) {
  if (!isTerminating(r)) throw new RangeError('non-terminating');
  let d = r.d, a = 0, b = 0;
  while (d % 2n === 0n) { d /= 2n; a++; }
  while (d % 5n === 0n) { d /= 5n; b++; }
  const k = Math.max(a, b), neg = r.n < 0n;
  const scaled = ((neg ? -r.n : r.n) * 10n ** BigInt(k)) / r.d;
  let s = scaled.toString().padStart(k + 1, '0');
  if (k) s = `${s.slice(0, -k)}.${s.slice(-k)}`;
  return (neg ? '-' : '') + s;
}

export const showTex = (r, asFraction = false) =>
  r.d === 1n ? `${r.n}` : !asFraction && isTerminating(r) ? toDecimal(r) : `\\frac{${r.n}}{${r.d}}`;

export const showRat = (r, asFraction = false) =>
  r.d === 1n ? `${r.n}` : !asFraction && isTerminating(r) ? toDecimal(r) : `${r.n}/${r.d}`;

// ---- Expression trees: leaf {t:'leaf', kind:'num'|'frac', r} or node {t:'bin', op, l, r} ----
const OPS = { '+': add, '-': sub, '*': mul, '/': div };
const TEX = { '+': '+', '-': '-', '*': '\\times', '/': '\\div' };
const SYM = { '+': '+', '-': '−', '*': '×', '/': '÷' };
const PREC = { '+': 1, '-': 1, '*': 2, '/': 2 };

export function evalTree(t) {
  if (t.t === 'leaf') return t.r;
  const a = evalTree(t.l), b = evalTree(t.r);
  if (!a || !b || (t.op === '/' && b.n === 0n)) return null;
  const v = OPS[t.op](a, b);
  return v.n > 0n && v.d <= LIMIT ? v : null;
}

export function render(t, tex = false) {
  if (t.t === 'leaf') {
    if (t.kind !== 'frac') return toDecimal(t.r);
    return tex ? `\\frac{${t.r.n}}{${t.r.d}}` : `${t.r.n}/${t.r.d}`;
  }
  if (tex && t.op === '/' && t.l.t === 'bin') return `\\frac{${render(t.l, true)}}{${render(t.r, true)}}`;
  const wrap = (c, right) => {
    const need = c.t === 'bin' && (PREC[c.op] < PREC[t.op] || (right && PREC[c.op] === PREC[t.op] && (t.op === '-' || t.op === '/')));
    const s = render(c, tex);
    return need ? `(${s})` : s;
  };
  return `${wrap(t.l, false)} ${tex ? TEX[t.op] : SYM[t.op]} ${wrap(t.r, true)}`;
}

// ---- Generators ----
const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = (xs) => xs[rnd(0, xs.length - 1)];
function shuffle(xs) { for (let i = xs.length - 1; i > 0; i--) { const j = rnd(0, i); [xs[i], xs[j]] = [xs[j], xs[i]]; } return xs; }

const DECIMALS = ['0.5', '0.25', '0.75', '1.5', '2.5', '0.2', '0.4', '1.25'];
const MAX_DEN = { 2: 12, 4: 20, 5: 30 };
const MAX_INT = { 1: 12, 2: 30, 3: 99, 4: 99, 5: 999 };
const COUNTS = { 1: [2], 2: [3], 3: [3, 4], 4: [4], 5: [4, 5] };

function leaf(level) {
  const den = MAX_DEN[level] ?? 0;
  if (den && Math.random() < 0.3) {
    const q = rnd(2, den);
    for (;;) { const p = rnd(1, q - 1), r = rat(p, q); if (r.d === BigInt(q)) return { t: 'leaf', kind: 'frac', r }; }
  }
  if (level <= 2 && Math.random() < 0.3) return { t: 'leaf', kind: 'num', r: parseDecimal(pick(DECIMALS)) };
  return { t: 'leaf', kind: 'num', r: rat(rnd(2, MAX_INT[level])) };
}

export function genExpression(level) {
  const ops = level <= 2 ? ['*', '/'] : ['*', '/', '+', '-'];
  for (let i = 0; i < 1000; i++) {
    const items = Array.from({ length: pick(COUNTS[level]) }, () => leaf(level));
    if (level === 2 && !items.some((x) => x.r.d > 1n)) continue;
    while (items.length > 1) {
      const j = rnd(0, items.length - 2);
      items.splice(j, 2, { t: 'bin', op: pick(ops), l: items[j], r: items[j + 1] });
    }
    const tree = items[0], value = evalTree(tree);
    if (value && tree.t === 'bin') return { tree, value };
  }
  throw new Error('expression generation failed');
}

const MUL = { 1: [[2, 9], [2, 9]], 2: [[11, 99], [2, 9]], 3: [[11, 99], [11, 99]], 4: [[100, 999], [2, 9]], 5: [[100, 999], [11, 99]] };
const FR = { 1: [12, 2, 6], 2: [30, 2, 9], 3: [60, 2, 20], 4: [120, 2, 49], 5: [200, 2, 99] };

export function makeMultiplyHint(a, b) {
  if (b === 9 || a === 9) {
    const x = b === 9 ? a : b;
    return {
      title: 'Multiplication by 9 using base 10',
      text: `Multiply ${x} by 10 and subtract ${x}:`,
      tex: `${x} \\times 9 = (${x} \\times 10) - ${x} = ${x * 10} - ${x} = ${x * 9}`,
    };
  }
  if (b === 5 || a === 5) {
    const x = b === 5 ? a : b;
    return {
      title: 'Multiplication by 5 via halving',
      text: `Multiply ${x} by 10 and divide by 2:`,
      tex: `${x} \\times 5 = \\frac{${x} \\times 10}{2} = \\frac{${x * 10}}{2} = ${x * 5}`,
    };
  }
  if (b === 11 || a === 11) {
    const x = b === 11 ? a : b;
    return {
      title: 'Multiplication by 11',
      text: `Multiply ${x} by 10 and add ${x}:`,
      tex: `${x} \\times 11 = (${x} \\times 10) + ${x} = ${x * 10} + ${x} = ${x * 11}`,
    };
  }
  if (b === 25 || a === 25) {
    const x = b === 25 ? a : b;
    return {
      title: 'Multiplication by 25 via division by 4',
      text: `Multiply ${x} by 100 and divide by 4 (halve twice):`,
      tex: `${x} \\times 25 = \\frac{${x} \\times 100}{4} = ${x * 25}`,
    };
  }
  if (b % 10 >= 8 && b > 10) {
    const round = Math.ceil(b / 10) * 10;
    const diff = round - b;
    return {
      title: 'Rounding to nearest multiple of ten',
      text: `Rewrite ${b} as (${round} - ${diff}) and distribute ${a}:`,
      tex: `${a} \\times ${b} = (${a} \\times ${round}) - (${a} \\times ${diff}) = ${a * round} - ${a * diff} = ${a * b}`,
    };
  }
  if (a % 10 >= 8 && a > 10) {
    const round = Math.ceil(a / 10) * 10;
    const diff = round - a;
    return {
      title: 'Rounding to nearest multiple of ten',
      text: `Rewrite ${a} as (${round} - ${diff}) and distribute ${b}:`,
      tex: `${a} \\times ${b} = (${round} \\times ${b}) - (${diff} \\times ${b}) = ${round * b} - ${diff * b} = ${a * b}`,
    };
  }
  if (a >= 10 && b < 10) {
    const tens = Math.floor(a / 10) * 10;
    const ones = a % 10;
    return {
      title: 'Decomposition into tens and units',
      text: `Decompose ${a} into (${tens} + ${ones}) and multiply each by ${b}:`,
      tex: `${a} \\times ${b} = (${tens} \\times ${b}) + (${ones} \\times ${b}) = ${tens * b} + ${ones * b} = ${a * b}`,
    };
  }
  if (b >= 10) {
    const bTens = Math.floor(b / 10) * 10;
    const bOnes = b % 10;
    return {
      title: 'Decomposition into tens and units',
      text: `Decompose ${b} into (${bTens} + ${bOnes}) and multiply each by ${a}:`,
      tex: `${a} \\times ${b} = (${a} \\times ${bTens}) + (${a} \\times ${bOnes}) = ${a * bTens} + ${a * bOnes} = ${a * b}`,
    };
  }
  return {
    title: 'Direct mental multiplication',
    text: 'Compute the direct product:',
    tex: `${a} \\times ${b} = ${a * b}`,
  };
}

export function makeFractionHint(N, D, p, q, k) {
  const nNum = Number(N), dNum = Number(D), pNum = Number(p), qNum = Number(q), kNum = Number(k);
  if (kNum === 2) {
    return {
      title: 'Simplification by halving (divide by 2)',
      text: 'Both numerator and denominator are even numbers; divide both by 2:',
      tex: `\\frac{${nNum} \\div 2}{${dNum} \\div 2} = \\frac{${pNum}}{${qNum}}`,
    };
  }
  if (kNum === 3) {
    return {
      title: 'Divisibility rule for 3',
      text: 'Sum of digits in both terms is divisible by 3; divide both by 3:',
      tex: `\\frac{${nNum} \\div 3}{${dNum} \\div 3} = \\frac{${pNum}}{${qNum}}`,
    };
  }
  if (kNum === 5) {
    return {
      title: 'Divisibility rule for 5',
      text: 'Trailing digits are 0 or 5; divide both by 5:',
      tex: `\\frac{${nNum} \\div 5}{${dNum} \\div 5} = \\frac{${pNum}}{${qNum}}`,
    };
  }
  if (kNum === 10) {
    return {
      title: 'Cancelling trailing zeros (divide by 10)',
      text: 'Both terms have a trailing zero; simplify by dividing by 10:',
      tex: `\\frac{${nNum} \\div 10}{${dNum} \\div 10} = \\frac{${pNum}}{${qNum}}`,
    };
  }
  return {
    title: `Greatest Common Divisor (GCD: ${kNum})`,
    text: `The greatest common divisor of both terms is ${kNum}. Divide by ${kNum} to reduce:`,
    tex: `\\frac{${nNum} \\div ${kNum}}{${dNum} \\div ${kNum}} = \\frac{${pNum}}{${qNum}}`,
  };
}

export function makeExpressionHint(tree, value) {
  const texStr = render(tree, true);
  const hasDec = /0\.25|0\.5|0\.75|1\.25|1\.5|2\.5/.test(texStr);
  let text = 'Evaluate parentheses first, then multiplication and division before addition and subtraction.';
  if (hasDec) {
    text = 'Converting decimals to simple fractions (e.g., 0.25 to 1/4 or 0.5 to 1/2) simplifies mental steps significantly.';
  }
  let stepTex = '';
  if (tree.t === 'bin' && tree.l) {
    const leftVal = evalTree(tree.l);
    if (leftVal && tree.l.t === 'bin') {
      stepTex = `${render(tree.l, true)} = ${showTex(leftVal)}`;
    }
  }
  return {
    title: 'Order of operations & fast conversions',
    text,
    tex: stepTex || `\\text{Step-by-step simplification towards: } ${showTex(value)}`,
  };
}

function multiplyQ(level) {
  const [ra, rb] = MUL[level];
  const operand = (lo, hi) => { let x; do { x = rnd(lo, hi); } while ([1, 10, 100].includes(x)); return x; };
  const a = operand(...ra), b = operand(...rb);
  const P = BigInt(a) * BigInt(b), A = BigInt(a), B = BigInt(b);
  const cand = [P + 10n, P - 10n, P + 100n, P - 100n, P + A, P - A, P + B, P - B].map((x) => rat(x));
  const s = P.toString();
  for (let i = 0; i + 1 < s.length; i++) cand.push(rat(BigInt(s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2))));
  const hint = makeMultiplyHint(a, b);
  return { tex: `${a} \\times ${b}`, text: `${a} × ${b}`, correct: rat(P), cand, frac: false, hint };
}

function fractionQ(level) {
  const [max, kLo, kHi] = FR[level];
  let p, q, r;
  for (;;) { q = rnd(2, max); p = rnd(1, q - 1); r = rat(p, q); if (r.d === BigInt(q)) break; }
  const k = rnd(kLo, kHi), N = BigInt(p * k), D = BigInt(q * k), P = BigInt(p), Q = BigInt(q);
  const cand = [rat(Q, P), rat(P + 1n, Q), rat(P - 1n, Q), rat(P, Q + 1n), rat(P, Q - 1n), rat(2n * P, Q), rat(P, 2n * Q)];
  const hint = makeFractionHint(N, D, p, q, k);
  return { tex: `\\frac{${N}}{${D}}`, text: `${N}/${D}`, correct: r, cand, frac: true, hint };
}

function expressionQ(level) {
  const { tree, value: v } = genExpression(level);
  const cand = [mul(v, rat(10n)), div(v, rat(10n)), mul(v, rat(2n)), div(v, rat(2n)), div(rat(1n), v), add(v, rat(1n)), sub(v, rat(1n))];
  const hint = makeExpressionHint(tree, v);
  return { tex: render(tree, true), text: render(tree, false), correct: v, cand, frac: false, hint };
}

const LIMIT_OK = (c) => c.n > 0n && c.d <= LIMIT;

// Builds a question with exactly four distinct-valued options, in random order.
export function makeQuestion(skill, level) {
  const q = skill === 'multiply' ? multiplyQ(level) : skill === 'fraction' ? fractionQ(level) : expressionQ(level);
  const pool = [];
  for (const c of q.cand) if (LIMIT_OK(c) && !eq(c, q.correct) && !pool.some((x) => eq(x, c))) pool.push(c);
  shuffle(pool);
  const picks = pool.slice(0, 3);
  for (let k = 1n; picks.length < 3; k++) {
    const c = add(q.correct, rat(k));
    if (!picks.some((x) => eq(x, c))) picks.push(c);
  }
  const values = shuffle([q.correct, ...picks]);
  return {
    skill, level, tex: q.tex, text: q.text,
    options: values.map((r) => showRat(r, q.frac)),
    texOptions: values.map((r) => showTex(r, q.frac)),
    answer: values.findIndex((r) => eq(r, q.correct)),
    hint: q.hint,
  };
}
