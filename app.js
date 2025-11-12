// app.js
// 單頁應用（SPA）控制：登入與主頁顯示、Firebase Auth、分頁切換、打卡範例

// ===== 1) 設定區：請填入您的 Firebase Web 應用設定 =====
// 取得方式：Firebase Console -> 專案設定 -> 您的應用 -> Firebase SDK snippet
window.FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
  apiKey: "AIzaSyDdetnrACoNTSV3ZqFBPOSfnZzRtmk5fk8",
  authDomain: "nw-checkin.firebaseapp.com",
  projectId: "nw-checkin",
  storageBucket: "nw-checkin.appspot.com",
  messagingSenderId: "520938520545",
  appId: "1:520938520545:web:fb32a42eb1504aab041ca0",
  measurementId: "G-G6M6NGBC03",
};

// Google Maps API Key（來自使用者提供）
const GOOGLE_MAPS_API_KEY = "AIzaSyAzhLdWtycJgfz8UsXWlji63DkXpA4kmyY";

// 若您需要使用 Google Maps，請在此填入 API 金鑰（選填，用於定位或地圖顯示）
// export const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

// 角色階層（由高至低），請依需求調整
// 改用全域變數以避免重複宣告衝突
window.Roles = window.Roles || [
  "系統管理員",
  "管理層",
  "高階主管",
  "初階主管",
  "行政",
  "一般",
  "勤務",
];

// ===== 2) DOM 參考 =====
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const setupWarning = document.getElementById("setup-warning");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const emailSignInBtn = document.getElementById("emailSignIn");
const initAdminBtn = document.getElementById("initAdminBtn");
const applyAccountBtn = document.getElementById("applyAccountBtn");
const togglePasswordBtn = document.getElementById("togglePassword");
const togglePasswordIcon = document.getElementById("togglePasswordIcon");

const userNameEl = document.getElementById("userName");
const userPhotoEl = document.getElementById("userPhoto");
const subTabsEl = document.getElementById("subTabs");

const homeSection = document.getElementById("homeSection");
const checkinSection = document.getElementById("checkinSection");
const settingsSection = document.getElementById("settingsSection");
const leaderSection = document.getElementById("leaderSection");
const manageSection = document.getElementById("manageSection");
const featureSection = document.getElementById("featureSection");
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));

const locationInfo = document.getElementById("locationInfo");
const checkinBtn = document.getElementById("checkinBtn");
const checkinResult = document.getElementById("checkinResult");
const checkinSubTitle = document.getElementById("checkinSubTitle");
const settingsSubTitle = document.getElementById("settingsSubTitle");
const leaderSubTitle = document.getElementById("leaderSubTitle");
const manageSubTitle = document.getElementById("manageSubTitle");
const featureSubTitle = document.getElementById("featureSubTitle");
const settingsContent = document.getElementById("settingsContent");
const modalRoot = document.getElementById("modalRoot");

// ===== 2.1) 互動增強：按鈕按下（滑鼠/觸控）效果 =====
function attachPressInteractions(el) {
  if (!el) return;
  const add = () => {
    // 避免 disabled 元素進入 pressed 狀態
    if (el.disabled) return;
    el.classList.add("pressed");
  };
  const remove = () => {
    el.classList.remove("pressed");
  };
  el.addEventListener("mousedown", add);
  el.addEventListener("mouseup", remove);
  el.addEventListener("mouseleave", remove);
  el.addEventListener("touchstart", add, { passive: true });
  el.addEventListener("touchend", remove);
  el.addEventListener("touchcancel", remove);
}

// 對現有按鈕立即掛載互動效果
[...document.querySelectorAll(".btn, .tab-btn")].forEach(attachPressInteractions);
attachPressInteractions(document.getElementById("checkinBtn"));
attachPressInteractions(document.getElementById("emailSignIn"));
attachPressInteractions(document.getElementById("initAdminBtn"));
attachPressInteractions(document.getElementById("applyAccountBtn"));
attachPressInteractions(togglePasswordBtn);

// 顯示/隱藏密碼
if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener("click", () => {
    if (!passwordInput) return;
    const show = passwordInput.type === "password";
    passwordInput.type = show ? "text" : "password";
    // 切換圖示（簡化：加/去斜線）
    if (togglePasswordIcon) {
      togglePasswordIcon.innerHTML = show
        ? '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>'
        : '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/><line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="2"/>';
    }
  });
}

// ===== 2.2) 設定分頁資料狀態與彈窗工具 =====
const appState = {
  companies: [
    { id: id(), name: "台北公司", coords: "25.041,121.532" },
    { id: id(), name: "桃園公司", coords: "24.993,121.301" },
  ],
  regions: [
    { id: id(), name: "台北" },
    { id: id(), name: "新北" },
    { id: id(), name: "桃園" },
  ],
  licenses: [],
  communities: [],
  accounts: [],
  pendingAccounts: [],
  currentUserId: null,
  currentUserRole: null,
};

function id() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function openModal({ title, fields, initial = {}, submitText = "儲存", onSubmit, message, afterRender }) {
  if (!modalRoot) return;
  modalRoot.classList.remove("hidden");
  modalRoot.innerHTML = "";
  const modal = document.createElement("div");
  modal.className = "modal";

  const header = document.createElement("div");
  header.className = "modal-header";
  const hTitle = document.createElement("div");
  hTitle.className = "modal-title";
  hTitle.textContent = title;
  const btnClose = document.createElement("button");
  btnClose.className = "btn";
  btnClose.textContent = "關閉";
  attachPressInteractions(btnClose);
  btnClose.addEventListener("click", () => closeModal());
  header.appendChild(hTitle);
  header.appendChild(btnClose);

  const body = document.createElement("div");
  body.className = "modal-body";
  // 可選的訊息段落（用於刪除確認等情境）
  if (message) {
    const msg = document.createElement("div");
    msg.className = "modal-message";
    msg.textContent = message;
    msg.style.marginBottom = "12px";
    msg.style.color = "#b00020";
    body.appendChild(msg);
  }

  const inputs = [];
  fields.forEach((f) => {
    const row = document.createElement("div");
    row.className = "form-row";
    const label = document.createElement("label");
    label.className = "label";
    label.textContent = f.label;
    let input;
    if (f.type === "select") {
      input = document.createElement("select");
      input.className = "input";
      (f.options || []).forEach((opt) => {
        const o = document.createElement("option");
        o.value = opt.value;
        o.textContent = opt.label;
        input.appendChild(o);
      });
      input.value = initial[f.key] ?? (f.options?.[0]?.value ?? "");
      if (f.readonly) input.disabled = true;
    } else if (f.type === "multiselect") {
      input = document.createElement("div");
      (f.options || []).forEach((opt) => {
        const wrap = document.createElement("label");
        wrap.style.display = "flex";
        wrap.style.alignItems = "center";
        wrap.style.gap = "6px";
        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.value = opt.value;
        chk.checked = Array.isArray(initial[f.key]) && initial[f.key].includes(opt.value);
        if (f.readonly) chk.disabled = true;
        wrap.appendChild(chk);
        wrap.appendChild(document.createTextNode(opt.label));
        input.appendChild(wrap);
      });
      input.dataset.multikey = f.key;
    } else {
      input = document.createElement("input");
      input.className = "input";
      input.type = f.type || "text";
      input.placeholder = f.placeholder || "";
      if (initial && initial[f.key] != null && f.type !== "file") input.value = initial[f.key];
      if (f.readonly) input.disabled = true;
    }
    input.dataset.key = f.key;
    row.appendChild(label);
    row.appendChild(input);
    // 檔案欄位預覽：初始值與即時選取預覽
    if (f.type === "file") {
      let preview = null;
      if (initial && initial[f.key]) {
        preview = document.createElement("img");
        preview.src = initial[f.key];
        preview.alt = f.label;
        preview.style.width = "60px";
        preview.style.height = "60px";
        preview.style.borderRadius = "50%";
        preview.style.objectFit = "cover";
        preview.style.marginTop = "6px";
        row.appendChild(preview);
      }
      if (f.readonly) input.disabled = true;
      // 即時預覽：使用者選擇檔案後，顯示預覽圖片
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (file) {
          const url = await fileToDataUrl(file);
          if (!preview) {
            preview = document.createElement("img");
            preview.alt = f.label;
            preview.style.width = "60px";
            preview.style.height = "60px";
            preview.style.borderRadius = "50%";
            preview.style.objectFit = "cover";
            preview.style.marginTop = "6px";
            row.appendChild(preview);
          }
          preview.src = url;
        } else {
          // 沒選檔案時，回退到初始預覽或清除
          if (preview) {
            if (initial && initial[f.key]) preview.src = initial[f.key]; else preview.remove();
          }
        }
      });
    }
    body.appendChild(row);
    inputs.push(input);
  });

  const footer = document.createElement("div");
  footer.className = "modal-footer";
  const btnCancel = document.createElement("button");
  btnCancel.className = "btn";
  btnCancel.textContent = "取消";
  attachPressInteractions(btnCancel);
  btnCancel.addEventListener("click", () => closeModal());
  const btnSubmit = document.createElement("button");
  btnSubmit.className = "btn btn-primary";
  btnSubmit.textContent = submitText;
  attachPressInteractions(btnSubmit);
  btnSubmit.addEventListener("click", async () => {
    const data = {};
    for (const el of inputs) {
      const key = el.dataset.key;
      if (el.tagName === "DIV" && el.dataset.multikey) {
        const vals = Array.from(el.querySelectorAll("input[type=checkbox]:checked")).map((c) => c.value);
        data[key] = vals;
      } else if (el.type === "file") {
        const file = el.files?.[0];
        if (file) {
          data[key] = await fileToDataUrl(file);
          data[`${key}Name`] = file.name;
        } else {
          data[key] = initial[key] ?? null;
        }
      } else if (el.type === "number") {
        data[key] = el.value ? Number(el.value) : null;
      } else {
        data[key] = el.value;
      }
    }
    const ok = await onSubmit?.(data);
    // 若 onSubmit 明確回傳 false，視為失敗不關閉視窗；成功則關閉並回到目前子分頁列表
    if (ok !== false) {
      closeModal();
      if (activeMainTab === "settings" && activeSubTab) {
        renderSettingsContent(activeSubTab);
      }
    }
  });
  footer.appendChild(btnCancel);
  footer.appendChild(btnSubmit);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  modalRoot.appendChild(modal);

  // 允許外部在渲染完成後插入額外 UI 或事件（例如地圖編輯按鈕）
  if (typeof afterRender === "function") {
    try { afterRender({ modal, header, body, footer, inputs }); } catch (e) { console.error("afterRender error", e); }
  }
}

function closeModal() {
  if (!modalRoot) return;
  modalRoot.classList.add("hidden");
  modalRoot.innerHTML = "";
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function optionList(items, labelKey = "name") {
  return items.map((it) => ({ value: it.id, label: it[labelKey] }));
}
function getRoles() {
  if (typeof window !== "undefined" && window.Roles && Array.isArray(window.Roles)) return window.Roles;
  return ["系統管理員", "管理層", "高階主管", "初階主管", "行政", "一般", "勤務"];
}

// Google Maps：載入與地理編碼工具
async function ensureGoogleMaps() {
  if (window.google && window.google.maps) return window.google.maps;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.google.maps;
}

function regionIdFromAddressComponents(components = []) {
  const names = components.map((c) => c.long_name);
  const lookup = [];
  components.forEach((c) => {
    const t = (c.types || [])[0];
    if (["locality", "administrative_area_level_3", "administrative_area_level_2", "administrative_area_level_1"].includes(t)) {
      lookup.push(c.long_name);
    }
  });
  const candidates = [...lookup, ...names].filter(Boolean);
  for (const r of appState.regions) {
    if (candidates.some((n) => (n || "").includes(r.name))) return r.id;
  }
  return null;
}

async function geocodeAddress(address) {
  const maps = await ensureGoogleMaps();
  const geocoder = new maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results?.[0]) resolve(results[0]); else reject(new Error(`Geocode failed: ${status}`));
    });
  });
}

async function reverseGeocode(lat, lng) {
  const maps = await ensureGoogleMaps();
  const geocoder = new maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) resolve(results[0]); else reject(new Error(`Reverse geocode failed: ${status}`));
    });
  });
}

function openMapPicker({ initialAddress = "", initialCoords = "", initialRadius = 100 }) {
  return new Promise(async (resolve) => {
    await ensureGoogleMaps();
    const start = (() => {
      if (initialCoords) {
        const [latStr, lngStr] = String(initialCoords).split(",").map((s) => s.trim());
        const lat = parseFloat(latStr); const lng = parseFloat(lngStr);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
      return { lat: 25.041, lng: 121.532 };
    })();
    const fields = [
      { key: "address", label: "地址", type: "text", placeholder: "輸入地址以定位" },
      { key: "coords", label: "定位座標", type: "text", placeholder: "lat,lng" },
      { key: "radiusMeters", label: "有效打卡範圍半徑(公尺)", type: "number", placeholder: "100" },
    ];
    const initial = { address: initialAddress, coords: `${start.lat},${start.lng}`, radiusMeters: initialRadius };
    openModal({
      title: "地圖編輯",
      fields,
      initial,
      submitText: "套用",
      onSubmit: async (data) => resolve(data),
      afterRender: async ({ body }) => {
        const maps = await ensureGoogleMaps();
        const mapBox = document.createElement("div");
        mapBox.style.width = "100%";
        mapBox.style.height = "320px";
        mapBox.style.marginTop = "8px";
        body.appendChild(mapBox);
        const map = new maps.Map(mapBox, { center: start, zoom: 16 });
        const marker = new maps.Marker({ position: start, map, draggable: true });
        let circle = new maps.Circle({ strokeColor: "#4285F4", strokeOpacity: 0.8, strokeWeight: 2, fillColor: "#4285F4", fillOpacity: 0.15, map, center: start, radius: initial.radiusMeters || 100 });
        const addrInput = body.querySelector('[data-key="address"]');
        const coordsInput = body.querySelector('[data-key="coords"]');
        const radiusInput = body.querySelector('[data-key="radiusMeters"]');
        const updateFromLatLng = async (lat, lng) => {
          coordsInput.value = `${lat.toFixed(6)},${lng.toFixed(6)}`;
          marker.setPosition({ lat, lng });
          circle.setCenter({ lat, lng });
          try { const res = await reverseGeocode(lat, lng); addrInput.value = res.formatted_address || addrInput.value; } catch {}
        };
        marker.addListener("dragend", (ev) => { const p = ev.latLng; updateFromLatLng(p.lat(), p.lng()); });
        radiusInput.addEventListener("input", () => { const r = Number(radiusInput.value) || 100; circle.setRadius(r); });
        addrInput.addEventListener("change", async () => {
          const v = addrInput.value?.trim(); if (!v) return;
          try {
            const res = await geocodeAddress(v);
            const loc = res.geometry.location; const pos = { lat: loc.lat(), lng: loc.lng() };
            map.setCenter(pos); marker.setPosition(pos); circle.setCenter(pos);
            coordsInput.value = `${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`;
          } catch {}
        });
      },
    });
  });
}

function companyStats(companyId) {
  const communityCount = appState.communities.filter((c) => c.companyId === companyId).length;
  const staff = appState.accounts.filter((a) => a.companyId === companyId);
  const staffCount = staff.length;
  const leaderRoles = new Set(["管理層", "高階主管", "初階主管"]);
  const leaderCount = staff.filter((a) => leaderRoles.has(a.role)).length;
  return { communityCount, leaderCount, staffCount };
}

// 簡易刪除確認彈窗
function confirmAction({ title = "確認刪除", text = "確定要刪除？此動作無法復原。", confirmText = "刪除" } = {}) {
  return new Promise((resolve) => {
    openModal({ title, fields: [], submitText: confirmText, message: text, onSubmit: () => { resolve(true); } });
    const cancelBtn = modalRoot?.querySelector('.modal-footer .btn:not(.btn-primary)');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { resolve(false); });
  });
}

// 登入頁面「帳號申請」
if (applyAccountBtn) {
  applyAccountBtn.addEventListener("click", () => {
    openModal({
      title: "帳號申請",
      submitText: "送出申請",
      fields: [
        { key: "photoUrl", label: "大頭照", type: "file" },
        { key: "name", label: "中文姓名", type: "text" },
        { key: "title", label: "職稱", type: "text" },
        { key: "email", label: "電子郵件", type: "email" },
        { key: "phone", label: "手機號碼", type: "text" },
        { key: "password", label: "預設密碼", type: "text" },
        { key: "passwordConfirm", label: "確認密碼", type: "text" },
        { key: "emergencyName", label: "緊急聯絡人", type: "text" },
        { key: "emergencyRelation", label: "緊急聯絡人關係", type: "text" },
        { key: "emergencyPhone", label: "緊急聯絡人手機號碼", type: "text" },
        { key: "bloodType", label: "血型", type: "select", options: ["A","B","O","AB"].map((x)=>({value:x,label:x})) },
        { key: "birthdate", label: "出生年月日", type: "date" },
        { key: "licenses", label: "相關證照", type: "multiselect", options: optionList(appState.licenses) },
      ],
      onSubmit: (d) => {
        appState.pendingAccounts.push({ id: id(), ...d, role: "一般", status: "待審核", companyId: null, serviceCommunities: [], createdAt: new Date().toISOString() });
      },
    });
  });
}

// 顯示個人資訊彈窗（含登出）
function showProfileModal(user, role) {
  const initial = {
    photoUrl: user.photoURL || "",
    name: user.displayName || "",
    email: user.email || "",
    role: role || "一般",
    phone: "",
  };
  openModal({
    title: "個人資訊",
    submitText: "儲存",
    initial,
    fields: [
      { key: "role", label: "角色", type: "select", options: getRoles().map((r)=>({value:r,label:r})), readonly: true },
      { key: "photoUrl", label: "大頭照", type: "file", readonly: true },
      { key: "name", label: "姓名", type: "text", readonly: true },
      { key: "email", label: "電子郵件", type: "email", readonly: true },
      { key: "phone", label: "手機號碼", type: "text", readonly: true },
      { key: "monthlyPoints", label: "本月計點", type: "text", readonly: true },
      { key: "notifications", label: "通知", type: "text", readonly: true },
    ],
    onSubmit: async (data) => {
      try {
        if (!db || !fns.setDoc || !fns.doc) throw new Error("Firestore 未初始化");
        if (!user?.uid) throw new Error("使用者未登入");
        const payload = {};
        if (typeof data.photoUrl === "string") payload.photoUrl = data.photoUrl;
        if (typeof data.name === "string") payload.name = data.name;
        if (typeof data.email === "string") payload.email = data.email;
        if (typeof data.phone === "string") payload.phone = data.phone;
        // 角色僅限系統管理員可變更
        if (appState.currentUserRole === "系統管理員" && typeof data.role === "string") payload.role = data.role;
        if (Object.keys(payload).length === 0) return true;
        if (typeof fns.serverTimestamp === "function") payload.updatedAt = fns.serverTimestamp();
        await fns.setDoc(fns.doc(db, "users", user.uid), payload, { merge: true });
        if (typeof payload.photoUrl === "string" && userPhotoEl) userPhotoEl.src = payload.photoUrl;
        if (typeof payload.name === "string") userNameEl.textContent = payload.name || userNameEl.textContent;
        return true;
      } catch (e) {
        alert("儲存個人照片失敗：" + (e?.message || e));
        return false;
      }
    },
    afterRender: async ({ header, body, footer, inputs }) => {
      try {
        // 置中布局
        body.style.textAlign = "center";
        Array.from(body.querySelectorAll(".form-row")).forEach((row) => {
          row.style.display = "flex";
          row.style.flexDirection = "column";
          row.style.alignItems = "center";
        });

        // 初始狀態：唯讀，停用儲存
        const btnSubmit = footer.querySelector(".btn-primary");
        if (btnSubmit) btnSubmit.disabled = true;

        // 加入「編輯」按鈕（位於標題右側）
        const btnEdit = document.createElement("button");
        btnEdit.className = "btn";
        btnEdit.textContent = "編輯";
        attachPressInteractions(btnEdit);
        header.insertBefore(btnEdit, header.lastChild); // 放在關閉按鈕前

        let editing = false;

        // 以 Firestore 使用者文件覆蓋照片與基本資訊
        if (db && fns.doc && fns.getDoc && user?.uid) {
          const ref = fns.doc(db, "users", user.uid);
          const snap = await fns.getDoc(ref);
          if (snap.exists()) {
            const d = snap.data() || {};
            // 照片預覽與點擊重新上傳
            {
              const photo = d.photoUrl || initial.photoUrl;
              const input = body.querySelector('[data-key="photoUrl"]');
              const row = input?.parentElement;
              if (row) {
                let preview = row.querySelector("img");
                if (!preview) {
                  preview = document.createElement("img");
                  preview.style.width = "120px";
                  preview.style.height = "120px";
                  preview.style.borderRadius = "50%";
                  preview.style.objectFit = "cover";
                  preview.style.margin = "12px auto 0";
                  preview.style.cursor = "default";
                  row.appendChild(preview);
                }
                if (photo) preview.src = photo;
                if (input) {
                  input.style.display = "none";
                  preview.addEventListener("click", () => {
                    if (editing) input.click();
                  });
                }
              }
            }
            // 姓名、Email、角色 顯示
            const nameInput = body.querySelector('[data-key="name"]');
            const emailInput = body.querySelector('[data-key="email"]');
            const roleInput = body.querySelector('[data-key="role"]');
            const phoneInput = body.querySelector('[data-key="phone"]');
            const monthlyInput = body.querySelector('[data-key="monthlyPoints"]');
            const notifInput = body.querySelector('[data-key="notifications"]');
            if (nameInput) nameInput.value = d.name || user.displayName || nameInput.value || "";
            if (emailInput) emailInput.value = d.email || user.email || emailInput.value || "";
            if (phoneInput) phoneInput.value = d.phone || phoneInput.value || "";
            if (roleInput) roleInput.value = d.role || roleInput.value || (typeof role === "string" ? role : "一般");

            // 計算本月計點（checkins 集合當月筆數）
            try {
              if (fns.getDocs && fns.collection) {
                const snap2 = await fns.getDocs(fns.collection(db, "checkins"));
                let count = 0;
                const now = new Date();
                const ym = `${now.getFullYear()}-${now.getMonth()+1}`;
                snap2.forEach((docSnap) => {
                  const x = docSnap.data() || {};
                  if (x.uid !== user.uid) return;
                  const ts = x.createdAt;
                  if (ts && typeof ts.toDate === "function") {
                    const d2 = ts.toDate();
                    const ym2 = `${d2.getFullYear()}-${d2.getMonth()+1}`;
                    if (ym2 === ym) count++;
                  }
                });
                if (monthlyInput) monthlyInput.value = String(count);
              }
            } catch {}

            // 通知顯示（若有 users 欄位）
            try {
              if (notifInput) {
                const v = d.notifications ?? d.notificationsEnabled;
                if (typeof v === "boolean") notifInput.value = v ? "已開啟" : "未開啟";
                else if (typeof v === "string") notifInput.value = v;
                else notifInput.value = "未設定";
              }
            } catch {}
          }
        }

        // 切換編輯狀態：啟用/停用可編輯欄位與儲存按鈕
        const editableKeys = new Set(["photoUrl", "name", "email", "phone", "role"]);
        const toggleEditing = (to) => {
          editing = to;
          inputs.forEach((el) => {
            const k = el.dataset.key;
            if (!editableKeys.has(k)) return; // 非可編輯欄位維持唯讀
            if (k === "role" && appState.currentUserRole !== "系統管理員") {
              // 非系統管理員：角色仍維持唯讀
              el.disabled = true;
              return;
            }
            el.disabled = !editing;
          });
          // 影像預覽游標提示
          const preview = body.querySelector('[data-key="photoUrl"]')?.parentElement?.querySelector('img');
          if (preview) preview.style.cursor = editing ? "pointer" : "default";
          if (btnSubmit) btnSubmit.disabled = !editing;
          btnEdit.textContent = editing ? "完成編輯" : "編輯";
        };

        // 初始為唯讀
        toggleEditing(false);
        btnEdit.addEventListener("click", () => toggleEditing(!editing));
      } catch {}

      // 在視窗最下方（footer）加入登出按鈕
      try {
        const btnLogout = document.createElement("button");
        btnLogout.className = "btn";
        btnLogout.textContent = "登出";
        attachPressInteractions(btnLogout);
        btnLogout.addEventListener("click", async () => {
          try {
            if (typeof fns.signOut === "function" && auth) {
              await fns.signOut(auth);
              closeModal();
            } else {
              throw new Error("Auth 未初始化或 signOut 不可用");
            }
          } catch (e) {
            alert("登出失敗：" + (e?.message || e));
          }
        });
        footer.appendChild(btnLogout);
      } catch {}
    },
  });
}

function renderSettingsContent(label) {
  if (!settingsContent) return;
  if (label === "一般") {
    renderSettingsGeneral();
  } else if (label === "社區") {
    renderSettingsCommunities();
  } else if (label === "帳號") {
    renderSettingsAccounts();
  } else {
    settingsContent.innerHTML = "";
  }
}

function renderSettingsGeneral() {
  const companiesHtml = `
    <div class="block" id="block-companies">
      <div class="block-header">
        <span class="block-title">公司列表</span>
        <div class="block-actions"><button id="btnAddCompany" class="btn">新增</button></div>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>名稱</th><th>社區數</th><th>幹部數</th><th>人員數</th><th>定位座標</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${appState.companies.map((co) => {
              const s = companyStats(co.id);
              return `<tr data-id="${co.id}">
                <td>${co.name}</td>
                <td>${s.communityCount}</td>
                <td>${s.leaderCount}</td>
                <td>${s.staffCount}</td>
                <td>${co.coords || ""}</td>
                <td class="cell-actions">
                  <button class="btn btn-sm" data-act="edit">編輯</button>
                  <button class="btn btn-sm" data-act="del">刪除</button>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>`;

  const regionsHtml = `
    <div class="block" id="block-regions">
      <div class="block-header">
        <span class="block-title">區域</span>
        <div class="block-actions"><button id="btnAddRegion" class="btn">新增</button></div>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>名稱</th><th>操作</th></tr></thead>
          <tbody>
            ${appState.regions.map((r) => `<tr data-id="${r.id}"><td>${r.name}</td><td class="cell-actions"><button class="btn" data-act="edit">編輯</button><button class="btn" data-act="del">刪除</button></td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;

  const licensesHtml = `
    <div class="block" id="block-licenses">
      <div class="block-header">
        <span class="block-title">證照</span>
        <div class="block-actions"><button id="btnAddLicense" class="btn">新增</button></div>
      </div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>名稱</th><th>操作</th></tr></thead>
          <tbody>
            ${appState.licenses.map((l) => `<tr data-id="${l.id}"><td>${l.name}</td><td class="cell-actions"><button class="btn" data-act="edit">編輯</button><button class="btn" data-act="del">刪除</button></td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;

  settingsContent.innerHTML = companiesHtml + regionsHtml + licensesHtml;

  // 事件：公司
  const btnAddCompany = document.getElementById("btnAddCompany");
  attachPressInteractions(btnAddCompany);
  btnAddCompany.addEventListener("click", () => {
    openModal({
      title: "新增公司",
      fields: [
        { key: "name", label: "名稱", type: "text" },
        { key: "coords", label: "定位座標", type: "text", placeholder: "lat,lng" },
      ],
      onSubmit: async (data) => {
        try {
          if (!db || !fns.addDoc || !fns.collection) throw new Error("Firestore 未初始化");
          const docRef = await fns.addDoc(fns.collection(db, "companies"), { name: data.name || "", coords: data.coords || "", createdAt: fns.serverTimestamp() });
          appState.companies.push({ id: docRef.id, name: data.name || "", coords: data.coords || "" });
        } catch (err) {
          alert(`儲存公司失敗：${err?.message || err}`);
          return false;
        }
      },
    });
  });
  settingsContent.querySelectorAll("#block-companies tbody tr").forEach((tr) => {
    const cid = tr.dataset.id;
    tr.querySelectorAll("button").forEach((b) => attachPressInteractions(b));
    tr.addEventListener("click", (e) => {
      const act = e.target?.dataset?.act;
      if (!act) return;
      const co = appState.companies.find((c) => c.id === cid);
      if (!co) return;
      if (act === "edit") {
        openModal({
          title: "編輯公司",
          fields: [
            { key: "name", label: "名稱", type: "text" },
            { key: "coords", label: "定位座標", type: "text" },
          ],
          initial: co,
          onSubmit: async (data) => {
            try {
              if (!db || !fns.setDoc || !fns.doc) throw new Error("Firestore 未初始化");
              await fns.setDoc(fns.doc(db, "companies", cid), { name: data.name || co.name, coords: data.coords || co.coords, updatedAt: fns.serverTimestamp() }, { merge: true });
              co.name = data.name || co.name;
              co.coords = data.coords || co.coords;
            } catch (err) {
              alert(`更新公司失敗：${err?.message || err}`);
              return false;
            }
          },
        });
      } else if (act === "del") {
        (async () => {
          const ok = await confirmAction({ title: "確認刪除公司", text: `確定要刪除公司「${co.name}」嗎？此動作無法復原。`, confirmText: "刪除" });
          if (!ok) return;
          try {
            if (!db || !fns.deleteDoc || !fns.doc) throw new Error("Firestore 未初始化");
            await fns.deleteDoc(fns.doc(db, "companies", cid));
            appState.companies = appState.companies.filter((c) => c.id !== cid);
            renderSettingsContent("一般");
          } catch (err) {
            alert(`刪除公司失敗：${err?.message || err}`);
          }
        })();
      }
    });
  });

  // 事件：區域
  const btnAddRegion = document.getElementById("btnAddRegion");
  attachPressInteractions(btnAddRegion);
  btnAddRegion.addEventListener("click", () => {
    openModal({
      title: "新增區域",
      fields: [{ key: "name", label: "名稱", type: "text" }],
      onSubmit: async (data) => {
        try {
          if (!db || !fns.addDoc || !fns.collection) throw new Error("Firestore 未初始化");
          const docRef = await fns.addDoc(fns.collection(db, "regions"), { name: data.name || "", createdAt: fns.serverTimestamp() });
          appState.regions.push({ id: docRef.id, name: data.name || "" });
        } catch (err) {
          alert(`儲存區域失敗：${err?.message || err}`);
          return false;
        }
      },
    });
  });
  settingsContent.querySelectorAll("#block-regions tbody tr").forEach((tr) => {
    const rid = tr.dataset.id;
    tr.querySelectorAll("button").forEach((b) => attachPressInteractions(b));
    tr.addEventListener("click", (e) => {
      const act = e.target?.dataset?.act;
      const r = appState.regions.find((x) => x.id === rid);
      if (!r) return;
      if (act === "edit") {
        openModal({ title: "編輯區域", fields: [{ key: "name", label: "名稱", type: "text" }], initial: r, onSubmit: async (d) => {
          try {
            if (!db || !fns.setDoc || !fns.doc) throw new Error("Firestore 未初始化");
            await fns.setDoc(fns.doc(db, "regions", rid), { name: d.name || r.name, updatedAt: fns.serverTimestamp() }, { merge: true });
            r.name = d.name || r.name;
          } catch (err) {
            alert(`更新區域失敗：${err?.message || err}`);
            return false;
          }
        } });
      } else if (act === "del") {
        (async () => {
          const ok = await confirmAction({ title: "確認刪除區域", text: `確定要刪除區域「${r.name}」嗎？此動作無法復原。`, confirmText: "刪除" });
          if (!ok) return;
          try {
            if (!db || !fns.deleteDoc || !fns.doc) throw new Error("Firestore 未初始化");
            await fns.deleteDoc(fns.doc(db, "regions", rid));
            appState.regions = appState.regions.filter((x) => x.id !== rid);
            renderSettingsContent("一般");
          } catch (err) {
            alert(`刪除區域失敗：${err?.message || err}`);
          }
        })();
      }
    });
  });

  // 事件：證照
  const btnAddLicense = document.getElementById("btnAddLicense");
  attachPressInteractions(btnAddLicense);
  btnAddLicense.addEventListener("click", () => {
    openModal({
      title: "新增證照",
      fields: [{ key: "name", label: "名稱", type: "text" }],
      onSubmit: async (d) => {
        try {
          if (!db || !fns.addDoc || !fns.collection) throw new Error("Firestore 未初始化");
          const docRef = await fns.addDoc(fns.collection(db, "licenses"), { name: d.name || "", createdAt: fns.serverTimestamp() });
          appState.licenses.push({ id: docRef.id, name: d.name || "" });
        } catch (err) {
          alert(`儲存證照失敗：${err?.message || err}`);
          return false;
        }
      },
    });
  });
  settingsContent.querySelectorAll("#block-licenses tbody tr").forEach((tr) => {
    const lid = tr.dataset.id;
    tr.querySelectorAll("button").forEach((b) => attachPressInteractions(b));
    tr.addEventListener("click", (e) => {
      const act = e.target?.dataset?.act;
      const l = appState.licenses.find((x) => x.id === lid);
      if (!l) return;
      if (act === "edit") {
        openModal({ title: "編輯證照", fields: [{ key: "name", label: "名稱", type: "text" }], initial: l, onSubmit: async (d) => {
          try {
            if (!db || !fns.setDoc || !fns.doc) throw new Error("Firestore 未初始化");
            await fns.setDoc(fns.doc(db, "licenses", lid), { name: d.name || l.name, updatedAt: fns.serverTimestamp() }, { merge: true });
            l.name = d.name || l.name;
          } catch (err) {
            alert(`更新證照失敗：${err?.message || err}`);
            return false;
          }
        } });
      } else if (act === "del") {
        (async () => {
          const ok = await confirmAction({ title: "確認刪除證照", text: `確定要刪除證照「${l.name}」嗎？此動作無法復原。`, confirmText: "刪除" });
          if (!ok) return;
          try {
            if (!db || !fns.deleteDoc || !fns.doc) throw new Error("Firestore 未初始化");
            await fns.deleteDoc(fns.doc(db, "licenses", lid));
            appState.licenses = appState.licenses.filter((x) => x.id !== lid);
            renderSettingsContent("一般");
          } catch (err) {
            alert(`刪除證照失敗：${err?.message || err}`);
          }
        })();
      }
    });
  });
}

function renderSettingsCommunities() {
  const rows = appState.communities.map((c) => {
    const regionName = appState.regions.find((r) => r.id === c.regionId)?.name || "";
    return `<tr data-id="${c.id}"><td>${c.code || ""}</td><td>${c.name || ""}</td><td>${c.address || ""}</td><td>${regionName}</td><td>${c.coords || ""}</td><td>${c.radiusMeters ?? ""}</td><td class="cell-actions"><button class="btn" data-act="edit">編輯</button><button class="btn" data-act="del">刪除</button></td></tr>`;
  }).join("");

  settingsContent.innerHTML = `
    <div class="block" id="block-communities">
      <div class="block-header"><span class="block-title">社區列表</span><div class="block-actions"><button id="btnAddCommunity" class="btn">新增</button></div></div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>社區編號</th><th>社區名稱</th><th>地址</th><th>區域</th><th>定位座標</th><th>有效打卡範圍半徑(公尺)</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;

  const btnAdd = document.getElementById("btnAddCommunity");
  attachPressInteractions(btnAdd);
  btnAdd.addEventListener("click", () => {
    openModal({
      title: "新增社區",
      fields: [
        { key: "code", label: "社區編號", type: "text" },
        { key: "name", label: "社區名稱", type: "text" },
        { key: "address", label: "地址", type: "text" },
        { key: "regionId", label: "區域", type: "select", options: optionList(appState.regions) },
        { key: "coords", label: "定位座標", type: "text", placeholder: "lat,lng" },
        { key: "radiusMeters", label: "有效打卡範圍半徑(公尺)", type: "number" },
      ],
      onSubmit: async (d) => {
        try {
          if (!db || !fns.addDoc || !fns.collection) throw new Error("Firestore 未初始化");
          const payload = { code: d.code || "", name: d.name || "", address: d.address || "", regionId: d.regionId || null, coords: d.coords || "", radiusMeters: d.radiusMeters ?? null, createdAt: fns.serverTimestamp() };
          const docRef = await fns.addDoc(fns.collection(db, "communities"), payload);
          appState.communities.push({ id: docRef.id, ...payload });
        } catch (err) {
          alert(`儲存社區失敗：${err?.message || err}`);
          return false;
        }
      },
      afterRender: ({ body }) => {
        const addrInput = body.querySelector('[data-key="address"]');
        const coordsInput = body.querySelector('[data-key="coords"]');
        const regionSelect = body.querySelector('[data-key="regionId"]');
        const radiusInput = body.querySelector('[data-key="radiusMeters"]');
        // 預設 50 公尺（若尚未填值）
        if (radiusInput && (!radiusInput.value || radiusInput.value.trim() === "")) radiusInput.value = "50";
        // 依地址自動帶入區域與座標
        addrInput?.addEventListener("change", async () => {
          const v = addrInput.value?.trim(); if (!v) return;
          try {
            const res = await geocodeAddress(v);
            const loc = res.geometry.location; const pos = { lat: loc.lat(), lng: loc.lng() };
            coordsInput.value = `${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`;
            const rid = regionIdFromAddressComponents(res.address_components || []);
            if (rid) regionSelect.value = rid;
          } catch {}
        });
        // 插入地圖編輯按鈕
        const coordsRow = coordsInput?.parentElement;
        if (coordsRow) {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = "開啟地圖編輯";
          attachPressInteractions(btn);
          btn.style.marginTop = "6px";
          btn.addEventListener("click", async () => {
            const result = await openMapPicker({ initialAddress: addrInput.value, initialCoords: coordsInput.value, initialRadius: Number(body.querySelector('[data-key="radiusMeters"]').value) || 50 });
            if (result) {
              addrInput.value = result.address || addrInput.value;
              coordsInput.value = result.coords || coordsInput.value;
              const radiusInput2 = body.querySelector('[data-key="radiusMeters"]');
              if (radiusInput2 && result.radiusMeters != null) radiusInput2.value = String(result.radiusMeters);
              // 反向地理編碼取得區域
              try {
                const [lat, lng] = (result.coords || "").split(",").map((s) => parseFloat(s.trim()));
                if (!isNaN(lat) && !isNaN(lng)) {
                  const rev = await reverseGeocode(lat, lng);
                  const rid = regionIdFromAddressComponents(rev.address_components || []);
                  if (rid) regionSelect.value = rid;
                }
              } catch {}
            }
          });
          coordsRow.appendChild(btn);
        }
      },
    });
  });

  settingsContent.querySelectorAll("#block-communities tbody tr").forEach((tr) => {
    const cid = tr.dataset.id;
    tr.querySelectorAll("button").forEach((b) => attachPressInteractions(b));
    tr.addEventListener("click", (e) => {
      const act = e.target?.dataset?.act;
      const item = appState.communities.find((x) => x.id === cid);
      if (!item) return;
      if (act === "edit") {
        openModal({
          title: "編輯社區",
          fields: [
            { key: "code", label: "社區編號", type: "text" },
            { key: "name", label: "社區名稱", type: "text" },
            { key: "address", label: "地址", type: "text" },
            { key: "regionId", label: "區域", type: "select", options: optionList(appState.regions) },
            { key: "coords", label: "定位座標", type: "text" },
            { key: "radiusMeters", label: "有效打卡範圍半徑(公尺)", type: "number" },
          ],
          initial: item,
          onSubmit: async (d) => {
            try {
              if (!db || !fns.setDoc || !fns.doc) throw new Error("Firestore 未初始化");
              const payload = {
                code: d.code ?? item.code ?? "",
                name: d.name ?? item.name ?? "",
                regionId: d.regionId ?? item.regionId ?? null,
                coords: d.coords ?? item.coords ?? "",
                address: d.address ?? item.address ?? "",
                radiusMeters: d.radiusMeters ?? item.radiusMeters ?? null,
                updatedAt: fns.serverTimestamp(),
              };
              await fns.setDoc(fns.doc(db, "communities", cid), payload, { merge: true });
              Object.assign(item, d);
            } catch (err) {
              alert(`更新社區失敗：${err?.message || err}`);
              return false;
            }
          },
          afterRender: ({ body }) => {
            const addrInput = body.querySelector('[data-key="address"]');
            const coordsInput = body.querySelector('[data-key="coords"]');
            const regionSelect = body.querySelector('[data-key="regionId"]');
            const radiusInput = body.querySelector('[data-key="radiusMeters"]');
            // 若半徑未填值，預設為 50 公尺
            if (radiusInput && (!radiusInput.value || radiusInput.value.trim() === "")) radiusInput.value = "50";
            addrInput?.addEventListener("change", async () => {
              const v = addrInput.value?.trim(); if (!v) return;
              try {
                const res = await geocodeAddress(v);
                const loc = res.geometry.location; const pos = { lat: loc.lat(), lng: loc.lng() };
                coordsInput.value = `${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`;
                const rid = regionIdFromAddressComponents(res.address_components || []);
                if (rid) regionSelect.value = rid;
              } catch {}
            });
            const coordsRow = coordsInput?.parentElement;
            if (coordsRow) {
              const btn = document.createElement("button");
              btn.className = "btn";
              btn.textContent = "開啟地圖編輯";
              attachPressInteractions(btn);
              btn.style.marginTop = "6px";
              btn.addEventListener("click", async () => {
                const result = await openMapPicker({ initialAddress: addrInput.value, initialCoords: coordsInput.value, initialRadius: Number(body.querySelector('[data-key="radiusMeters"]').value) || 100 });
                if (result) {
                  addrInput.value = result.address || addrInput.value;
                  coordsInput.value = result.coords || coordsInput.value;
                  const radiusInput = body.querySelector('[data-key="radiusMeters"]');
                  if (radiusInput && result.radiusMeters != null) radiusInput.value = String(result.radiusMeters);
                  try {
                    const [lat, lng] = (result.coords || "").split(",").map((s) => parseFloat(s.trim()));
                    if (!isNaN(lat) && !isNaN(lng)) {
                      const rev = await reverseGeocode(lat, lng);
                      const rid = regionIdFromAddressComponents(rev.address_components || []);
                      if (rid) regionSelect.value = rid;
                    }
                  } catch {}
                }
              });
              coordsRow.appendChild(btn);
            }
          },
        });
      } else if (act === "del") {
        (async () => {
          const ok = await confirmAction({ title: "確認刪除社區", text: `確定要刪除社區「${item.name}」嗎？此動作無法復原。`, confirmText: "刪除" });
          if (!ok) return;
          try {
            if (!db || !fns.deleteDoc || !fns.doc) throw new Error("Firestore 未初始化");
            await fns.deleteDoc(fns.doc(db, "communities", cid));
            appState.communities = appState.communities.filter((x) => x.id !== cid);
            renderSettingsContent("社區");
          } catch (err) {
            alert(`刪除社區失敗：${err?.message || err}`);
          }
        })();
      }
    });
  });
}

function renderSettingsAccounts() {
  const rows = appState.accounts.map((a) => {
    const companyName = appState.companies.find((c) => c.id === a.companyId)?.name || "";
    const service = Array.isArray(a.serviceCommunities) ? a.serviceCommunities.map((id) => appState.communities.find((x) => x.id === id)?.name || id).join("、") : "";
    const lic = Array.isArray(a.licenses) ? a.licenses.map((x) => appState.licenses.find((l) => l.id === x)?.name || x).join("、") : "";
    return `<tr data-id="${a.id}">
      <td>${a.photoUrl ? `<img src="${a.photoUrl}" alt="頭像" style="width:36px;height:36px;border-radius:50%;object-fit:cover;"/>` : ""}</td>
      <td>${a.name || ""}</td>
      <td>${a.title || ""}</td>
      <td>${a.email || ""}</td>
      <td>${a.phone || ""}</td>
      <td class="cell-password" contenteditable="true" title="雙擊編輯，Enter 或失焦儲存">${a.password || ""}</td>
      <td class="cell-password-confirm" contenteditable="true" title="雙擊編輯，Enter 或失焦儲存">${a.passwordConfirm || ""}</td>
      <td>${a.emergencyName || ""}</td>
      <td>${a.emergencyRelation || ""}</td>
      <td>${a.emergencyPhone || ""}</td>
      <td>${a.bloodType || ""}</td>
      <td>${a.birthdate || ""}</td>
      <td>${lic}</td>
      <td>${a.role || ""}</td>
      <td>${companyName}</td>
      <td>${service}</td>
      <td>${a.status || ""}</td>
      <td class="cell-actions"><button class="btn" data-act="edit">編輯</button><button class="btn" data-act="del">刪除</button></td>
    </tr>`;
  }).join("");

  const pendingRows = appState.pendingAccounts.map((p) => {
    return `<tr data-id="${p.id}">
      <td>${p.photoUrl ? `<img src="${p.photoUrl}" alt="頭像" style="width:36px;height:36px;border-radius:50%;object-fit:cover;"/>` : ""}</td>
      <td>${p.name || ""}</td>
      <td>${p.title || ""}</td>
      <td>${p.email || ""}</td>
      <td>${p.phone || ""}</td>
      <td>${p.role || "一般"}</td>
      <td>${p.status || "待審核"}</td>
      <td class="cell-actions"><button class="btn" data-act="approve">核准</button><button class="btn" data-act="del">刪除</button></td>
    </tr>`;
  }).join("");

  settingsContent.innerHTML = `
    <div class="block" id="block-accounts">
      <div class="block-header"><span class="block-title">帳號列表</span><div class="block-actions"><button id="btnAddAccount" class="btn">新增</button></div></div>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>大頭照</th><th>中文姓名</th><th>職稱</th><th>電子郵件</th><th>手機號碼</th><th>預設密碼</th><th>確認密碼</th><th>緊急聯絡人</th><th>緊急聯絡人關係</th><th>緊急聯絡人手機號碼</th><th>血型</th><th>出生年月日</th><th>相關證照</th><th>角色</th><th>公司</th><th>服務社區</th><th>狀況</th><th>操作</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>

    <div class="block" id="block-pending-accounts">
      <div class="block-header"><span class="block-title">待審核帳號</span></div>
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>大頭照</th><th>中文姓名</th><th>職稱</th><th>電子郵件</th><th>手機號碼</th><th>角色</th><th>狀況</th><th>操作</th>
            </tr>
          </thead>
          <tbody>${pendingRows}</tbody>
        </table>
      </div>
    </div>`;

  const btnAdd = document.getElementById("btnAddAccount");
  attachPressInteractions(btnAdd);
  btnAdd.addEventListener("click", () => {
    openModal({
      title: "新增帳號",
      fields: [
        { key: "photoUrl", label: "大頭照", type: "file" },
        { key: "name", label: "中文姓名", type: "text" },
        { key: "title", label: "職稱", type: "text" },
        { key: "email", label: "電子郵件", type: "email" },
        { key: "phone", label: "手機號碼", type: "text" },
        { key: "password", label: "預設密碼", type: "text" },
        { key: "passwordConfirm", label: "確認密碼", type: "text" },
        { key: "emergencyName", label: "緊急聯絡人", type: "text" },
        { key: "emergencyRelation", label: "緊急聯絡人關係", type: "text" },
        { key: "emergencyPhone", label: "緊急聯絡人手機號碼", type: "text" },
        { key: "bloodType", label: "血型", type: "select", options: ["A","B","O","AB"].map((x)=>({value:x,label:x})) },
        { key: "birthdate", label: "出生年月日", type: "date" },
        { key: "licenses", label: "相關證照", type: "multiselect", options: optionList(appState.licenses) },
        { key: "role", label: "角色", type: "select", options: getRoles().map((r)=>({value:r,label:r})) },
        { key: "companyId", label: "公司", type: "select", options: optionList(appState.companies) },
        { key: "serviceCommunities", label: "服務社區", type: "multiselect", options: optionList(appState.communities) },
        { key: "pagePermissions", label: "頁面權限", type: "multiselect", options: [
          { value: "checkin", label: "打卡" },
          { value: "leader", label: "幹部" },
          { value: "manage", label: "管理" },
          { value: "feature", label: "功能" },
          { value: "settings", label: "設定" },
        ] },
        { key: "status", label: "狀況", type: "select", options: ["在職","離職"].map((x)=>({value:x,label:x})) },
      ],
      onSubmit: async (d) => {
        try {
          if (appState.currentUserRole !== "系統管理員") {
            alert("權限不足：只有系統管理員可以新增帳號。");
            return false;
          }
          if (!db || !fns.addDoc || !fns.collection) throw new Error("Firestore 未初始化");

          // 驗證密碼一致（若有提供）
          if (d.password && d.passwordConfirm && d.password !== d.passwordConfirm) {
            alert("預設密碼與確認密碼不一致。");
            return false;
          }

          // 嘗試透過雲端函式建立 Auth 使用者（不影響目前登入的管理員）
          let createdUid = null;
          if (fns.functions && fns.httpsCallable && d.email && d.password) {
            try {
              const createUser = fns.httpsCallable(fns.functions, "adminCreateUser");
              const res = await createUser({
                email: d.email,
                password: d.password,
                name: d.name || "",
                photoUrl: d.photoUrl || "",
              });
              createdUid = res?.data?.uid || null;
            } catch (err) {
              console.warn("adminCreateUser 失敗", err);
              alert("警告：未能建立登入帳號（Auth）。已僅儲存基本資料，請稍後重試或部署雲端函式。");
            }
          }

          const payload = {
            photoUrl: d.photoUrl || "",
            name: d.name || "",
            title: d.title || "",
            email: d.email || "",
            phone: d.phone || "",
            // 不將密碼寫入 Firestore（避免明文儲存）
            uid: createdUid || null,
            emergencyName: d.emergencyName || "",
            emergencyRelation: d.emergencyRelation || "",
            emergencyPhone: d.emergencyPhone || "",
            bloodType: d.bloodType || "",
            birthdate: d.birthdate || "",
            licenses: Array.isArray(d.licenses) ? d.licenses : [],
            role: d.role || "一般",
            companyId: d.companyId || null,
            serviceCommunities: Array.isArray(d.serviceCommunities) ? d.serviceCommunities : [],
            pagePermissions: Array.isArray(d.pagePermissions) ? d.pagePermissions : [],
            status: d.status || "在職",
            createdAt: fns.serverTimestamp(),
          };
          const docRef = await fns.addDoc(fns.collection(db, "users"), payload);
          // 僅在前端狀態保留密碼欄位作為表格顯示，不寫入 Firestore
          appState.accounts.push({ id: docRef.id, ...d, uid: createdUid || null });
        } catch (err) {
          alert(`儲存帳號失敗：${err?.message || err}`);
          return false;
        }
      },
    });
  });

  settingsContent.querySelectorAll("#block-accounts tbody tr").forEach((tr) => {
    const aid = tr.dataset.id;
    tr.querySelectorAll("button").forEach((b) => attachPressInteractions(b));
    tr.addEventListener("click", (e) => {
      const act = e.target?.dataset?.act;
      const a = appState.accounts.find((x) => x.id === aid);
      if (!a) return;
      if (act === "edit") {
        openModal({
          title: "編輯帳號",
          fields: [
            { key: "photoUrl", label: "大頭照", type: "file" },
            { key: "name", label: "中文姓名", type: "text" },
            { key: "title", label: "職稱", type: "text" },
            { key: "email", label: "電子郵件", type: "email" },
            { key: "phone", label: "手機號碼", type: "text" },
            { key: "password", label: "預設密碼", type: "text" },
            { key: "passwordConfirm", label: "確認密碼", type: "text" },
            { key: "emergencyName", label: "緊急聯絡人", type: "text" },
            { key: "emergencyRelation", label: "緊急聯絡人關係", type: "text" },
            { key: "emergencyPhone", label: "緊急聯絡人手機號碼", type: "text" },
            { key: "bloodType", label: "血型", type: "select", options: ["A","B","O","AB"].map((x)=>({value:x,label:x})) },
            { key: "birthdate", label: "出生年月日", type: "date" },
            { key: "licenses", label: "相關證照", type: "multiselect", options: optionList(appState.licenses) },
            { key: "role", label: "角色", type: "select", options: getRoles().map((r)=>({value:r,label:r})) },
            { key: "companyId", label: "公司", type: "select", options: optionList(appState.companies) },
            { key: "serviceCommunities", label: "服務社區", type: "multiselect", options: optionList(appState.communities) },
            { key: "pagePermissions", label: "頁面權限", type: "multiselect", options: [
              { value: "checkin", label: "打卡" },
              { value: "leader", label: "幹部" },
              { value: "manage", label: "管理" },
              { value: "feature", label: "功能" },
              { value: "settings", label: "設定" },
            ] },
            { key: "status", label: "狀況", type: "select", options: ["在職","離職"].map((x)=>({value:x,label:x})) },
          ],
          initial: a,
          onSubmit: async (d) => {
            try {
              if (appState.currentUserRole !== "系統管理員") {
                alert("權限不足：只有系統管理員可以編輯帳號。");
                return false;
              }
              if (!db || !fns.setDoc || !fns.doc) throw new Error("Firestore 未初始化");

              // 若提供新密碼且確認一致，呼叫雲端函式更新 Auth 密碼
              if (d.password && d.passwordConfirm) {
                if (d.password !== d.passwordConfirm) {
                  alert("新密碼與確認密碼不一致。");
                  return false;
                }
                if (fns.functions && fns.httpsCallable) {
                  try {
                    const updatePwd = fns.httpsCallable(fns.functions, "adminUpdateUserPassword");
                    await updatePwd({
                      uid: a.uid || null,
                      email: a.email || d.email || null,
                      newPassword: d.password,
                    });
                    alert("已更新登入頁面的密碼。");
                  } catch (err) {
                    console.warn("adminUpdateUserPassword 失敗", err);
                    alert("更新登入密碼失敗：請稍後重試或確認雲端函式部署與權限設定。");
                    return false;
                  }
                } else {
                  alert("尚未設定雲端函式，無法更新登入密碼。");
                  return false;
                }
              }

              const payload = {
                photoUrl: d.photoUrl ?? a.photoUrl ?? "",
                name: d.name ?? a.name ?? "",
                title: d.title ?? a.title ?? "",
                email: d.email ?? a.email ?? "",
                phone: d.phone ?? a.phone ?? "",
                // 不將密碼寫入 Firestore（避免明文儲存）
                uid: a.uid || null,
                emergencyName: d.emergencyName ?? a.emergencyName ?? "",
                emergencyRelation: d.emergencyRelation ?? a.emergencyRelation ?? "",
                emergencyPhone: d.emergencyPhone ?? a.emergencyPhone ?? "",
                bloodType: d.bloodType ?? a.bloodType ?? "",
                birthdate: d.birthdate ?? a.birthdate ?? "",
                licenses: Array.isArray(d.licenses) ? d.licenses : (Array.isArray(a.licenses) ? a.licenses : []),
                role: d.role ?? a.role ?? "一般",
                companyId: d.companyId ?? a.companyId ?? null,
                serviceCommunities: Array.isArray(d.serviceCommunities) ? d.serviceCommunities : (Array.isArray(a.serviceCommunities) ? a.serviceCommunities : []),
                pagePermissions: Array.isArray(d.pagePermissions) ? d.pagePermissions : (Array.isArray(a.pagePermissions) ? a.pagePermissions : []),
                status: d.status ?? a.status ?? "在職",
                updatedAt: fns.serverTimestamp(),
              };
              await fns.setDoc(fns.doc(db, "users", aid), payload, { merge: true });
              // 在前端狀態更新顯示資料（保留密碼欄位僅供表格顯示，不寫入 Firestore）
              Object.assign(a, { ...d, uid: payload.uid });
            } catch (err) {
              alert(`更新帳號失敗：${err?.message || err}`);
              return false;
            }
          },
        });
      } else if (act === "del") {
        (async () => {
          if (appState.currentUserRole !== "系統管理員") {
            alert("權限不足：只有系統管理員可以刪除帳號。");
            return;
          }
          const ok = await confirmAction({ title: "確認刪除帳號", text: `確定要刪除帳號「${a.name || a.email || aid}」嗎？此動作無法復原。`, confirmText: "刪除" });
          if (!ok) return;
          try {
            if (!db || !fns.deleteDoc || !fns.doc) throw new Error("Firestore 未初始化");
            await fns.deleteDoc(fns.doc(db, "users", aid));
            appState.accounts = appState.accounts.filter((x) => x.id !== aid);
            renderSettingsContent("帳號");
          } catch (err) {
            alert(`刪除帳號失敗：${err?.message || err}`);
          }
        })();
      }
    });

    // 內嵌密碼編輯：在失焦或按 Enter 觸發更新
    const pwdCell = tr.querySelector(".cell-password");
    const confirmCell = tr.querySelector(".cell-password-confirm");
    [pwdCell, confirmCell].forEach((cell) => {
      if (!cell) return;
      cell.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          cell.blur();
        }
      });
      cell.addEventListener("blur", async () => {
        const a = appState.accounts.find((x) => x.id === aid);
        if (!a) return;
        const newPwd = (pwdCell?.textContent || "").trim();
        const newConfirm = (confirmCell?.textContent || "").trim();
        // 若兩者皆空，不做事
        if (!newPwd && !newConfirm) return;
        if (newPwd !== newConfirm) {
          alert("新密碼與確認密碼不一致。");
          return;
        }
        if (appState.currentUserRole !== "系統管理員") {
          alert("權限不足：只有系統管理員可以更新密碼。");
          return;
        }
        if (!(fns.functions && fns.httpsCallable)) {
          alert("尚未設定雲端函式，無法更新登入密碼。");
          return;
        }
        try {
          const updatePwd = fns.httpsCallable(fns.functions, "adminUpdateUserPassword");
          await updatePwd({
            uid: a.uid || null,
            email: a.email || null,
            newPassword: newPwd,
          });
          alert("已更新登入頁面的密碼。");
          // 更新前端表格顯示值
          a.password = newPwd;
          a.passwordConfirm = newConfirm;
        } catch (err) {
          alert(`更新登入密碼失敗：${err?.message || err}`);
        }
      });
    });
  });

  // 待審核帳號事件綁定
  settingsContent.querySelectorAll("#block-pending-accounts tbody tr").forEach((tr) => {
    const pid = tr.dataset.id;
    tr.querySelectorAll("button").forEach((b) => attachPressInteractions(b));
    tr.addEventListener("click", (e) => {
      const act = e.target?.dataset?.act;
      const item = appState.pendingAccounts.find((x) => x.id === pid);
      if (!act || !item) return;
      if (act === "approve") {
        (async () => {
          try {
            if (appState.currentUserRole !== "系統管理員") {
              alert("權限不足：只有系統管理員可以核准帳號。");
              return;
            }
            // 寫入 users 集合（不含密碼），狀態設為在職
            if (!db || !fns.addDoc || !fns.collection || !fns.deleteDoc || !fns.doc) throw new Error("Firestore 未初始化");
            const payload = {
              photoUrl: item.photoUrl || "",
              name: item.name || "",
              title: item.title || "",
              email: item.email || "",
              phone: item.phone || "",
              licenses: Array.isArray(item.licenses) ? item.licenses : [],
              role: item.role || "一般",
              companyId: item.companyId || null,
              serviceCommunities: Array.isArray(item.serviceCommunities) ? item.serviceCommunities : [],
              pagePermissions: Array.isArray(item.pagePermissions) ? item.pagePermissions : [],
              status: "在職",
              createdAt: fns.serverTimestamp(),
            };
            const userDoc = await fns.addDoc(fns.collection(db, "users"), payload);

            // 可選：建立 Auth 帳號，預設密碼為 000000（可在帳號列表中再更新）
            if (fns.functions && fns.httpsCallable && item.email) {
              try {
                const createUser = fns.httpsCallable(fns.functions, "adminCreateUser");
                await createUser({ email: item.email, password: "000000", name: item.name || "", photoUrl: item.photoUrl || "" });
              } catch (err) {
                console.warn("核准時建立 Auth 失敗", err);
                alert("警告：未能建立登入帳號（Auth）。你可稍後在帳號列表編輯密碼或部署雲端函式。");
              }
            }

            // 刪除待審核紀錄
            await fns.deleteDoc(fns.doc(db, "pendingAccounts", pid));

            // 更新前端狀態與 UI
            appState.accounts.push({ id: userDoc.id, ...payload });
            appState.pendingAccounts = appState.pendingAccounts.filter((x) => x.id !== pid);
            renderSettingsContent("帳號");
          } catch (err) {
            alert(`核准帳號失敗：${err?.message || err}`);
          }
        })();
      } else if (act === "del") {
        (async () => {
          const ok = await confirmAction({ title: "確認刪除待審核帳號", text: `確定要刪除此待審核帳號「${item.name || item.email || pid}」嗎？`, confirmText: "刪除" });
          if (!ok) return;
          try {
            if (db && fns.deleteDoc && fns.doc) {
              await fns.deleteDoc(fns.doc(db, "pendingAccounts", pid));
            }
          } catch (err) {
            console.warn("刪除 Firestore 待審核紀錄失敗：", err);
          }
          appState.pendingAccounts = appState.pendingAccounts.filter((x) => x.id !== pid);
          renderSettingsContent("帳號");
        })();
      }
    });
  });
}


// ===== 3) 檢查是否已設定 API 金鑰 =====
function isConfigReady() {
  const cfg = FIREBASE_CONFIG || {};
  return (
    !!cfg.apiKey && !cfg.apiKey.startsWith("YOUR_") &&
    !!cfg.projectId && !cfg.projectId.startsWith("YOUR_") &&
    !!cfg.appId && !cfg.appId.startsWith("YOUR_")
  );
}

if (!isConfigReady()) {
  setupWarning.classList.remove("hidden");
  loginView.classList.remove("hidden");
  appView.classList.add("hidden");
  emailSignInBtn.disabled = true;
} else {
  setupWarning.classList.add("hidden");
  emailSignInBtn.disabled = false;
}

// ===== 4) 動態載入 Firebase 模組並初始化 =====
let firebaseApp, auth, db, functionsApp;
// 將常用 Firebase 函式存到外層，讓按鈕事件可即時呼叫
let fns = {
  signInWithEmailAndPassword: null,
  createUserWithEmailAndPassword: null,
  signOut: null,
  doc: null,
  getDoc: null,
  setDoc: null,
  addDoc: null,
  collection: null,
  deleteDoc: null,
  updateDoc: null,
  serverTimestamp: null,
  // Firebase Functions（雲端函式）
  functions: null,
  httpsCallable: null,
};

async function ensureFirebase() {
  if (!isConfigReady()) return;
  const [
    { initializeApp },
    { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword },
    { getFirestore, doc, getDoc, setDoc, addDoc, collection, getDocs, deleteDoc, updateDoc, serverTimestamp },
    { getFunctions, httpsCallable },
  ] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"),
    import("https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js"),
  ]);

  // 初始化 Firebase
  firebaseApp = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  functionsApp = getFunctions(firebaseApp);

  // 將函式指派到外層供事件使用
  fns.signInWithEmailAndPassword = signInWithEmailAndPassword;
  fns.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
  fns.signOut = signOut;
  fns.doc = doc;
  fns.getDoc = getDoc;
  fns.setDoc = setDoc;
  fns.addDoc = addDoc;
  fns.collection = collection;
  fns.getDocs = getDocs;
  fns.deleteDoc = deleteDoc;
  fns.updateDoc = updateDoc;
  fns.serverTimestamp = serverTimestamp;
  // 雲端函式
  fns.functions = functionsApp;
  fns.httpsCallable = httpsCallable;

  // 監聽登入狀態（容錯：若網路或授權網域設定不完整，改為顯示登入頁）
  try {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 顯示主頁
        loginView.classList.add("hidden");
        appView.classList.remove("hidden");

      // 先以 Auth 設定頁首使用者資訊（後續以 Firestore 覆蓋）
      userNameEl.textContent = user.displayName || user.email || "使用者";
      if (userPhotoEl) {
        if (user.photoURL) userPhotoEl.src = user.photoURL; else userPhotoEl.removeAttribute("src");
        // 將頭像設為按鈕：點擊開啟個人資訊與登出
        userPhotoEl.onclick = () => showProfileModal(user, role);
      }

      // 確認或建立使用者文件（role 欄位）
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      let role = "一般";
      if (userSnap.exists()) {
        const data = userSnap.data();
        role = data.role || role;
        // 以 Firestore 使用者資料覆蓋頁首姓名與照片（若有）
        const displayName = data.name || user.displayName || user.email || "使用者";
        userNameEl.textContent = displayName;
        if (userPhotoEl) {
          const photoFromDoc = data.photoUrl || "";
          if (photoFromDoc) userPhotoEl.src = photoFromDoc; else if (user.photoURL) userPhotoEl.src = user.photoURL; else userPhotoEl.removeAttribute("src");
        }
      } else {
        await setDoc(userDocRef, { role, name: user.displayName || "使用者", email: user.email || "", createdAt: serverTimestamp() });
      }
      // 將目前使用者資訊保存於 appState 供權限檢查
      appState.currentUserId = user.uid;
      appState.currentUserRole = role;
      // 身份資訊可移至頁首或設定分頁說明；此處改為由子分頁顯示邏輯控制

      // 依帳號「頁面權限」控制可見的分頁（首頁永遠顯示）
      applyPagePermissionsForUser(user);

      // 從 Firestore 載入 users 清單，帶入帳號列表
      await loadAccountsFromFirestore();

      // 從 Firestore 載入 設定→一般 所需清單（公司、區域、證照）
      await Promise.all([
        loadCompaniesFromFirestore(),
        loadRegionsFromFirestore(),
        loadLicensesFromFirestore(),
        loadCommunitiesFromFirestore(),
      ]);
      // 載入待審核帳號
      await loadPendingAccountsFromFirestore();
      if (activeMainTab === "settings" && activeSubTab === "一般") renderSettingsContent("一般");

        // 啟用定位顯示
        initGeolocation();

        // 綁定打卡
        checkinBtn.addEventListener("click", () => doCheckin(user, role));
      } else {
        // 顯示登入頁
        appView.classList.add("hidden");
        loginView.classList.remove("hidden");
        userNameEl.textContent = "未登入";
        userPhotoEl.removeAttribute("src");
        // 登出時恢復顯示所有分頁
        resetPagePermissions();
      }
    });
  } catch (err) {
    // 提示使用者可能需要在 Firebase Authentication 設定中加入授權網域（localhost/127.0.0.1）
    console.warn("Firebase Auth 狀態監聽失敗：", err);
    setupWarning.classList.remove("hidden");
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
    emailSignInBtn.disabled = true;
  }

  // 分頁切換
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  async function loadAccountsFromFirestore() {
    if (!db || !fns.getDocs || !fns.collection) return;
    try {
      const snap = await fns.getDocs(fns.collection(db, "users"));
      const items = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() || {};
        items.push({
          id: docSnap.id,
          photoUrl: d.photoUrl || "",
          name: d.name || "",
          title: d.title || "",
          email: d.email || "",
          phone: d.phone || "",
          password: d.password || "",
          passwordConfirm: d.passwordConfirm || "",
          emergencyName: d.emergencyName || "",
          emergencyRelation: d.emergencyRelation || "",
          emergencyPhone: d.emergencyPhone || "",
          bloodType: d.bloodType || "",
          birthdate: d.birthdate || "",
          licenses: Array.isArray(d.licenses) ? d.licenses : [],
          role: d.role || "一般",
          companyId: d.companyId || null,
          serviceCommunities: Array.isArray(d.serviceCommunities) ? d.serviceCommunities : [],
          pagePermissions: Array.isArray(d.pagePermissions) ? d.pagePermissions : [],
          status: d.status || "在職",
        });
      });
      items.forEach((it) => {
        const idx = appState.accounts.findIndex((a) => a.id === it.id);
        if (idx >= 0) {
          appState.accounts[idx] = { ...appState.accounts[idx], ...it };
        } else {
          appState.accounts.push(it);
        }
      });
      if (activeMainTab === "settings" && activeSubTab === "帳號") renderSettingsContent("帳號");
    } catch (err) {
      console.warn("載入 Firestore users 失敗：", err);
    }
  }

  async function loadCompaniesFromFirestore() {
    if (!db || !fns.getDocs || !fns.collection) return;
    try {
      const snap = await fns.getDocs(fns.collection(db, "companies"));
      const items = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() || {};
        items.push({ id: docSnap.id, name: d.name || "", coords: d.coords || "" });
      });
      items.forEach((it) => {
        const idx = appState.companies.findIndex((a) => a.id === it.id);
        if (idx >= 0) appState.companies[idx] = { ...appState.companies[idx], ...it }; else appState.companies.push(it);
      });
    } catch (err) {
      console.warn("載入 Firestore companies 失敗：", err);
    }
  }

  async function loadRegionsFromFirestore() {
    if (!db || !fns.getDocs || !fns.collection) return;
    try {
      const snap = await fns.getDocs(fns.collection(db, "regions"));
      const items = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() || {};
        items.push({ id: docSnap.id, name: d.name || "" });
      });
      items.forEach((it) => {
        const idx = appState.regions.findIndex((a) => a.id === it.id);
        if (idx >= 0) appState.regions[idx] = { ...appState.regions[idx], ...it }; else appState.regions.push(it);
      });
    } catch (err) {
      console.warn("載入 Firestore regions 失敗：", err);
    }
  }

  async function loadLicensesFromFirestore() {
    if (!db || !fns.getDocs || !fns.collection) return;
    try {
      const snap = await fns.getDocs(fns.collection(db, "licenses"));
      const items = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() || {};
        items.push({ id: docSnap.id, name: d.name || "" });
      });
      items.forEach((it) => {
        const idx = appState.licenses.findIndex((a) => a.id === it.id);
        if (idx >= 0) appState.licenses[idx] = { ...appState.licenses[idx], ...it }; else appState.licenses.push(it);
      });
    } catch (err) {
      console.warn("載入 Firestore licenses 失敗：", err);
    }
  }

  async function loadCommunitiesFromFirestore() {
    if (!db || !fns.getDocs || !fns.collection) return;
    try {
      const snap = await fns.getDocs(fns.collection(db, "communities"));
      const items = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() || {};
        items.push({
          id: docSnap.id,
          code: d.code || "",
          name: d.name || "",
          regionId: d.regionId || null,
          coords: d.coords || "",
          address: d.address || "",
          radiusMeters: d.radiusMeters ?? null,
        });
      });
      items.forEach((it) => {
        const idx = appState.communities.findIndex((a) => a.id === it.id);
        if (idx >= 0) appState.communities[idx] = { ...appState.communities[idx], ...it }; else appState.communities.push(it);
      });
      if (activeMainTab === "settings" && activeSubTab === "社區") renderSettingsContent("社區");
    } catch (err) {
      console.warn("載入 Firestore communities 失敗：", err);
    }
  }

  function applyPagePermissionsForUser(user) {
    try {
      const account = appState.accounts.find((a) => a.email && user.email && a.email.toLowerCase() === user.email.toLowerCase());
      const allowed = new Set(["home"]);
      if (account && Array.isArray(account.pagePermissions) && account.pagePermissions.length) {
        account.pagePermissions.forEach((k) => allowed.add(k));
        tabButtons.forEach((b) => {
          const k = b.dataset.tab;
          if (!allowed.has(k)) b.classList.add("hidden"); else b.classList.remove("hidden");
        });
        // 若目前選中的分頁不在允許清單，切回首頁
        if (activeMainTab && !allowed.has(activeMainTab)) setActiveTab("home");
      } else {
        // 未設定權限時顯示所有分頁
        tabButtons.forEach((b) => b.classList.remove("hidden"));
      }
    } catch (_) {
      // 任意錯誤下，顯示所有分頁
      tabButtons.forEach((b) => b.classList.remove("hidden"));
    }
  }

  function resetPagePermissions() {
    tabButtons.forEach((b) => b.classList.remove("hidden"));
  }

  function setActiveTab(tab) {
    activeMainTab = tab;
    tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    homeSection.classList.toggle("hidden", tab !== "home");
    checkinSection.classList.toggle("hidden", tab !== "checkin");
    leaderSection.classList.toggle("hidden", tab !== "leader");
    manageSection.classList.toggle("hidden", tab !== "manage");
    featureSection.classList.toggle("hidden", tab !== "feature");
    settingsSection.classList.toggle("hidden", tab !== "settings");
    renderSubTabs(tab);
  }

  function renderSubTabs(mainTab) {
    const tabs = SUB_TABS[mainTab] || [];
    subTabsEl.innerHTML = "";
    if (!tabs.length) return;
    tabs.forEach((label, idx) => {
      const btn = document.createElement("button");
      btn.className = "subtab-btn";
      btn.textContent = label;
      btn.dataset.subtab = label;
      btn.addEventListener("click", () => setActiveSubTab(label));
      // 掛載按鈕按下互動效果（滑鼠/觸控）
      attachPressInteractions(btn);
      subTabsEl.appendChild(btn);
      if (idx === 0) activeSubTab = label;
    });
    setActiveSubTab(activeSubTab);
  }

  function setActiveSubTab(label) {
    activeSubTab = label;
    Array.from(subTabsEl.querySelectorAll(".subtab-btn")).forEach((b) => {
      b.classList.toggle("active", b.dataset.subtab === label);
    });
    // 更新各分頁的子分頁標題（作占位）
    if (activeMainTab === "checkin") {
      checkinSubTitle.textContent = label;
    } else if (activeMainTab === "leader") {
      leaderSubTitle.textContent = label;
    } else if (activeMainTab === "manage") {
      manageSubTitle.textContent = label;
    } else if (activeMainTab === "feature") {
      featureSubTitle.textContent = label;
    } else if (activeMainTab === "settings") {
      settingsSubTitle.textContent = label;
      renderSettingsContent(label);
    }
  }

  // 初始分頁
  setActiveTab("home");

  // 內部功能：定位與打卡
  function initGeolocation() {
    if (!("geolocation" in navigator)) {
      locationInfo.textContent = "此裝置不支援定位";
      return;
    }
  navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        locationInfo.textContent = `目前位置：${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      },
      (err) => {
        locationInfo.textContent = `定位失敗：${err?.message || err}`;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function doCheckin(user, role) {
    try {
      // 再次取得位置（若可）
      let lat, lng;
      if ("geolocation" in navigator) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              lat = pos.coords.latitude;
              lng = pos.coords.longitude;
              resolve();
            },
            () => resolve(),
            { enableHighAccuracy: true, timeout: 8000 }
          );
        });
      }

      const ref = collection(db, "checkins");
      const docRef = await addDoc(ref, {
        uid: user.uid,
        name: user.displayName || user.email || "使用者",
        role,
        lat: lat ?? null,
        lng: lng ?? null,
        createdAt: serverTimestamp(),
      });
      checkinResult.textContent = `打卡成功：${docRef.id}`;
    } catch (err) {
      checkinResult.textContent = `打卡失敗：${err?.message || err}`;
    }
  }
}

// ===== 5) 事件綁定（即使首次載入尚未初始化，也能觸發） =====
emailSignInBtn?.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    alert("請輸入電子郵件與密碼");
    return;
  }
  if (!isConfigReady()) {
    alert("尚未設定 Firebase 金鑰，請於 app.js 補齊。");
    return;
  }
  if (!auth || !fns.signInWithEmailAndPassword) {
    await ensureFirebase();
  }
  try {
    await fns.signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert(`登入失敗：${err?.message || err}`);
  }
});

initAdminBtn?.addEventListener("click", async () => {
  const email = emailInput.value.trim() || "admin@nw-checkin.local";
  const password = passwordInput.value || "Admin2026!";
  if (!isConfigReady()) {
    alert("尚未設定 Firebase 金鑰，請於 app.js 補齊。");
    return;
  }
  if (!auth || !fns.createUserWithEmailAndPassword) {
    await ensureFirebase();
  }
  try {
    const cred = await fns.createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    const userDocRef = fns.doc(db, "users", user.uid);
    await fns.setDoc(userDocRef, { role: "系統管理員", name: user.email || "管理員", createdAt: fns.serverTimestamp() });
    alert("管理員初始化完成，已自動登入。");
  } catch (err) {
    alert(`初始化失敗：${err?.message || err}`);
  }
});

// 啟動：若設定已就緒，先行初始化以載入使用者狀態
(async () => {
  if (isConfigReady()) {
    await ensureFirebase();
  }
})();
// 子分頁定義（頁中上）
const SUB_TABS = {
  home: [],
  checkin: ["紀錄", "請假", "計點"],
  leader: ["地圖", "紀錄", "請假", "計點"],
  manage: ["總覽", "地圖", "記錄", "請假", "計點"],
  feature: ["公告", "文件", "工具"],
  settings: ["一般", "帳號", "社區", "規則", "系統"],
};

let activeMainTab = "home";
let activeSubTab = null;