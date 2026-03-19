// 1. 輔助函數：取得當前對話 ID 與標題
function getChatInfo() {
    const chatId = window.location.href.split('/chat/')[1] || null;
    // 抓取 Gemini 標題（通常在頂部或側邊欄高亮處，這裡抓取網頁 Title 比較保險）
    const chatTitle = document.title.replace(' - Gemini', '').trim();
    return { chatId, chatTitle };
  }
  
  // 2. 建立「儲存至 G-Nest」的按鈕
  function createSaveButton() {
    if (document.getElementById('gnest-save-btn')) return;
  
    const btn = document.createElement('button');
    btn.id = 'gnest-save-btn';
    btn.innerText = '📂 存入 G-Nest';
    
    btn.onclick = async () => {
      const { chatId, chatTitle } = getChatInfo();
      if (!chatId) return alert('請先開啟一個對話！');
  
      const folderName = prompt(`要把「${chatTitle}」存入哪個資料夾？`, '預設專案');
      
      if (folderName) {
        // 讀取舊資料並寫入新資料 (使用 sync 讓你跨機器也能用)
        const data = await chrome.storage.sync.get(['gemini_folders']);
        const folders = data.gemini_folders || {};
        
        if (!folders[folderName]) folders[folderName] = [];
        
        // 避免重複加入
        if (!folders[folderName].some(chat => chat.id === chatId)) {
          folders[folderName].push({ id: chatId, title: chatTitle });
          await chrome.storage.sync.set({ gemini_folders: folders });
          alert(`✅ 已存入 ${folderName}`);
          renderFolderList(); // 更新 UI 顯示
        }
      }
    };
  
    // 找個地方塞進去，例如側邊欄頂部
    const target = document.querySelector('div[role="navigation"]');
    if (target) target.prepend(btn);
  }
  
  // 3. 渲染資料夾清單 (讓你能看到已存的內容)
  async function renderFolderList() {
    const container = document.getElementById('folder-list');
    if (!container) return;
  
    const data = await chrome.storage.sync.get(['gemini_folders']);
    const folders = data.gemini_folders || {};
  
    container.innerHTML = ''; // 清空重修
    
    for (const [name, chats] of Object.entries(folders)) {
      const folderEl = document.createElement('details');
      folderEl.innerHTML = `<summary>${name} (${chats.length})</summary>`;
      const list = document.createElement('ul');
      
      chats.forEach(chat => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="/app/chat/${chat.id}">${chat.title}</a>`;
        list.appendChild(li);
      });
      
      folderEl.appendChild(list);
      container.appendChild(folderEl);
    }
  }
  
  // 4. 初始化與監控
  const observer = new MutationObserver(() => {
    createSaveButton();
    if (!document.getElementById('folder-list')) {
      const sidebar = document.querySelector('div[role="navigation"]');
      if (sidebar) {
        const folderUI = document.createElement('div');
        folderUI.id = 'gemini-folder-container';
        folderUI.innerHTML = '<h3>G-Nest 專案</h3><div id="folder-list"></div>';
        sidebar.prepend(folderUI);
        renderFolderList();
      }
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });