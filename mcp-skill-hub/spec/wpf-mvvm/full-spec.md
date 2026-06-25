# wpf-mvvm 完整規範

## 目錄結構

```
src/
├── DTOs/             ← 後端 JSON 對應結構（純資料，無方法）
├── Models/           ← Domain 類別（含靜態 FromDto 工廠）+ API 呼叫
├── ViewModels/       ← INotifyPropertyChanged + ICommand
├── Views/            ← XAML + 最小 Code-Behind
├── Services/         ← INavigationService / IDialogService
├── Converters/       ← IValueConverter（純顯示格式）
└── Commands/         ← RelayCommand / AsyncRelayCommand
```

## MVVM 對應關係

| MVVM      | WPF 對應                        |
|-----------|----------------------------------|
| Model     | DTOs/ + Models/（Domain + API）  |
| View      | Views/（XAML + Code-Behind）     |
| ViewModel | ViewModels/                      |

## DTO 範例

```csharp
// DTOs/ProductDTO.cs
// 僅對應後端 JSON 結構，禁止加入任何方法或業務邏輯
public class ProductDTO
{
    public string product_id { get; init; } = string.Empty;
    public decimal unit_price { get; init; }
    public int stock_qty { get; init; }
    public bool? is_active { get; init; }
}
```

## Domain Model 範例

```csharp
// Models/Product.cs
public class Product
{
    public string ProductId { get; init; } = string.Empty;
    public decimal UnitPrice { get; init; }
    public int StockQty { get; init; }
    public bool IsLowStock { get; init; }
    public bool IsActive { get; init; }

    public static Product FromDto(ProductDTO dto) => new()
    {
        ProductId  = dto.product_id,
        UnitPrice  = dto.unit_price,
        StockQty   = dto.stock_qty,
        IsLowStock = dto.stock_qty < 10,
        IsActive   = dto.is_active ?? true,
    };
}
```

## Model 服務範例

```csharp
// Models/ProductModel.cs
public class ProductModel
{
    private readonly HttpClient _httpClient;

    public ProductModel(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IReadOnlyList<Product>> FetchProductsAsync()
    {
        var dtos = await _httpClient.GetFromJsonAsync<ProductDTO[]>("/products")
            ?? Array.Empty<ProductDTO>();
        return dtos.Select(Product.FromDto).ToArray();
    }
}
```

## OpenAPI 自動產生 DTO 的例外處理

```csharp
// 當 DTO 來自 OpenAPI 自動產生時，不可修改產生的檔案
// 改用獨立 Mapper 類別承擔轉換責任
// Models/Mappers/ProductMapper.cs
public static class ProductMapper
{
    public static Product ToDomain(this ProductDTO dto) => new()
    {
        ProductId  = dto.product_id,
        UnitPrice  = dto.unit_price,
        StockQty   = dto.stock_qty,
        IsLowStock = dto.stock_qty < 10,
        IsActive   = dto.is_active ?? true,
    };
}
```

## ViewModel 範例

```csharp
// ViewModels/ProductListViewModel.cs
public class ProductListViewModel : INotifyPropertyChanged
{
    private readonly ProductModel _productModel;
    private ObservableCollection<Product> _products = new();
    private bool _isLoading;
    private string? _errorMessage;

    public ProductListViewModel(ProductModel productModel)
    {
        _productModel = productModel;
        LoadCommand = new AsyncRelayCommand(LoadAsync);
    }

    public ObservableCollection<Product> Products
    {
        get => _products;
        private set { _products = value; OnPropertyChanged(); }
    }

    public bool IsLoading
    {
        get => _isLoading;
        private set { _isLoading = value; OnPropertyChanged(); }
    }

    public string? ErrorMessage
    {
        get => _errorMessage;
        private set { _errorMessage = value; OnPropertyChanged(); }
    }

    public ICommand LoadCommand { get; }

    private async Task LoadAsync()
    {
        IsLoading = true;
        ErrorMessage = null;
        try
        {
            var items = await _productModel.FetchProductsAsync();
            Products = new ObservableCollection<Product>(items);
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
        finally
        {
            IsLoading = false;
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    protected void OnPropertyChanged([CallerMemberName] string? name = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
```

## View 範例

```csharp
// Views/ProductListView.xaml.cs
// Code-Behind 僅允許 InitializeComponent() 與 DataContext 設定
public partial class ProductListView : UserControl
{
    public ProductListView(ProductListViewModel viewModel)
    {
        InitializeComponent();
        DataContext = viewModel;
    }
}
```

```xml
<!-- Views/ProductListView.xaml -->
<UserControl x:Class="App.Views.ProductListView">
    <Grid>
        <ProgressBar IsIndeterminate="True"
                     Visibility="{Binding IsLoading,
                                  Converter={StaticResource BoolToVisibilityConverter}}" />
        <TextBlock Text="{Binding ErrorMessage}"
                   Foreground="Red"
                   Visibility="{Binding ErrorMessage,
                                Converter={StaticResource NullToVisibilityConverter}}" />
        <DataGrid ItemsSource="{Binding Products}" AutoGenerateColumns="False">
            <DataGrid.Columns>
                <DataGridTextColumn Header="商品編號" Binding="{Binding ProductId}" />
                <DataGridTextColumn Header="單價"     Binding="{Binding UnitPrice}" />
            </DataGrid.Columns>
        </DataGrid>
        <Button Content="重新載入" Command="{Binding LoadCommand}" />
    </Grid>
</UserControl>
```

## AsyncRelayCommand

```csharp
// Commands/AsyncRelayCommand.cs
public class AsyncRelayCommand : ICommand
{
    private readonly Func<Task> _execute;
    private readonly Action<Exception>? _onException;
    private bool _isExecuting;

    public AsyncRelayCommand(Func<Task> execute, Action<Exception>? onException = null)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _onException = onException;
    }

    public bool CanExecute(object? parameter) => !_isExecuting;

    public async void Execute(object? parameter)
    {
        if (_isExecuting) return;
        try
        {
            _isExecuting = true;
            RaiseCanExecuteChanged();
            await _execute();
        }
        catch (Exception ex)
        {
            if (_onException != null) _onException(ex);
            else WriteExceptionToDebug(ex);
        }
        finally
        {
            _isExecuting = false;
            RaiseCanExecuteChanged();
        }
    }

    public event EventHandler? CanExecuteChanged;

    // 確保 CanExecuteChanged 永遠在 UI 執行緒觸發
    private void RaiseCanExecuteChanged()
    {
        var dispatcher = System.Windows.Application.Current?.Dispatcher;
        if (dispatcher != null && !dispatcher.CheckAccess())
        {
            dispatcher.BeginInvoke(new Action(RaiseCanExecuteChanged));
            return;
        }
        CanExecuteChanged?.Invoke(this, EventArgs.Empty);
    }

    private static void WriteExceptionToDebug(Exception ex)
        => System.Diagnostics.Debug.WriteLine($"[AsyncRelayCommand] {ex}");
}
```

## Navigation Service

```csharp
// Services/INavigationService.cs
public interface INavigationService
{
    void Navigate<TViewModel>() where TViewModel : class;
    void GoBack();
}

// ❌ 禁止：ViewModel 直接建立或切換視窗
var window = new ProductListWindow();
window.Show();

// ✅ 正確：透過注入的 INavigationService
_navigationService.Navigate<ProductListViewModel>();
```

## Dialog Service

```csharp
// Services/IDialogService.cs
public interface IDialogService
{
    Task<bool> ConfirmAsync(string title, string message);
    Task ShowErrorAsync(string title, string message);
}

// ❌ 禁止：ViewModel 直接呼叫
MessageBox.Show("確定要刪除嗎？", "確認", MessageBoxButton.YesNo);

// ✅ 正確：透過注入的 IDialogService
var confirmed = await _dialogService.ConfirmAsync("確認", "確定要刪除嗎？");
if (confirmed) await DeleteAsync();
```

## SharedViewModel（跨頁面狀態）

```csharp
// ViewModels/UserSessionViewModel.cs（Singleton）
public class UserSessionViewModel : INotifyPropertyChanged
{
    private string _currentUserName = string.Empty;

    public string CurrentUserName
    {
        get => _currentUserName;
        set { _currentUserName = value; OnPropertyChanged(); }
    }

    public event PropertyChangedEventHandler? PropertyChanged;

    protected void OnPropertyChanged([CallerMemberName] string? name = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}

// ❌ 禁止：靜態欄位傳遞狀態
public static class GlobalState { public static string CurrentUser = ""; }

// ✅ 正確：DI 容器以 Singleton 注入 SharedViewModel
// DI 註冊範例（App.xaml.cs）
services.AddSingleton<UserSessionViewModel>();
```
