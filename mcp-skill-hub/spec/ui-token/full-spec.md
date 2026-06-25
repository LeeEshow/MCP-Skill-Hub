# ui-token 完整規範

## 目錄結構

```
src/styles/
├── tokens.css     ← 所有 Token 的唯一來源（Primitive + Semantic）
├── global.css     ← CSS Reset + 全域共用樣式
├── theme.ts       ← TypeScript 版 Token（供圖表庫 / 內聯樣式）
└── index.ts       ← 統一 export 入口
```

## Token 兩層架構

```
Primitive Token        →    Semantic Token         →    元件
--color-blue-500: #3b82f6   --color-primary: var(--color-blue-500)   color: var(--color-primary)
```

- **Primitive**：原始設計數值，命名反映色票或絕對尺寸
- **Semantic**：語意別名，命名反映用途；元件只能引用此層

## tokens.css

```css
/* styles/tokens.css */
:root {
  /* ── Primitive：色票 ────────────────────────────────── */
  --color-blue-100: #dbeafe;
  --color-blue-500: #3b82f6;
  --color-blue-700: #1d4ed8;
  --color-red-500:  #ef4444;
  --color-red-700:  #b91c1c;
  --color-green-500:#22c55e;
  --color-yellow-500:#eab308;
  --color-gray-50:  #f9fafb;
  --color-gray-200: #e5e7eb;
  --color-gray-500: #6b7280;
  --color-gray-900: #111827;
  --color-white:    #ffffff;

  /* ── Semantic：顏色用途 ─────────────────────────────── */
  --color-primary:         var(--color-blue-500);
  --color-primary-hover:   var(--color-blue-700);
  --color-primary-subtle:  var(--color-blue-100);
  --color-danger:          var(--color-red-500);
  --color-danger-hover:    var(--color-red-700);
  --color-success:         var(--color-green-500);
  --color-warning:         var(--color-yellow-500);
  --color-text-default:    var(--color-gray-900);
  --color-text-muted:      var(--color-gray-500);
  --color-border:          var(--color-gray-200);
  --color-surface:         var(--color-white);
  --color-background:      var(--color-gray-50);

  /* ── 間距：4px 基礎單位 ────────────────────────────── */
  --spacing-xs:  4px;
  --spacing-sm:  8px;
  --spacing-md:  16px;
  --spacing-lg:  24px;
  --spacing-xl:  32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;

  /* ── 字體大小 ──────────────────────────────────────── */
  --font-size-xs:  12px;
  --font-size-sm:  14px;
  --font-size-md:  16px;
  --font-size-lg:  18px;
  --font-size-xl:  20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 30px;

  /* ── 字重 ──────────────────────────────────────────── */
  --font-weight-normal:  400;
  --font-weight-medium:  500;
  --font-weight-semibold:600;
  --font-weight-bold:    700;

  /* ── 行高 ──────────────────────────────────────────── */
  --line-height-tight:  1.25;
  --line-height-normal: 1.5;
  --line-height-loose:  1.75;

  /* ── 圓角 ──────────────────────────────────────────── */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-full: 9999px;

  /* ── 陰影 ──────────────────────────────────────────── */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.10);

  /* ── Z-index ───────────────────────────────────────── */
  --z-index-base:     0;
  --z-index-dropdown: 100;
  --z-index-sticky:   200;
  --z-index-modal:    300;
  --z-index-toast:    400;

  /* ── 過渡動畫 ──────────────────────────────────────── */
  --transition-fast:   150ms ease;
  --transition-normal: 250ms ease;
}

/* ── Dark Mode：只覆寫 Semantic Token ──────────────────── */
[data-theme="dark"] {
  --color-primary:        var(--color-blue-500);
  --color-primary-hover:  var(--color-blue-700);
  --color-text-default:   var(--color-gray-50);
  --color-text-muted:     var(--color-gray-500);
  --color-border:         #374151;
  --color-surface:        #1f2937;
  --color-background:     #111827;
}
```

## theme.ts（TypeScript 橋接）

```typescript
// styles/theme.ts
// 數值必須與 tokens.css 保持同步，任一異動兩者同步更新

export const theme = {
  color: {
    primary:        '#3b82f6',
    primaryHover:   '#1d4ed8',
    danger:         '#ef4444',
    success:        '#22c55e',
    warning:        '#eab308',
    textDefault:    '#111827',
    textMuted:      '#6b7280',
    border:         '#e5e7eb',
    surface:        '#ffffff',
    background:     '#f9fafb',
  },
  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    '2xl': 48,
    '3xl': 64,
  },
  fontSize: {
    xs:  12,
    sm:  14,
    md:  16,
    lg:  18,
    xl:  20,
    '2xl': 24,
  },
} as const;

export type ThemeColor   = keyof typeof theme.color;
export type ThemeSpacing = keyof typeof theme.spacing;
```

## index.ts（統一 export）

```typescript
// styles/index.ts
import './tokens.css';
import './global.css';

export { theme }        from './theme';
export type { ThemeColor, ThemeSpacing } from './theme';
```

## 元件使用範例

```css
/* ✅ 正確：引用 Semantic Token */
.button-primary {
  background-color: var(--color-primary);
  color:            var(--color-surface);
  padding:          var(--spacing-sm) var(--spacing-md);
  border-radius:    var(--radius-md);
  font-size:        var(--font-size-sm);
  font-weight:      var(--font-weight-medium);
  transition:       background-color var(--transition-fast);
}
.button-primary:hover {
  background-color: var(--color-primary-hover); /* ✅ 狀態色用 Token */
}
.button-primary:disabled {
  opacity: 0.5;
  cursor:  not-allowed;
}

/* ❌ 禁止：硬編碼色值 */
.button-bad {
  background-color: #3b82f6;   /* ❌ */
  padding: 8px 16px;           /* ❌ */
  filter: brightness(0.9);     /* ❌ hover 不能用 filter */
}
```

```typescript
// ✅ 正確：圖表庫使用 theme.ts（不支援 CSS 變數時）
import { theme } from '@/styles';

const chartOptions = {
  colors: [theme.color.primary, theme.color.danger, theme.color.success],
  chart:  { fontFamily: 'inherit', fontSize: theme.fontSize.sm },
};

// ❌ 禁止：圖表庫使用硬編碼色值
const badOptions = {
  colors: ['#3b82f6', '#ef4444'],  // ❌
};
```

## Dark Mode 切換

```typescript
// 切換深色模式：只需切換 data-theme 屬性，所有 Semantic Token 自動更新
const toggleDarkMode = (isDark: boolean) => {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
};

// ❌ 禁止：在元件內各自處理 dark mode
const badStyle = {
  color: isDark ? '#f9fafb' : '#111827',  // ❌ 繞過 Token 系統
};
```

## 新增 Token 判斷流程

```
需要新設計數值？
    │
    ▼
是否已有語意相近的 Semantic Token？
    ├─ 是 → 直接使用，禁止新增重複 Token
    └─ 否 → 是否有對應的 Primitive Token？
                ├─ 是 → 新增 Semantic Token，指向現有 Primitive
                └─ 否 → 先新增 Primitive Token，再新增 Semantic Token
```
