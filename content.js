console.log("🚀 G-Nest 終極裝甲版啟動中...");

// --- 1. 資料層 (Sync Storage) ---
const DataManager = {
  async getCoreData() {
    const data = await chrome.storage.sync.get(['gnest_folders', 'gnest_kbs']);
    return {
      folders: data.gnest_folders || [], // 結構: {id, name, chats:[], kbId}
      kbs: data.gnest_kbs || []          // 結構: {id, name, summary}
    };
  },
  async createFolder(name, kbId) {
    const { folders } = await this.getCoreData();
    folders.push({ id: 'f_' + Date.now(), name, chats: [], kbId: kbId || null });
    await chrome.storage.sync.set({ gnest_folders: folders });
    UIController.refresh(); // 重繪 UI
  },
  async createKB(name, summary) {
    const { kbs } = await this.getCoreData();
    kbs.push({ id: 'kb_' + Date.now(), name, summary });
    await chrome.storage.sync.set({ gnest_kbs: kbs });
    UIController.refresh();
  },
  async saveChatToFolder(folderId) {
    const chatId = window.location.href.split('/chat/')[1];
    if (!chatId) return alert('請先打開一則對話！');
    
    const chatTitle = document.title.replace(' - Gemini', '').trim();
    const { folders } = await this.getCoreData();
    const folder = folders.find(f => f.id === folderId);
    
    if (folder && !folder.chats.some(c => c.id === chatId)) {
      folder.chats.push({ id: chatId, title: chatTitle });
      await chrome.storage.sync.set({ gnest_folders: folders });
      alert(`✅ 已將「${chatTitle}」存入 ${folder.name}`);
      UIController.refresh();
    } else {
      alert('⚠️ 此對話已經在資料夾中了！');
    }
  }
};

// --- 2. 彈出視窗系統 (Modal) ---
const ModalManager = {
  close() {
    const el = document.getElementById('gnest-modal-overlay');
    if (el) el.remove();
  },
  // 建立基礎視窗
  createBase(titleHTML, bodyHTML, onSave) {
    this.close();
    const overlay = document.createElement('div');
    overlay.id = 'gnest-modal-overlay';
    // 讓背景變暗且模糊
    overlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 99999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(2px);";
    
    const box = document.createElement('div');
    box.style.cssText = "background: #1e1e1e; border: 1px solid #444746; border-radius: 12px; padding: 24px; width: 350px; color: #e3e3e3; font-family: 'Google Sans', sans-serif; box-shadow: 0 10px 25px rgba(0,0,0,0.5);";
    box.innerHTML = `<h3 style="margin-top:0; color: #e3e3e3; font-size: 16px;">${titleHTML}</h3>${bodyHTML}`;
    
    const btnBox = document.createElement('div');
    btnBox.style.cssText = "display: flex; justify-content: flex-end; margin-top: 24px;";
    
    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = "取消";
    cancelBtn.style.cssText = "padding: 8px 16px; border-radius: 6px; cursor: pointer; border: none; background: transparent; color: #8ab4f8; font-weight: 500;";
    cancelBtn.onclick = () => this.close();
    
    const saveBtn = document.createElement('button');
    saveBtn.innerText = "建立";
    saveBtn.style.cssText = "padding: 8px 16px; border-radius: 6px; cursor: pointer; border: none; background: #8ab4f8; color: #131314; font-weight: 500; margin-left: 10px;";
    saveBtn.onclick = onSave;

    btnBox.appendChild(cancelBtn);
    btnBox.appendChild(saveBtn);
    box.appendChild(btnBox);
    overlay.appendChild(box);
    
    overlay.onclick = (e) => { if (e.target === overlay) this.close(); };
    document.body.appendChild(overlay);
  },

  // 開啟「新增知識庫」視窗
  openKBModal() {
    const inputStyle = "width: 100%; padding: 10px; margin: 8px 0 16px 0; background: #333537; border: 1px solid #555; color: white; border-radius: 6px; box-sizing: border-box;";
    const body = `
      <label style="font-size: 12px; color: #9aa0a6;">知識庫名稱</label>
      <input type="text" id="kb-name" placeholder="例如: 資安事件報告" style="${inputStyle}">
      <label style="font-size: 12px; color: #9aa0a6;">描述 (選填)</label>
      <input type="text" id="kb-desc" placeholder="簡短說明..." style="${inputStyle}">
    `;
    this.createBase("📚 新增知識庫", body, async () => {
      const name = document.getElementById('kb-name').value.trim();
      const desc = document.getElementById('kb-desc').value.trim();
      if (name) {
        await DataManager.createKB(name, desc);
        this.close();
      }
    });
  },

  // 開啟「新增對話資料夾」視窗 (包含配對邏輯)
  async openFolderModal() {
    const { kbs } = await DataManager.getCoreData();
    let kbOptions = '<option value="">(無配對)</option>';
    kbs.forEach(kb => { kbOptions += `<option value="${kb.id}">${kb.name}</option>`; });
    
    const inputStyle = "width: 100%; padding: 10px; margin: 8px 0 16px 0; background: #333537; border: 1px solid #555; color: white; border-radius: 6px; box-sizing: border-box;";
    const body = `
      <label style="font-size: 12px; color: #9aa0a6;">資料夾名稱</label>
      <input type="text" id="fd-name" placeholder="例如: Go WebAuthn 專案" style="${inputStyle}">
      <label style="font-size: 12px; color: #9aa0a6;">配對知識庫 (可選)</label>
      <select id="fd-kb" style="${inputStyle}">${kbOptions}</select>
    `;
    this.createBase("📁 新增對話資料夾", body, async () => {
      const name = document.getElementById('fd-name').value.trim();
      const kbId = document.getElementById('fd-kb').value;
      if (name) {
        await DataManager.createFolder(name, kbId);
        this.close();
      }
    });
  }
};

// --- 3. 側邊欄 UI 注入與渲染 ---
const UIController = {
  async refresh() {
    // 找尋側邊欄
    const sidebar = document.querySelector('nav') || document.querySelector('aside');
    if (!sidebar) return;

    // 建立或獲取 G-Nest 容器
    let container = document.getElementById('gnest-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'gnest-container';
      container.style.cssText = "margin: 10px 0; border-top: 1px solid #444746; padding-top: 10px;";
      
      // 核心魔法：精準尋找「我的內容」並插入在它下方
      let targetNode = null;
      const elements = sidebar.querySelectorAll('span, div, a');
      for (let el of elements) {
        if (el.innerText && el.innerText.trim() === '我的內容') {
           // 找到包含該文字的最外層按鈕容器
           targetNode = el.closest('div[role="listitem"]') || el.closest('li') || el.closest('a') || el.parentElement;
           break;
        }
      }
      
      if (targetNode && targetNode.parentNode) {
        targetNode.parentNode.insertBefore(container, targetNode.nextSibling);
      } else {
        sidebar.prepend(container); // 如果找不到就放在最上面
      }
    }

    const { folders, kbs } = await DataManager.getCoreData();
    
    // 渲染骨架與兩個原生風格按鈕
    container.innerHTML = `
      <div style="padding: 10px 16px 5px 16px; font-size: 11px; color: #9aa0a6; font-weight: bold; letter-spacing: 0.8px;">G-NEST 專案</div>
      <div id="btn-add-folder" style="display: flex; align-items: center; padding: 10px 16px; cursor: pointer; color: #e3e3e3; font-size: 13px; border-radius: 0 20px 20px 0; margin-right: 8px; transition: background 0.2s;">
        <span style="margin-right: 12px; font-size: 16px;">📁</span> 新增對話資料夾
      </div>
      <div id="btn-add-kb" style="display: flex; align-items: center; padding: 10px 16px; cursor: pointer; color: #e3e3e3; font-size: 13px; border-radius: 0 20px 20px 0; margin-right: 8px; transition: background 0.2s;">
        <span style="margin-right: 12px; font-size: 16px;">📚</span> 新增知識庫
      </div>
      <div id="gnest-folder-list" style="margin-top: 5px;"></div>
    `;

    // 綁定 Hover 效果與點擊事件
    ['btn-add-folder', 'btn-add-kb'].forEach(id => {
      const btn = document.getElementById(id);
      btn.onmouseover = () => btn.style.background = '#333537';
      btn.onmouseout = () => btn.style.background = 'transparent';
    });

    document.getElementById('btn-add-folder').onclick = () => ModalManager.openFolderModal();
    document.getElementById('btn-add-kb').onclick = () => ModalManager.openKBModal();

    // 渲染資料夾列表
    const folderListEl = document.getElementById('gnest-folder-list');
    folders.forEach(folder => {
      // 標示配對的知識庫
      const kb = kbs.find(k => k.id === folder.kbId);
      const kbTag = kb ? `<span style="font-size: 10px; color: #8ab4f8; margin-left: 6px; background: rgba(138, 180, 248, 0.1); padding: 2px 6px; border-radius: 4px;">[${kb.name}]</span>` : '';
      
      const details = document.createElement('details');
      details.style.cssText = "color: #e3e3e3; margin-left: 8px; padding-bottom: 5px;";
      details.innerHTML = `<summary style="padding: 8px; cursor: pointer; font-size: 13px; list-style: none; display: flex; align-items: center;">
        <span style="margin-right: 8px;">📁</span> ${folder.name} (${folder.chats.length}) ${kbTag}
      </summary>`;
      
      const ul = document.createElement('ul');
      ul.style.cssText = "list-style: none; padding-left: 30px; margin: 0; font-size: 12px;";
      
      // 渲染資料夾內的對話
      folder.chats.forEach(chat => {
        const li = document.createElement('li');
        li.style.cssText = "padding: 6px 0; cursor: pointer; color: #9aa0a6; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;";
        li.innerHTML = `📄 ${chat.title}`;
        li.onmouseover = () => li.style.color = '#e3e3e3';
        li.onmouseout = () => li.style.color = '#9aa0a6';
        
        // 點擊對話邏輯
        li.onclick = () => {
          if (window.location.href.indexOf(chat.id) === -1) {
            window.location.href = `/app/chat/${chat.id}`;
          }
          // 過濾側邊欄其他對話
          setTimeout(() => {
            const folderChatIds = folder.chats.map(c => c.id);
            document.querySelectorAll('a[href*="/app/chat/"]').forEach(link => {
              const linkId = link.getAttribute('href').split('/chat/')[1];
              const box = link.closest('div[role="listitem"]') || link;
              box.style.display = folderChatIds.includes(linkId) ? 'block' : 'none';
            });
          }, 800);
        };
        ul.appendChild(li);
      });

      // 「存入當前對話」按鈕 (放在每個資料夾底部)
      const saveBtn = document.createElement('button');
      saveBtn.innerText = "+ 將當前對話存入";
      saveBtn.style.cssText = "background: transparent; border: 1px dashed #555; color: #8ab4f8; border-radius: 4px; padding: 4px 8px; font-size: 11px; margin-top: 5px; cursor: pointer; width: 90%;";
      saveBtn.onmouseover = () => saveBtn.style.background = 'rgba(255,255,255,0.05)';
      saveBtn.onmouseout = () => saveBtn.style.background = 'transparent';
      saveBtn.onclick = () => DataManager.saveChatToFolder(folder.id);
      
      ul.appendChild(saveBtn);
      details.appendChild(ul);
      folderListEl.appendChild(details);
    });
  }
};

// --- 4. 裝甲級保證掛載 (取代會卡死的 MutationObserver) ---
// 每 1.5 秒檢查一次 UI 是否還在，如果被 Google 網頁切換洗掉，就自動補回來
setInterval(() => {
  if (!document.getElementById('gnest-container')) {
    UIController.refresh();
  }
}, 1500);