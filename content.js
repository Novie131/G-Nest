console.log("🚀 G-Nest UI 升級版啟動...");

const DataManager = {
  async getCoreData() {
    const data = await chrome.storage.sync.get(['gnest_folders', 'gnest_kbs']);
    return { folders: data.gnest_folders || [], kbs: data.gnest_kbs || [] };
  },
  async deleteFolder(id) {
    const { folders } = await this.getCoreData();
    await chrome.storage.sync.set({ gnest_folders: folders.filter(f => f.id !== id) });
    UIController.refresh();
  }
};

const Icons = {
  chevron: `<svg class="gnest-chevron" width="18" height="18" viewBox="0 -960 960 960" fill="currentColor"><path d="M400-280v-400l200 200-200 200Z"/></svg>`,
  folder: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>`,
  more: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/></svg>`,
  add: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>`,
  delete: `<svg width="18" height="18" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-520H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-640v520-520Z"/></svg>`,
  swap: `<svg width="18" height="18" viewBox="0 -960 960 960" fill="currentColor"><path d="M280-120 80-320l200-200 56 56-104 104h608v80H232l104 104-56 56Zm400-320-56-56 104-104H120v-80h608L624-784l56-56 200 200-200 200Z"/></svg>`
};

const ContextMenu = {
  close() { const m = document.getElementById('gnest-context-menu'); if(m) m.remove(); },
  open(e, folder) {
    this.close();
    e.preventDefault(); e.stopPropagation();

    const menu = document.createElement('div');
    menu.id = 'gnest-context-menu';
    menu.innerHTML = `
      <div class="gnest-cm-item" id="cm-add">${Icons.add} 存入當前對話</div>
      <div class="gnest-cm-item" id="cm-swap">${Icons.swap} 交換配對知識庫</div>
      <div class="gnest-cm-item" id="cm-del" style="color:#ff8080;">${Icons.delete} 刪除資料夾</div>
    `;

    // 計算彈出位置
    const rect = e.target.closest('.gnest-action-btn').getBoundingClientRect();
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.left = `${rect.left + 20}px`; // 讓選單向右下展開

    document.body.appendChild(menu);

    // 點擊外部關閉選單
    setTimeout(() => { document.addEventListener('click', this.close, {once: true}); }, 0);

    // 綁定功能
    document.getElementById('cm-del').onclick = () => DataManager.deleteFolder(folder.id);
    document.getElementById('cm-swap').onclick = () => alert("即將實作：切換知識庫");
    document.getElementById('cm-add').onclick = () => alert("即將實作：存入對話");
  }
};

const UIController = {
  async refresh() {
    const root = document.getElementById('gnest-root');
    if (!root) return;

    const { folders, kbs } = await DataManager.getCoreData();
    root.innerHTML = ''; // 清空

    // --- 區塊 1：對話資料夾 ---
    const folderSection = document.createElement('details');
    folderSection.className = 'gnest-section';
    folderSection.open = true; // 預設展開
    folderSection.innerHTML = `<summary>對話資料夾 ${Icons.chevron}</summary>`;
    
    folders.forEach(f => {
      const fdItem = document.createElement('details');
      fdItem.innerHTML = `
        <summary class="gnest-folder-summary">
          <span class="gnest-folder-icon">${Icons.folder}</span>
          <span style="flex-grow:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</span>
          <div class="gnest-folder-actions">
            <div class="gnest-action-btn btn-add" title="新增對話">${Icons.add}</div>
            <div class="gnest-action-btn btn-more" title="更多選項">${Icons.more}</div>
          </div>
        </summary>
        <div class="gnest-sub-list">
           ${f.chats.length === 0 ? '<div class="gnest-sub-item" style="color:#5f6368;">尚無對話</div>' : ''}
        </div>
      `;

      // 綁定事件 (防止點擊展開時觸發按鈕)
      fdItem.querySelector('.btn-more').onclick = (e) => ContextMenu.open(e, f);
      fdItem.querySelector('.btn-add').onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        alert(`即將為 ${f.name} 新增對話`);
      };

      folderSection.appendChild(fdItem);
    });

    // --- 區塊 2：知識庫大分類 ---
    const kbSection = document.createElement('details');
    kbSection.className = 'gnest-section';
    kbSection.open = true;
    kbSection.innerHTML = `<summary>知識庫 ${Icons.chevron}</summary>`;
    
    kbs.forEach(k => {
      const kbItem = document.createElement('details');
      kbItem.innerHTML = `
        <summary class="gnest-folder-summary">
          <span class="gnest-folder-icon" style="color:#a8c7fa;">📚</span>
          <span>${k.name}</span>
        </summary>
        <div class="gnest-sub-list">
          <div class="gnest-sub-item" style="color:#9aa0a6;">${k.desc || '無描述'}</div>
        </div>
      `;
      kbSection.appendChild(kbItem);
    });

    root.appendChild(folderSection);
    root.appendChild(kbSection);
  },

  init() {
    if (document.getElementById('gnest-root')) return;

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let targetNode = null;
    while(targetNode = walker.nextNode()) {
      if (targetNode.textContent.trim() === '我的內容') {
        const anchor = targetNode.parentElement.closest('div[role="listitem"]') || targetNode.parentElement.parentElement;
        const root = document.createElement('div');
        root.id = 'gnest-root';
        anchor.parentNode.insertBefore(root, anchor.nextSibling);
        this.refresh();
        return;
      }
    }
  }
};

setInterval(() => UIController.init(), 2000);