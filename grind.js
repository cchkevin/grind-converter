// 磨豆刻度換算引擎（手沖）
//
// 每台機器用 V60 建議範圍兩端 ≈ 400µm / 700µm 建立「格數 → 粒徑」的直線，
// 換算 = A 機刻度 → 粒徑 µm → B 機刻度。
//
// 為什麼不用廠商標的「每格幾微米」？那是刀盤軸向移動量，不是粒徑。
// 例如 K-Ultra 標 20µm/格、C40 標 30µm/格，但兩者手沖格數的比例跟這個完全對不上。
//
// 可在瀏覽器（<script> 直接載入，不需伺服器）和 Node（require）使用。

(function (root) {
  const { GRINDERS, V60_MICRONS } =
    typeof module !== 'undefined' && module.exports ? require('./grinders.js') : root.Grind;

  // ── 刻度寫法 ↔ 總格數 ──

  function parts(str, max) {
    const s = String(str).trim();
    if (!/^\d+(\.\d+){0,2}$/.test(s)) throw new Error(`看不懂的刻度：「${str}」`);
    const p = s.split('.').map(Number);
    if (p.length > max) throw new Error(`「${str}」的段數太多，這台最多 ${max} 段`);
    return p;
  }

  /** 把該機型的刻度寫法轉成「從零點起算的總格數」（decimal 型可有小數） */
  function toClicks(notation, str) {
    switch (notation.type) {
      case 'clicks':
      case 'decimal': {
        const s = String(str).trim();
        const v = Number(s);
        if (s === '' || !Number.isFinite(v) || v < 0) throw new Error(`看不懂的刻度：「${str}」`);
        return v;
      }
      case 'rnt': {
        // 3 段 = 圈.數字.格；2 段 = 數字.格（第 0 圈，例如 K-Ultra 常說的 8.0）；1 段 = 數字
        const { perRotation, perNumber } = notation;
        const numbers = perRotation / perNumber;
        const p = parts(str, 3);
        const [r, n, t] = p.length === 3 ? p : p.length === 2 ? [0, ...p] : [0, p[0], 0];
        if (n >= numbers) throw new Error(`「${str}」：數字要小於 ${numbers}`);
        if (t >= perNumber) throw new Error(`「${str}」：格要小於 ${perNumber}`);
        return r * perRotation + n * perNumber + t;
      }
      case 'rc': {
        // 圈.格數，例如 1.22 = 1 圈又 22 格
        const p = parts(str, 2);
        const [r, c] = p.length === 2 ? p : [0, p[0]];
        if (p.length === 2 && c >= notation.perRotation) throw new Error(`「${str}」：格數要小於 ${notation.perRotation}`);
        return r * notation.perRotation + c;
      }
      case 'numberStep': {
        const p = parts(str, 2);
        const [n, s] = p.length === 2 ? p : [p[0], 0];
        if (s >= notation.perNumber) throw new Error(`「${str}」：小格要小於 ${notation.perNumber}`);
        return n * notation.perNumber + s;
      }
      default:
        throw new Error(`未知的刻度寫法：${notation.type}`);
    }
  }

  /** 總格數 → 該機型的刻度寫法 */
  function fromClicks(notation, clicks) {
    switch (notation.type) {
      case 'clicks':
        return String(Math.round(clicks));
      case 'decimal':
        return String(Math.round(clicks * 10) / 10);
      case 'rnt': {
        const c = Math.round(clicks);
        const r = Math.floor(c / notation.perRotation);
        const rest = c % notation.perRotation;
        const n = Math.floor(rest / notation.perNumber);
        const t = rest % notation.perNumber;
        return r === 0 ? `${n}.${t}` : `${r}.${n}.${t}`;
      }
      case 'rc': {
        const c = Math.round(clicks);
        const r = Math.floor(c / notation.perRotation);
        return `${r}.${String(c % notation.perRotation).padStart(2, '0')}`;
      }
      case 'numberStep': {
        const c = Math.round(clicks);
        return `${Math.floor(c / notation.perNumber)}.${c % notation.perNumber}`;
      }
      default:
        throw new Error(`未知的刻度寫法：${notation.type}`);
    }
  }

  // ── 格數 ↔ 粒徑 ──

  function getGrinder(id, extra) {
    const g = (extra && extra[id]) || GRINDERS[id];
    if (!g) throw new Error(`找不到磨豆機：${id}`);
    return g;
  }

  function line(g) {
    const lo = toClicks(g.notation, g.v60[0]);
    const hi = toClicks(g.notation, g.v60[1]);
    if (!(hi > lo)) throw new Error(`${g.name} 的 V60 範圍要「細 < 粗」`);
    const slope = (V60_MICRONS[1] - V60_MICRONS[0]) / (hi - lo); // µm / 格
    return { lo, slope };
  }

  /**
   * 有些機器沒有可靠的 V60 範圍，但有跟另一台機器的實測對照（例如過篩比對）。
   * 這種機器用 ref 定義：{ grinder: 'c40', pairs: [[這台的刻度, 那台的刻度], [這台的, 那台的]] }
   * 這台的格數先線性換成那台的格數，再用那台的粒徑模型（含那台的對照點修正）。
   */
  function refLine(g, extra) {
    const ref = getGrinder(g.ref.grinder, extra);
    const n = g.ref.pairs.map(([mine, theirs]) => [toClicks(g.notation, mine), toClicks(ref.notation, String(theirs))]);
    const [[x1, y1], [x2, y2]] = n;
    if (!(x2 > x1) || !(y2 > y1)) throw new Error(`${g.name} 的對照資料要「細 < 粗」`);
    const k = (y2 - y1) / (x2 - x1); // 那台的格數 / 這台的格數
    return { x1, y1, k };
  }

  /** 總格數 → 粒徑 µm（g.scale 是實測對照點算出的修正倍率，預設 1） */
  function micronsAt(g, clicks, extra, depth = 0) {
    if (depth > 5) throw new Error('ref 參照形成循環');
    let um;
    if (g.ref) {
      const { x1, y1, k } = refLine(g, extra);
      um = micronsAt(getGrinder(g.ref.grinder, extra), y1 + (clicks - x1) * k, extra, depth + 1);
    } else {
      const { lo, slope } = line(g);
      um = V60_MICRONS[0] + (clicks - lo) * slope;
    }
    return um * (g.scale || 1);
  }

  /** 粒徑 µm → 總格數 */
  function clicksAt(g, microns, extra, depth = 0) {
    if (depth > 5) throw new Error('ref 參照形成循環');
    const um = microns / (g.scale || 1);
    if (g.ref) {
      const { x1, y1, k } = refLine(g, extra);
      return x1 + (clicksAt(getGrinder(g.ref.grinder, extra), um, extra, depth + 1) - y1) / k;
    }
    const { lo, slope } = line(g);
    return lo + (um - V60_MICRONS[0]) / slope;
  }

  /** 刻度字串 → 粒徑 µm */
  function toMicrons(id, setting, extra) {
    const g = getGrinder(id, extra);
    return micronsAt(g, toClicks(g.notation, setting), extra);
  }

  /** 粒徑 µm → 該機刻度 */
  function fromMicrons(id, microns, extra) {
    const g = getGrinder(id, extra);
    const clicks = Math.max(0, clicksAt(g, microns, extra));
    const [min, max] = g.microns || [0, Infinity];
    return {
      clicks,
      display: fromClicks(g.notation, clicks),
      microns,
      outOfRange: microns < min || microns > max,
    };
  }

  /**
   * A 機刻度 → B 機刻度
   * @param fromId  食譜用的磨豆機 id
   * @param setting 食譜的刻度（字串，用那台機器的寫法，例如 "24"、"0.8.0"、"4.2"）
   * @param toId    要換算成的磨豆機 id
   * @param extra   自訂磨豆機 { id: grinder }（選填）
   */
  function convert(fromId, setting, toId, extra) {
    return fromMicrons(toId, toMicrons(fromId, setting, extra), extra);
  }

  /**
   * 實測對照點：實際比對過「A 機 X 格 ≈ B 機 Y」，算出 A 機的修正倍率
   * 不同資料來源對同一台機器的估計差很多，實際比對過的點最準。
   * 回傳的 scale 放進 extra[fromId].scale 即可生效。
   */
  function pairScale(fromId, fromSetting, toId, toSetting, extra) {
    const from = getGrinder(fromId, extra);
    const base = toMicrons(fromId, fromSetting, { ...extra, [fromId]: { ...from, scale: 1 } });
    const target = toMicrons(toId, toSetting, extra);
    if (!(base > 0) || !(target > 0)) throw new Error('對照點的刻度太細，無法計算');
    return target / base;
  }

  /**
   * 把對照點清單套用成 extra：[{ from, setting, to, mine }]（from 機 setting ≈ to 機 mine）
   *   同一台只有 1 組 → 整台等比例修正（scale）
   *   同一台有 2 組以上 → 取最細、最粗兩組，直接用兩點定義這台跟對方的換算（起點和比例都照實測）
   */
  function applyPairs(pairs, extra = {}) {
    const out = { ...extra };
    const groups = new Map();
    for (const p of pairs || []) {
      const list = groups.get(p.from) || [];
      // 兩點定義需要同一台對照對象；對象不同時只保留最新的對象
      groups.set(p.from, list.filter((x) => x.to === p.to).concat(p));
    }
    for (const [from, list] of groups) {
      const g = getGrinder(from, extra); // 原始定義（內建或自訂），不是已套用過對照點的版本
      if (list.length === 1) {
        const p = list[0];
        out[from] = { ...g, scale: pairScale(from, p.setting, p.to, p.mine, out), pair: p, pairs: list };
        continue;
      }
      const sorted = list
        .map((p) => ({ p, c: toClicks(g.notation, p.setting) }))
        .sort((a, b) => a.c - b.c);
      const lo = sorted[0].p;
      const hi = sorted[sorted.length - 1].p;
      if (sorted[0].c === sorted[sorted.length - 1].c) throw new Error(`${g.name} 的兩個對照點刻度相同`);
      const next = { ...g, scale: undefined, ref: { grinder: lo.to, pairs: [[lo.setting, lo.mine], [hi.setting, hi.mine]] }, pair: hi, pairs: list };
      validateGrinder(next, out);
      out[from] = next;
    }
    return out;
  }

  /** 檢查一筆磨豆機資料（給自訂磨豆機用），有問題就丟錯 */
  function validateGrinder(g, extra) {
    if (!g || !g.name) throw new Error('缺少名稱');
    if (!g.notation || !g.notation.type) throw new Error('缺少刻度寫法');
    if (g.ref) {
      if (!Array.isArray(g.ref.pairs) || g.ref.pairs.length !== 2) throw new Error('對照資料要有兩組');
      refLine(g, extra);
    } else {
      if (!Array.isArray(g.v60) || g.v60.length !== 2) throw new Error('V60 範圍要有細、粗兩個值');
      line(g);
    }
    return true;
  }

  const api = { GRINDERS, V60_MICRONS, toClicks, fromClicks, toMicrons, fromMicrons, convert, pairScale, applyPairs, validateGrinder };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign((root.Grind = root.Grind || {}), api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
