// 1. 資料存儲封裝 (之前討論的大腦)
const FolderManager = {
    async getAllFolders() {
      return new Promise((resolve) => {
        chrome.storage.local.get(['gemini_folders'], (result) => {
          resolve(result.gemini_folders || {});
        });
      });
    }
  };
  
  // 2. 注入 UI 的主要函式
  function initExtension() {
    console.log("🚀 Gemini Project Folders 已啟動！");
    
    // 這裡之後會放：插入「建立資料夾」按鈕的程式碼
    const sidebar = document.querySelector('div[role="navigation"]'); // 這是暫定的選擇器
    if (sidebar) {
      const folderUI = document.createElement('div');
      folderUI.id = 'gemini-folder-container';
      folderUI.innerHTML = '<h3>我的專案資料夾</h3><ul id="folder-list"></ul>';
      sidebar.prepend(folderUI);
    }
  }
  
  // 3. 監控頁面載入 (因為 Gemini 是 SPA)
  const observer = new MutationObserver(() => {
    if (!document.getElementById('gemini-folder-container')) {
      initExtension();
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });