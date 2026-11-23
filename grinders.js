// 磨豆機資料表（手沖換算用）
//
// 換算原理：每台機器 V60 建議範圍的細端 ≈ 400µm、粗端 ≈ 700µm，
// 用這兩點建立「格數 ↔ 粒徑 µm」的直線，所有機器就能在同一把尺上互換。
// 資料來源：Honest Coffee Guide 各機型頁面（同一套方法估算，跨機比較才一致），
// 1Zpresso 刻度寫法對照官方 grind setting reference 圖。
//
// 欄位：
//   v60        V60 建議範圍 [細, 粗]，用該機型自己的刻度寫法（字串）
//   microns    該機可磨範圍 [最細, 最粗] µm，超出就提示
//   notation   刻度寫法
//     { type: 'clicks' }                              直接數格數，例如 "24"
//     { type: 'decimal' }                             刻度盤數字，可有小數，例如 "5.5"
//     { type: 'rnt', perRotation, perNumber }         圈.數字.格，例如 K-Ultra "0.8.0"（也接受 "8.0"）
//     { type: 'rc', perRotation }                     圈.格數，例如 KINGrinder "1.22" = 1 圈 22 格
//     { type: 'numberStep', perNumber }               數字.小格，例如 Fellow Ode Gen 2 "4.2" = 4 號第 2 小格
//   confidence 'high' = 刻度寫法已對照官方；'medium' = 寫法依常見用法推定，請自行確認

(function (root) {
  const HCG = (slug) => `https://honestcoffeeguide.com/${slug}-grind-settings/`;
  const rnt = (perRotation, perNumber = 10) => ({ type: 'rnt', perRotation, perNumber });
  const clicks = { type: 'clicks' };
  const decimal = { type: 'decimal' };

  const GRINDERS = {
    // ── 1Zpresso ──
    'k-ultra': { name: '1Zpresso K-Ultra', v60: ['0.5.3', '0.9.2'], microns: [0, 760], notation: rnt(100), confidence: 'high', source: HCG('1zpresso-k-ultra') },
    'k-pro': { name: '1Zpresso K-Pro', v60: ['0.5.0', '0.8.7'], microns: [0, 1400], notation: rnt(100), confidence: 'high', source: HCG('1zpresso-k-pro') },
    'k-plus': { name: '1Zpresso K-Plus', v60: ['0.4.9', '0.8.4'], microns: [0, 1330], notation: rnt(100), confidence: 'high', source: HCG('1zpresso-k-plus') },
    'k-max': { name: '1Zpresso K-Max', v60: ['0.5.0', '0.8.7'], microns: [0, 1400], notation: rnt(100), confidence: 'high', source: HCG('1zpresso-k-max') },
    'j-max': { name: '1Zpresso J-Max', v60: ['1.6.2', '2.8.4'], microns: [0, 1190], notation: rnt(90), confidence: 'high', source: HCG('1zpresso-j-max') },
    'j-ultra': { name: '1Zpresso J-Ultra', v60: ['1.6.3', '2.8.4'], microns: [0, 1230], notation: rnt(100), confidence: 'medium', source: HCG('1zpresso-j-ultra') },
    'x-pro': { name: '1Zpresso X-Pro', v60: ['1.1.8', '2.1.5'], microns: [0, 1240], notation: rnt(60), confidence: 'high', source: HCG('1zpresso-x-pro') },
    'x-ultra': { name: '1Zpresso X-Ultra', v60: ['1.2.0', '2.1.8'], microns: [0, 1210], notation: rnt(60), confidence: 'medium', source: HCG('1zpresso-x-ultra') },
    'zp6': { name: '1Zpresso ZP6 Special', v60: ['1.8', '5.1'], microns: [240, 1050], notation: decimal, confidence: 'medium', source: HCG('1zpresso-zp6-special') },

    // ── Comandante ──
    'c40': { name: 'Comandante C40 MK4', v60: ['15', '25'], microns: [0, 1090], notation: clicks, confidence: 'high', source: HCG('comandante-c40-mk4') },
    'c40-redclix': { name: 'Comandante C40 + Red Clix', v60: ['30', '51'], microns: [0, 1090], notation: clicks, confidence: 'high', source: HCG('comandante-c40-mk4-with-red-clix') },

    // ── Timemore 泰摩 ──
    'timemore-c2': { name: 'Timemore 栗子 C2', v60: ['13', '22'], microns: [0, 950], notation: clicks, confidence: 'high', source: HCG('timemore-c2') },
    'timemore-c3': { name: 'Timemore 栗子 C3 / C3S / C3 Pro / C3 Max', v60: ['11', '18'], microns: [0, 950], notation: clicks, confidence: 'high', source: HCG('timemore-c3') },
    'timemore-064s': { name: 'Timemore Sculptor 064S', v60: ['3.3', '9.3'], microns: [235, 1035], notation: decimal, confidence: 'medium', source: HCG('timemore-sculptor-064s') },

    // ── KINGrinder ──
    'kingrinder-k2': { name: 'KINGrinder K2', v60: ['55', '95'], microns: [0, 1030], notation: clicks, confidence: 'medium', source: HCG('kingrinder-k2') },
    'kingrinder-k6': { name: 'KINGrinder K4 / K6', v60: ['0.48', '1.22'], microns: [0, 1350], notation: { type: 'rc', perRotation: 60 }, confidence: 'medium', source: HCG('kingrinder-k6') },

    // ── 電動 ──
    'ode-gen2': { name: 'Fellow Ode Gen 2', v60: ['2.2', '5.2'], microns: [275, 1160], notation: { type: 'numberStep', perNumber: 3 }, confidence: 'medium', source: HCG('fellow-ode-brew-grinder-gen-2') },
    'opus': { name: 'Fellow Opus', v60: ['3', '6'], microns: [230, 1160], notation: decimal, confidence: 'medium', source: HCG('fellow-opus') },
    'ek43s': { name: 'Mahlkönig EK43 S', v60: ['5.7', '13.3'], microns: [180, 803], notation: decimal, confidence: 'high', source: HCG('mahlkonig-ek43-s') },
    'lagom-p64': { name: 'Option-O Lagom P64', v60: ['1.6', '4.5'], microns: [245, 1245], notation: decimal, confidence: 'high', source: HCG('option-o-lagom-p64') },
    'df64-gen2': { name: 'Turin DF64 Gen 2', v60: ['23', '53'], microns: [180, 1050], notation: decimal, confidence: 'high', source: HCG('turin-df64-gen-2') },
    'df83v': { name: 'Turin DF83V', v60: ['24', '50'], microns: [130, 1150], notation: decimal, confidence: 'high', source: HCG('turin-df83v') },
    'fuji-r220': { name: 'Fuji Royal 小富士 R-220', v60: ['2.5', '5.5'], microns: [290, 1090], notation: decimal, confidence: 'medium', source: HCG('fuji-royal-r-220') },
    'nice-cut-g': { name: 'Kalita Nice Cut G 小飛鷹', v60: ['1', '2'], microns: [420, 1400], notation: decimal, confidence: 'medium', source: HCG('kalita-nice-cut-g') },
    'baratza-encore': { name: 'Baratza Encore', v60: ['7', '18'], microns: [250, 1200], notation: clicks, confidence: 'high', source: HCG('baratza-encore') },
    'virtuoso-plus': { name: 'Baratza Virtuoso+', v60: ['8', '20'], microns: [200, 1200], notation: clicks, confidence: 'high', source: HCG('baratza-virtuoso-plus') },
    'wilfa-uniform': { name: 'Wilfa Uniform', v60: ['11', '25'], microns: [220, 1010], notation: clicks, confidence: 'high', source: HCG('wilfa-uniform') },
    'xbloom': { name: 'xBloom Studio', v60: ['21', '47'], microns: [180, 1050], notation: clicks, confidence: 'high', source: HCG('xbloom-studio') },

    // ── 其他手搖 ──
    // MAVO 幻刺 Pro：一圈 120 格（0–11 號，每號 10 格），常寫成「8.5」= 85 格。
    // Honest Coffee Guide 的 V60 4–7 跟中文社群的過篩實測、Coffee Chronicler 的使用習慣（手沖 7–11.5、常用 8.7）差很多，
    // 所以改用兩組 0.85mm 篩網的過篩比對，掛在 C40 上換算：
    //   6.3 ≈ C40 17 格（什麼值得買 https://post.smzdm.com/p/adonox6x/ ，過篩率皆約 72%）
    //   8.5 ≈ C40 24 格（B 站評測 https://www.bilibili.com/video/BV1Qc41167EN/ ）
    // 注意：smzdm 另外寫「C40 每粗一格 ≈ 幻刺粗 0.5」，跟這兩點算出的約 0.31 不一致，尚無定論。
    // v60 只用來顯示建議範圍（由 C40 V60 15–25 換算），換算本身走 ref。
    'phantox-pro': {
      name: 'MAVO 幻刺 Pro（Phantox Pro）',
      v60: ['5.7', '8.8'],
      ref: { grinder: 'c40', pairs: [['6.3', '17'], ['8.5', '24']] },
      microns: [0, 1200],
      notation: rnt(120),
      confidence: 'medium',
      source: 'https://post.smzdm.com/p/adonox6x/',
    },
    'exagrind': { name: 'Wacaco Exagrind', v60: ['19', '41'], microns: [150, 950], notation: clicks, confidence: 'high', source: HCG('wacaco-exagrind') },
    'porlex-mini2': { name: 'Porlex Mini II', v60: ['7', '12'], microns: [0, 1400], notation: clicks, confidence: 'high', source: HCG('porlex-mini-ii') },
    'skerton-pro': { name: 'Hario Skerton Pro', v60: ['2', '3'], microns: [350, 1400], notation: clicks, confidence: 'medium', source: HCG('hario-skerton-pro') },
  };

  /** V60 範圍兩端對應的粒徑（µm） */
  const V60_MICRONS = [400, 700];

  const api = { GRINDERS, V60_MICRONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else Object.assign((root.Grind = root.Grind || {}), api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
