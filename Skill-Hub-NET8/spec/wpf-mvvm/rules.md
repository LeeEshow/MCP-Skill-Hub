# Layer 2 Rules — WPF MVVM Spec

- View 僅限 XAML 結構與 Data Binding 宣告，Code-Behind 僅允許 `InitializeComponent()` 與純 UI 動畫交互邏輯。
- ViewModel 嚴禁引用 `System.Windows` 及其子命名空間，確保與 WPF 視窗框架完全解耦以具備獨立單元測試能力。
- ViewModel 必須實作 `INotifyPropertyChanged`，所有 UI 連動屬性的變更必須透過 `PropertyChanged` 事件明確觸發。
- 使用者操作必須全面透過 `ICommand` 實作，嚴禁在 XAML / Code-Behind 撰寫帶有業務邏輯的 UI 事件處理常式（EventHandler）。
- View 建構函式必須透過相依性注入（DI）接收 ViewModel 並配置 `DataContext`；ViewModel 嚴禁持有或感知任何 View 的參考。
- Domain 類別必須宣告靜態 `FromDto()` 方法承擔轉換責任；DTO 僅限純資料載體結構（限用 `init` 唯讀屬性且不含任何方法）。
- 若 DTO 來自 OpenAPI / Swagger 自動產生，轉換邏輯必須移至獨立的擴充方法 Mapper 類別，嚴禁修改自動產生的源碼檔案。
- Model 層（資料服務）僅負責資料存取並回傳 Domain 物件，嚴禁管理任何 ViewModel 狀態或引用 WPF 框架特有型別。
- 視窗上的動態列表綁定必須使用 `ObservableCollection<T>`，嚴禁以 `List<T>` 或陣列作為 ViewModel 的 UI 綁定集合屬性。
- `IValueConverter` 僅限純顯示格式轉換（如日期格式化、列舉中文化），嚴禁在 Converter 內執行業務邏輯或狀態流轉判斷。
- 視窗與頁面切換必須全面透過注入的 `INavigationService` 執行，嚴禁在 ViewModel 內部直接實例化視窗或操作全域 Windows 集合。
- 非同步 UI 操作必須以 `AsyncRelayCommand` 封裝，並明確管理 `IsLoading` 與 `ErrorMessage` 狀態；ViewModel 內部業務方法嚴禁宣告為 `async void`。
- 跳出確認框與錯誤提示必須全面透過注入的 `IDialogService` 異步執行，嚴禁 ViewModel 直接呼叫 `MessageBox.Show()`。
- ViewModel 建構函式僅限接收 DI 注入參數，嚴禁在建構函式內觸發非同步 I/O；所有非同步初始化必須改由 Command 觸發。
- 跨頁面共用狀態必須提取為獨立 `SharedViewModel` 並以 Singleton 方式注入 DI 容器，嚴禁透過靜態欄位或全域變數傳遞。
- 全 codebase 嚴禁使用 `FindName()`、`VisualTreeHelper` 或任何讓 ViewModel 取得 XAML UI 元素控制權的機制。
- `#region` 只用來組織對外的公開職責邊界（CRUD 群、多介面實作邊界、事件處理器、內嵌 DTO/Struct）；禁止巢狀 region，不為單一方法建立 region，禁止以實作細節分組（如 Helpers、Private Methods）。
- XML `<summary>` 限一句話，描述成員的職責與存在理由，不描述內部運作方式；禁止裝飾性橫幅與橫線分隔符。
