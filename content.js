console.log("🚀 G-Nest 架構重構版啟動...");

// --- 1. 資料層 ---
const DataManager = {
  async getCoreData() {
    const data = await chrome.storage.sync.get(['gnest_folders', 'gnest_kbs']);
    return { folders: data.gnest_folders || [], kbs: data.gnest_kbs || [] };
  },
  async saveFolder(name, kbId) {
    const { folders } = await this.getCoreData();
    folders.push({ id: 'f_' + Date.now(), name, kbId: kbId || null, chats: [] });
    await chrome.storage.sync.set({ gnest_folders: folders });
    UIController.refresh();
  },
  async saveKB(name, desc) {
    const { kbs } = await this.getCoreData();
    kbs.push({ id: 'kb_' + Date.now(), name, desc });
    await chrome.storage.sync.set({ gnest_kbs: kbs });
    UIController.refresh();
  }
};

// Google 官方 SVG Icons
const Icons = {
  folderAdd: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M560-320h80v-80h80v-80h-80v-80h-80v80h-80v80h80v80ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>`,
  kbAdd: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M520-600v-240h320v240H520ZM120-120v-240h320v240H120Zm400 0v-240h320v240H520ZM120-600v-240h320v240H120Zm80-80h160v-80H200v80Zm400 0h160v-80H600v80ZM200-200h160v-80H200v80Zm400 0h160v-80H600v80Zm-400-480v80-80Zm400 0v80-80Zm-400 400v80-80Zm400 0v80-80Z"/></svg>`
};

// --- 2. 視窗管理 (Modal) ---
const ModalManager = {
  close() { const el = document.getElementById('gnest-modal-overlay'); if (el) el.remove(); },
  
  createBase(title, contentHTML, onConfirm) {
    this.close();
    const overlay = document.createElement('div');
    overlay.id = 'gnest-modal-overlay';
    
    const box = document.createElement('div');
    box.className = 'gnest-modal-box';
    box.innerHTML = `<h3>${title}</h3>${contentHTML}`;
    
    const btnGroup = document.createElement('div');
    btnGroup.className = 'gnest-btn-group';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'gnest-btn-cancel';
    cancelBtn.innerText = "取消";
    cancelBtn.onclick = () => this.close();
    
    const okBtn = document.createElement('button');
    okBtn.className = 'gnest-btn-ok';
    okBtn.innerText = "建立";
    okBtn.onclick = onConfirm;

    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(okBtn);
    box.appendChild(btnGroup);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  async openFolderModal() {
    const { kbs } = await DataManager.getCoreData();
    let kbOptions = '<option value="" style="background:#1e1f20;">(無配對)</option>';
    kbs.forEach(k => kbOptions += `<option value="${k.id}" style="background:#1e1f20;">${k.name}</option>`);

    const html = `
      <input type="text" id="fd-name" class="gnest-input" placeholder="資料夾名稱">
      <div style="font-size:12px; color:#c4c7c5; margin-bottom:4px;">配對知識庫</div>
      <select id="fd-kb" class="gnest-input">${kbOptions}</select>
    `;
    this.createBase("新建資料夾", html, async () => {
      const name = document.getElementById('fd-name').value;
      const kbId = document.getElementById('fd-kb').value;
      if (name) { await DataManager.saveFolder(name, kbId); this.close(); }
    });
  },

  openKBModal() {
    const html = `
      <input type="text" id="kb-name" class="gnest-input" placeholder="知識庫名稱">
      <input type="text" id="kb-desc" class="gnest-input" placeholder="簡介/連結">
    `;
    this.createBase("新建知識庫", html, async () => {
      const name = document.getElementById('kb-name').value;
      const desc = document.getElementById('kb-desc').value;
      if (name) { await DataManager.saveKB(name, desc); this.close(); }
    });
  }
};

// --- 3. UI 注入與顯示控制 ---
const UIController = {
  async refresh() {
    const listArea = document.getElementById('gnest-list-area');
    if (!listArea) return;

    const { folders, kbs } = await DataManager.getCoreData();
    listArea.innerHTML = '';

    folders.forEach(f => {
      const kb = kbs.find(k => k.id === f.kbId);
      const kbTag = kb ? `<span class="gnest-kb-tag">📚 ${kb.name}</span>` : '';
      
      const item = document.createElement('div');
      item.className = 'gnest-folder-item';
      item.innerHTML = `<span class="gnest-folder-icon">📁</span><span>${f.name}</span>${kbTag}`;
      listArea.appendChild(item);
    });
  },

  init() {
    if (document.getElementById('gnest-root')) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let targetNode = null;
    while(targetNode = walker.nextNode()) {
      if (targetNode.textContent.trim() === '我的內容') {
        const anchor = targetNode.parentElement.closest('div[role="listitem"]') || targetNode.parentElement.parentElement;
        this.inject(anchor);
        return;
      }
    }
  },

  inject(anchor) {
    const root = document.createElement('div');
    root.id = 'gnest-root';
    
    // 按鈕
    const btnFolder = document.createElement('div');
    btnFolder.className = 'gnest-pill-btn';
    btnFolder.innerHTML = `<span class="gnest-btn-icon">${Icons.folderAdd}</span><span>新增對話資料夾</span>`;
    
    const btnKB = document.createElement('div');
    btnKB.className = 'gnest-pill-btn';
    btnKB.innerHTML = `<span class="gnest-btn-icon">${Icons.kbAdd}</span><span>新增知識庫</span>`;
    
    // 分隔線與清單區
    const divider = document.createElement('div');
    divider.className = 'gnest-divider';
    const listArea = document.createElement('div');
    listArea.id = 'gnest-list-area';

    // 綁定事件
    btnFolder.onclick = () => ModalManager.openFolderModal();
    btnKB.onclick = () => ModalManager.openKBModal();

    // 組裝
    root.appendChild(btnFolder);
    root.appendChild(btnKB);
    root.appendChild(divider);
    root.appendChild(listArea);

    anchor.parentNode.insertBefore(root, anchor.nextSibling);
    this.refresh();
  }
};

setInterval(() => UIController.init(), 2000);