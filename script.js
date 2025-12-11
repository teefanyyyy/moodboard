const TITLE_IMAGE_SRC = "./assets/title.png";
        
const CUSTOM_MOODS = [
    { name: "hapi", src: "./assets/hapi.png" },
    { name: "hapi with ethan", src: "./assets/hapi with ethan.png" },
    { name: "sad", src: "./assets/sad.png" },
    { name: "tampo", src: "./assets/tampo.png" },
    { name: "angy", src: "./assets/angy.png" },
    { name: "meh", src: "./assets/meh.png" },
    { name: "yap", src: "./assets/yap.png" }
];

/* --- DEFAULT PRESETS --- */
const DEFAULT_TAPES = [
    { id: 'tape1', src: '' }
];
const DEFAULT_PAPERS = [
    { id: 'white', bg: '#fff' },
    { id: 'yellow', bg: '#fff9c4' },
    { id: 'blue', bg: '#e1f5fe' },
    { id: 'pink', bg: '#f8bbd0' },
    { id: 'grid', bg: 'url("https://www.transparenttextures.com/patterns/graphy.png") #fff' }
];
// Defined here with CSS properties so buttons look like the backgrounds
const DEFAULT_BGS = [
    { id: 'cork', type: 'cork', name: 'Cork', style: "background-image: url('https://www.transparenttextures.com/patterns/cork-board.png'); background-color: #bcaaa4;" },
    { id: 'grid', type: 'grid', name: 'Grid', style: "background-color: #fdfdfd; background-image: linear-gradient(#ddd 1px, transparent 1px), linear-gradient(90deg, #ddd 1px, transparent 1px); background-size: 20px 20px;" },
    { id: 'pink', type: 'pink', name: 'Pink', style: "background-color: #f8bbd0; background-image: radial-gradient(#f48fb1 2px, transparent 2px); background-size: 20px 20px;" },
    { id: 'clouds', type: 'clouds', name: 'Clouds', style: "background-color: #e3f2fd; background-image: radial-gradient(white 20%, transparent 20%), radial-gradient(white 20%, transparent 20%); background-position: 0 0, 50px 50px; background-size: 100px 100px;" }
];
const CUSTOM_FONTS = ['Gaegu', 'Indie Flower', 'Patrick Hand', 'Permanent Marker', 'Shadows Into Light'];

const firebaseConfig = {
  apiKey: "AIzaSyCOqqMp096MQh19FEEYpdwDzhx-R9VlRrw",
  authDomain: "moodboard-e7832.firebaseapp.com",
  projectId: "moodboard-e7832",
  storageBucket: "moodboard-e7832.firebasestorage.app",
  messagingSenderId: "173097557380",
  appId: "1:173097557380:web:7a188a47ed996e7fa091d1"
};

/* --- VARS --- */
let db=null; let useFirebase=false; 
let items=[]; let goals={}; let boardBgs={}; let pinterestBoards=[];
let userTapes=[]; let userPapers=[]; let userBackgrounds=[];

let pickedColor={h:0,s:100,v:0,r:0,g:0,b:0,hex:"#000000"}; 
let editingItemId=null; let currentActiveWeek=''; let currentEditorImage=null; let confirmCallback=null;
let selectedMoodSrc = null;
let activeWeeks = []; 
let isLocked = true;
let currentMode = 'weeks'; 
let activeBoardId = null;

// Editor State
let currentTape = null; let currentPaper = null; let currentFont = 'Gaegu'; let currentFontColor = '#444';

window.onload = function() {
    document.getElementById('mainTitleImage').src = TITLE_IMAGE_SRC;
    initMoodSelector();
    initWeeks(); 
    updateLockUI();
    
    if(firebaseConfig.apiKey){
        firebase.initializeApp(firebaseConfig);
        db=firebase.firestore();
        useFirebase=true;
        loadFromFirebase();
    } else {
        loadFromLocal();
    }
    
    initColorPicker(); 
    document.getElementById('drawSize').addEventListener('input',(e)=>document.getElementById('sizeVal').innerText=e.target.value);
};

function toggleLockMode() { isLocked = !isLocked; updateLockUI(); }
function updateLockUI() { const body = document.body; const btn = document.getElementById('lockBtn'); if(isLocked) { body.classList.add('is-locked'); btn.classList.add('locked'); btn.classList.remove('unlocked'); btn.innerText = "🔒"; document.querySelectorAll('.draggable-item').forEach(el=>el.classList.remove('selected')); } else { body.classList.remove('is-locked'); btn.classList.remove('locked'); btn.classList.add('unlocked'); btn.innerText = "🔓"; } }

function showWeeks() {
    currentMode = 'weeks'; activeBoardId = null;
    document.getElementById('weeks-container').style.display = 'block';
    document.getElementById('pinterest-container').style.display = 'none';
    toggleNav();
    renderAllItems(); 
}

function showPinterestBoard(boardId) {
    currentMode = 'pinterest'; activeBoardId = boardId;
    const board = pinterestBoards.find(b => b.id === boardId);
    document.getElementById('board-name-display').innerText = board ? board.name : "My Board";
    
    document.getElementById('weeks-container').style.display = 'none';
    document.getElementById('pinterest-container').style.display = 'block';
    renderActivePinterestBoard();
    if(boardBgs[boardId]) applyBgToContainer(document.getElementById('active-board-container'), boardBgs[boardId]);
    else applyBgToContainer(document.getElementById('active-board-container'), {type:'cork'});
    
    // Auto close nav on click - handled in list logic
}

function createNewBoard() { const name = prompt("Enter a name for your new Pinboard:"); if(name) { const newBoard = { id: 'pin-' + Date.now(), name: name }; if(!pinterestBoards) pinterestBoards = []; pinterestBoards.push(newBoard); saveData('boards'); renderBoardsList(); showPinterestBoard(newBoard.id); } }

function renderBoardsList() { 
    const list = document.getElementById('sidebar-boards-list'); list.innerHTML = ''; 
    if(pinterestBoards) { 
        pinterestBoards.forEach(board => { 
            const a = document.createElement('a'); 
            a.innerText = "📌 " + board.name; 
            a.onclick = () => { 
                document.getElementById("mySidebar").style.width = "0";
                showPinterestBoard(board.id); 
            }; 
            list.appendChild(a); 
        }); 
    } 
}

function renameCurrentBoard() {
    if(!activeBoardId) return;
    const board = pinterestBoards.find(b => b.id === activeBoardId);
    if(board) {
        const newName = prompt("Rename Board:", board.name);
        if(newName) {
            board.name = newName;
            saveData('boards');
            document.getElementById('board-name-display').innerText = newName;
            renderBoardsList();
        }
    }
}

function exportBoardAsPNG() { document.body.classList.add('is-locked'); const boardElement = document.getElementById('active-board-container'); html2canvas(boardElement, { useCORS: true, scale: 2 }).then(canvas => { const link = document.createElement('a'); link.download = document.getElementById('board-name-display').innerText + '.png'; link.href = canvas.toDataURL(); link.click(); if(!isLocked) document.body.classList.remove('is-locked'); }); }
function openSettingsModal() { document.getElementById('settingsModal').style.display = 'flex'; document.getElementById('overlay').style.display = 'block'; toggleNav(); }
function askHardReset() { const code = prompt("To delete EVERYTHING, type the word 'DELETE' below:"); if (code === "DELETE") { localStorage.clear(); location.reload(); } else if (code !== null) { alert("Incorrect code. Nothing was deleted."); } }

/* --- DATA HANDLING --- */
function loadFromLocal(){ 
    try {
        if(localStorage.getItem('moodboard_items_final')) items=JSON.parse(localStorage.getItem('moodboard_items_final')); 
        if(localStorage.getItem('moodboard_goals_final')) goals=JSON.parse(localStorage.getItem('moodboard_goals_final')); 
        if(localStorage.getItem('moodboard_bgs_final')) boardBgs=JSON.parse(localStorage.getItem('moodboard_bgs_final')); 
        if(localStorage.getItem('moodboard_pinboards')) pinterestBoards=JSON.parse(localStorage.getItem('moodboard_pinboards')); 
        if(localStorage.getItem('moodboard_assets')) { 
            const assets = JSON.parse(localStorage.getItem('moodboard_assets')); 
            userTapes=assets.tapes||[]; userPapers=assets.papers||[]; userBackgrounds=assets.backgrounds||[];
        } 
    } catch(e) { console.error("Error loading local data", e); }
    renderApp(); 
}
function loadFromFirebase(){ 
    db.collection("items").onSnapshot((s)=>{items=s.docs.map(d=>d.data());renderAllItems();}); 
    db.collection("data").doc("goals").onSnapshot((d)=>{if(d.exists){goals=d.data();renderGoals();}}); 
    db.collection("data").doc("bgs").onSnapshot((d)=>{if(d.exists){boardBgs=d.data();applyAllBoardBgs();}}); 
    db.collection("data").doc("boards").onSnapshot((d)=>{if(d.exists){pinterestBoards=d.data().list || []; renderBoardsList();}}); 
    db.collection("data").doc("assets").onSnapshot((d)=>{if(d.exists){
        const dta = d.data();
        userTapes=dta.tapes||[]; userPapers=dta.papers||[]; userBackgrounds=dta.backgrounds||[];
        renderEditorAssets(); 
    }}); 
}
function saveData(t){ 
    const assetData = {tapes:userTapes, papers:userPapers, backgrounds:userBackgrounds};
    if(!useFirebase){ 
        if(t==='items')localStorage.setItem('moodboard_items_final',JSON.stringify(items)); 
        if(t==='goals')localStorage.setItem('moodboard_goals_final',JSON.stringify(goals)); 
        if(t==='bgs')localStorage.setItem('moodboard_bgs_final',JSON.stringify(boardBgs)); 
        if(t==='boards')localStorage.setItem('moodboard_pinboards',JSON.stringify(pinterestBoards)); 
        if(t==='assets')localStorage.setItem('moodboard_assets', JSON.stringify(assetData)); 
        return; 
    } 
    if(t==='goals')db.collection("data").doc("goals").set(goals); 
    if(t==='bgs')db.collection("data").doc("bgs").set(boardBgs); 
    if(t==='boards')db.collection("data").doc("boards").set({list: pinterestBoards}); 
    if(t==='assets')db.collection("data").doc("assets").set(assetData); 
}
function renderApp(){ renderAllItems(); renderGoals(); applyAllBoardBgs(); renderBoardsList(); renderEditorAssets(); }

/* --- EDITOR & CUSTOMIZATION LOGIC --- */
function initMoodSelector(){ const container = document.getElementById('moodGrid'); container.innerHTML = ''; CUSTOM_MOODS.forEach(opt => { const wrapper = document.createElement('div'); wrapper.className = 'mood-option-container'; wrapper.onclick = () => selectMood(opt.src, wrapper.querySelector('img')); const img = document.createElement('img'); img.src = opt.src; img.title = opt.name; img.className = 'mood-btn'; const span = document.createElement('span'); span.className = 'mood-label-small'; span.innerText = opt.name; wrapper.appendChild(img); wrapper.appendChild(span); container.appendChild(wrapper); }); }
function selectMood(src, imgElement) { selectedMoodSrc = src; document.querySelectorAll('.mood-btn').forEach(el => el.classList.remove('selected')); imgElement.classList.add('selected'); }

function openNoteEditor(weekIdOrItem) {
    if(isLocked) return;
    const modal = document.getElementById('noteEditorModal');
    currentEditorImage = null; selectedMoodSrc = null; 
    currentTape = null; currentPaper = null; currentFont = 'Gaegu'; currentFontColor = '#444';
    document.getElementById('editorImgPreview').style.display = 'none'; 
    document.getElementById('photoLabel').style.display = 'block'; 
    document.getElementById('editorFileInput').value = '';
    document.querySelectorAll('.mood-btn').forEach(el => el.classList.remove('selected'));
    renderEditorAssets();

    if (typeof weekIdOrItem === 'string') { 
        currentActiveWeek = weekIdOrItem; editingItemId = null; 
        document.getElementById('editorText').value = ""; 
    } else { 
        const item = weekIdOrItem; editingItemId = item.id; currentActiveWeek = item.weekId; 
        document.getElementById('editorText').value = item.text || ""; 
        if(item.moodImg) { selectedMoodSrc = item.moodImg; const match = Array.from(document.querySelectorAll('.mood-btn')).find(img => img.src === item.moodImg); if(match) match.classList.add('selected'); }
        if(item.imgUrl) { currentEditorImage = item.imgUrl; document.getElementById('editorImgPreview').src = item.imgUrl; document.getElementById('editorImgPreview').style.display = 'block'; document.getElementById('photoLabel').style.display = 'none'; } 
        if(item.tapeUrl) currentTape = item.tapeUrl;
        if(item.paperUrl) currentPaper = item.paperUrl;
        if(item.fontFamily) currentFont = item.fontFamily;
        if(item.fontColor) currentFontColor = item.fontColor;
    }
    applyEditorPreviewStyles();
    modal.style.display = 'flex'; document.getElementById('overlay').style.display = 'block'; document.getElementById('editorText').focus();
}

function setEditorTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="setEditorTab('${tab}')"]`).classList.add('active');
    document.getElementById('tab-tape').style.display = tab === 'tape' ? 'flex' : 'none';
    document.getElementById('tab-paper').style.display = tab === 'paper' ? 'flex' : 'none';
    document.getElementById('tab-font').style.display = tab === 'font' ? 'flex' : 'none';
}

function renderEditorAssets() {
    // Tapes
    const tapeDiv = document.getElementById('tab-tape');
    const uploadTape = tapeDiv.firstElementChild; const uploadBtnTape = tapeDiv.children[1];
    tapeDiv.innerHTML = ''; tapeDiv.appendChild(uploadTape); tapeDiv.appendChild(uploadBtnTape);
    [...DEFAULT_TAPES, ...userTapes].forEach(t => {
        const d = document.createElement('div'); d.className = 'style-opt';
        if(t.src) d.style.backgroundImage = `url('${t.src}')`; else d.style.backgroundColor = 'rgba(100, 221, 231, 0.6)';
        d.onclick = () => { currentTape = t.src; applyEditorPreviewStyles(); };
        tapeDiv.appendChild(d);
    });
    // Papers
    const paperDiv = document.getElementById('tab-paper');
    const uploadPaper = paperDiv.firstElementChild; const uploadBtnPaper = paperDiv.children[1];
    paperDiv.innerHTML = ''; paperDiv.appendChild(uploadPaper); paperDiv.appendChild(uploadBtnPaper);
    [...DEFAULT_PAPERS, ...userPapers].forEach(p => {
        const d = document.createElement('div'); d.className = 'style-opt';
        if(p.bg.includes('url')) d.style.background = p.bg; else d.style.backgroundColor = p.bg;
        d.onclick = () => { currentPaper = p.bg; applyEditorPreviewStyles(); };
        paperDiv.appendChild(d);
    });
    // Fonts
    const fontDiv = document.getElementById('tab-font');
    fontDiv.innerHTML = `<input type="color" id="fontColorPicker" value="${currentFontColor}" onchange="applyFontColor(this.value)" style="width:100%; height:30px; border:none; cursor:pointer;">`;
    CUSTOM_FONTS.forEach(f => {
        const d = document.createElement('div'); d.innerText = "Aa"; d.className = 'style-opt';
        d.style.fontFamily = f; d.style.display = 'flex'; d.style.justifyContent = 'center'; d.style.alignItems = 'center';
        d.onclick = () => { currentFont = f; applyEditorPreviewStyles(); };
        fontDiv.appendChild(d);
    });
}

function handleAssetUpload(input, type) {
    if(input.files && input.files[0]) {
        const r = new FileReader();
        r.onload = (e) => {
            const obj = { id: Date.now(), [type==='tape'?'src':'bg']: e.target.result };
            if(type==='tape') userTapes.push(obj); else userPapers.push(obj);
            saveData('assets');
            renderEditorAssets();
        };
        r.readAsDataURL(input.files[0]);
    }
}

function applyFontColor(c) { currentFontColor = c; applyEditorPreviewStyles(); }

function applyEditorPreviewStyles() {
    const editor = document.getElementById('noteEditorPreview');
    const tape = document.getElementById('editorTapePreview');
    const text = document.getElementById('editorText');
    if(currentPaper) { if(currentPaper.includes('url')) editor.style.background = currentPaper; else { editor.style.background = ''; editor.style.backgroundColor = currentPaper; } } else { editor.style.background = '#fff'; }
    if(currentTape) { tape.style.backgroundColor = 'transparent'; tape.style.backgroundImage = `url('${currentTape}')`; } else { tape.style.backgroundImage = ''; tape.style.backgroundColor = 'rgba(100, 221, 231, 0.6)'; }
    text.style.fontFamily = currentFont; text.style.color = currentFontColor;
}

function saveFromEditor(type) {
    const text = document.getElementById('editorText').value; const hasBorder = document.getElementById('stickerBorderCheck').checked;
    let moodName = "Unknown"; const moodObj = CUSTOM_MOODS.find(m => m.src === selectedMoodSrc); if(moodObj) moodName = moodObj.name;
    const baseW = type === 'note' ? 220 : 200; const baseH = type === 'note' ? 260 : 200;
    const newItem = { id: editingItemId || Date.now(), type, text, moodName: selectedMoodSrc ? moodName : null, moodImg: selectedMoodSrc, imgUrl: currentEditorImage, weekId: currentActiveWeek, x: 50, y: 50, w: baseW, h: baseH, rot: 0, zIndex: 1, hasBorder: hasBorder, tapeUrl: currentTape, paperUrl: currentPaper, fontFamily: currentFont, fontColor: currentFontColor };
    if (editingItemId) { const existing = items.find(i => i.id === editingItemId); if(existing) { newItem.x = existing.x; newItem.y = existing.y; newItem.w = existing.w; newItem.h = existing.h; newItem.rot = existing.rot; newItem.zIndex = existing.zIndex || 1; const idx = items.indexOf(existing); items[idx] = newItem; } } else { items.push(newItem); }
    if(useFirebase) db.collection("items").doc(String(newItem.id)).set(newItem); else { saveData('items'); renderAllItems(); }
    closeAllModals();
}

function saveDrawing() {
    const dataURL = canvas.toDataURL();
    const item={id:Date.now(),type:'sticker',text:'',moodName:'',imgUrl:dataURL,weekId:currentActiveWeek,x:50,y:50,w:200,h:200,rot:0,zIndex:1,hasBorder:true}; 
    if(useFirebase) db.collection("items").doc(String(item.id)).set(item); else { items.push(item); saveData('items'); renderAllItems(); } 
    closeAllModals(); clearCanvas();
}

/* --- BACKGROUND MODAL LOGIC (FIXED) --- */
function openBgModal(id){ if(isLocked) return; currentActiveWeek = id; renderBgModalItems(); document.getElementById('bgModal').style.display='flex'; document.getElementById('overlay').style.display='block'; }
function renderBgModalItems() {
    const container = document.getElementById('bg-list-container'); container.innerHTML = '';
    
    // Add Upload Button
    const addBtn = document.createElement('div'); addBtn.className = 'bg-add-btn'; addBtn.innerText = '+'; addBtn.onclick = () => document.getElementById('bgAssetUpload').click(); container.appendChild(addBtn);
    
    // Defaults with visual preview
    DEFAULT_BGS.forEach(bg => { 
        const btn = document.createElement('div'); 
        btn.className = 'bg-btn'; 
        btn.innerText = bg.name; 
        // Inline styles for preview
        btn.style.cssText = bg.style;
        btn.onclick = () => setBoardBg(bg.type); 
        container.appendChild(btn); 
    });
    
    // User Uploads (Safety check)
    if(Array.isArray(userBackgrounds)) {
        userBackgrounds.forEach(bg => { const btn = document.createElement('div'); btn.className = 'bg-preview-btn'; btn.style.backgroundImage = `url('${bg.src}')`; btn.onclick = () => setBoardBg('custom', bg.src); container.appendChild(btn); });
    }
}
function handleBgAssetUpload(input) {
    if(input.files && input.files[0]) {
        const r = new FileReader();
        r.onload = (e) => {
            userBackgrounds.push({ id: Date.now(), src: e.target.result });
            saveData('assets');
            renderBgModalItems();
        };
        r.readAsDataURL(input.files[0]);
    }
}
function setBoardBg(t, u=null){ if(u) boardBgs[currentActiveWeek]={type:'custom',url:u}; else boardBgs[currentActiveWeek]={type:t,url:null}; const containerId = currentActiveWeek.startsWith('pin-') ? 'active-board-container' : currentActiveWeek+"-container"; applyBgToContainer(document.getElementById(containerId), boardBgs[currentActiveWeek]); saveData('bgs'); closeAllModals(); }

/* --- DOM CREATION --- */
function createDOMItem(item) {
    let containerId;
    if(item.weekId.startsWith('pin-')) { if(currentMode !== 'pinterest' || item.weekId !== activeBoardId) return; containerId = 'active-board-inner'; } else { if(currentMode !== 'weeks') return; containerId = 'board-' + item.weekId; }
    const board = document.getElementById(containerId); if(!board) return;
    const div = document.createElement('div'); div.classList.add('draggable-item');
    div.style.left = item.x + 'px'; div.style.top = item.y + 'px'; div.style.width = item.w + 'px'; div.style.height = item.h + 'px';
    div.style.transform = `rotate(${item.rot}deg)`;
    
    // APPLY SAVED Z-INDEX (Default to 1)
    div.style.zIndex = item.zIndex || 1;

    const baseW = item.type === 'note' ? 220 : 200; const baseH = item.type === 'note' ? 260 : 200;
    const scaleX = item.w / baseW || 1; const scaleY = item.h / baseH || 1;
    
    // ADDED LAYER UP/DOWN HANDLES
    let handles = `
        <div class="control-handle resize-handle">↘</div>
        <div class="control-handle delete-handle">✖</div>
        <div class="control-handle edit-handle">✎</div>
        <div class="control-handle rotate-handle"></div>
        <div class="control-handle layer-up-handle" title="Layer Up">▲</div>
        <div class="control-handle layer-down-handle" title="Layer Down">▼</div>
    `;
    
    let innerContent = '';
    if(item.type === 'note') {
        let moodContent = ''; if(item.moodImg && item.moodName) moodContent = `<div class="mood-tag"><img src="${item.moodImg}"><span>${item.moodName}</span></div>`;
        let paperStyle = ''; if(item.paperUrl) { if(item.paperUrl.includes('url')) paperStyle = `background: ${item.paperUrl};`; else paperStyle = `background-color: ${item.paperUrl};`; }
        let tapeStyle = ''; if(item.tapeUrl) tapeStyle = `background-image: url('${item.tapeUrl}'); background-color: transparent;`;
        let fontStyle = `font-family: '${item.fontFamily || 'Gaegu'}', cursive; color: ${item.fontColor || '#444'};`;
        innerContent = `<div class="note-paper" style="${paperStyle} ${fontStyle}"><div class="tape" style="${tapeStyle}"></div><div class="note-text-area">${item.text}</div><div class="note-footer"><div class="note-mood-display">${moodContent}</div>${item.imgUrl?`<div class="note-polaroid"><img src="${item.imgUrl}"></div>`:''}</div></div>`;
    } else {
        const borderClass = item.hasBorder ? 'sticker-border' : ''; if(item.imgUrl) innerContent = `<div class="${borderClass}"><img src="${item.imgUrl}" class="sticker-img" style="width:100%; height:100%; object-fit:contain;"></div>`;
    }
    const scaledWrapper = `<div class="scalable-content" style="width:${baseW}px; height:${baseH}px; transform: scale(${scaleX}, ${scaleY});">${innerContent}</div>`;
    div.innerHTML = handles + scaledWrapper;
    setupItemEvents(div, item, baseW, baseH);
    board.appendChild(div);
}

function setupItemEvents(div, item, baseW, baseH) {
    const scalable = div.querySelector('.scalable-content');
    const resizer = div.querySelector('.resize-handle');
    const rotater = div.querySelector('.rotate-handle');
    
    // EVENTS FOR NEW LAYER BUTTONS
    div.querySelector('.layer-up-handle').addEventListener('click', (e) => { 
        e.stopPropagation(); 
        let newZ = (item.zIndex || 1) + 1;
        // CAP Z-INDEX TO 10,000 to avoid issues
        if(newZ > 10000) newZ = 10000;
        
        item.zIndex = newZ;
        div.style.zIndex = item.zIndex;
        if(useFirebase) db.collection("items").doc(String(item.id)).update({zIndex: item.zIndex});
        else saveData('items');
    });
    
    div.querySelector('.layer-down-handle').addEventListener('click', (e) => { 
        e.stopPropagation(); 
        let newZ = (item.zIndex || 1) - 1;
        if(newZ < 1) newZ = 1;
        item.zIndex = newZ;
        div.style.zIndex = item.zIndex;
        if(useFirebase) db.collection("items").doc(String(item.id)).update({zIndex: item.zIndex});
        else saveData('items');
    });

    // Touch support for layer buttons to prevent selecting board
    div.querySelector('.layer-up-handle').addEventListener('touchstart', (e) => { e.stopPropagation(); }, {passive:true});
    div.querySelector('.layer-down-handle').addEventListener('touchstart', (e) => { e.stopPropagation(); }, {passive:true});

    function handleStart(e, action) {
        if(isLocked) return;
        e.preventDefault(); e.stopPropagation();
        const startX = (e.touches ? e.touches[0].clientX : e.clientX);
        const startY = (e.touches ? e.touches[0].clientY : e.clientY);
        const startW = div.offsetWidth; const startH = div.offsetHeight;
        const rect = div.getBoundingClientRect(); const centerX = rect.left + rect.width/2; const centerY = rect.top + rect.height/2;
        const startAngle = Math.atan2(startY - centerY, startX - centerX) * 180 / Math.PI; const initialRot = item.rot || 0;

        const move = (ev) => {
            ev.preventDefault();
            const cx = (ev.touches ? ev.touches[0].clientX : ev.clientX);
            const cy = (ev.touches ? ev.touches[0].clientY : ev.clientY);

            if(action === 'resize') {
                const newW = Math.max(50, startW + (cx - startX));
                const newH = Math.max(50, startH + (cy - startY));
                div.style.width = newW + 'px'; div.style.height = newH + 'px';
                const sX = newW / baseW; const sY = newH / baseH;
                if(scalable) scalable.style.transform = `scale(${sX}, ${sY})`;
            } else if (action === 'rotate') {
                const curAngle = Math.atan2(cy - centerY, cx - centerX) * 180 / Math.PI;
                const newRot = initialRot + (curAngle - startAngle);
                div.style.transform = `rotate(${newRot}deg)`;
                item.rot = newRot;
            }
        };
        const end = () => {
            document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', end);
            document.removeEventListener('touchmove', move); document.removeEventListener('touchend', end);
            item.w = parseInt(div.style.width); item.h = parseInt(div.style.height);
            if(useFirebase) db.collection("items").doc(String(item.id)).set(item); else saveData('items');
        };
        if(e.touches) { document.addEventListener('touchmove', move, {passive:false}); document.addEventListener('touchend', end); }
        else { document.addEventListener('mousemove', move); document.addEventListener('mouseup', end); }
    }

    resizer.addEventListener('mousedown', (e) => handleStart(e, 'resize'));
    resizer.addEventListener('touchstart', (e) => handleStart(e, 'resize'), {passive:false});
    rotater.addEventListener('mousedown', (e) => handleStart(e, 'rotate'));
    rotater.addEventListener('touchstart', (e) => handleStart(e, 'rotate'), {passive:false});

    div.querySelector('.delete-handle').addEventListener('click', (e) => { e.stopPropagation(); deleteItem(item.id); });
    div.querySelector('.delete-handle').addEventListener('touchstart', (e) => { e.stopPropagation(); deleteItem(item.id); });
    if(item.type === 'note') {
        div.querySelector('.edit-handle').addEventListener('click', (e) => { e.stopPropagation(); openNoteEditor(item); });
        div.querySelector('.edit-handle').addEventListener('touchstart', (e) => { e.stopPropagation(); openNoteEditor(item); });
    }

    let initialDist=0; let initialAngle=0; let initialRot=0; let startX=0; let startY=0; let initialLeft=0; let initialTop=0; let initialW=0; let initialH=0;
    function handleItemTouchStart(e) {
        if(isLocked) return;
        if(e.target.classList.contains('control-handle')) return; 
        document.querySelectorAll('.draggable-item').forEach(el=>el.classList.remove('selected'));
        div.classList.add('selected'); 
        // CSS handles the temporary "bring to very front" via .selected { z-index: 50000 !important }
        
        const touches = e.touches;
        if(touches.length === 1) { e.preventDefault(); startX = touches[0].clientX; startY = touches[0].clientY; initialLeft = parseFloat(div.style.left || 0); initialTop = parseFloat(div.style.top || 0); } 
        else if (touches.length === 2) { e.preventDefault(); const t1 = touches[0]; const t2 = touches[1]; initialDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY); initialAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180 / Math.PI; initialW = parseFloat(div.style.width); initialH = parseFloat(div.style.height); initialRot = item.rot || 0; }
    }
    function handleItemTouchMove(e) {
        if(isLocked) return;
        if(e.target.classList.contains('control-handle')) return;
        e.preventDefault();
        const touches = e.touches;
        if(touches.length === 1) { const dx = touches[0].clientX - startX; const dy = touches[0].clientY - startY; div.style.left = (initialLeft + dx) + 'px'; div.style.top = (initialTop + dy) + 'px'; } 
        else if(touches.length === 2) {
            const t1 = touches[0]; const t2 = touches[1];
            const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const scaleFactor = currentDist / initialDist;
            const newW = Math.max(50, initialW * scaleFactor); const newH = Math.max(50, initialH * scaleFactor);
            div.style.width = newW + 'px'; div.style.height = newH + 'px';
            const sX = newW / baseW; const sY = newH / baseH;
            if(scalable) scalable.style.transform = `scale(${sX}, ${sY})`;
            const currentAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180 / Math.PI;
            const newRot = initialRot + (currentAngle - initialAngle);
            div.style.transform = `rotate(${newRot}deg)`;
            item.w = newW; item.h = newH; item.rot = newRot;
        }
    }
    function handleItemTouchEnd(e) {
        if(isLocked) return;
        if(e.touches.length === 0) { item.x = parseInt(div.style.left); item.y = parseInt(div.style.top); if(useFirebase) db.collection("items").doc(String(item.id)).set(item); else saveData('items'); }
    }
    div.addEventListener('touchstart', handleItemTouchStart, {passive:false});
    div.addEventListener('touchmove', handleItemTouchMove, {passive:false});
    div.addEventListener('touchend', handleItemTouchEnd);
    div.addEventListener('mousedown', (e) => {
        if(isLocked || e.target.classList.contains('control-handle')) return;
        document.querySelectorAll('.draggable-item').forEach(el=>el.classList.remove('selected'));
        div.classList.add('selected'); 
        
        const sx=e.clientX, sy=e.clientY, sl=div.offsetLeft, st=div.offsetTop;
        const mv=(ev)=>{ div.style.left=(sl+ev.clientX-sx)+'px'; div.style.top=(st+ev.clientY-sy)+'px'; };
        const ed=()=>{ document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', ed); item.x=parseInt(div.style.left); item.y=parseInt(div.style.top); if(useFirebase) db.collection("items").doc(String(item.id)).update({x:item.x,y:item.y}); else saveData('items'); };
        document.addEventListener('mousemove', mv); document.addEventListener('mouseup', ed);
    });
}

function deleteItem(id){if(isLocked)return; showConfirm("Delete this item?",()=>{if(useFirebase)db.collection("items").doc(String(id)).delete();else{items=items.filter(i=>i.id!==id);saveData('items');renderAllItems();}});}
function renderAllItems(){document.querySelectorAll('.board-inner').forEach(b=>b.innerHTML='');items.forEach(createDOMItem);}

/* --- HELPERS --- */
function openBgModal(id){if(isLocked)return; currentActiveWeek=id;document.getElementById('bgModal').style.display='flex';document.getElementById('overlay').style.display='block'; renderBgModalItems();}
function openDrawModal(id){
    if(isLocked)return; 
    currentActiveWeek=id;
    document.getElementById('drawModalTitle').innerText="Art Studio 🎨";
    document.getElementById('drawModal').style.display='flex';
    document.getElementById('overlay').style.display='block';
    setTimeout(resizeCanvas, 50); 
}
function closeAllModals(){
    document.querySelectorAll('.modal').forEach(m=>m.style.display='none');
    document.getElementById('overlay').style.display='none';
}
function toggleColorPicker(){const cp=document.getElementById('ibisPicker');cp.style.display=cp.style.display==='none'?'flex':'none';}
function deselectAll(e){if(e.target.classList.contains('board-inner'))document.querySelectorAll('.draggable-item').forEach(el=>el.classList.remove('selected'));}

// --- GLOBAL CONFIRM FUNCTION ---
function showConfirm(msg, cb) { 
    document.getElementById('confirmMsg').innerText=msg; 
    confirmCallback=cb; 
    document.getElementById('confirmModal').style.display='flex'; 
    document.getElementById('overlay').style.display='block'; 
}
function closeConfirm(res) { 
    document.getElementById('confirmModal').style.display='none'; 
    document.getElementById('overlay').style.display='none'; 
    if(res && confirmCallback) confirmCallback(); 
    confirmCallback=null; 
}

function openStatsModal(){calculateStats();document.getElementById('statsModal').style.display='flex';document.getElementById('overlay').style.display='block';toggleNav();}
function calculateStats(){const counts={};let total=0;items.forEach(item=>{if(item.type==='note' && item.moodName){counts[item.moodName]=(counts[item.moodName]||0)+1;total++;}});const html=Object.keys(counts).map(mood=>{const pct=Math.round((counts[mood]/total)*100);return `<div class="stat-row"><div class="stat-label">${mood}</div><div class="stat-bar-container"><div class="stat-bar" style="width:${pct}%"></div></div><div class="stat-pct">${pct}%</div></div>`;}).join('');document.getElementById('statsContent').innerHTML=total>0?html:"<p style='text-align:center'>No moods recorded yet!</p>";}
function handleFileSelect(input){if(input.files&&input.files[0]){const r=new FileReader();r.onload=(e)=>{currentEditorImage=e.target.result;document.getElementById('editorImgPreview').src=currentEditorImage;document.getElementById('editorImgPreview').style.display='block';document.getElementById('photoLabel').style.display='none';};r.readAsDataURL(input.files[0]);}}
function toggleNav(){const sb=document.getElementById("mySidebar");sb.style.width=sb.style.width==="250px"?"0":"250px";}
function setBoardBg(t,u=null){if(u)boardBgs[currentActiveWeek]={type:'custom',url:u};else boardBgs[currentActiveWeek]={type:t,url:null};applyBgToContainer(document.getElementById(currentActiveWeek.startsWith('pin-') ? 'active-board-container' : currentActiveWeek+"-container"),boardBgs[currentActiveWeek]);saveData('bgs');closeAllModals();}
function handleBgUpload(i){if(i.files[0]){const r=new FileReader();r.onload=(e)=>setBoardBg('custom',e.target.result);r.readAsDataURL(i.files[0]);}}
function applyBgToContainer(c,d){if(!d || !c)return;c.classList.remove('board-bg-cork','board-bg-grid','board-bg-pink','board-bg-clouds');c.style.backgroundImage='';c.style.backgroundColor='';if(d.type==='custom'&&d.url){c.style.backgroundImage=`url('${d.url}')`;c.style.backgroundSize='cover';c.style.backgroundPosition='center';}else{c.classList.add('board-bg-'+d.type);}}
function applyAllBoardBgs(){ activeWeeks.forEach(id=>{if(boardBgs[id])applyBgToContainer(document.getElementById(id+"-container"),boardBgs[id]);}); if(activeBoardId && boardBgs[activeBoardId]) applyBgToContainer(document.getElementById('active-board-container'), boardBgs[activeBoardId]); }

/* --- WEEK INIT & GROUPING --- */
function initWeeks() { 
    const today = new Date(); 
    const currentWeekId = getWeekId(today); 
    const prevDate = new Date(today); prevDate.setDate(today.getDate() - 7); 
    const prevWeekId = getWeekId(prevDate); 
    
    if(!activeWeeks.includes(prevWeekId)) activeWeeks.push(prevWeekId); 
    if(!activeWeeks.includes(currentWeekId)) activeWeeks.push(currentWeekId); 
    activeWeeks.sort(); 
    
    const container = document.getElementById('weeks-container'); 
    container.innerHTML = ''; 
    
    // Populate the Main View (the board sections)
    activeWeeks.forEach(id => { 
        const datesLabel = getWeekLabel(id); 
        const section = document.createElement('div'); section.className = 'week-section'; section.id = id; 
        section.innerHTML = ` <div class="week-header"> <div class="week-title">${datesLabel}</div> <div class="board-actions"> <button class="action-btn btn-note" onclick="openNoteEditor('${id}')">📝 Sticky</button> <button class="action-btn btn-draw" onclick="openDrawModal('${id}')">🎨 Paint</button> <button class="action-btn btn-bg" onclick="openBgModal('${id}')">🖼️ BG</button> </div> </div> <div class="goals-strip"> <div class="goal-header"><span>Weekly Goals</span><button class="goal-add-btn" onclick="addGoal('${id}')">+ Add</button></div> <ul class="goal-list" id="goals-${id}"></ul> </div> <div class="board-container" id="${id}-container"> <div class="board-inner" id="board-${id}" onclick="deselectAll(event)"></div> </div>`; 
        container.appendChild(section); 
    });

    // Populate Sidebar with Grouping
    renderSidebarWeeks();
}

function renderSidebarWeeks() {
    const sidebarList = document.getElementById('sidebar-weeks-list');
    sidebarList.innerHTML = '';
    
    // Group by Month Year
    const groups = {};
    activeWeeks.forEach(id => {
        const dateStr = id.replace('week-', '');
        const date = new Date(dateStr);
        // Create key "December 2025"
        const key = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        if(!groups[key]) groups[key] = [];
        groups[key].push(id);
    });

    // Render Groups
    for (const [monthYear, weeks] of Object.entries(groups)) {
        const details = document.createElement('details');
        details.className = 'month-folder';
        details.open = true; // Open by default
        
        const summary = document.createElement('summary');
        summary.className = 'month-summary';
        summary.innerText = monthYear;
        
        details.appendChild(summary);
        
        weeks.forEach(id => {
            const datesLabel = getWeekLabel(id); 
            const link = document.createElement('a'); 
            link.href = "#"; 
            link.innerText = datesLabel; 
            link.onclick = () => { showWeeks(); window.location.hash = id; }; 
            details.appendChild(link);
        });
        
        sidebarList.appendChild(details);
    }
}

function getWeekId(dateObj) { const d = new Date(dateObj); const day = d.getDay(); const diff = d.getDate() - day; const sunday = new Date(d.setDate(diff)); return "week-" + sunday.toISOString().split('T')[0]; }
function getWeekLabel(weekId) { const dateStr = weekId.replace('week-', ''); const start = new Date(dateStr); const end = new Date(start); end.setDate(start.getDate() + 6); const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return `${monthNames[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`; }
function addGoal(id){ if(isLocked) return; const t = prompt("New Goal:"); if(t){ if(!goals[id]) goals[id]=[]; goals[id].push({text:t, done:false}); saveData('goals'); renderGoals(); } }
function toggleGoal(id, idx){ if(isLocked) return; const d = !goals[id][idx].done; goals[id][idx].done = d; saveData('goals'); renderGoals(); if(d) confetti({particleCount:100, spread:70, origin:{y:0.6}}); }
function deleteGoal(id, idx){ if(isLocked) return; showConfirm("Delete this goal?",()=>{ goals[id].splice(idx,1); saveData('goals'); renderGoals(); }); }
function renderGoals(){ for(const[id,list]of Object.entries(goals)){ const ul=document.getElementById('goals-'+id); if(!ul) continue; ul.innerHTML=''; list.forEach((g,i)=>{ const li=document.createElement('li'); li.innerHTML=`<input type="checkbox" ${g.done?'checked':''} onclick="toggleGoal('${id}',${i})"><span style="${g.done?'text-decoration:line-through;color:#bbb':''}" onclick="deleteGoal('${id}',${i})">${g.text}</span>`; ul.appendChild(li); }); } }

/* --- DRAW CANVAS --- */
const canvas=document.getElementById('drawCanvas');const ctx=canvas.getContext('2d');let currentBrush='pen';let isDrawing=false;
function resizeCanvas(){const container=document.querySelector('.canvas-container');canvas.width=container.clientWidth;canvas.height=container.clientHeight;}
function setBrush(type,btn){currentBrush=type;document.querySelectorAll('.brush-btn').forEach(b=>b.classList.remove('active'));if(type!=='color')btn.classList.add('active');}
function getPoint(e){const rect=canvas.getBoundingClientRect();const touch=e.touches?e.touches[0]:e;return{x:touch.clientX-rect.left,y:touch.clientY-rect.top};}
canvas.addEventListener('mousedown',startDraw);canvas.addEventListener('mousemove',draw);canvas.addEventListener('mouseup',()=>isDrawing=false);canvas.addEventListener('touchstart',startDraw,{passive:false});canvas.addEventListener('touchmove',draw,{passive:false});canvas.addEventListener('touchend',()=>isDrawing=false);
function startDraw(e){isDrawing=true;ctx.beginPath();draw(e);}
function draw(e){if(!isDrawing)return;e.preventDefault();const p=getPoint(e);const size=document.getElementById('drawSize').value;const color=pickedColor.hex;ctx.lineWidth=size;ctx.lineCap='round';ctx.lineJoin='round';if(currentBrush==='eraser'){ctx.globalCompositeOperation='destination-out';ctx.strokeStyle="rgba(0,0,0,1)";ctx.lineTo(p.x,p.y);ctx.stroke();}else if(currentBrush==='spray'){ctx.globalCompositeOperation='source-over';ctx.fillStyle=color;for(let i=0;i<10;i++){const ang=Math.random()*Math.PI*2;const rad=Math.random()*size*2;ctx.fillRect(p.x+Math.cos(ang)*rad,p.y+Math.sin(ang)*rad,1,1);}}else if(currentBrush==='marker'){ctx.globalCompositeOperation='source-over';ctx.globalAlpha=0.5;ctx.strokeStyle=color;ctx.lineTo(p.x,p.y);ctx.stroke();ctx.globalAlpha=1.0;}else{ctx.globalCompositeOperation='source-over';ctx.strokeStyle=color;ctx.lineTo(p.x,p.y);ctx.stroke();}ctx.beginPath();ctx.moveTo(p.x,p.y);}
function clearCanvas(){ctx.clearRect(0,0,canvas.width,canvas.height);}
function initColorPicker(){const ring=document.getElementById('hueRing');const square=document.getElementById('svSquare');function setHue(e){e.preventDefault();const rect=ring.getBoundingClientRect();const x=(e.touches?e.touches[0].clientX:e.clientX)-rect.left-rect.width/2;const y=(e.touches?e.touches[0].clientY:e.clientY)-rect.top-rect.height/2;let deg=Math.atan2(y,x)*(180/Math.PI)+90;if(deg<0)deg+=360;pickedColor.h=deg;updateColorUI();}ring.addEventListener('mousedown',(e)=>{setHue(e);document.addEventListener('mousemove',setHue);document.addEventListener('mouseup',()=>document.removeEventListener('mousemove',setHue));});ring.addEventListener('touchstart',(e)=>{setHue(e);document.addEventListener('touchmove',setHue,{passive:false});document.addEventListener('touchend',()=>document.removeEventListener('touchmove',setHue));},{passive:false});function setSV(e){e.preventDefault();const rect=square.getBoundingClientRect();let x=(e.touches?e.touches[0].clientX:e.clientX)-rect.left;let y=(e.touches?e.touches[0].clientY:e.clientY)-rect.top;x=Math.max(0,Math.min(x,rect.width));y=Math.max(0,Math.min(y,rect.height));pickedColor.s=(x/rect.width)*100;pickedColor.v=100-(y/rect.height)*100;updateColorUI();}square.addEventListener('mousedown',(e)=>{setSV(e);document.addEventListener('mousemove',setSV);document.addEventListener('mouseup',()=>document.removeEventListener('mousemove',setSV));});square.addEventListener('touchstart',(e)=>{setSV(e);document.addEventListener('touchmove',setSV,{passive:false});document.addEventListener('touchend',()=>document.removeEventListener('touchmove',setSV));},{passive:false});['rSlider','gSlider','bSlider'].forEach(id=>{document.getElementById(id).addEventListener('input',updateColorFromSliders);});updateColorUI();}
function hsvToRgb(h,s,v){let r,g,b;const i=Math.floor(h*6);const f=h*6-i;const p=v*(1-s);const q=v*(1-f*s);const t=v*(1-(1-f)*s);switch(i%6){case 0:r=v,g=t,b=p;break;case 1:r=q,g=v,b=p;break;case 2:r=p,g=v,b=t;break;case 3:r=p,g=q,b=v;break;case 4:r=t,g=p,b=v;break;case 5:r=v,g=p,b=q;break;}return{r:Math.round(r*255),g:Math.round(g*255),b:Math.round(b*255)};}
function updateColorUI(){document.getElementById('svSquare').style.backgroundColor=`hsl(${pickedColor.h},100%,50%)`;const rgb=hsvToRgb(pickedColor.h/360,pickedColor.s/100,pickedColor.v/100);pickedColor.r=rgb.r;pickedColor.g=rgb.g;pickedColor.b=rgb.b;pickedColor.hex=`rgb(${rgb.r},${rgb.g},${rgb.b})`;const svInd=document.getElementById('svInd');svInd.style.left=pickedColor.s+'%';svInd.style.top=(100-pickedColor.v)+'%';document.getElementById('rSlider').value=rgb.r;document.getElementById('gSlider').value=rgb.g;document.getElementById('bSlider').value=rgb.b;document.getElementById('colorPreview').style.backgroundColor=pickedColor.hex;}
function updateColorFromSliders(){const r=parseInt(document.getElementById('rSlider').value);const g=parseInt(document.getElementById('gSlider').value);const b=parseInt(document.getElementById('bSlider').value);pickedColor.hex=`rgb(${r},${g},${b})`;document.getElementById('colorPreview').style.backgroundColor=pickedColor.hex;}
