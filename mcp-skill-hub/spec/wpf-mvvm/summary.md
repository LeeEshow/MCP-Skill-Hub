# wpf-mvvm Spec

適用於 WPF / C# 桌面應用程式開發。規範 View / ViewModel / Model 三層分工，Domain 類別以靜態工廠承擔 DTO 轉換，ViewModel 透過 INotifyPropertyChanged 與 ICommand 驅動 UI，並統一非同步指令、導覽、Dialog 與 DI 注入規範，確保 ViewModel 與 WPF 框架完全解耦且可獨立單元測試。
