console.log("🚀 G-Nest 旗艦版啟動中...");

// --- 1. 資料庫管理 (Sync Storage) ---
const DataManager = {
  async getCoreData() {
    const data = await chrome.storage.sync.get(['gnest_folders', 'gnest_kbs']);
    return {
      folders: data.gnest_folders || [], // {id, name, chats:[], kbId}
      kbs: data.gnest_kbs || []          // {id, name, summary}
    };
  },
  async createFolder(name, kbId) {
    const { folders } = await this.getCoreData();
    folders.push({ id: 'f_' + Date.now(), name, chats: [], kbId: kbId || null });
    await chrome.storage.sync.set({ gnest_folders: folders });
    renderGnestUI(); // 重新渲染側邊欄
  },
  async createKB(name, summary) {
    const { kbs } = await this.getCoreData();
    kbs.push({ id: 'kb_' + Date.now(), name, summary });
    await chrome.storage.sync.set({ gnest_kbs: kbs });
  },
  async saveChatToFolder(folderId, chatId, chatTitle) {
    const { folders } = await this.getCoreData();
    const folder = folders.find(f => f.id === folderId);
    if (folder && !folder.chats.some(c => c.id === chatId)) {
      folder.chats.push({ id: chatId, title: chatTitle });
      await chrome.storage.sync.set({ gnest_folders: folders });
      renderGnestUI();
    }
  }
};

// --- 2. 彈出視窗 UI (Modal) ---
const ModalManager = {
  close() {
    const existing = document.getElementById('gnest-modal-overlay');
    if (existing) existing.remove();
  },
  createOverlay() {
    this.close();
    const overlay = document.createElement('div');
    overlay.id = 'gnest-modal-overlay';
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 9999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(2px);";
    // 點擊背景關閉
    overlay.onclick = (e) => { if (e.target === overlay) this.close(); };
    return overlay;
  },
  getModalStyle() {
    return "background: #1e1e1e; border: 1px solid #444746; border-radius: 12px; padding: 24px; width: 350px; color: #e3e3e3; font-family: sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5);";
  },
  getInputStyle() {
    return "width: 100%; padding: 10px; margin: 10px 0 20px 0; background: #333537; border: 1px solid #555; color: white; border-radius: 6px; box-sizing: border-box;";
  },
  getBtnStyle(isPrimary) {
    return `padding: 8px 16px; border-radius: 6px; cursor: pointer; border: none; font-weight: bold; margin-left: 10px; ${isPrimary ? 'background: #8ab4f8; color: #131314;' : 'background: transparent; color: #8ab4f8;'}`;
  },

  // 開啟「新增知識庫」視窗
  openKBModal() {
    const overlay = this.createOverlay();
    const modal = document.createElement('div');
    modal.style.cssText = this.getModalStyle();
    modal.innerHTML = `
      <h3 style="margin-top:0; color: #e3e3e3;">📚 新增知識庫</h3>
      <label style="font-size: 12px; color: #9aa0a6;">知識庫名稱</label>
      <input type="text" id="kb-name" placeholder="例如: 研究所論文整理" style="${this.getInputStyle()}">
      <label style="font-size: 12px; color: #9aa0a6;">描述 (選填)</label>
      <input type="text" id="kb-desc" placeholder="簡短說明..." style="${this.getInputStyle()}">
      <div style="display: flex; justify-content: flex-end;">
        <button id="kb-cancel" style="${this.getBtnStyle(false)}">取消</button>
        <button id="kb-save" style="${this.getBtnStyle(true)}">建立</button>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('kb-cancel').onclick = () => this.close();
    document.getElementById('kb-save').onclick = async () => {
      const name = document.getElementById('kb-name').value.trim();
      const desc = document.getElementById('kb-desc').value.trim();
      if (name) {
        await DataManager.createKB(name, desc);
        alert(`✅ 知識庫「${name}」建立成功！`);
        this.close();
      }
    };
  },

  // 開啟「新增對話資料夾」視窗 (包含配對 KB)
  async openFolderModal() {
    const { kbs } = await DataManager.getCoreData();
    let kbOptions = '<option value="">(無配對)</option>';
    kbs.forEach(kb => { kbOptions += `<option value="${kb.id}">${kb.name}</option>`; });

    const overlay = this.createOverlay();
    const modal = document.createElement('div');
    modal.style.cssText = this.getModalStyle();
    modal.innerHTML = `
      <h3 style="margin-top:0; color: #e3e3e3;">📁 新增對話資料夾</h3>
      <label style="font-size: 12px; color: #9aa0a6;">資料夾名稱</label>
      <input type="text" id="folder-name" placeholder="例如: Go WebAuthn 專案" style="${this.getInputStyle()}">
      <label style="font-size: 12px; color: #9aa0a6;">配對知識庫 (可選)</label>
      <select id="folder-kb" style="${this.getInputStyle()}">
        ${kbOptions}
      </select>
      <div style="display: flex; justify-content: flex-end;">
        <button id="fd-cancel" style="${this.getBtnStyle(false)}">取消</button>
        <button id="fd-save" style="${this.getBtnStyle(true)}">建立</button>
      </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('fd-cancel').onclick = () => this.close();
    document.getElementById('fd-save').onclick = async () => {
      const name = document.getElementById('folder-name').value.trim();
      const kbId = document.getElementById('folder-kb').value;
      if (name) {
        await DataManager.createFolder(name, kbId);
        this.close();
      }
    };
  }
};

// --- 3. 側邊欄 UI 注入與渲染 ---
async function renderGnestUI() {
  // 尋找側邊欄的清單容器
  const sidebar = document.querySelector('nav') || document.querySelector('aside');
  if (!sidebar) return;

  // 避免重複注入
  let gnestContainer = document.getElementById('gnest-main-container');
  if (!gnestContainer) {
    gnestContainer = document.createElement('div');
    gnestContainer.id = 'gnest-main-container';
    gnestContainer.style.cssText = "margin-top: 15px; border-top: 1px solid #444746; padding-top: 10px;";
    
    // 試著找到 "我的內容" 的節點，插在它後面
    const allText = document.evaluate("//span[contains(text(), '我的內容')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (allText) {
        // 找到包含「我的內容」的最外層按鈕容器
        const myContentBtn = allText.closest('div[role="listitem"]') || allText.closest('li') || allText.closest('a');
        if (myContentBtn && myContentBtn.parentNode) {
            myContentBtn.parentNode.insertBefore(gnestContainer, myContentBtn.nextSibling);
        } else {
            sidebar.appendChild(gnestContainer);
        }
    } else {
        sidebar.appendChild(gnestContainer); // 找不到就塞在最下面
    }
  }

  // 渲染功能選單與資料夾列表
  const { folders, kbs } = await DataManager.getCoreData();
  
  // 原生風格的 Hover Item 函數
  const createNavItem = (icon, text, onClick) => {
    const el = document.createElement('div');
    el.style.cssText = "display: flex; align-items: center; padding: 10px 16px; cursor: pointer; color: #e3e3e3; font-size: 13px; border-radius: 0 20px 20px 0; margin-right: 8px; transition: background 0.2s;";
    el.onmouseover = () => el.style.background = '#333537';
    el.onmouseout = () => el.style.background = 'transparent';
    el.onclick = onClick;
    el.innerHTML = `<span style="margin-right: 12px; font-size: 16px;">${icon}</span><span>${text}</span>`;
    return el;
  };

  gnestContainer.innerHTML = ''; // 清空重繪

  // 加入兩個核心按鈕
  gnestContainer.appendChild(createNavItem('📁+', '新增對話資料夾', () => ModalUI.openFolderModal()));
  gnestContainer.appendChild(createNavItem('📚+', '新增知識庫', () => ModalUI.openKBModal()));

  // 標題
  const title = document.createElement('div');
  title.style.cssText = "padding: 15px 16px 5px 16px; font-size: 12px; color: #9aa0a6; font-weight: bold;";
  title.innerText = "我的專案資料夾";
  gnestContainer.appendChild(title);

  // 渲染每個資料夾
  folders.forEach(folder => {
    // 尋找配對的 KB 名稱
    const pairedKB = kbs.find(k => k.id === folder.kbId);
    const kbTag = pairedKB ? `<span style="font-size: 10px; color: #8ab4f8; margin-left: 6px;">[${pairedKB.name}]</span>` : '';

    const folderEl = document.createElement('details');
    folderEl.style.cssText = "color: #e3e3e3; margin-left: 8px;";
    folderEl.innerHTML = `<summary style="padding: 8px; cursor: pointer; font-size: 13px;">📁 ${folder.name} (${folder.chats.length}) ${kbTag}</summary>`;
    
    const list = document.createElement('ul');
    list.style.cssText = "list-style: none; padding-left: 20px; margin: 0;";

    folder.chats.forEach(chat => {
      const li = document.createElement('li');
      li.style.padding = "4px 0";
      li.innerHTML = `<a href="/app/chat/${chat.id}" style="color: #9aa0a6; text-decoration: none; font-size: 12px;">📄 ${chat.title}</a>`;
      
      // 點擊過濾功能！
      li.onclick = () => {
         setTimeout(() => {
            const folderChatIds = folder.chats.map(c => c.id);
            document.querySelectorAll('a[href*="/app/chat/"]').forEach(link => {
              const linkId = link.getAttribute('href').split('/chat/')[1];
              const box = link.closest('div[role="listitem"]') || link;
              box.style.display = folderChatIds.includes(linkId) ? 'block' : 'none';
            });
         }, 500);
      };
      list.appendChild(li);
    });

    // 存入當前對話的按鈕 (放在資料夾展開的底部)
    const saveBtn = document.createElement('button');
    saveBtn.innerText = "+ 將當前對話存入此資料夾";
    saveBtn.style.cssText = "background: transparent; border: 1px dashed #555; color: #8ab4f8; border-radius: 4px; padding: 4px 8px; font-size: 11px; margin-top: 5px; cursor: pointer; width: 90%;";
    saveBtn.onclick = async () => {
      const chatId = window.location.href.split('/chat/')[1];
      const chatTitle = document.title.replace(' - Gemini', '').trim();
      if (!chatId) return alert("請先打開一則對話！");
      await DataManager.saveChatToFolder(folder.id, chatId, chatTitle);
      alert(`已存入 ${folder.name}`);
    };
    list.appendChild(saveBtn);

    folderEl.appendChild(list);
    gnestContainer.appendChild(folderEl);
  });
}

// 修正 ModalUI 參考 (讓上面的 createNavItem 讀得到)
const ModalUI = ModalManager;

// --- 4. 監控與啟動 ---
const observer = new MutationObserver(() => {
  renderGnestUI();
});
observer.observe(document.body, { childList: true, subtree: true });