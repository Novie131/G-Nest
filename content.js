console.log("🚀 G-Nest 終極拖曳版啟動：完美對齊與全功能操作...");

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
  async deleteFolder(id) {
    if(!confirm("確定要刪除此資料夾嗎？(裡面的對話連結不會被刪除)")) return;
    const { folders } = await this.getCoreData();
    await chrome.storage.sync.set({ gnest_folders: folders.filter(f => f.id !== id) });
    UIController.refresh();
  },
  async renameFolder(id, newName) {
    const { folders } = await this.getCoreData();
    const folder = folders.find(f => f.id === id);
    if(folder) { folder.name = newName; await chrome.storage.sync.set({ gnest_folders: folders }); UIController.refresh(); }
  },
  async pairFolderKB(id, kbId) {
    const { folders } = await this.getCoreData();
    const folder = folders.find(f => f.id === id);
    if(folder) { folder.kbId = kbId || null; await chrome.storage.sync.set({ gnest_folders: folders }); UIController.refresh(); }
  },
  async saveChatToFolder(folderId, chatId, chatTitle) {
    const { folders } = await this.getCoreData();
    const folder = folders.find(f => f.id === folderId);
    if (folder && !folder.chats.some(c => c.id === chatId)) {
      folder.chats.push({ id: chatId, title: chatTitle });
      await chrome.storage.sync.set({ gnest_folders: folders });
      UIController.refresh();
    }
  },
  async saveKB(name, desc) {
    const { kbs } = await this.getCoreData();
    kbs.push({ id: 'kb_' + Date.now(), name, desc });
    await chrome.storage.sync.set({ gnest_kbs: kbs });
    UIController.refresh();
  },
  async deleteKB(id) {
    const { kbs, folders } = await this.getCoreData();
    const newKbs = kbs.filter(k => k.id !== id);
    const newFolders = folders.map(f => f.kbId === id ? { ...f, kbId: null } : f);
    await chrome.storage.sync.set({ gnest_kbs: newKbs, gnest_folders: newFolders });
    UIController.refresh();
  }
};

const Icons = {
  chevron: `<svg class="gnest-chevron" width="18" height="18" viewBox="0 -960 960 960" fill="currentColor"><path d="M400-280v-400l200 200-200 200Z"/></svg>`,
  folder: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>`,
  more: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z"/></svg>`,
  folderAdd: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M560-320h80v-80h80v-80h-80v-80h-80v80h-80v80h80v80ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>`,
  kbAdd: `<svg width="20" height="20" viewBox="0 -960 960 960" fill="currentColor"><path d="M520-600v-240h320v240H520ZM120-120v-240h320v240H120Zm400 0v-240h320v240H520ZM120-600v-240h320v240H120Zm80-80h160v-80H200v80Zm400 0h160v-80H600v80ZM200-200h160v-80H200v80Zm400 0h160v-80H600v80Zm-400-480v80-80Zm400 0v80-80Zm-400 400v80-80Zm400 0v80-80Z"/></svg>`,
  bot: `<svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor"><path d="M160-120v-160q0-33 23.5-56.5T240-360h480q33 0 56.5 23.5T800-280v160H160Zm320-320q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Z"/></svg>`
};

// --- 2. Modal 與三點選單 ---
const ModalManager = {
  closeAll() {
    const o = document.getElementById('gnest-modal-overlay'); if (o) o.remove();
    const m = document.getElementById('gnest-context-menu'); if (m) m.remove();
  },
  
  // 建立基礎視窗
  createModal(title, html, onConfirm) {
    this.closeAll();
    const overlay = document.createElement('div');
    overlay.id = 'gnest-modal-overlay';
    overlay.innerHTML = `
      <div class="gnest-modal-box">
        <h3>${title}</h3>${html}
        <div class="gnest-btn-group">
          <button class="gnest-btn-cancel" id="btn-modal-cancel">取消</button>
          <button class="gnest-btn-ok" id="btn-modal-create">確認</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('btn-modal-cancel').onclick = () => this.closeAll();
    document.getElementById('btn-modal-create').onclick = onConfirm;
  },

  async openFolderModal() {
    const { kbs } = await DataManager.getCoreData();
    let options = '<option value="" style="background:#1e1f20;">(無配對)</option>';
    kbs.forEach(k => options += `<option value="${k.id}" style="background:#1e1f20;">${k.name}</option>`);
    this.createModal("新建資料夾", `
      <input type="text" id="fd-name" class="gnest-input" placeholder="資料夾名稱" autofocus>
      <div style="font-size:12px; color:#c4c7c5; margin-bottom:8px;">配對知識庫</div>
      <select id="fd-kb" class="gnest-input">${options}</select>
    `, async () => {
      const name = document.getElementById('fd-name').value;
      if (name) { await DataManager.saveFolder(name, document.getElementById('fd-kb').value); this.closeAll(); }
    });
  },

  openKBModal() {
    this.createModal("新建知識庫", `
      <input type="text" id="kb-name" class="gnest-input" placeholder="知識庫名稱" autofocus>
      <input type="text" id="kb-desc" class="gnest-input" placeholder="簡介/連結">
    `, async () => {
      const name = document.getElementById('kb-name').value;
      if (name) { await DataManager.saveKB(name, document.getElementById('kb-desc').value); this.closeAll(); }
    });
  },

  openRenameModal(folder) {
    this.createModal("重新命名資料夾", `
      <input type="text" id="rn-name" class="gnest-input" value="${folder.name}" autofocus>
    `, async () => {
      const newName = document.getElementById('rn-name').value;
      if (newName) { await DataManager.renameFolder(folder.id, newName); this.closeAll(); }
    });
  },

  async openPairKBModal(folder) {
    const { kbs } = await DataManager.getCoreData();
    let options = '<option value="" style="background:#1e1f20;">(解除配對)</option>';
    kbs.forEach(k => options += `<option value="${k.id}" style="background:#1e1f20;" ${folder.kbId === k.id ? 'selected' : ''}>${k.name}</option>`);
    this.createModal(`為「${folder.name}」配對知識庫`, `
      <select id="pair-kb" class="gnest-input">${options}</select>
    `, async () => {
      await DataManager.pairFolderKB(folder.id, document.getElementById('pair-kb').value);
      this.closeAll();
    });
  },

  // 更多選項 (三點) Context Menu
  openContextMenu(e, folder) {
    this.closeAll(); e.preventDefault(); e.stopPropagation();
    const menu = document.createElement('div');
    menu.id = 'gnest-context-menu';
    // 實作使用者要求的選項：新對話、重新命名、配對知識庫、刪除
    menu.innerHTML = `
      <div class="gnest-cm-item" id="cm-new"><span>✨</span> 新的對話</div>
      <div class="gnest-cm-item" id="cm-rn"><span>✏️</span> 重新命名</div>
      <div class="gnest-cm-item" id="cm-pair"><span>🔗</span> 配對知識庫</div>
      <div class="gnest-cm-item" id="cm-del" style="color:#ff8080;"><span>🗑️</span> 刪除資料夾</div>
    `;
    const rect = e.target.closest('.btn-more').getBoundingClientRect();
    menu.style.top = `${rect.bottom + 5}px`; menu.style.left = `${rect.left}px`;
    document.body.appendChild(menu);
    setTimeout(() => { document.addEventListener('click', this.closeAll, {once: true}); }, 0);

    // 綁定事件
    document.getElementById('cm-new').onclick = () => {
      window.location.href = 'https://gemini.google.com/app'; // 跳轉開新對話
    };
    document.getElementById('cm-rn').onclick = () => this.openRenameModal(folder);
    document.getElementById('cm-pair').onclick = () => this.openPairKBModal(folder);
    document.getElementById('cm-del').onclick = () => DataManager.deleteFolder(folder.id);
  }
};

// --- 3. 側邊欄 UI 控制器 (包含 Drag & Drop) ---
const UIController = {
  async refresh() {
    const root = document.getElementById('gnest-root');
    if (!root) return;
    const { folders, kbs } = await DataManager.getCoreData();
    root.innerHTML = ''; 

    // 新增按鈕區塊
    const btnGroup = document.createElement('div');
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
    document.getElementById('gnest-btn-folder').onclick = () => ModalManager.openFolderModal();
    document.getElementById('gnest-btn-kb').onclick = () => ModalManager.openKBModal();

    const createSection = (title) => {
      const sec = document.createElement('details');
      sec.className = 'gnest-section'; sec.open = true;
      sec.innerHTML = `<summary>${title} ${Icons.chevron}</summary>`;
      return sec;
    };

    // 渲染對話資料夾 (加入 Drop 區域邏輯)
    const folderSection = createSection('對話資料夾');
    folders.forEach(f => {
      const fdItem = document.createElement('details');
      fdItem.className = 'gnest-folder-container';
      const hasChats = f.chats && f.chats.length > 0;
      
      const kb = kbs.find(k => k.id === f.kbId);
      const kbTag = kb ? `<span class="gnest-kb-tag">${kb.name}</span>` : '';

      fdItem.innerHTML = `
        <summary class="gnest-folder-summary">
          <span class="gnest-folder-icon">${Icons.folder}</span>
          <span style="flex-grow:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</span>
          ${kbTag}
          <div class="gnest-folder-actions"><div class="gnest-action-btn btn-more">${Icons.more}</div></div>
        </summary>
        <div class="gnest-sub-list">
          ${!hasChats ? '<div class="gnest-sub-item" style="color:#5f6368; cursor:default;">(拖曳對話至此)</div>' : ''}
        </div>
      `;
      fdItem.querySelector('.btn-more').onclick = (e) => ModalManager.openContextMenu(e, f);
      
      // 🔮 核心魔法：接收拖拉 (Drag & Drop)
      fdItem.addEventListener('dragover', (e) => { e.preventDefault(); fdItem.classList.add('gnest-drag-over'); });
      fdItem.addEventListener('dragleave', () => fdItem.classList.remove('gnest-drag-over'));
      fdItem.addEventListener('drop', async (e) => {
        e.preventDefault(); fdItem.classList.remove('gnest-drag-over');
        try {
          const data = JSON.parse(e.dataTransfer.getData('application/json'));
          if (data && data.id) {
             await DataManager.saveChatToFolder(f.id, data.id, data.title);
          }
        } catch(err) { console.error("拖曳解析失敗", err); }
      });

      // 渲染裡面的對話連結
      const subList = fdItem.querySelector('.gnest-sub-list');
      f.chats.forEach(c => {
        const item = document.createElement('div');
        item.className = 'gnest-sub-item';
        item.innerHTML = `📄 ${c.title}`;
        item.onclick = () => window.location.href = `/app/chat/${c.id}`;
        subList.appendChild(item);
      });

      folderSection.appendChild(fdItem);
    });

    // 渲染知識庫
    const kbSection = createSection('知識庫');
    kbs.forEach(k => {
      const kbItem = document.createElement('details');
      kbItem.innerHTML = `
        <summary class="gnest-folder-summary">
          <span class="gnest-folder-icon" style="color:#a8c7fa;">📚</span><span>${k.name}</span>
        </summary>
        <div class="gnest-sub-list"><div class="gnest-sub-item" style="color:#9aa0a6; cursor:default;">${k.desc || '無描述'}</div></div>
      `;
      kbSection.appendChild(kbItem);
    });

    root.appendChild(folderSection); root.appendChild(kbSection);
  },

  initSidebar() {
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

// --- 4. 使原生對話可以被拖曳 (Draggable) ---
const DragDropManager = {
  makeChatsDraggable() {
    // 尋找 Gemini 側邊欄原生的對話連結
    document.querySelectorAll('a[href*="/app/chat/"]').forEach(link => {
      // 防止找到我們自己 G-Nest 裡面的連結
      if (link.closest('#gnest-root')) return;

      const container = link.closest('div[role="listitem"]') || link.closest('li') || link;
      if (container.dataset.gnestDraggable) return; // 已經加過了

      container.draggable = true;
      container.dataset.gnestDraggable = "true";

      container.addEventListener('dragstart', (e) => {
        const chatId = link.getAttribute('href').split('/chat/')[1];
        const chatTitle = link.innerText.trim();
        e.dataTransfer.setData('application/json', JSON.stringify({id: chatId, title: chatTitle}));
        e.dataTransfer.effectAllowed = 'copyMove';
        container.style.opacity = '0.5';
      });

      container.addEventListener('dragend', () => container.style.opacity = '1');
    });
  }
};

// --- 5. 漂浮小幫手 (加入新增/刪除功能) ---
const FloatingHelper = {
  init() {
    if (document.getElementById('gnest-helper')) return;
    const helper = document.createElement('div');
    helper.id = 'gnest-helper';
    helper.innerHTML = `
      ${Icons.bot}
      <div id="gnest-helper-menu">
        <div class="gnest-helper-item" id="help-add-fd"><span>📁</span> 新增對話資料夾</div>
        <div class="gnest-helper-item" id="help-del-fd" style="color:#ff8080;"><span>🗑️</span> 刪除對話資料夾</div>
        <hr style="border-color:#444746; margin: 4px 0;">
        <div class="gnest-helper-item" id="help-add-kb"><span>📚</span> 新增知識庫</div>
        <div class="gnest-helper-item" id="help-del-kb" style="color:#ff8080;"><span>🗑️</span> 刪除知識庫</div>
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
      isDragging = false; startX = e.clientX; startY = e.clientY;
      const rect = el.getBoundingClientRect(); initialX = rect.left; initialY = rect.top;
      document.onmousemove = (moveEvent) => {
        isDragging = true;
        el.style.bottom = 'auto'; el.style.right = 'auto';
        el.style.left = `${initialX + (moveEvent.clientX - startX)}px`; 
        el.style.top = `${initialY + (moveEvent.clientY - startY)}px`;
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
    const close = () => document.getElementById('gnest-helper-menu').style.display = 'none';
    document.getElementById('help-add-fd').onclick = () => { close(); ModalManager.openFolderModal(); };
    document.getElementById('help-add-kb').onclick = () => { close(); ModalManager.openKBModal(); };
    
    document.getElementById('help-del-fd').onclick = async () => {
      close();
      const { folders } = await DataManager.getCoreData();
      const name = prompt(`請輸入要刪除的【資料夾】名稱：\n${folders.map(f=>f.name).join('\n')}`);
      const target = folders.find(f=>f.name === name);
      if(target) DataManager.deleteFolder(target.id);
    };
    
    document.getElementById('help-del-kb').onclick = async () => {
      close();
      const { kbs } = await DataManager.getCoreData();
      const name = prompt(`請輸入要刪除的【知識庫】名稱：\n${kbs.map(k=>k.name).join('\n')}`);
      const target = kbs.find(k=>k.name === name);
      if(target) DataManager.deleteKB(target.id);
    };
  }
};

// ... 聊天滑軌 (ChatRailTracker) 維持上一版邏輯，此處省略以節省空間，請記得保留你原本代碼裡的 ChatRailTracker ...

// --- 全域啟動 ---
setInterval(() => {
  UIController.initSidebar();
  DragDropManager.makeChatsDraggable(); // 🔮 持續掃描並注入拖曳功能
  FloatingHelper.init();
  // ChatRailTracker.init(); 
}, 1500);