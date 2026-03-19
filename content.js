console.log("🚀 G-Nest 腳本已成功載入！正在尋找側邊欄...");

// 1. 尋找側邊欄的終極武器 (多重選擇器)
function getSidebar() {
    // 這是目前 Gemini (2026) 最可能的幾個側邊欄特徵
    const possibleSelectors = [
      'nav',                          // 導航列
      'aside',                        // 側邊欄常用標籤
      '.left-nav-content',           // 舊版 class
      'div[role="navigation"]',       // 之前的 role
      '.navigation-drawer'            // 框架常用名
    ];
  
    for (let selector of possibleSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        console.log(`🎯 找到側邊欄了！使用的是選擇器: ${selector}`);
        return el;
      }
    }
    
    // 如果真的都找不到，我們試著找「新的對話」那個按鈕的父元素
    const newChatBtn = document.querySelector('button[aria-label*="對話"]');
    if (newChatBtn) {
       console.log("🎯 透過「新對話按鈕」定位成功！");
       return newChatBtn.parentElement;
    }
  
    console.log("⚠️ 警告：目前掃描了所有已知位置，都找不到側邊欄...");
    return null;
  }

// 2. 輔助函數：取得當前對話 ID 與標題
function getChatInfo() {
  const chatId = window.location.href.split('/chat/')[1] || null;
  const chatTitle = document.title.replace(' - Gemini', '').trim();
  return { chatId, chatTitle };
}

// 3. 建立「儲存至 G-Nest」的按鈕
function createSaveButton() {
  if (document.getElementById('gnest-save-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'gnest-save-btn';
  btn.innerText = '📂 存入 G-Nest';
  
  // 美化一下按鈕，讓它顯眼一點
  btn.style.cssText = "background: #1a73e8; color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; margin: 10px 16px; width: calc(100% - 32px); font-weight: bold;";

  btn.onclick = async () => {
    const { chatId, chatTitle } = getChatInfo();
    if (!chatId) return alert('請先開啟一個對話！');

    const folderName = prompt(`要把「${chatTitle}」存入哪個資料夾？`, '預設專案');
    
    if (folderName) {
      const data = await chrome.storage.sync.get(['gemini_folders']);
      const folders = data.gemini_folders || {};
      
      if (!folders[folderName]) folders[folderName] = [];
      
      if (!folders[folderName].some(chat => chat.id === chatId)) {
        folders[folderName].push({ id: chatId, title: chatTitle });
        await chrome.storage.sync.set({ gemini_folders: folders });
        alert(`✅ 已存入 ${folderName}`);
        renderFolderList(); 
      }
    }
  };

  const target = getSidebar();
  if (target) target.prepend(btn);
}

// 4. 新增魔法：過濾側邊欄對話
function filterSidebar(chatIdsInFolder) {
  // 找尋所有 Gemini 原生對話的連結 (<a> 標籤且 href 包含 /chat/)
  const allLinks = document.querySelectorAll('a[href*="/app/chat/"]');
  
  allLinks.forEach(link => {
    const linkId = link.getAttribute('href').split('/chat/')[1];
    // 找到該對話的最外層容器，避免只隱藏文字沒隱藏框框
    const container = link.closest('div[role="listitem"]') || link.closest('li') || link;
    
    // 如果這個對話的 ID 有在我們點擊的資料夾裡面，就顯示；沒有就隱藏
    if (chatIdsInFolder.includes(linkId)) {
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
  });
}

// 5. 渲染資料夾清單
async function renderFolderList() {
  const container = document.getElementById('folder-list');
  if (!container) return;

  const data = await chrome.storage.sync.get(['gemini_folders']);
  const folders = data.gemini_folders || {};

  container.innerHTML = ''; 
  
  for (const [name, chats] of Object.entries(folders)) {
    const folderEl = document.createElement('details');
    // 加一點樣式讓它好看
    folderEl.style.cssText = "padding: 8px 16px; cursor: pointer; color: #e8eaed;";
    folderEl.innerHTML = `<summary style="font-weight: bold; color: #8ab4f8;">📁 ${name} (${chats.length})</summary>`;
    
    const list = document.createElement('ul');
    list.style.cssText = "list-style: none; padding-left: 15px; margin-top: 5px;";
    
    const folderChatIds = chats.map(c => c.id); // 整理出這個資料夾所有的 ID

    chats.forEach(chat => {
      const li = document.createElement('li');
      li.style.marginBottom = "5px";
      const a = document.createElement('a');
      a.innerText = `📄 ${chat.title}`;
      a.style.cssText = "color: #e8eaed; text-decoration: none; font-size: 13px;";
      a.href = `/app/chat/${chat.id}`;
      
      // 點擊對話時的行為：前往該對話，並啟動過濾功能！
      a.onclick = (e) => {
        // e.preventDefault(); // 取消預設跳轉如果想做完全的單頁切換，但這裡先保留預設跳轉比較穩
        console.log(`執行過濾：只顯示 ${name} 資料夾的對話`);
        setTimeout(() => filterSidebar(folderChatIds), 500); // 延遲一下等頁面載入
      };

      li.appendChild(a);
      list.appendChild(li);
    });
    
    // 加上一個「重置過濾」的按鈕，讓你可以把所有對話叫回來
    const resetBtn = document.createElement('button');
    resetBtn.innerText = '顯示全部對話';
    resetBtn.style.cssText = "background: none; border: 1px solid #5f6368; color: #9aa0a6; border-radius: 4px; padding: 2px 8px; font-size: 11px; margin-top: 5px;";
    resetBtn.onclick = () => {
       document.querySelectorAll('a[href*="/app/chat/"]').forEach(link => {
         const container = link.closest('div[role="listitem"]') || link.closest('li') || link;
         container.style.display = 'block';
       });
    };
    folderEl.appendChild(resetBtn);

    folderEl.appendChild(list);
    container.appendChild(folderEl);
  }
}

// 6. 初始化與監控
const observer = new MutationObserver(() => {
  const sidebar = getSidebar();
  if (sidebar) {
    createSaveButton();
    if (!document.getElementById('gemini-folder-container')) {
      console.log("✅ 成功找到側邊欄，注入 G-Nest UI！");
      const folderUI = document.createElement('div');
      folderUI.id = 'gemini-folder-container';
      folderUI.style.marginTop = "10px";
      folderUI.innerHTML = '<h3 style="padding: 0 16px; color: #e8eaed; font-size: 14px;">G-Nest 專案</h3><div id="folder-list"></div>';
      sidebar.prepend(folderUI);
      renderFolderList();
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });