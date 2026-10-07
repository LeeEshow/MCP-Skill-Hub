# Layer 2 Rules — ui-token Spec

代號格式：未標＝核心（偏離須讓審查者查得到原因，見 AIC-12）；`[建議]`＝偏離無須說明；`[前提:…]`＝符合前提才適用。

- UIT-01 元件引用 Token 而非字面值，Token 命名與分層由專案決定；hover、active、disabled 等互動狀態色由 Token 表達，不以 `filter` 或魔術色值調整。
- UIT-02 所有設計數值（顏色、尺寸、字體、陰影、層級）由集中定義的 Token 提供，元件與內聯樣式不寫字面值（Token 定義檔本身除外）。
- UIT-06 若支援主題切換，須在 Token 層覆寫，不在元件內各自判斷。
- UIT-11 新增 Token 前確認無可複用者，不建立語意重複的 Token。
