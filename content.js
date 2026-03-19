console.log("🚀 G-Nest 終極完全體啟動：包含滑軌與漂浮小幫手...");

// --- 1. 資料層 ---
const DataManager = {
  async getCoreData() {
    const data = await chrome.storage.sync.get(['gnest_folders', 'gnest_kbs']);
    return { folders: data.gnest_folders || [], kbs: data.gnest_kbs || [] };
  },
  async deleteFolder(id) {
    const { folders } = await this.getCoreData();
    await chrome.storage.sync.set({ gnest_folders: folders.filter(f => f.id !== id) });
    UIController.refresh();
  },
  // 新增：刪除知識庫功能
  async deleteKB(id) {
    const { kbs, folders } = await this.getCoreData();
    // 移除KB，並將有配對此KB的資料夾的 kbId 設為 null
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

// --- 3. Sprint 1: 側邊欄 UI 控制器 ---
const ContextMenu = {
  close() { const m = document.getElementById('gnest-context-menu'); if(m) m.remove(); },
  open(e, folder) {
    this.close(); e.preventDefault(); e.stopPropagation();
    const menu = document.createElement('div');
    menu.id = 'gnest-context-menu';
    menu.innerHTML = `
      <div class="gnest-cm-item" id="cm-add">${Icons.add} 存入當前對話</div>
      <div class="gnest-cm-item" id="cm-swap">${Icons.swap} 交換知識庫</div>
      <div class="gnest-cm-item" id="cm-del" style="color:#ff8080;">${Icons.delete} 刪除資料夾</div>
    `;
    const rect = e.target.closest('.gnest-action-btn').getBoundingClientRect();
    menu.style.top = `${rect.bottom + 5}px`; menu.style.left = `${rect.left + 20}px`;
    document.body.appendChild(menu);
    setTimeout(() => { document.addEventListener('click', this.close, {once: true}); }, 0);

    document.getElementById('cm-del').onclick = () => DataManager.deleteFolder(folder.id);
  }
};

const UIController = {
  async refresh() {
    const root = document.getElementById('gnest-root');
    if (!root) return;
    const { folders, kbs } = await DataManager.getCoreData();
    root.innerHTML = '';

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
      fdItem.innerHTML = `
        <summary class="gnest-folder-summary">
          <span class="gnest-folder-icon">${Icons.folder}</span>
          <span style="flex-grow:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</span>
          <div class="gnest-folder-actions">
            <div class="gnest-action-btn btn-more" title="更多選項">${Icons.more}</div>
          </div>
        </summary>
        <div class="gnest-sub-list">${f.chats.length === 0 ? '<div class="gnest-sub-item" style="color:#5f6368;">尚無對話</div>' : ''}</div>
      `;
      fdItem.querySelector('.btn-more').onclick = (e) => ContextMenu.open(e, f);
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
        <div class="gnest-sub-list">
          <div class="gnest-sub-item" style="color:#9aa0a6;">${k.desc || '無描述'}</div>
        </div>
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

// --- 4. Sprint 2: 聊天節點滑軌 (Chat Rail) ---
const ChatRailTracker = {
  init() {
    if (document.getElementById('gnest-scroll-rail')) return;
    const rail = document.createElement('div');
    rail.id = 'gnest-scroll-rail';
    document.body.appendChild(rail);
    this.scanChats();
  },
  scanChats() {
    const rail = document.getElementById('gnest-scroll-rail');
    if (!rail) return;
    
    // 尋找使用者的提問區塊 (Gemini 的 DOM 特徵)
    // 通常使用者的對話會有 message-author-role="user" 屬性
    const userPrompts = document.querySelectorAll('div[data-message-author-role="user"]');
    
    rail.innerHTML = ''; // 清空重新渲染

    userPrompts.forEach((prompt, index) => {
      const text = prompt.innerText.trim().substring(0, 150) + '...'; // 擷取部分文字作為 tooltip
      const node = document.createElement('div');
      node.className = 'gnest-scroll-node';
      node.innerHTML = `<div class="gnest-node-tooltip">💬 節點 ${index + 1}:<br>${text}</div>`;
      
      // 點擊節點，畫面自動平滑滾動到該提問
      node.onclick = () => {
        prompt.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      
      rail.appendChild(node);
    });
  }
};

// --- 5. Sprint 2: 漂浮小幫手 (Floating Helper) ---
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
    this.bindMenu(helper);
  },

  // 實作拖曳邏輯 (面試常考題！)
  makeDraggable(el) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    el.onmousedown = (e) => {
      // 如果點擊的是選單，不要觸發拖曳
      if (e.target.closest('#gnest-helper-menu')) return;
      
      isDragging = false;
      startX = e.clientX; startY = e.clientY;
      const rect = el.getBoundingClientRect();
      initialX = rect.left; initialY = rect.top;

      document.onmousemove = (moveEvent) => {
        isDragging = true; // 只要滑鼠移動了，就標記為拖曳中
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        // 覆蓋原本的 bottom/right，改用 top/left 絕對定位
        el.style.bottom = 'auto'; el.style.right = 'auto';
        el.style.left = `${initialX + dx}px`;
        el.style.top = `${initialY + dy}px`;
      };

      document.onmouseup = () => {
        document.onmousemove = null;
        document.onmouseup = null;
      };
    };

    // 處理點擊展開選單 (防止拖曳完觸發點擊)
    el.onclick = (e) => {
      if (isDragging || e.target.closest('#gnest-helper-menu')) return;
      const menu = document.getElementById('gnest-helper-menu');
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    };
  },

  bindMenu(helper) {
    // 新增知識庫
    document.getElementById('help-add-kb').onclick = () => {
      const name = prompt("請輸入新「知識庫」名稱：");
      if (name) DataManager.saveKB(name, "透過小幫手新增");
      document.getElementById('gnest-helper-menu').style.display = 'none';
    };

    // 刪除知識庫
    document.getElementById('help-del-kb').onclick = async () => {
      const { kbs } = await DataManager.getCoreData();
      if (kbs.length === 0) return alert("目前沒有知識庫可以刪除！");
      
      let msg = "請輸入要刪除的知識庫編號：\n";
      kbs.forEach((k, i) => msg += `[${i + 1}] ${k.name}\n`);
      const choice = prompt(msg);
      
      const index = parseInt(choice) - 1;
      if (!isNaN(index) && kbs[index]) {
        if(confirm(`確定要刪除「${kbs[index].name}」嗎？`)) {
           await DataManager.deleteKB(kbs[index].id);
           alert("已刪除！");
        }
      }
      document.getElementById('gnest-helper-menu').style.display = 'none';
    };
  }
};

// --- 全域啟動與監控 ---
setInterval(() => {
  UIController.initSidebar();
  ChatRailTracker.init();
  FloatingHelper.init();
  
  // 動態更新滑軌節點 (因為對話會越來越長)
  ChatRailTracker.scanChats();
}, 2000);