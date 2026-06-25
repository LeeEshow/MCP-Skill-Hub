# react-mvvm 完整規範

## 目錄結構

```
src/
├── styles/               ← ① 設計 Token（最優先）
│   ├── tokens.css        ← CSS 自訂屬性（唯一來源）
│   ├── global.css        ← 全域樣式 + 共用 class
│   ├── theme.ts          ← TypeScript 版 tokens（供圖表庫 / 內聯樣式）
│   └── index.ts          ← 統一 export 入口
├── api/                  ← Axios 實例與攔截器
├── types/                ← DTO / Domain 型別定義
├── models/               ← API 呼叫 + DTO → Domain 轉換
├── viewmodels/           ← Custom Hook（邏輯層）
└── views/
    ├── layout/           ← 版面元件
    ├── components/       ← UI 共用元件
    └── pages/            ← 頁面（組裝 View + ViewModel）
```

## MVVM 對應關係

| MVVM      | React 對應           |
|-----------|----------------------|
| Model     | types/ + models/     |
| View      | components/ / pages/ |
| ViewModel | Custom Hooks         |

## Types 範例

```typescript
// types/product.ts

// DTO：對應後端 JSON（snake_case）
export interface ProductDTO {
  product_id: string;
  unit_price: number;
  stock_qty: number;
  is_active?: boolean;
}

// Domain：前端使用格式（camelCase），含衍生欄位
export interface Product {
  productId: string;
  unitPrice: number;
  stockQty: number;
  isLowStock: boolean;  // 衍生欄位，後端不提供
  isActive: boolean;
}
```

## Model 範例

```typescript
// models/productModel.ts
import { apiClient } from '../api/axios';
import { ProductDTO, Product } from '../types/product';

export const fetchProducts = async (): Promise<Product[]> => {
  const res = await apiClient.get<ProductDTO[]>('/products');
  return res.data.map(fromDTO);
};

// 私有轉換函式（snake_case → camelCase + 計算衍生欄位）
const fromDTO = (dto: ProductDTO): Product => ({
  productId:  dto.product_id,
  unitPrice:  dto.unit_price,
  stockQty:   dto.stock_qty,
  isLowStock: dto.stock_qty < 10,
  isActive:   dto.is_active ?? true,
});
```

## ViewModel 範例

```typescript
// viewmodels/useProductsViewModel.ts
import { useEffect, useState, useCallback } from 'react';
import { fetchProducts } from '../models/productModel';
import { Product } from '../types/product';

export const useProductsViewModel = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const totalCount    = products.length;
  const lowStockCount = products.filter(p => p.isLowStock).length;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await fetchProducts());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { products, loading, error, totalCount, lowStockCount, reload: load };
};
```

## View 範例

```typescript
// views/pages/ProductListPage.tsx
import { useProductsViewModel } from '../../viewmodels/useProductsViewModel';
import DataTable from '../../components/DataTable';
import { LoadingPanel } from '../../components/LoadingPanel';

const ProductListPage: React.FC = () => {
  const vm = useProductsViewModel();
  if (vm.loading) return <LoadingPanel />;
  return (
    <DataTable
      data={vm.products}
      rowKey="productId"
      columns={[
        { key: 'productId', label: '商品編號' },
        { key: 'unitPrice', label: '單價', align: 'right' },
      ]}
    />
  );
};
```

## Hook 規範

### 禁止在 render 函式內定義子元件

```typescript
// ❌ 錯誤：每次 render 產生新參考，導致 unmount/remount
const Panel = () => {
  const ActionBtn = ({ label }: { label: string }) => (
    <button>{label}</button>
  );
  return <ActionBtn label="送出" />;
};

// ✅ 正確：移到 module scope
const ActionBtn = ({ label }: { label: string }) => (
  <button>{label}</button>
);
const Panel = () => <ActionBtn label="送出" />;
```

### useLatest 模式

```typescript
// utils/useLatest.ts
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

// ✅ 正確：空 deps interval，永遠讀到最新 vm
const vmRef = useLatest(vm);
useEffect(() => {
  const id = setInterval(() => {
    vmRef.current.refresh(); // callback 讀取，安全
  }, 5000);
  return () => clearInterval(id);
}, []);

// ❌ 禁止：在 render 路徑讀取 ref
const doubled = vmRef.current.value * 2; // render 路徑讀取，禁止
```

### Effect 內 setState

```typescript
// ✅ 加具名 eslint-disable 說明理由
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- modal open draft reset
  if (open) setDraft(initialValue);
}, [open]);
```

### 共用 Input Draft Hook

```typescript
// hooks/useDraftValue.ts
export const useDraftValue = (externalValue: number, onCommit: (raw: string) => void) => {
  const [draft, setDraft] = useState(String(externalValue));
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sync on external value change
  useEffect(() => { setDraft(String(externalValue)); }, [externalValue]);
  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (!isNaN(n)) onCommit(raw);
    else setDraft(String(externalValue));
  };
  return { draft, setDraft, commit };
};
```

## 非同步可靠性

### 防 Stale Response

```typescript
// Request ID 模式
const reqIdRef = useRef(0);
const load = useCallback(async (query: string) => {
  const id = ++reqIdRef.current;
  setLoading(true);
  try {
    const data = await fetchData(query);
    if (id !== reqIdRef.current) return;
    setData(data);
  } finally {
    if (id === reqIdRef.current) setLoading(false);
  }
}, []);

// Cancelled Flag 模式（適用 useEffect mount 請求）
useEffect(() => {
  let cancelled = false;
  fetchOptions().then(list => {
    if (cancelled) return;
    setOptions(list);
  });
  return () => { cancelled = true; };
}, []);
```

### API 錯誤處理

```typescript
// api/client.ts
apiClient.interceptors.response.use(
  response => response,
  error => {
    // DEV 環境完整輸出便於除錯
    if (import.meta.env.DEV) {
      console.error('[API Error Source Details]', error);
    }
    // PROD 環境阻斷技術細節，只回傳使用者友善訊息
    let userMessage = '系統維護中，請稍後再試。';
    if (error.response?.data?.message) {
      userMessage = error.response.data.message; // 採用後端包裹的業務錯誤訊息
    } else if (error.message?.includes('timeout')) {
      userMessage = '連線逾時，請檢查您的網路狀態。';
    }
    return Promise.reject(new Error(userMessage));
  }
);
```

## 效能優化

```typescript
// ❌ 高頻事件 setState
const onMouseMove = (e: MouseEvent) => {
  setPosition({ x: e.clientX, y: e.clientY }); // 每次移動都 re-render
};

// ✅ 直接操作 DOM，結束時才提交
const onMouseMove = useCallback((e: MouseEvent) => {
  elementRef.current!.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
}, []);
const onMouseUp = useCallback((e: MouseEvent) => {
  setPosition({ x: e.clientX, y: e.clientY }); // 只提交一次
}, []);

// Context Provider value 必須 memoize
const value = useMemo(() => ({ data, actions }), [data, actions]);
return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
```

## 安全性

```typescript
// ❌ 禁止：dangerouslySetInnerHTML 直接插入未處理的使用者內容（XSS 風險）
return <div dangerouslySetInnerHTML={{ __html: userInput }} />;

// ✅ 正確：文字內容走 React 標準大括號，自動轉義
return <div>{userInput}</div>;

// ✅ 必要時才用 dangerouslySetInnerHTML，且必須先以 DOMPurify sanitize
import DOMPurify from 'dompurify';
const cleanHtml = useMemo(() => DOMPurify.sanitize(dirtyHtml), [dirtyHtml]);
return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;

// ❌ 禁止：DOM 操作直接插入使用者資料
element.innerHTML = `<td>${userValue}</td>`;

// ✅ 正確：DOM 操作改用 textContent（瀏覽器自動 escape）
const td = document.createElement('td');
td.textContent = userValue;
```
