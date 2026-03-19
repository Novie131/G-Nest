console.log("🚀 G-Nest 旗艦版：全功能啟動中...");

// --- 1. 資料層：管理資料夾與知識庫 ---
const DataManager = {
  async getCoreData() {
    const data = await chrome.storage.sync.get(['gnest_folders', 'gnest_kbs']);
    return {
      folders: data.gnest_folders || [], // {id, name, kbId, chats:[]}
      kbs: data.gnest_kbs || []          // {id, name, desc}
    };
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

// --- 2. 視窗管理 (Modal) ---
const ModalManager = {
  close() { const el = document.getElementById('gnest-modal-overlay'); if (el) el.remove(); },
  
  createBase(title, contentHTML, onConfirm) {
    this.close();
    const overlay = document.createElement('div');
    overlay.id = 'gnest-modal-overlay';
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:10000; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(3px);";
    
    const box = document.createElement('div');
    box.style.cssText = "background:#1e1e1e; padding:24px; border-radius:12px; border:1px solid #444746; width:340px; color:#e3e3e3; font-family:sans-serif; box-shadow:0 8px 30px rgba(0,0,0,0.5);";
    box.innerHTML = `<h3 style="margin-top:0; font-size:18px;">${title}</h3>${contentHTML}`;
    
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = "display:flex; justify-content:flex-end; margin-top:20px;";
    
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = "取消";
    cancelBtn.style.cssText = "background:none; color:#8ab4f8; border:none; cursor:pointer; font-weight:bold; padding:8px 15px;";
    cancelBtn.onclick = () => this.close();
    
    const okBtn = document.createElement('button');
    okBtn.innerText = "建立";
    okBtn.style.cssText = "background:#8ab4f8; color:#131314; border:none; padding:8px 20px; border-radius:18px; cursor:pointer; font-weight:bold; margin-left:10px;";
    okBtn.onclick = onConfirm;

    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(okBtn);
    box.appendChild(btnGroup);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  },

  async openFolderModal() {
    const { kbs } = await DataManager.getCoreData();
    let kbOptions = '<option value="">(無配對)</option>';
    kbs.forEach(k => kbOptions += `<option value="${k.id}">${k.name}</option>`);

    const html = `
      <label style="font-size:12px; color:#9aa0a6;">資料夾名稱</label>
      <input type="text" id="fd-name" style="width:100%; padding:10px; margin:8px 0 15px 0; background:#333; color:white; border:1px solid #555; border-radius:4px; box-sizing:border-box;">
      <label style="font-size:12px; color:#9aa0a6;">配對知識庫 (KB)</label>
      <select id="fd-kb" style="width:100%; padding:10px; margin-top:8px; background:#333; color:white; border:1px solid #555; border-radius:4px;">${kbOptions}</select>
    `;
    this.createBase("📁 新增對話資料夾", html, async () => {
      const name = document.getElementById('fd-name').value;
      const kbId = document.getElementById('fd-kb').value;
      if (name) { await DataManager.saveFolder(name, kbId); this.close(); }
    });
  },

  openKBModal() {
    const html = `
      <label style="font-size:12px; color:#9aa0a6;">知識庫名稱</label>
      <input type="text" id="kb-name" placeholder="例如: Go 語言實作規範" style="width:100%; padding:10px; margin:8px 0 15px 0; background:#333; color:white; border:1px solid #555; border-radius:4px; box-sizing:border-box;">
      <label style="font-size:12px; color:#9aa0a6;">簡介/連結</label>
      <input type="text" id="kb-desc" placeholder="例如: GitHub Repo 連結" style="width:100%; padding:10px; margin-top:8px; background:#333; color:white; border:1px solid #555; border-radius:4px; box-sizing:border-box;">
    `;
    this.createBase("📚 新增知識庫", html, async () => {
      const name = document.getElementById('kb-name').value;
      const desc = document.getElementById('kb-desc').value;
      if (name) { await DataManager.saveKB(name, desc); this.close(); }
    });
  }
};

// --- 3. UI 注入與顯示控制 ---
const UIController = {
  async refresh() {
    const root = document.getElementById('gnest-root');
    if (!root) { this.init(); return; }

    const { folders, kbs } = await DataManager.getCoreData();
    const listArea = document.getElementById('gnest-list-area');
    listArea.innerHTML = '';

    folders.forEach(f => {
      const kb = kbs.find(k => k.id === f.kbId);
      const kbTag = kb ? `<span style="font-size:10px; color:#8ab4f8; margin-left:8px; background:rgba(138,180,248,0.1); padding:2px 6px; border-radius:4px;">📚 ${kb.name}</span>` : '';
      
      const item = document.createElement('div');
      item.style.cssText = "padding:8px 0; font-size:13px; color:#e3e3e3; display:flex; align-items:center; cursor:pointer;";
      item.innerHTML = `<span>📁 ${f.name}</span>${kbTag}`;
      listArea.appendChild(item);
    });
  },

  init() {
    if (document.getElementById('gnest-root')) return;

    // 尋找「我的內容」文字節點
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
    root.style.cssText = "margin-top: 10px; padding: 0 16px; border-top: 1px solid #444746; color: #e3e3e3; font-family:sans-serif;";
    
    root.innerHTML = `
      <div id="gnest-btn-folder" style="display:flex; align-items:center; padding:12px 0; cursor:pointer; font-size:14px; color:#8ab4f8; transition: opacity 0.2s;">
        <span style="margin-right:10px;">📁+</span> 新增對話資料夾
      </div>
      <div id="gnest-btn-kb" style="display:flex; align-items:center; padding:5px 0 12px 0; cursor:pointer; font-size:14px; color:#8ab4f8; transition: opacity 0.2s;">
        <span style="margin-right:10px;">📚+</span> 新增知識庫
      </div>
      <div id="gnest-list-area" style="border-top: 1px solid #333; padding-top:10px;"></div>
    `;

    anchor.parentNode.insertBefore(root, anchor.nextSibling);

    document.getElementById('gnest-btn-folder').onclick = () => ModalManager.openFolderModal();
    document.getElementById('gnest-btn-kb').onclick = () => ModalManager.openKBModal();

    this.refresh();
  }
};

// 保持掃描，確保 UI 始終存在
setInterval(() => UIController.init(), 2000);