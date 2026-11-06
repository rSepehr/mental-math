import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../index.js';

const N = (s) => ({ t: 'leaf', kind: 'num', r: M.parseDecimal(s) });
const F = (p, q) => ({ t: 'leaf', kind: 'frac', r: M.rat(p, q) });
const B = (op, l, r) => ({ t: 'bin', op, l, r });

test('exact rational arithmetic', () => {
  assert.deepEqual(M.parseDecimal('27.5'), M.rat(55n, 2n));
  assert.deepEqual(M.parseDecimal('0.125'), M.rat(1n, 8n));
  assert.deepEqual(M.add(M.rat(1n, 2n), M.rat(1n, 3n)), M.rat(5n, 6n));
  assert.deepEqual(M.sub(M.rat(1n, 2n), M.rat(1n, 3n)), M.rat(1n, 6n));
  assert.deepEqual(M.mul(M.rat(2n, 3n), M.rat(9n, 4n)), M.rat(3n, 2n));
  assert.deepEqual(M.div(M.rat(3n, 7n), M.rat(9n, 14n)), M.rat(2n, 3n));
  assert.equal(M.cmp(M.rat(1n, 3n), M.rat(1n, 4n)), 1);
  assert.throws(() => M.div(M.rat(1n), M.rat(0n)));
  assert.equal(M.toDecimal(M.rat(55n, 2n)), '27.5');
  assert.equal(M.isTerminating(M.rat(3n, 8n)), true);
  assert.equal(M.isTerminating(M.rat(1n, 6n)), false);
});

test('golden expressions evaluate with exact precision', () => {
  // Case A: (0.5 × 36) ÷ 0.25 = 72
  const t1 = B('/', B('*', N('0.5'), N('36')), N('0.25'));
  assert.equal(M.toDecimal(M.evalTree(t1)), '72');
  assert.equal(M.render(t1, true), '\\frac{0.5 \\times 36}{0.25}');

  // Case B: 3/7 ÷ 9/14 = 2/3
  const t2 = B('/', F(3, 7), F(9, 14));
  assert.deepEqual(M.evalTree(t2), M.rat(2n, 3n));
  assert.equal(M.render(t2, true), '\\frac{3}{7} \\div \\frac{9}{14}');

  // Case C: (197 − 87) ÷ 22.4 × 5.6 = 27.5
  const t3 = B('*', B('/', B('-', N('197'), N('87')), N('22.4')), N('5.6'));
  assert.equal(M.toDecimal(M.evalTree(t3)), '27.5');
});

test('problem generation: 4 distinct choices, valid answer, non-reduced fractions, educational hints', () => {
  for (const skill of ['multiply', 'fraction', 'expression']) {
    for (let level = 1; level <= 5; level++) {
      for (let i = 0; i < 50; i++) {
        const q = M.makeQuestion(skill, level);
        assert.equal(q.options.length, 4, 'must have exactly 4 choices');
        assert.equal(new Set(q.options).size, 4, 'all choices must be distinct');
        assert.ok(q.answer >= 0 && q.answer < 4, 'correct answer index must be within 0..3');
        assert.ok(q.hint && typeof q.hint.title === 'string' && q.hint.title.length > 0);
        assert.ok(typeof q.hint.text === 'string' && q.hint.text.length > 0);
        assert.ok(typeof q.hint.tex === 'string' && q.hint.tex.length > 0);

        if (skill === 'fraction') {
          const [n, d] = q.text.split('/').map((x) => BigInt(x));
          assert.notEqual(M.rat(n, d).d, d, 'generated fraction problem must not be pre-reduced');
          for (const opt of q.options) {
            const [a, b = '1'] = opt.split('/');
            assert.equal(M.rat(BigInt(a), BigInt(b)).d, BigInt(b), `option ${opt} must be fully reduced`);
          }
        }
      }
    }
  }
});
