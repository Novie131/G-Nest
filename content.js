console.log("🚀 G-Nest 終極完全體啟動：包含強化 DOM 掃描邏輯...");

// --- 1. 資料層 ---
const DataManager = {
  async getCoreData() {
    const data = await chrome.storage.sync.get(['gnest_folders', 'gnest_kbs']);
    return { folders: data.gnest_folders || [], kbs: data.gnest_kbs || [] };
  },
  async deleteFolder(id) {
    if(!confirm("確定要刪除此資料夾嗎？裡面的對話連結不會被刪除。")) return;
    const { folders } = await this.getCoreData();
    await chrome.storage.sync.set({ gnest_folders: folders.filter(f => f.id !== id) });
    UIController.refresh();
    ContextMenu.close();
  },
  async deleteKB(id) {
    const { kbs, folders } = await this.getCoreData();
    const newKbs = kbs.filter(k => k.id !== id);
    const newFolders = folders.map(f => f.kbId === id ? { ...f, kbId: null } : f);
    await chrome.storage.sync.set({ gnest_kbs: newKbs, gnest_folders: newFolders });
    UIController.refresh();
  },
  async saveKB(name, desc) {
    const { kbs } = await this.getCoreData();
    kbs.push({ id: 'kb_' + Date.now(), name, desc });
    await chrome.storage.sync.set({ gnest_kbs: kbs });
    UIController.refresh();
  },
  async saveFolder(name, kbId) {
    const { folders } = await this.getCoreData();
    folders.push({ id: 'f_' + Date.now(), name, kbId: kbId || null, chats: [] });
    await chrome.storage.sync.set({ gnest_folders: folders });
    UIController.refresh();
  }
};

// --- 2. 圖示庫 ---
const Icons = {
  chevron: `<svg class="gnest-chevron" width="18" height="18" viewBox="0 -960 960 960" fill="currentColor"><path d="M400-280v-400l200 200-200 200Z"/></svg>`,
  folder: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>`,
  more: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/></svg>`,
  add: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>`,
  delete: `<svg width="18" height="18" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-520H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-640v520-520Z"/></svg>`,
  swap: `<svg width="18" height="18" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-120 80-320l200-200 56 56-104 104h608v80H232l104 104-56 56Zm400-320-56-56 104-104H120v-80h608L624-784l56-56 200 200-200 200Z"/></svg>`,
  bot: `<svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-120v-160q0-33 23.5-56.5T240-360h480q33 0 56.5 23.5T800-280v160H160Zm320-320q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Z"/></svg>`
};

// --- 3. UI 控制器 ---
const ContextMenu = {
  close() { const m = document.getElementById('gnest-context-menu'); if(m) m.remove(); },
  open(e, folder) {
    this.close(); e.preventDefault(); e.stopPropagation();
    const menu = document.createElement('div');
    menu.id = 'gnest-context-menu';
    menu.innerHTML = `
      <div class="gnest-cm-item" id="cm-add">${Icons.add} 存入當前對話</div>
      <div class="gnest-cm-item" id="cm-del" style="color:#ff8080;">${Icons.delete} 刪除資料夾</div>
    `;
    // 定位修復：使用 fixed 定位，插在 body
    const rect = e.target.closest('.btn-more').getBoundingClientRect();
    menu.style.top = `${rect.bottom + 5}px`; 
    menu.style.left = `${rect.left}px`;
    document.body.appendChild(menu);
    
    // 監聽外部點擊關閉
    setTimeout(() => { document.addEventListener('click', this.close, {once: true}); }, 0);

    document.getElementById('cm-del').onclick = () => DataManager.deleteFolder(folder.id);
  }
};

const UIController = {
  async refresh() {
    const root = document.getElementById('gnest-root');
    if (!root) return;
    const { folders, kbs } = await DataManager.getCoreData();
    root.innerHTML = ''; // 清空重新渲染

    const createSection = (title) => {
      const sec = document.createElement('details');
      sec.className = 'gnest-section'; sec.open = true;
      sec.innerHTML = `<summary>${title} ${Icons.chevron}</summary>`;
      return sec;
    };

    // 渲染資料夾
    const folderSection = createSection('對話資料夾');
    folders.forEach(f => {
      const fdItem = document.createElement('details');
      const hasChats = f.chats && f.chats.length > 0;
      fdItem.innerHTML = `
        <summary class="gnest-folder-summary">
          <span class="gnest-folder-icon">${Icons.folder}</span>
          <span style="flex-grow:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</span>
          <div class="gnest-folder-actions">
            <div class="gnest-action-btn btn-more" title="更多選項">${Icons.more}</div>
          </div>
        </summary>
        <div class="gnest-sub-list">
          ${!hasChats ? '<div class="gnest-sub-item" style="color:#5f6368; cursor:default;">(空)</div>' : ''}
        </div>
      `;
      // 綁定選項按鈕事件 (防止冒泡)
      fdItem.querySelector('.btn-more').onclick = (e) => ContextMenu.open(e, f);
      
      // 這裡之後要實作點擊資料夾過濾側邊欄的邏輯
      fdItem.querySelector('summary').onclick = (e) => {
        if(e.target.closest('.gnest-folder-actions')) return; // 點按鈕不折疊
        console.log(`過濾資料夾: ${f.name}`);
      }

      folderSection.appendChild(fdItem);
    });

    // 渲染知識庫
    const kbSection = createSection('知識庫');
    kbs.forEach(k => {
      const kbItem = document.createElement('details');
      kbItem.innerHTML = `
        <summary class="gnest-folder-summary">
          <span class="gnest-folder-icon" style="color:#a8c7fa;">📚</span>
          <span>${k.name}</span>
        </summary>
        <div class="gnest-sub-list">
          <div class="gnest-sub-item" style="color:#9aa0a6; cursor:default;">${k.desc || '無描述'}</div>
        </div>
      `;
      kbSection.appendChild(kbItem);
    });

    root.appendChild(folderSection); 
    root.appendChild(kbSection);
  },

  initSidebar() {
    // 避免重複注入
    if (document.getElementById('gnest-root')) return;

    // 🔧 修復核心：強化雷達定位
    // 我們不再找 XPath 文字，改找「新對話」按鈕所在的父容器，這是最穩定的地基。
    const selectors = [
      'div[role="navigation"] ul', // 嘗試找導航列清單
      'nav ul',                     // 嘗試找 nav 裡的 ul
      '.left-nav-content'           // 舊版 class 備胎
    ];
    
    let nativeList = null;
    for (const s of selectors) {
      nativeList = document.querySelector(s);
      if (nativeList) break;
    }

    if (!nativeList) {
      // 終極備胎：找那顆巨大的「新對話」按鈕的父父層
      const newChatBtn = document.querySelector('button[aria-label*="對話"]') || 
                         document.querySelector('button[aria-label*="chat"]');
      if (newChatBtn) {
        nativeList = newChatBtn.closest('div').parentElement;
      }
    }

    if (nativeList) {
      console.log("✅ 成功找到側邊欄地基，注入 G-Nest！");
      const root = document.createElement('div');
      root.id = 'gnest-root';
      
      // 塞在原生清單的最前面
      nativeList.prepend(root);
      this.refresh();
    }
  }
};

// --- 4. Sprint 2: 聊天節點滑軌 (Chat Rail) ---
const ChatRailTracker = {
  init() {
    // SPA 換頁檢查：如果沒在 /chat/ 路徑下，移除滑軌
    if (!window.location.href.includes('/chat/')) {
      const existingRail = document.getElementById('gnest-scroll-rail');
      if (existingRail) existingRail.remove();
      return;
    }

    if (!document.getElementById('gnest-scroll-rail')) {
      const rail = document.createElement('div');
      rail.id = 'gnest-scroll-rail';
      document.body.appendChild(rail);
      console.log("✅ 聊天滑軌已載入");
    }
    this.scanChats();
  },

  scanChats() {
    const rail = document.getElementById('gnest-scroll-rail');
    if (!rail) return;
    
    // 🔧 修復核心：強化聊天節點雷達
    // 原生 selector data-message-author-role 在 SPA 切換時可能失效
    // 我們改用組合式 selector，搜尋多種可能的 user 提問特徵
    const promptSelectors = [
      'div[data-message-author-role="user"]', // 標準特徵
      '.user-prompt',                        // 可能的 class
      'message-content[role="presentation"]'   // 結構特徵 (謹慎使用)
    ];
    
    let userPrompts = [];
    for (const s of promptSelectors) {
      const found = document.querySelectorAll(s);
      if (found.length > 0) {
        userPrompts = found;
        break; // 找到一種就夠了
      }
    }

    // SPA 防護：如果搜尋結果沒變，不重繪 (效能優化)
    const currentCount = rail.querySelectorAll('.gnest-scroll-node').length;
    if (userPrompts.length === currentCount && currentCount > 0) return;

    rail.innerHTML = ''; // 清空

    userPrompts.forEach((prompt, index) => {
      // 抓取文字內容 (移除可能包含的 SVG 或其他雜物)
      const pureText = prompt.innerText || prompt.textContent || "";
      const textPreview = pureText.trim().substring(0, 100) + '...';
      
      const node = document.createElement('div');
      node.className = 'gnest-scroll-node';
      node.innerHTML = `<div class="gnest-node-tooltip">💬 節點 ${index + 1}:<br>${textPreview}</div>`;
      
      // 平滑滾動邏輯
      node.onclick = () => {
        prompt.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      
      rail.appendChild(node);
    });
  }
};

// --- 5. Sprint 2: 漂浮小幫手 (Floating Helper) (保留你已完成的邏輯) ---
const FloatingHelper = {
  init() {
    if (document.getElementById('gnest-helper')) return;
    const helper = document.createElement('div');
    helper.id = 'gnest-helper';
    helper.innerHTML = `
      ${Icons.bot}
      <div id="gnest-helper-menu">
        <div class="gnest-helper-item" id="help-add-kb">${Icons.add} 新增知識庫</div>
        <div class="gnest-helper-item" id="help-add-fd">${Icons.folder} 新增資料夾</div>
        <div class="gnest-helper-item" id="help-del-kb" style="color:#ff8080;">${Icons.delete} 刪除知識庫</div>
      </div>
    `;
    document.body.appendChild(helper);
    this.makeDraggable(helper);
    this.bindMenu();
  },
  makeDraggable(el) {
    let isDragging = false; let startX, startY, initialX, initialY;
    el.onmousedown = (e) => {
      if (e.target.closest('#gnest-helper-menu')) return;
      isDragging = false;
      startX = e.clientX; startY = e.clientY;
      const rect = el.getBoundingClientRect();
      initialX = rect.left; initialY = rect.top;
      document.onmousemove = (moveEvent) => {
        isDragging = true;
        const dx = moveEvent.clientX - startX; const dy = moveEvent.clientY - startY;
        el.style.bottom = 'auto'; el.style.right = 'auto';
        el.style.left = `${initialX + dx}px`; el.style.top = `${initialY + dy}px`;
      };
      document.onmouseup = () => { document.onmousemove = null; document.onmouseup = null; };
    };
    el.onclick = (e) => {
      if (isDragging || e.target.closest('#gnest-helper-menu')) return;
      const menu = document.getElementById('gnest-helper-menu');
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    };
  },
  bindMenu() {
    // 將「新增資料夾/知識庫」的功能移到這裡
    document.getElementById('help-add-kb').onclick = () => {
      this.closeMenu();
      const name = prompt("請輸入新「知識庫」名稱：");
      if (name) DataManager.saveKB(name, "透過小幫手新增");
    };
    document.getElementById('help-add-fd').onclick = () => {
      this.closeMenu();
      const name = prompt("請輸入新「對話資料夾」名稱：");
      if (name) DataManager.saveFolder(name);
    };
    document.getElementById('help-del-kb').onclick = async () => {
      this.closeMenu();
      // (簡化刪除邏輯，這裡之後要實作專業 Modal)
      const { kbs } = await DataManager.getCoreData();
      if(kbs.length===0) return alert("沒有知識庫");
      const name = prompt(`請輸入要刪除的知識庫完整名稱：\n${kbs.map(k=>k.name).join('\n')}`);
      const target = kbs.find(k=>k.name === name);
      if(target) DataManager.deleteKB(target.id);
    };
  },
  closeMenu() { document.getElementById('gnest-helper-menu').style.display = 'none'; }
};

// --- 全域啟動與監控 (資工系專業：解決 SPA SPA 換頁偵測) ---
// 使用更靈敏的偵測頻率，確保在 SPA 換頁時能抓到 DOM 變動
setInterval(() => {
  UIController.initSidebar();
  ChatRailTracker.init(); // init 內部會處理 SPA 檢查
  FloatingHelper.init();
}, 1500); 

// SPA 特殊處理：監聽網頁網址變動 (因為 setInterval 有時會慢半拍)
window.addEventListener('popstate', () => {
  ChatRailTracker.init();
});