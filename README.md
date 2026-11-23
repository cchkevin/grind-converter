# 磨豆刻度換算（手沖）

把食譜上的磨豆機刻度換算成另一台磨豆機的刻度，例如「C40 22 格」→「1Zpresso K-Ultra 幾格」。

- **離線可用**：下載後直接用瀏覽器打開 `index.html`，不需要網路、伺服器或安裝。
- **實測對照點**：網路上各家換算表差異很大，可以填入自己實際比對過的刻度修正換算。同一台機器填兩組（例如淺焙、中焙）最準。
- **常用刻度**：填入平常的淺焙／中焙／深焙刻度，換算結果會顯示比平常粗或細幾格。
- **自訂磨豆機**：清單裡沒有的機器，只要知道 V60 建議範圍的最細、最粗刻度就能加入。
- 自訂資料存在瀏覽器的 localStorage，可匯出／匯入 JSON 備份。

## 個人預設（選填）

把 `local-settings.example.js` 複製成 `local-settings.js`，填入自己的對照點和常用刻度。
瀏覽器裡還沒存過設定時，頁面會自動套用這些設定，換電腦或清掉瀏覽器資料也不用重新輸入。
`local-settings.js` 已列在 `.gitignore`，不會被上傳。

## 換算原理

每台磨豆機 V60 建議範圍的細端對應約 400µm、粗端約 700µm，用這兩點建立「刻度 → 粒徑」的直線，
所有機器就能在同一把尺上互換：A 機刻度 → 粒徑 → B 機刻度。

不用廠商標示的「每格幾微米」，因為那是刀盤的軸向移動量，不是實際粒徑，跨機比較對不上。

已發表的資料彼此差異主要在「起點」（零點定義、量測方式不同），每格之間的比例反而比較一致。
所以沒有實測時，換算結果請當作起點；加入自己的對照點後，起點就會被校正。

## 檔案

| 檔案 | 內容 |
|---|---|
| `index.html` | 換算頁面 |
| `grinders.js` | 磨豆機資料表（V60 範圍、刻度寫法、可磨範圍、資料來源） |
| `grind.js` | 換算引擎，瀏覽器 `<script>` 與 Node `require` 都可用 |
| `grind.test.cjs` | 測試：`node --test grind.test.cjs` |
| `local-settings.example.js` | 個人預設的範本 |

### 在程式裡使用

```js
const G = require('./grind.js');
G.convert('c40', '22', 'k-ultra').display; // → '8.0'

// 加入實測對照點
const extra = G.applyPairs([{ from: 'c40', setting: '22', to: 'k-ultra', mine: '6.5' }]);
G.convert('c40', '22', 'k-ultra', extra).display; // → '6.5'
```

## 資料來源

- 各機型 V60 建議範圍：[Honest Coffee Guide](https://honestcoffeeguide.com/)（同一套方法估算，跨機比較較一致）
- 1Zpresso 刻度寫法：1Zpresso 官方 grind setting reference
- MAVO 幻刺 Pro：中文社群的過篩比對（[什麼值得買](https://post.smzdm.com/p/adonox6x/)、[Bilibili](https://www.bilibili.com/video/BV1Qc41167EN/)）

每筆資料的來源都寫在 `grinders.js`。標示「寫法待確認」的機型，刻度寫法是依常見用法推定的，歡迎用 issue 或 PR 修正。

## 注意

磨豆機個體差異、刀盤磨合、豆子烘焙度都會影響結果。換算出來的是起點，請依口感微調。

## 授權

程式碼以 [MIT License](LICENSE) 釋出。

`grinders.js` 裡的磨豆機刻度資料整理自各來源（見上方「資料來源」與檔案內的連結），引用時請一併註明原始出處。
