console.log("🚀 G-Nest 完美修復版啟動：找回按鈕與強化節點掃描...");

// --- 1. 資料層 ---
const DataManager = {
  async getCoreData() {
    const data = await chrome.storage.sync.get(['gnest_folders', 'gnest_kbs']);
    return { folders: data.gnest_folders || [], kbs: data.gnest_kbs || [] };
  },
  async deleteFolder(id) {
    if(!confirm("確定要刪除此資料夾嗎？")) return;
    const { folders } = await this.getCoreData();
    await chrome.storage.sync.set({ gnest_folders: folders.filter(f => f.id !== id) });
    UIController.refresh();
    ModalManager.closeAll();
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

// --- 2. 圖示庫 (找回遺失的圖示) ---
const Icons = {
  folderAdd: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M560-320h80v-80h80v-80h-80v-80h-80v80h-80v80h80v80ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>`,
  kbAdd: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M520-600v-240h320v240H520ZM120-120v-240h320v240H120Zm400 0v-240h320v240H520ZM120-600v-240h320v240H120Zm80-80h160v-80H200v80Zm400 0h160v-80H600v80ZM200-200h160v-80H200v80Zm400 0h160v-80H600v80Zm-400-480v80-80Zm400 0v80-80Zm-400 400v80-80Zm400 0v80-80Z"/></svg>`,
  chevron: `<svg class="gnest-chevron" width="18" height="18" viewBox="0 -960 960 960" fill="currentColor"><path d="M400-280v-400l200 200-200 200Z"/></svg>`,
  folder: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>`,
  more: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/></svg>`,
  add: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>`,
  delete: `<svg width="18" height="18" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-520H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-640v520-520Z"/></svg>`,
  swap: `<svg width="18" height="18" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-120 80-320l200-200 56 56-104 104h608v80H232l104 104-56 56Zm400-320-56-56 104-104H120v-80h608L624-784l56-56 200 200-200 200Z"/></svg>`,
  bot: `<svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-120v-160q0-33 23.5-56.5T240-360h480q33 0 56.5 23.5T800-280v160H160Zm320-320q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Z"/></svg>`
};

// --- 3. 視窗與選單管理 (找回專業的 Modal) ---
const ModalManager = {
  closeAll() {
    const el = document.getElementById('gnest-modal-overlay'); if (el) el.remove();
    const m = document.getElementById('gnest-context-menu'); if (m) m.remove();
  },
  
  // 開啟建立資料夾的黑視窗
  async openFolderModal() {
    this.closeAll();
    const { kbs } = await DataManager.getCoreData();
    let options = '<option value="" style="background:#1e1f20;">(無配對)</option>';
    kbs.forEach(k => options += `<option value="${k.id}" style="background:#1e1f20;">${k.name}</option>`);

    const overlay = document.createElement('div');
    overlay.id = 'gnest-modal-overlay';
    overlay.innerHTML = `
      <div class="gnest-modal-box" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:20001;">
        <h3>新建資料夾</h3>
        <input type="text" id="fd-name" class="gnest-input" placeholder="資料夾名稱" autofocus>
        <div style="font-size:12px; color:#c4c7c5; margin-bottom:4px;">配對知識庫</div>
        <select id="fd-kb" class="gnest-input">${options}</select>
        <div class="gnest-btn-group">
          <button class="gnest-btn-cancel" id="btn-modal-cancel">取消</button>
          <button class="gnest-btn-ok" id="btn-modal-create">建立</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('btn-modal-cancel').onclick = () => this.closeAll();
    document.getElementById('btn-modal-create').onclick = async () => {
      const name = document.getElementById('fd-name').value;
      const kbId = document.getElementById('fd-kb').value;
      if (name) { await DataManager.saveFolder(name, kbId); this.closeAll(); }
    };
  },

  // 開啟建立知識庫的黑視窗
  openKBModal() {
    this.closeAll();
    const overlay = document.createElement('div');
    overlay.id = 'gnest-modal-overlay';
    overlay.innerHTML = `
      <div class="gnest-modal-box" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:20001;">
        <h3>新建知識庫</h3>
        <input type="text" id="kb-name" class="gnest-input" placeholder="知識庫名稱" autofocus>
        <input type="text" id="kb-desc" class="gnest-input" placeholder="簡介/連結">
        <div class="gnest-btn-group">
          <button class="gnest-btn-cancel" id="btn-modal-cancel">取消</button>
          <button class="gnest-btn-ok" id="btn-modal-create">建立</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('btn-modal-cancel').onclick = () => this.closeAll();
    document.getElementById('btn-modal-create').onclick = async () => {
      const name = document.getElementById('kb-name').value;
      const desc = document.getElementById('kb-desc').value;
      if (name) { await DataManager.saveKB(name, desc); this.closeAll(); }
    };
  },

  // 開啟三點選項選單
  openContextMenu(e, folder) {
    this.closeAll(); e.preventDefault(); e.stopPropagation();
    const menu = document.createElement('div');
    menu.id = 'gnest-context-menu';
    menu.innerHTML = `
      <div class="gnest-cm-item" id="cm-add">${Icons.add} 存入當前對話</div>
      <div class="gnest-cm-item" id="cm-del" style="color:#ff8080;">${Icons.delete} 刪除資料夾</div>
    `;
    const rect = e.target.closest('.btn-more').getBoundingClientRect();
    menu.style.top = `${rect.bottom + 5}px`; 
    menu.style.left = `${rect.left}px`;
    document.body.appendChild(menu);
    
    setTimeout(() => { document.addEventListener('click', this.closeAll, {once: true}); }, 0);
    document.getElementById('cm-del').onclick = () => DataManager.deleteFolder(folder.id);
  }
};

// --- 4. 側邊欄 UI 控制器 ---
const UIController = {
  async refresh() {
    const root = document.getElementById('gnest-root');
    if (!root) return;
    const { folders, kbs } = await DataManager.getCoreData();
    root.innerHTML = ''; 

    // 1️⃣ 找回遺失的「新增按鈕」區塊
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = "margin-bottom: 15px;";
    btnGroup.innerHTML = `
      <div class="gnest-pill-btn" id="gnest-btn-folder" style="margin-bottom: 5px;">
        <span class="gnest-btn-icon">${Icons.folderAdd}</span><span>新增對話資料夾</span>
      </div>
      <div class="gnest-pill-btn" id="gnest-btn-kb">
        <span class="gnest-btn-icon">${Icons.kbAdd}</span><span>新增知識庫</span>
      </div>
      <div class="gnest-divider" style="margin-top: 15px;"></div>
    `;
    root.appendChild(btnGroup);

    // 綁定按鈕事件
    document.getElementById('gnest-btn-folder').onclick = () => ModalManager.openFolderModal();
    document.getElementById('gnest-btn-kb').onclick = () => ModalManager.openKBModal();

    const createSection = (title) => {
      const sec = document.createElement('details');
      sec.className = 'gnest-section'; sec.open = true;
      sec.innerHTML = `<summary>${title} ${Icons.chevron}</summary>`;
      return sec;
    };

    // 2️⃣ 渲染對話資料夾
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
      fdItem.querySelector('.btn-more').onclick = (e) => ModalManager.openContextMenu(e, f);
      folderSection.appendChild(fdItem);
    });

    // 3️⃣ 渲染知識庫
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
    if (document.getElementById('gnest-root')) return;

    // 🔧 修復位置錯誤：用 TreeWalker 找回「我的內容」，精準插在它下方
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let targetNode = null;
    while(targetNode = walker.nextNode()) {
      if (targetNode.textContent.trim() === '我的內容') {
        const anchor = targetNode.parentElement.closest('div[role="listitem"]') || targetNode.parentElement.parentElement;
        const root = document.createElement('div');
        root.id = 'gnest-root';
        // InsertAfter 的標準寫法
        anchor.parentNode.insertBefore(root, anchor.nextSibling);
        this.refresh();
        console.log("✅ 側邊欄 UI 已精準定位於「我的內容」下方");
        return;
      }
    }
  }
};

// --- 5. 聊天節點滑軌 (Chat Rail) ---
const ChatRailTracker = {
  init() {
    if (!window.location.href.includes('/chat/')) {
      const existingRail = document.getElementById('gnest-scroll-rail');
      if (existingRail) existingRail.remove();
      return;
    }

    if (!document.getElementById('gnest-scroll-rail')) {
      const rail = document.createElement('div');
      rail.id = 'gnest-scroll-rail';
      document.body.appendChild(rail);
    }
    this.scanChats();
  },

  scanChats() {
    const rail = document.getElementById('gnest-scroll-rail');
    if (!rail) return;
    
    // 🔧 強力雷達：網羅 Gemini 所有可能的「使用者對話」標籤
    const promptSelectors = 'user-query, div[data-message-author-role="user"], div[class*="user-query"], div[class*="query-text"]';
    
    // 找出所有符合條件的元素，並排除側邊欄裡面的雜訊
    const foundElements = document.querySelectorAll(promptSelectors);
    const userPrompts = Array.from(foundElements).filter(el => !el.closest('nav') && !el.closest('aside'));

    // 如果數量沒變，就不重新渲染 (節省效能)
    const currentCount = rail.querySelectorAll('.gnest-scroll-node').length;
    if (userPrompts.length === currentCount && currentCount > 0) return;

    rail.innerHTML = ''; 

    userPrompts.forEach((prompt, index) => {
      const pureText = prompt.innerText || prompt.textContent || "";
      const textPreview = pureText.trim().substring(0, 100) + '...';
      
      const node = document.createElement('div');
      node.className = 'gnest-scroll-node';
      node.innerHTML = `<div class="gnest-node-tooltip">💬 節點 ${index + 1}:<br>${textPreview}</div>`;
      
      node.onclick = () => prompt.scrollIntoView({ behavior: 'smooth', block: 'center' });
      rail.appendChild(node);
    });
  }
};

// --- 6. 漂浮小幫手 ---
const FloatingHelper = {
  init() {
    if (document.getElementById('gnest-helper')) return;
    const helper = document.createElement('div');
    helper.id = 'gnest-helper';
    helper.innerHTML = `
      ${Icons.bot}
      <div id="gnest-helper-menu">
        <div class="gnest-helper-item" id="help-add-kb">${Icons.add} 新增知識庫</div>
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
    document.getElementById('help-add-kb').onclick = () => {
      document.getElementById('gnest-helper-menu').style.display = 'none';
      ModalManager.openKBModal(); // 讓小幫手也能叫出漂亮的視窗
    };
    document.getElementById('help-del-kb').onclick = async () => {
      document.getElementById('gnest-helper-menu').style.display = 'none';
      const { kbs } = await DataManager.getCoreData();
      if(kbs.length===0) return alert("沒有知識庫");
      const name = prompt(`請輸入要刪除的知識庫名稱：\n${kbs.map(k=>k.name).join('\n')}`);
      const target = kbs.find(k=>k.name === name);
      if(target) DataManager.deleteKB(target.id);
    };
  }
};

// --- 全域啟動 ---
setInterval(() => {
  UIController.initSidebar();
  ChatRailTracker.init(); 
  FloatingHelper.init();
}, 1500); 

window.addEventListener('popstate', () => ChatRailTracker.init());