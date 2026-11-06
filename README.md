# Mental Math Engine

A lightweight, zero-dependency mathematical engine for generating mental math training problems, evaluating arbitrary-precision rational arithmetic, and generating realistic distractors with step-by-step educational hints.

Designed for high-speed arithmetic drills, competitive math, and Olympiad preparation.

---

## Features

- **Exact Rational Arithmetic**: Uses native JavaScript `BigInt` to eliminate IEEE-754 floating-point inaccuracies. Every intermediate operation produces exact fractions.
- **Smart Distractor Generation**: Multiple-choice options are not arbitrary random numbers; they model human calculation mistakes (digit swaps, carry errors, inverted fractions, off-by-ten slips).
- **Dual Output**: Returns problems and options in both clean ASCII text and formatted LaTeX for KaTeX/MathJax rendering.
- **Educational Hints**: Every generated question includes a structured hint highlighting mental shortcuts (e.g., factoring by 5 or 25, rounding to tens, decimal-to-fraction conversions).
- **Zero Dependencies**: Pure modern ESM JavaScript with built-in Node.js test runner support.

---

## Installation

```bash
git clone https://github.com/rSepehr/mental-math.git
cd mental-math
```

No build step or external packages required.

---

## Quick Start

```javascript
import { makeQuestion } from './index.js';

// Generate a Level 3 multiplication question
const q1 = makeQuestion('multiply', 3);
console.log(q1.text);       // "24 × 19"
console.log(q1.tex);        // "24 \\times 19"
console.log(q1.options);    // ["436", "456", "476", "457"]
console.log(q1.answer);     // 1 (index of the correct answer)
console.log(q1.hint.title); // "Rounding to nearest multiple of ten"

// Generate a Level 2 fraction simplification problem
const q2 = makeQuestion('fraction', 2);
console.log(q2.text);       // "48/72"
console.log(q2.tex);        // "\\frac{48}{72}"
console.log(q2.options);    // ["2/3", "3/2", "3/4", "1/2"]

// Generate a Level 4 compound expression
const q3 = makeQuestion('expression', 4);
console.log(q3.text);       // "(0.5 × 36) ÷ 0.25"
console.log(q3.tex);        // "\\frac{0.5 \\times 36}{0.25}"
```

---

## API Reference

### `makeQuestion(skill, level)`
Generates a complete problem set with 4 unique multiple-choice options.

- **Parameters**:
  - `skill`: `'multiply'` | `'fraction'` | `'expression'`
  - `level`: `1` | `2` | `3` | `4` | `5`
- **Returns**:
  ```typescript
  {
    skill: string;
    level: number;
    text: string;         // Plain text representation (e.g., "18 × 25")
    tex: string;          // LaTeX string for rendering
    options: string[];    // Array of 4 distinct answers in plain text
    texOptions: string[]; // Array of 4 distinct answers in LaTeX
    answer: number;       // 0-based index of correct option (0, 1, 2, or 3)
    hint: {
      title: string;      // Strategy title
      text: string;       // Explanation of the mental shortcut
      tex: string;        // Formulaic demonstration in LaTeX
    };
  }
  ```

### Exact Rational Arithmetic
```javascript
import { rat, add, sub, mul, div, toDecimal } from './index.js';

const a = rat(1n, 4n);  // 1/4
const b = rat(1n, 2n);  // 1/2

const sum = add(a, b);  // 3/4
console.log(toDecimal(sum)); // "0.75"
```

---

## Testing

Run the built-in Node.js test suite:

```bash
npm test
```

All test cases verify rational arithmetic exactness, golden expression evaluation, and distractor uniqueness over thousands of generated problems.

---

## License

MIT License. See [LICENSE](./LICENSE) for details.
