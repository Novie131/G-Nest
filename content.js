console.log("🚀 G-Nest 旗艦版：正在進行地毯式搜索...");

// --- 1. 資料層 ---
const DataManager = {
  async getFolders() {
    const d = await chrome.storage.sync.get(['gnest_folders']);
    return d.gnest_folders || [];
  },
  async saveFolder(name, kbId) {
    const folders = await this.getFolders();
    folders.push({ id: 'f_' + Date.now(), name, kbId: kbId || null, chats: [] });
    await chrome.storage.sync.set({ gnest_folders: folders });
    UIController.init(); // 重新整理
  }
};

// --- 2. 視窗管理 (Modal) ---
const ModalManager = {
  openFolderModal() {
    const overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:10000; display:flex; justify-content:center; align-items:center;";
    overlay.innerHTML = `
      <div style="background:#1e1e1e; padding:24px; border-radius:12px; border:1px solid #444746; width:300px; color:white;">
        <h3 style="margin-top:0;">📁 新增對話資料夾</h3>
        <input type="text" id="fd-name" placeholder="資料夾名稱" style="width:100%; padding:8px; margin:10px 0; background:#333; color:white; border:1px solid #555;">
        <div style="text-align:right; margin-top:10px;">
          <button id="fd-cancel" style="background:none; color:#8ab4f8; border:none; cursor:pointer;">取消</button>
          <button id="fd-ok" style="background:#8ab4f8; color:#131314; border:none; padding:6px 15px; border-radius:4px; margin-left:10px; cursor:pointer;">建立</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('fd-cancel').onclick = () => overlay.remove();
    document.getElementById('fd-ok').onclick = async () => {
      const name = document.getElementById('fd-name').value;
      if(name) { await DataManager.saveFolder(name); overlay.remove(); }
    };
  }
};

// --- 3. 核心注入邏輯 ---
const UIController = {
  init() {
    if (document.getElementById('gnest-root')) return;

    // 尋找「我的內容」這四個字
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let targetNode = null;
    while(targetNode = walker.nextNode()) {
      if (targetNode.textContent.trim() === '我的內容') {
        const parent = targetNode.parentElement.closest('div[role="listitem"]') || targetNode.parentElement.parentElement;
        this.inject(parent);
        return;
      }
    }
    console.log("⚠️ 搜尋中... 尚未看見「我的內容」節點");
  },

  inject(anchor) {
    const root = document.createElement('div');
    root.id = 'gnest-root';
    root.style.cssText = "margin-top: 10px; padding: 0 16px; border-top: 1px solid #444746; color: #e3e3e3;";
    
    // 渲染「新增按鈕」
    const addBtn = document.createElement('div');
    addBtn.style.cssText = "display:flex; align-items:center; padding:10px 0; cursor:pointer; font-size:14px; color:#8ab4f8;";
    addBtn.innerHTML = `<span style="margin-right:10px;">📁+</span> 新增對話資料夾`;
    addBtn.onclick = () => ModalManager.openFolderModal();

    root.appendChild(addBtn);
    
    // 插入到「我的內容」節點的下方 (Insert After)
    anchor.parentNode.insertBefore(root, anchor.nextSibling);
    console.log("🎯 G-Nest 成功掛載於「我的內容」下方！");
  }
};

// 每 2 秒掃描一次，直到掛載成功為止
const scanInterval = setInterval(() => {
  UIController.init();
}, 2000);