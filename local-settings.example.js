// 個人預設（選填）：複製成 local-settings.js 後修改。
// 瀏覽器裡還沒存過對照點／常用刻度時，頁面會自動套用這裡的設定；
// 在頁面上改過之後，以瀏覽器裡存的為準。local-settings.js 不會進 git。
(function (root) {
  const LOCAL_SETTINGS = {
    // 實測對照點：from 機的 setting ≈ to 機的 mine。同一台填兩組最準。
    pairs: [
      // { from: 'c40', setting: '22', to: 'k-ultra', mine: '6.5', note: '咖啡廳比對' },
    ],
    // 常用刻度：換算到這台機器時，會顯示比平常粗／細幾格
    usual: null, // 例如 { grinder: 'k-ultra', light: ['7.0', '7.3'], medium: ['8.0', '8.0'], dark: ['8.5', '9.0'] }（不用的焙度可省略）
  };
  Object.assign((root.Grind = root.Grind || {}), { LOCAL_SETTINGS });
})(globalThis);
