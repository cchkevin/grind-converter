const { test } = require('node:test');
const assert = require('node:assert/strict');
const G = require('./grind.js');
const { GRINDERS } = G;

test('每台磨豆機資料都有效，V60 兩端對到 400 / 700µm', () => {
  for (const [id, g] of Object.entries(GRINDERS)) {
    assert.ok(G.validateGrinder(g), id);
    if (g.ref) continue; // 用對照資料定義的機器另外測
    assert.equal(Math.round(G.toMicrons(id, g.v60[0])), 400, id);
    assert.equal(Math.round(G.toMicrons(id, g.v60[1])), 700, id);
  }
});

test('刻度寫法解析', () => {
  const ku = GRINDERS['k-ultra'].notation;
  assert.equal(G.toClicks(ku, '0.8.0'), 80);
  assert.equal(G.toClicks(ku, '8.0'), 80); // 常見簡寫
  assert.equal(G.toClicks(ku, '7.3'), 73);
  assert.equal(G.toClicks(ku, '1.0.5'), 105);
  assert.equal(G.toClicks(GRINDERS['j-max'].notation, '2.8.4'), 2 * 90 + 84);
  assert.equal(G.toClicks(GRINDERS['x-pro'].notation, '1.1.8'), 60 + 18);
  assert.equal(G.toClicks(GRINDERS['kingrinder-k6'].notation, '1.22'), 82);
  assert.equal(G.toClicks(GRINDERS['ode-gen2'].notation, '4.2'), 14);
  assert.throws(() => G.toClicks(ku, '8.12'));
  assert.throws(() => G.toClicks(GRINDERS['ode-gen2'].notation, '4.3'));
  assert.throws(() => G.toClicks(ku, 'abc'));
});

test('寫法來回轉換不變', () => {
  for (const [id, g] of Object.entries(GRINDERS)) {
    for (const s of g.v60) {
      const c = G.toClicks(g.notation, s);
      assert.equal(G.toClicks(g.notation, G.fromClicks(g.notation, c)), c, `${id} ${s}`);
    }
  }
});

test('換回自己不變', () => {
  for (const id of Object.keys(GRINDERS)) {
    const s = GRINDERS[id].v60[0];
    assert.equal(G.convert(id, s, id).display, G.fromClicks(GRINDERS[id].notation, G.toClicks(GRINDERS[id].notation, s)));
  }
});

test('實際換算：C40 → K-Ultra', () => {
  // C40 1090µm/40 格 → 約 27µm/格；K-Ultra 約 7.7µm/格
  assert.equal(G.convert('c40', '22', 'k-ultra').display, '8.0');
  assert.equal(G.convert('c40', '15', 'k-ultra').display, '5.3');
  assert.equal(G.convert('c40', '25', 'k-ultra').display, '9.2');
});

test('越粗換過去也越粗', () => {
  let prev = -1;
  for (let s = 10; s <= 35; s++) {
    const c = G.convert('c40', String(s), 'k-ultra').clicks;
    assert.ok(c > prev);
    prev = c;
  }
});

test('超出機器範圍會標記', () => {
  assert.equal(G.convert('c40', '40', 'k-ultra').outOfRange, true); // 未校正時 C40 40 ≈ 1150µm，超過 K-Ultra 上限 1100µm
  assert.equal(G.convert('c40', '24', 'k-ultra').outOfRange, false);
});

test('自訂磨豆機', () => {
  const extra = { custom: { name: '某台', v60: ['10', '20'], notation: { type: 'clicks' } } };
  assert.equal(G.convert('custom', '15', 'k-ultra', extra).display, G.convert('k-ultra', '7.3', 'k-ultra').display);
  assert.throws(() => G.validateGrinder({ name: 'x', v60: ['20', '10'], notation: { type: 'clicks' } }));
});

test('實測對照點：C40 22 = K-Ultra 6.5 之後換算會對上，且其他格數等比例', () => {
  const extra = G.applyPairs([{ from: 'c40', setting: '22', to: 'k-ultra', mine: '6.5' }]);
  assert.equal(G.convert('c40', '22', 'k-ultra', extra).display, '6.5');
  assert.equal(G.convert('k-ultra', '6.5', 'c40', extra).display, '22');
  assert.ok(G.convert('c40', '25', 'k-ultra', extra).clicks > 65);
  // 沒套用的機器不受影響
  assert.equal(G.convert('timemore-c3', '14', 'k-ultra', extra).display, G.convert('timemore-c3', '14', 'k-ultra').display);
});

test('幻刺 Pro：過篩對照點換到 C40 要對上', () => {
  assert.equal(G.convert('phantox-pro', '6.3', 'c40').display, '17');
  assert.equal(G.convert('phantox-pro', '8.5', 'c40').display, '24');
  assert.equal(G.convert('c40', '24', 'phantox-pro').display, '8.5');
  assert.equal(G.toClicks(GRINDERS['phantox-pro'].notation, '8.5'), 85);
  assert.equal(G.toClicks(GRINDERS['phantox-pro'].notation, '1.0.5'), 125); // 第二圈
});

test('幻刺 Pro 會跟著 C40 的對照點一起修正', () => {
  const extra = G.applyPairs([{ from: 'c40', setting: '22', to: 'k-ultra', mine: '6.5' }]);
  // 幻刺 7.9 ≈ C40 22 → 套用 C40 對照點後 ≈ K-Ultra 6.5
  assert.equal(G.convert('phantox-pro', '7.9', 'c40', extra).display, '22');
  assert.equal(G.convert('phantox-pro', '7.9', 'k-ultra', extra).display, '6.5');
});

test('同一台兩組對照點：用兩點定義，中間點也要對上', () => {
  const extra = G.applyPairs([
    { from: 'x-ultra', setting: '2.2.0', to: 'k-ultra', mine: '7.0' },
    { from: 'x-ultra', setting: '2.3.5', to: 'k-ultra', mine: '8.0' },
  ]);
  assert.equal(G.convert('x-ultra', '2.2.0', 'k-ultra', extra).display, '7.0');
  assert.equal(G.convert('x-ultra', '2.3.5', 'k-ultra', extra).display, '8.0');
  assert.equal(G.convert('x-ultra', '2.2.5', 'k-ultra', extra).display, '7.3'); // 兩點之間
  assert.equal(G.convert('k-ultra', '8.0', 'x-ultra', extra).display, '2.3.5');
});

test('多台機器的對照點一起套用，互不干擾', () => {
  const extra = G.applyPairs([
    { from: 'c40', setting: '22', to: 'k-ultra', mine: '6.5' },
    { from: 'x-ultra', setting: '2.2.0', to: 'k-ultra', mine: '7.0' },
    { from: 'x-ultra', setting: '2.3.5', to: 'k-ultra', mine: '8.0' },
  ]);
  assert.equal(G.convert('c40', '22', 'k-ultra', extra).display, '6.5');
  assert.equal(G.convert('x-ultra', '2.3.5', 'k-ultra', extra).display, '8.0');
  assert.equal(G.convert('phantox-pro', '7.9', 'k-ultra', extra).display, '6.5');
});

test('內建對照點：C40 × K-Ultra 實測（C40 22 ≈ 6.8、40 ≈ 1.2.0）預設套用', () => {
  const extra = G.applyPairs([]);
  assert.equal(G.convert('c40', '22', 'k-ultra', extra).display, '6.8');
  assert.equal(G.convert('c40', '40', 'k-ultra', extra).display, '1.2.0');
  assert.equal(G.convert('c40', '30', 'k-ultra', extra).display, '9.1'); // 兩點之間
  assert.equal(G.convert('k-ultra', '1.2.0', 'c40', extra).display, '40');
  assert.equal(G.convert('c40', '40', 'k-ultra', extra).outOfRange, false);
  // 不要內建的
  assert.equal(G.convert('c40', '22', 'k-ultra', G.applyPairs([], {}, { builtin: false })).display, '8.0');
});

test('使用者有同兩台機器的對照點時，內建的停用（不論方向）', () => {
  const one = G.applyPairs([{ from: 'c40', setting: '22', to: 'k-ultra', mine: '6.5' }]);
  assert.equal(G.convert('c40', '22', 'k-ultra', one).display, '6.5');
  assert.equal(one['k-ultra'], undefined);

  const two = G.applyPairs([
    { from: 'c40', setting: '22', to: 'k-ultra', mine: '6.5' },
    { from: 'c40', setting: '30', to: 'k-ultra', mine: '9.0' },
  ]);
  assert.equal(G.convert('c40', '22', 'k-ultra', two).display, '6.5');
  assert.equal(G.convert('c40', '30', 'k-ultra', two).display, '9.0');

  const rev = G.applyPairs([
    { from: 'k-ultra', setting: '6.5', to: 'c40', mine: '22' },
    { from: 'k-ultra', setting: '9.0', to: 'c40', mine: '30' },
  ]);
  assert.equal(G.convert('c40', '22', 'k-ultra', rev).display, '6.5');
  assert.ok(!rev['k-ultra'].pairs.some((p) => p.builtin));
});

test('內建對照點跟使用者的其他機器一起套用', () => {
  const extra = G.applyPairs([
    { from: 'x-ultra', setting: '2.2.0', to: 'k-ultra', mine: '7.0' },
    { from: 'x-ultra', setting: '2.3.5', to: 'k-ultra', mine: '8.0' },
  ]);
  assert.equal(G.convert('x-ultra', '2.2.0', 'k-ultra', extra).display, '7.0');
  assert.equal(G.convert('c40', '22', 'k-ultra', extra).display, '6.8');
  // X-Ultra → K-Ultra → C40 串接
  assert.equal(G.convert('k-ultra', '6.8', 'c40', extra).display, '22');
});

test('內建對照點造成循環參照時，退回只用使用者的', () => {
  // C40 → X-Ultra → K-Ultra，加上內建 K-Ultra → C40 會繞一圈
  const pairs = [
    { from: 'c40', setting: '20', to: 'x-ultra', mine: '2.0.0' },
    { from: 'c40', setting: '30', to: 'x-ultra', mine: '2.5.0' },
    { from: 'x-ultra', setting: '2.2.0', to: 'k-ultra', mine: '7.0' },
    { from: 'x-ultra', setting: '2.3.5', to: 'k-ultra', mine: '8.0' },
  ];
  const extra = G.applyPairs(pairs);
  assert.equal(extra['k-ultra'], undefined);
  assert.equal(G.convert('c40', '20', 'x-ultra', extra).display, '2.0.0');
  assert.doesNotThrow(() => G.convert('c40', '22', 'k-ultra', extra));
});
