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
const applyAccountBtn = document.getElementById("applyAccountBtn");
const togglePasswordBtn = document.getElementById("togglePassword");
const togglePasswordIcon = document.getElementById("togglePasswordIcon");

const userNameEl = document.getElementById("userName");
const userPhotoEl = document.getElementById("userPhoto");
const subTabsEl = document.getElementById("subTabs");
const homeHero = document.getElementById("homeHero");
const homeHeroPhoto = document.getElementById("homeHeroPhoto");
// 首頁：A/B/C/D/E 堆疊容器
const homeHeaderStack = document.getElementById("homeHeaderStack");
// 首頁：地圖覆蓋層
const homeMapOverlay = document.getElementById("homeMapOverlay");
const homeMapImg = document.getElementById("homeMapImg");
// 首頁：日期、時間、農曆
const homeTimeEl = document.getElementById("homeTime");
const homeDateEl = document.getElementById("homeDate");
// 首頁 D 區塊：登入者姓名（顯示於地圖之上、文字之下）
const homeHeaderNameEl = document.getElementById("homeHeaderName");
// 舊版農曆元素（首頁已不再顯示），保留為相容但不再更新
const homeLunarEl = document.getElementById("homeLunar");
let homeClockTimer = null;
let lastCoords = null;
let geoRefreshTimer = null;
// 首頁：頁中 F–K（狀態與操作）
const homeMidStack = document.getElementById("homeMidStack");
const homeStatusEl = document.getElementById("homeStatus");
const btnStart = document.getElementById("btnStart");
const btnEnd = document.getElementById("btnEnd");
const btnOut = document.getElementById("btnOut");
const btnArrive = document.getElementById("btnArrive");
const btnReturn = document.getElementById("btnReturn");
const btnLeave = document.getElementById("btnLeave");
const btnLeaveRequest = document.getElementById("btnLeaveRequest");
const btnMakeup = document.getElementById("btnMakeup");

function updateHomeMap() {
  if (!homeMapImg || !lastCoords) return;
  const { latitude, longitude } = lastCoords;
  const lat = Number(latitude).toFixed(6);
  const lon = Number(longitude).toFixed(6);
  // 使用 Google 靜態地圖（目前位置）並疊加於頁首紅色區塊
  const size = "1200x600"; // 大尺寸以便縮放覆蓋 40vh
  const zoom = 15;
  const marker = `markers=color:red|${lat},${lon}`;
  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lon}&zoom=${zoom}&size=${size}&maptype=roadmap&${marker}&key=${GOOGLE_MAPS_API_KEY}`;
  homeMapImg.src = url;
}

function two(n) { return n < 10 ? "0" + n : "" + n; }
function nowInTZ(tz) {
  // 取得指定時區的本地時間對應的 Date 物件
  const str = new Date().toLocaleString('en-US', { timeZone: tz });
  return new Date(str);
}
function formatDateYYYYMMDD(d) {
  return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
}
// 近似判斷當日是否為 24 節氣（本地時區），若符合顯示節氣名稱
function getApproxSolarTerm(date) {
  const md = two(date.getMonth() + 1) + '-' + two(date.getDate());
  const terms = {
    '01-05': '小寒', '01-06': '小寒',
    '01-20': '大寒', '01-21': '大寒',
    '02-03': '立春', '02-04': '立春', '02-05': '立春',
    '02-18': '雨水', '02-19': '雨水', '02-20': '雨水',
    '03-05': '驚蟄', '03-06': '驚蟄',
    '03-20': '春分', '03-21': '春分',
    '04-04': '清明', '04-05': '清明',
    '04-19': '穀雨', '04-20': '穀雨',
    '05-05': '立夏', '05-06': '立夏', '05-07': '立夏',
    '05-20': '小滿', '05-21': '小滿', '05-22': '小滿',
    '06-05': '芒種', '06-06': '芒種',
    '06-21': '夏至', '06-22': '夏至',
    '07-06': '小暑', '07-07': '小暑', '07-08': '小暑',
    '07-22': '大暑', '07-23': '大暑', '07-24': '大暑',
    '08-07': '立秋', '08-08': '立秋', '08-09': '立秋',
    '08-22': '處暑', '08-23': '處暑', '08-24': '處暑',
    '09-07': '白露', '09-08': '白露', '09-09': '白露',
    '09-22': '秋分', '09-23': '秋分', '09-24': '秋分',
    '10-08': '寒露', '10-09': '寒露',
    '10-23': '霜降', '10-24': '霜降',
    '11-07': '立冬', '11-08': '立冬',
    '11-22': '小雪', '11-23': '小雪',
    '12-06': '大雪', '12-07': '大雪', '12-08': '大雪',
    '12-21': '冬至', '12-22': '冬至', '12-23': '冬至'
  };
  return terms[md] || '';
}
function getLunarString(d) {
  // 優先使用 Intl 中文曆（指定台灣時區），部分行動裝置會因時區差造成隔天偏移
  try {
    const fmt = new Intl.DateTimeFormat('zh-TW-u-ca-chinese', { timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric' });
    const lunar = fmt.format(d);
    const term = getApproxSolarTerm(d);
    return term ? `農曆 ${lunar}（${term}）` : `農曆 ${lunar}`;
  } catch (e) {
    // 後備：顯示簡短文字，避免手機不支援時顯示錯誤內容
    return '農曆（裝置不支援）';
  }
}
function updateHomeClockOnce() {
  const now = nowInTZ('Asia/Taipei');
  if (homeTimeEl) homeTimeEl.textContent = `${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}`;
  if (homeDateEl) homeDateEl.textContent = `${formatDateYYYYMMDD(now)} (${weekdayZH(now)})`;
}
function startHomeClock() {
  stopHomeClock();
  updateHomeClockOnce();
  homeClockTimer = setInterval(updateHomeClockOnce, 1000);
}
function stopHomeClock() {
  if (homeClockTimer) { clearInterval(homeClockTimer); homeClockTimer = null; }
}

// 週幾（中）
function weekdayZH(d) {
  const days = "日一二三四五六";
  return days[d.getDay()] || "";
}

// 每 30 秒定位更新（僅首頁且頁籤可見時）
function startGeoRefresh() {
  stopGeoRefresh();
  geoRefreshTimer = setInterval(() => {
    if (document.visibilityState !== 'visible' || activeMainTab !== 'home') return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        lastCoords = pos.coords;
        updateHomeMap();
      }, (err) => {
        // 忽略錯誤，保持上一筆座標
      }, { enableHighAccuracy: false, timeout: 8000, maximumAge: 15000 });
    }
  }, 30000);
}
function stopGeoRefresh() {
  if (geoRefreshTimer) { clearInterval(geoRefreshTimer); geoRefreshTimer = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && activeMainTab === 'home') startGeoRefresh(); else stopGeoRefresh();
});

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
      { id: id(), name: "台北公司", coords: "25.041,121.532", radiusMeters: 100 },
      { id: id(), name: "桃園公司", coords: "24.993,121.301", radiusMeters: 100 },
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

function openModal({ title, fields, initial = {}, submitText = "儲存", onSubmit, message, afterRender, refreshOnSubmit = true }) {
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
  header.appendChild(hTitle);
  // 移除標題列的「關閉」按鈕，改由底部「取消」控制關閉

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
      if (refreshOnSubmit && activeMainTab === "settings" && activeSubTab) {
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
    refreshOnSubmit: false,
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

// 打卡用地圖檢視（不可編輯地址/座標/半徑，顯示目前位置與公司/社區位置與範圍）
function openCheckinMapViewer({ targetName = "", targetCoords = "", targetRadius = 100 }) {
  return new Promise(async (resolve) => {
    await ensureGoogleMaps();
    let currentLat = null, currentLng = null;
    const parseCoords = (str) => {
      const [la, ln] = String(str || "").split(",").map((s) => s.trim());
      const lat = parseFloat(la); const lng = parseFloat(ln);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      return null;
    };
    const target = parseCoords(targetCoords) || { lat: 25.041, lng: 121.532 };

    openModal({
      title: "打卡定位",
      fields: [],
      submitText: "確認",
      // 確認後不觸發設定頁重新渲染，避免流程被中斷
      refreshOnSubmit: false,
      onSubmit: async () => {
        resolve({ lat: currentLat, lng: currentLng });
        return true;
      },
      afterRender: async ({ body, footer }) => {
        const maps = await ensureGoogleMaps();
        const mapBox = document.createElement("div");
        mapBox.style.width = "100%";
        mapBox.style.height = "360px";
        mapBox.style.marginTop = "8px";
        body.appendChild(mapBox);
        const map = new maps.Map(mapBox, { center: target, zoom: 16 });
        // 只顯示打卡範圍，不顯示公司/社區標示
        const circle = new maps.Circle({ strokeColor: "#4285F4", strokeOpacity: 0.8, strokeWeight: 2, fillColor: "#4285F4", fillOpacity: 0.15, map, center: target, radius: Number(targetRadius) || 100 });

        let currentMarker = null;
        const info = document.createElement("div");
        info.className = "muted";
        info.style.marginTop = "8px";
        info.textContent = "定位中…";
        body.appendChild(info);

        const updateCurrent = (lat, lng) => {
          currentLat = lat; currentLng = lng;
          info.textContent = `目前位置：${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          if (!currentMarker) currentMarker = new maps.Marker({ position: { lat, lng }, map, draggable: false, title: "目前位置" });
          else currentMarker.setPosition({ lat, lng });
        };

        // 初次定位
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => { updateCurrent(pos.coords.latitude, pos.coords.longitude); },
            (err) => { info.textContent = `定位失敗：${err?.message || err}`; },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
          );
        } else {
          info.textContent = "此裝置不支援定位";
        }

        // 重新定位按鈕（不可編輯座標/地址/半徑）
        const btnRelocate = document.createElement("button");
        btnRelocate.className = "btn";
        btnRelocate.textContent = "重新定位";
        attachPressInteractions(btnRelocate);
        footer.insertBefore(btnRelocate, footer.querySelector(".btn.btn-primary"));
        btnRelocate.addEventListener("click", () => {
          if ("geolocation" in navigator) {
            info.textContent = "定位中…";
            navigator.geolocation.getCurrentPosition(
              (pos) => { updateCurrent(pos.coords.latitude, pos.coords.longitude); },
              (err) => { info.textContent = `定位失敗：${err?.message || err}`; },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
            );
          }
        });
      },
    });
    const cancelBtn = modalRoot?.querySelector('.modal-footer .btn:not(.btn-primary)');
    cancelBtn?.addEventListener('click', () => resolve(null));
  });
}

function companyStats(companyId) {
  const communityCount = appState.communities.filter((c) => c.companyId === companyId).length;
  const accountsInCompany = appState.accounts.filter((a) => a.companyId === companyId);
  const leaderRoles = new Set(["系統管理員", "管理層", "高階主管", "初階主管", "行政"]);
  const staffRoles = new Set(["一般", "勤務"]);
  const leaderCount = accountsInCompany.filter((a) => leaderRoles.has(a.role)).length;
  const staffCount = accountsInCompany.filter((a) => staffRoles.has(a.role)).length;
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

// 載入 XLSX（SheetJS）
async function ensureXLSX() {
  if (window.XLSX) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("載入 XLSX 失敗"));
    document.head.appendChild(s);
  });
}

async function parseXLSXFile(file) {
  await ensureXLSX();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  return rows;
}

async function exportCommunitiesToXLSX() {
  await ensureXLSX();
  const data = appState.communities.map((c) => {
    const companyName = appState.companies.find((co) => co.id === c.companyId)?.name || "";
    const regionName = appState.regions.find((r) => r.id === c.regionId)?.name || "";
    return {
      公司: companyName,
      社區編號: c.code || "",
      社區名稱: c.name || "",
      地址: c.address || "",
      區域: regionName,
      定位座標: c.coords || "",
      "有效打卡範圍半徑(公尺)": c.radiusMeters ?? "",
    };
  });
  const ws = XLSX.utils.json_to_sheet(data, { skipHeader: false });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "communities");
  XLSX.writeFile(wb, "communities.xlsx");
}

async function importCommunitiesFromXLSX(file) {
  const rows = await parseXLSXFile(file);
  let success = 0, failed = 0;
  for (const r of rows) {
    try {
      const companyName = r["公司"] || "";
      const regionName = r["區域"] || "";
      const companyId = appState.companies.find((co) => (co.name || "") === companyName)?.id || null;
      const regionId = appState.regions.find((rg) => (rg.name || "") === regionName)?.id || null;
      const payload = {
        code: r["社區編號"] || "",
        name: r["社區名稱"] || "",
        address: r["地址"] || "",
        companyId,
        regionId,
        coords: r["定位座標"] || "",
        radiusMeters: r["有效打卡範圍半徑(公尺)"] !== "" ? Number(r["有效打卡範圍半徑(公尺)"]) : null,
        createdAt: fns?.serverTimestamp ? fns.serverTimestamp() : new Date().toISOString(),
      };
      let idNew = null;
      if (db && fns?.addDoc && fns?.collection) {
        const docRef = await fns.addDoc(fns.collection(db, "communities"), payload);
        idNew = docRef.id;
      } else {
        idNew = id();
      }
      appState.communities.push({ id: idNew, ...payload });
      success++;
    } catch (err) {
      console.warn("匯入社區失敗", err);
      failed++;
    }
  }
  alert(`社區匯入完成：成功 ${success} 筆，失敗 ${failed} 筆`);
  renderSettingsContent("社區");
}

async function exportAccountsToXLSX() {
  await ensureXLSX();
  const data = appState.accounts.map((a) => {
    const companyName = appState.companies.find((c) => c.id === a.companyId)?.name || "";
    const service = Array.isArray(a.serviceCommunities) ? a.serviceCommunities.map((id) => appState.communities.find((x) => x.id === id)?.name || id).join("、") : "";
    const lic = Array.isArray(a.licenses) ? a.licenses.map((x) => appState.licenses.find((l) => l.id === x)?.name || x).join("、") : "";
    return {
      中文姓名: a.name || "",
      職稱: a.title || "",
      電子郵件: a.email || "",
      手機號碼: a.phone || "",
      角色: a.role || "",
      公司: companyName,
      服務社區: service,
      狀況: a.status || "",
      相關證照: lic,
      緊急聯絡人: a.emergencyName || "",
      緊急聯絡人關係: a.emergencyRelation || "",
      緊急聯絡人手機號碼: a.emergencyPhone || "",
      血型: a.bloodType || "",
      出生年月日: a.birthdate || "",
    };
  });
  const ws = XLSX.utils.json_to_sheet(data, { skipHeader: false });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "accounts");
  XLSX.writeFile(wb, "accounts.xlsx");
}

async function importAccountsFromXLSX(file) {
  const rows = await parseXLSXFile(file);
  let success = 0, failed = 0;
  const splitNames = (s) => (s || "").split(/[、,]/).map((x) => x.trim()).filter(Boolean);
  for (const r of rows) {
    try {
      const companyName = r["公司"] || "";
      const companyId = appState.companies.find((co) => (co.name || "") === companyName)?.id || null;
      const serviceNames = splitNames(r["服務社區"] || "");
      const serviceIds = serviceNames.map((nm) => appState.communities.find((x) => (x.name || "") === nm)?.id).filter(Boolean);
      const licNames = splitNames(r["相關證照"] || "");
      const licIds = licNames.map((nm) => appState.licenses.find((l) => (l.name || "") === nm)?.id).filter(Boolean);
      const email = r["電子郵件"] || "";
      const payload = {
        photoUrl: "",
        name: r["中文姓名"] || "",
        title: r["職稱"] || "",
        email,
        phone: r["手機號碼"] || "",
        emergencyName: r["緊急聯絡人"] || "",
        emergencyRelation: r["緊急聯絡人關係"] || "",
        emergencyPhone: r["緊急聯絡人手機號碼"] || "",
        bloodType: r["血型"] || "",
        birthdate: r["出生年月日"] || "",
        licenses: licIds,
        role: r["角色"] || "一般",
        companyId,
        serviceCommunities: serviceIds,
        pagePermissions: [],
        status: r["狀況"] || "在職",
        updatedAt: fns?.serverTimestamp ? fns.serverTimestamp() : new Date().toISOString(),
      };
      // 以 Email 去重：存在則更新，否則新增
      let targetId = appState.accounts.find((a) => a.email && email && a.email.toLowerCase() === email.toLowerCase())?.id || null;
      if (db && fns?.setDoc && fns?.doc && targetId) {
        await fns.setDoc(fns.doc(db, "users", targetId), payload, { merge: true });
        const idx = appState.accounts.findIndex((a) => a.id === targetId);
        if (idx >= 0) appState.accounts[idx] = { ...appState.accounts[idx], ...payload };
      } else {
        if (db && fns?.addDoc && fns?.collection) {
          const docRef = await fns.addDoc(fns.collection(db, "users"), payload);
          targetId = docRef.id;
        } else {
          targetId = id();
        }
        appState.accounts.push({ id: targetId, ...payload });
      }
      success++;
    } catch (err) {
      console.warn("匯入帳號失敗", err);
      failed++;
    }
  }
  alert(`帳號匯入完成：成功 ${success} 筆，失敗 ${failed} 筆`);
  renderSettingsContent("帳號");
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
      onSubmit: async (d) => {
        try {
          // 密碼僅用於顯示，不寫入 Firestore
          const pendingPayload = {
            photoUrl: d.photoUrl || "",
            name: d.name || "",
            title: d.title || "",
            email: d.email || "",
            phone: d.phone || "",
            licenses: Array.isArray(d.licenses) ? d.licenses : [],
            role: "一般",
            companyId: null,
            serviceCommunities: [],
            pagePermissions: [],
            status: "待審核",
          };
          if (db && fns.addDoc && fns.collection && fns.serverTimestamp) {
            const docRef = await fns.addDoc(fns.collection(db, "pendingAccounts"), {
              ...pendingPayload,
              createdAt: fns.serverTimestamp(),
            });
            appState.pendingAccounts.push({ id: docRef.id, ...pendingPayload, password: d.password || "", passwordConfirm: d.passwordConfirm || "" });
          } else {
            // Firestore 尚未初始化時，先寫入前端狀態
            appState.pendingAccounts.push({ id: id(), ...pendingPayload, password: d.password || "", passwordConfirm: d.passwordConfirm || "", createdAt: new Date().toISOString() });
          }
          renderSettingsContent("帳號");
          return true;
        } catch (err) {
          alert(`提交帳號申請失敗：${err?.message || err}`);
          return false;
        }
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
        if (typeof payload.photoUrl === "string") {
          if (userPhotoEl) userPhotoEl.src = payload.photoUrl;
          if (homeHeroPhoto) homeHeroPhoto.src = payload.photoUrl;
        }
        if (typeof payload.name === "string") userNameEl.textContent = payload.name ? `歡迎~ ${payload.name}` : userNameEl.textContent;
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
        header.appendChild(btnEdit); // 標題右側加入「編輯」按鈕

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
              <th>名稱</th><th>社區數</th><th>幹部數</th><th>人員數</th><th>定位座標</th><th>打卡半徑(公尺)</th><th>操作</th>
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
                <td>${co.radiusMeters ?? ""}</td>
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
        { key: "radiusMeters", label: "有效打卡範圍半徑(公尺)", type: "number", placeholder: "100" },
      ],
      onSubmit: async (data) => {
        try {
          const payload = { name: data.name || "", coords: data.coords || "", radiusMeters: data.radiusMeters ?? null, createdAt: fns.serverTimestamp ? fns.serverTimestamp() : new Date().toISOString() };
          if (db && fns.addDoc && fns.collection) {
            const docRef = await fns.addDoc(fns.collection(db, "companies"), payload);
            appState.companies.push({ id: docRef.id, name: payload.name, coords: payload.coords, radiusMeters: payload.radiusMeters });
          } else {
            appState.companies.push({ id: id(), name: payload.name, coords: payload.coords, radiusMeters: payload.radiusMeters });
          }
          renderSettingsContent("一般");
          return true;
        } catch (err) {
          alert(`儲存公司失敗：${err?.message || err}`);
          return false;
        }
      },
      afterRender: async ({ body }) => {
        const coordsInput = body.querySelector('[data-key="coords"]');
        const radiusInput = body.querySelector('[data-key="radiusMeters"]');
        const coordsRow = coordsInput?.parentElement;
        if (!coordsRow || !coordsInput) return;
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.textContent = "用地圖選擇";
        attachPressInteractions(btn);
        btn.addEventListener("click", async () => {
          const maps = await ensureGoogleMaps();
          let inline = coordsRow.querySelector(".inline-map-picker");
          if (inline) { inline.classList.toggle("hidden"); return; }
          inline = document.createElement("div");
          inline.className = "inline-map-picker";
          inline.style.marginTop = "8px";
          const mapBox = document.createElement("div");
          mapBox.style.width = "100%";
          mapBox.style.height = "280px";
          inline.appendChild(mapBox);
          const controls = document.createElement("div");
          controls.style.display = "flex";
          controls.style.gap = "8px";
          controls.style.marginTop = "8px";
          const addrInput = document.createElement("input");
          addrInput.className = "input";
          addrInput.placeholder = "輸入地址以定位";
          controls.appendChild(addrInput);
          const btnApply = document.createElement("button");
          btnApply.className = "btn btn-primary";
          btnApply.textContent = "套用";
          attachPressInteractions(btnApply);
          controls.appendChild(btnApply);
          inline.appendChild(controls);
          coordsRow.appendChild(inline);

          const parse = (str) => {
            const [la, ln] = String(str || "").split(",").map((s) => s.trim());
            const lat = parseFloat(la); const lng = parseFloat(ln);
            if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
            return { lat: 25.041, lng: 121.532 };
          };
          const start = parse(coordsInput.value);
          const map = new maps.Map(mapBox, { center: start, zoom: 16 });
          const marker = new maps.Marker({ position: start, map, draggable: true });
          const circle = new maps.Circle({ strokeColor: "#4285F4", strokeOpacity: 0.8, strokeWeight: 2, fillColor: "#4285F4", fillOpacity: 0.15, map, center: start, radius: Number(radiusInput?.value) || 100 });
          const updateFromLatLng = async (lat, lng) => {
            coordsInput.value = `${lat.toFixed(6)},${lng.toFixed(6)}`;
            marker.setPosition({ lat, lng });
            circle.setCenter({ lat, lng });
            try { const res = await reverseGeocode(lat, lng); addrInput.value = res.formatted_address || addrInput.value; } catch {}
          };
          marker.addListener("dragend", (ev) => { const p = ev.latLng; updateFromLatLng(p.lat(), p.lng()); });
          radiusInput?.addEventListener("input", () => { const r = Number(radiusInput.value) || 100; circle.setRadius(r); });
          addrInput.addEventListener("change", async () => {
            const v = addrInput.value?.trim(); if (!v) return;
            try { const res = await geocodeAddress(v); const loc = res.geometry.location; const pos = { lat: loc.lat(), lng: loc.lng() }; map.setCenter(pos); marker.setPosition(pos); circle.setCenter(pos); coordsInput.value = `${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`; } catch {}
          });
          btnApply.addEventListener("click", () => {
            // 套用僅更新欄位，不關閉彈窗，讓使用者再按儲存
          });
        });
        coordsRow.appendChild(btn);
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
            { key: "radiusMeters", label: "有效打卡範圍半徑(公尺)", type: "number" },
          ],
          initial: co,
          onSubmit: async (data) => {
            try {
              const next = { name: data.name ?? co.name, coords: data.coords ?? co.coords, radiusMeters: data.radiusMeters ?? co.radiusMeters ?? null };
              if (db && fns.setDoc && fns.doc) {
                await fns.setDoc(fns.doc(db, "companies", cid), { ...next, updatedAt: fns.serverTimestamp ? fns.serverTimestamp() : new Date().toISOString() }, { merge: true });
              }
              co.name = next.name;
              co.coords = next.coords;
              co.radiusMeters = next.radiusMeters;
              renderSettingsContent("一般");
              return true;
            } catch (err) {
              alert(`更新公司失敗：${err?.message || err}`);
              return false;
            }
          },
          afterRender: async ({ body }) => {
            const coordsInput = body.querySelector('[data-key="coords"]');
            const radiusInput = body.querySelector('[data-key="radiusMeters"]');
            const coordsRow = coordsInput?.parentElement;
            if (!coordsRow || !coordsInput) return;
            const btn = document.createElement("button");
            btn.className = "btn";
            btn.textContent = "用地圖選擇";
            attachPressInteractions(btn);
            btn.addEventListener("click", async () => {
              const maps = await ensureGoogleMaps();
              let inline = coordsRow.querySelector(".inline-map-picker");
              if (inline) { inline.classList.toggle("hidden"); return; }
              inline = document.createElement("div");
              inline.className = "inline-map-picker";
              inline.style.marginTop = "8px";
              const mapBox = document.createElement("div");
              mapBox.style.width = "100%";
              mapBox.style.height = "280px";
              inline.appendChild(mapBox);
              const controls = document.createElement("div");
              controls.style.display = "flex";
              controls.style.gap = "8px";
              controls.style.marginTop = "8px";
              const addrInput = document.createElement("input");
              addrInput.className = "input";
              addrInput.placeholder = "輸入地址以定位";
              controls.appendChild(addrInput);
              const btnApply = document.createElement("button");
              btnApply.className = "btn btn-primary";
              btnApply.textContent = "套用";
              attachPressInteractions(btnApply);
              controls.appendChild(btnApply);
              inline.appendChild(controls);
              coordsRow.appendChild(inline);

              const parse = (str) => {
                const [la, ln] = String(str || "").split(",").map((s) => s.trim());
                const lat = parseFloat(la); const lng = parseFloat(ln);
                if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
                return { lat: 25.041, lng: 121.532 };
              };
              const start = parse(coordsInput.value);
              const map = new maps.Map(mapBox, { center: start, zoom: 16 });
              const marker = new maps.Marker({ position: start, map, draggable: true });
              const circle = new maps.Circle({ strokeColor: "#4285F4", strokeOpacity: 0.8, strokeWeight: 2, fillColor: "#4285F4", fillOpacity: 0.15, map, center: start, radius: Number(radiusInput?.value) || 100 });
              const updateFromLatLng = async (lat, lng) => {
                coordsInput.value = `${lat.toFixed(6)},${lng.toFixed(6)}`;
                marker.setPosition({ lat, lng });
                circle.setCenter({ lat, lng });
                try { const res = await reverseGeocode(lat, lng); addrInput.value = res.formatted_address || addrInput.value; } catch {}
              };
              marker.addListener("dragend", (ev) => { const p = ev.latLng; updateFromLatLng(p.lat(), p.lng()); });
              radiusInput?.addEventListener("input", () => { const r = Number(radiusInput.value) || 100; circle.setRadius(r); });
              addrInput.addEventListener("change", async () => {
                const v = addrInput.value?.trim(); if (!v) return;
                try { const res = await geocodeAddress(v); const loc = res.geometry.location; const pos = { lat: loc.lat(), lng: loc.lng() }; map.setCenter(pos); marker.setPosition(pos); circle.setCenter(pos); coordsInput.value = `${pos.lat.toFixed(6)},${pos.lng.toFixed(6)}`; } catch {}
              });
              btnApply.addEventListener("click", () => {
                // 套用僅更新欄位，不關閉彈窗，讓使用者再按儲存
              });
            });
            coordsRow.appendChild(btn);
          },
        });
      } else if (act === "del") {
        (async () => {
          const ok = await confirmAction({ title: "確認刪除公司", text: `確定要刪除公司「${co.name}」嗎？此動作無法復原。`, confirmText: "刪除" });
          if (!ok) return;
          try {
            if (db && fns.deleteDoc && fns.doc) {
              await fns.deleteDoc(fns.doc(db, "companies", cid));
            }
            appState.companies = appState.companies.filter((c) => c.id !== cid);
            renderSettingsContent("一般");
          } catch (err) {
            alert(`刪除公司失敗：${err?.message || err}`);
            // 雲端刪除失敗時仍執行本地刪除
            appState.companies = appState.companies.filter((c) => c.id !== cid);
            renderSettingsContent("一般");
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
          const payload = { name: data.name || "", createdAt: fns.serverTimestamp ? fns.serverTimestamp() : new Date().toISOString() };
          if (db && fns.addDoc && fns.collection) {
            const docRef = await fns.addDoc(fns.collection(db, "regions"), payload);
            appState.regions.push({ id: docRef.id, name: payload.name });
          } else {
            appState.regions.push({ id: id(), name: payload.name });
          }
          renderSettingsContent("一般");
          return true;
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
            const next = { name: d.name ?? r.name };
            if (db && fns.setDoc && fns.doc) {
              await fns.setDoc(fns.doc(db, "regions", rid), { ...next, updatedAt: fns.serverTimestamp ? fns.serverTimestamp() : new Date().toISOString() }, { merge: true });
            }
            r.name = next.name;
            renderSettingsContent("一般");
            return true;
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
            if (db && fns.deleteDoc && fns.doc) {
              await fns.deleteDoc(fns.doc(db, "regions", rid));
            }
            appState.regions = appState.regions.filter((x) => x.id !== rid);
            renderSettingsContent("一般");
          } catch (err) {
            alert(`刪除區域失敗：${err?.message || err}`);
            // 雲端刪除失敗時仍執行本地刪除
            appState.regions = appState.regions.filter((x) => x.id !== rid);
            renderSettingsContent("一般");
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
    const companyName = appState.companies.find((co) => co.id === c.companyId)?.name || "";
    return `<tr data-id="${c.id}"><td>${companyName}</td><td>${c.code || ""}</td><td>${c.name || ""}</td><td>${c.address || ""}</td><td>${regionName}</td><td>${c.coords || ""}</td><td>${c.radiusMeters ?? ""}</td><td class="cell-actions"><button class="btn" data-act="edit">編輯</button><button class="btn" data-act="del">刪除</button></td></tr>`;
  }).join("");

  settingsContent.innerHTML = `
    <div class="block" id="block-communities">
      <div class="block-header"><span class="block-title">社區列表</span><div class="block-actions"><button id="btnExportCommunities" class="btn">匯出.xlsx</button><button id="btnImportCommunities" class="btn">匯入.xlsx</button><button id="btnAddCommunity" class="btn">新增</button></div></div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>公司</th><th>社區編號</th><th>社區名稱</th><th>地址</th><th>區域</th><th>定位座標</th><th>有效打卡範圍半徑(公尺)</th><th>操作</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;

  // 匯出/匯入事件
  const btnExportC = document.getElementById("btnExportCommunities");
  const btnImportC = document.getElementById("btnImportCommunities");
  [btnExportC, btnImportC].forEach((b) => b && attachPressInteractions(b));
  btnExportC?.addEventListener("click", () => exportCommunitiesToXLSX());
  btnImportC?.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.addEventListener("change", async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        await importCommunitiesFromXLSX(f);
      } catch (err) {
        alert(`匯入社區失敗：${err?.message || err}`);
      }
    });
    input.click();
  });

  const btnAdd = document.getElementById("btnAddCommunity");
  attachPressInteractions(btnAdd);
  btnAdd.addEventListener("click", () => {
    openModal({
      title: "新增社區",
      fields: [
        { key: "code", label: "社區編號", type: "text" },
        { key: "name", label: "社區名稱", type: "text" },
        { key: "address", label: "地址", type: "text" },
        { key: "companyId", label: "所屬公司", type: "select", options: optionList(appState.companies) },
        { key: "regionId", label: "區域", type: "select", options: optionList(appState.regions) },
        { key: "coords", label: "定位座標", type: "text", placeholder: "lat,lng" },
        { key: "radiusMeters", label: "有效打卡範圍半徑(公尺)", type: "number" },
      ],
      onSubmit: async (d) => {
        try {
          if (!db || !fns.addDoc || !fns.collection) throw new Error("Firestore 未初始化");
          const payload = { code: d.code || "", name: d.name || "", address: d.address || "", companyId: d.companyId || null, regionId: d.regionId || null, coords: d.coords || "", radiusMeters: d.radiusMeters ?? null, createdAt: fns.serverTimestamp() };
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
            { key: "companyId", label: "所屬公司", type: "select", options: optionList(appState.companies) },
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
                companyId: d.companyId ?? item.companyId ?? null,
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
      <div class="block-header"><span class="block-title">帳號列表</span><div class="block-actions"><button id="btnExportAccounts" class="btn">匯出.xlsx</button><button id="btnImportAccounts" class="btn">匯入.xlsx</button><button id="btnAddAccount" class="btn">新增</button></div></div>
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

  // 帳號匯出/匯入事件
  const btnExportA = document.getElementById("btnExportAccounts");
  const btnImportA = document.getElementById("btnImportAccounts");
  [btnExportA, btnImportA].forEach((b) => b && attachPressInteractions(b));
  btnExportA?.addEventListener("click", () => exportAccountsToXLSX());
  btnImportA?.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.addEventListener("change", async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        if (appState.currentUserRole !== "系統管理員") {
          alert("權限不足：只有系統管理員可以匯入帳號。");
          return;
        }
        await importAccountsFromXLSX(f);
      } catch (err) {
        alert(`匯入帳號失敗：${err?.message || err}`);
      }
    });
    input.click();
  });

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
          // 若有建立 Auth 帳號，使用其 uid 作為文件 ID；否則使用自動 ID
          let newId = null;
          if (createdUid) {
            const ref = fns.doc(db, "users", createdUid);
            await fns.setDoc(ref, payload);
            newId = createdUid;
          } else {
            const docRef = await fns.addDoc(fns.collection(db, "users"), payload);
            newId = docRef.id;
          }
          // 僅在前端狀態保留密碼欄位作為表格顯示，不寫入 Firestore
          appState.accounts.push({ id: newId, ...d, uid: createdUid || null });
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

              // 若提供新密碼且確認一致，嘗試更新 Auth 密碼；失敗時改寄送重設密碼信
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
                    console.warn("adminUpdateUserPassword 失敗，改寄送重設密碼信", err);
                    const targetEmail = a.email || d.email || null;
                    if (targetEmail && fns.sendPasswordResetEmail && auth) {
                      try {
                        await fns.sendPasswordResetEmail(auth, targetEmail);
                        alert(`已寄送重設密碼信到「${targetEmail}」。`);
                      } catch (e2) {
                        alert(`更新登入密碼失敗且寄送重設信也失敗：${e2?.message || e2}`);
                        return false;
                      }
                    } else {
                      alert("更新登入密碼失敗：未取得使用者 Email 或尚未初始化寄送重設密碼功能。");
                      return false;
                    }
                  }
                } else {
                  const targetEmail = a.email || d.email || null;
                  if (targetEmail && fns.sendPasswordResetEmail && auth) {
                    try {
                      await fns.sendPasswordResetEmail(auth, targetEmail);
                      alert(`尚未設定雲端函式，已改寄送重設密碼信到「${targetEmail}」。`);
                    } catch (e2) {
                      alert(`尚未設定雲端函式且寄送重設信也失敗：${e2?.message || e2}`);
                      return false;
                    }
                  } else {
                    alert("尚未設定雲端函式且無法寄送重設密碼信（缺少 Email 或初始化）。");
                    return false;
                  }
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
          const targetEmail = a.email || null;
          if (targetEmail && fns.sendPasswordResetEmail && auth) {
            try {
              await fns.sendPasswordResetEmail(auth, targetEmail);
              alert(`尚未設定雲端函式，已改寄送重設密碼信到「${targetEmail}」。`);
            } catch (e2) {
              alert(`尚未設定雲端函式且寄送重設信也失敗：${e2?.message || e2}`);
            }
          } else {
            alert("尚未設定雲端函式且無法寄送重設密碼信（缺少 Email 或初始化）。");
          }
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
          const targetEmail = a.email || null;
          if (targetEmail && fns.sendPasswordResetEmail && auth) {
            try {
              await fns.sendPasswordResetEmail(auth, targetEmail);
              alert(`更新登入密碼失敗，已改寄送重設密碼信到「${targetEmail}」。`);
            } catch (e2) {
              alert(`更新登入密碼失敗且寄送重設信也失敗：${e2?.message || e2}`);
            }
          } else {
            alert(`更新登入密碼失敗：${err?.message || err}`);
          }
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

            // 建立 Auth 帳號（先雲端函式，失敗則 REST），預設密碼 000000
            let authCreated = false;
            let authUid = null;
            if (item.email) {
              if (fns.functions && fns.httpsCallable) {
                try {
                  const createUser = fns.httpsCallable(fns.functions, "adminCreateUser");
                  const res = await createUser({ email: item.email, password: "000000", name: item.name || "", photoUrl: item.photoUrl || "" });
                  authUid = res?.data?.uid || null;
                  authCreated = !!authUid;
                } catch (err) {
                  console.warn("核准時建立 Auth 失敗，改用 REST", err);
                  try {
                    const r = await createAuthUserViaRest(item.email, "000000");
                    authUid = r.uid;
                    authCreated = !!authUid;
                  } catch (err2) {
                    console.warn("REST 建立 Auth 失敗", err2);
                  }
                }
              } else {
                try {
                  const r = await createAuthUserViaRest(item.email, "000000");
                  authUid = r.uid;
                  authCreated = !!authUid;
                } catch (err2) {
                  console.warn("REST 建立 Auth 失敗", err2);
                }
              }
            }

            // 刪除待審核紀錄
            await fns.deleteDoc(fns.doc(db, "pendingAccounts", pid));

            // 更新前端狀態與 UI
            // 若成功建立 Auth，覆蓋 users 文件為該 uid
            if (authUid) {
              try {
                const ref = fns.doc(db, "users", authUid);
                await fns.setDoc(ref, payload, { merge: true });
                appState.accounts.push({ id: authUid, ...payload, uid: authUid });
              } catch (e) {
                // 若覆蓋失敗，至少保留先前 addDoc 版本
                appState.accounts.push({ id: userDoc.id, ...payload });
              }
            } else {
              appState.accounts.push({ id: userDoc.id, ...payload });
            }
            appState.pendingAccounts = appState.pendingAccounts.filter((x) => x.id !== pid);
            renderSettingsContent("帳號");
            // 提示狀態：已核准基本資料；若未建立 Auth，提醒管理者後續處理
            if (authCreated) {
              alert("核准完成：已加入帳號列表，登入預設密碼為 000000。");
            } else {
              alert("核准完成（部分）：已加入帳號列表，但未建立登入帳號（Auth）。請稍後在帳號列表設定密碼或部署雲端函式。");
            }
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
  sendPasswordResetEmail: null,
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
    { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail },
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
  // 明確指定雲端函式區域，避免跨區造成呼叫錯誤或 CORS 問題
  functionsApp = getFunctions(firebaseApp, "us-central1");

  // 將函式指派到外層供事件使用
  fns.signInWithEmailAndPassword = signInWithEmailAndPassword;
  fns.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
  fns.signOut = signOut;
  fns.sendPasswordResetEmail = sendPasswordResetEmail;
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
        const initialDisplayName = user.displayName || user.email || "使用者";
        userNameEl.textContent = `歡迎~ ${initialDisplayName}`;
        if (homeHeaderNameEl) homeHeaderNameEl.textContent = initialDisplayName;
      if (userPhotoEl) {
        if (user.photoURL) userPhotoEl.src = user.photoURL; else userPhotoEl.removeAttribute("src");
        // 將頭像設為按鈕：點擊開啟個人資訊與登出
        userPhotoEl.onclick = () => showProfileModal(user, role);
      }
      if (homeHeroPhoto) {
        if (user.photoURL) homeHeroPhoto.src = user.photoURL; else homeHeroPhoto.removeAttribute("src");
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
        userNameEl.textContent = `歡迎~ ${displayName}`;
        if (homeHeaderNameEl) homeHeaderNameEl.textContent = displayName;
        if (userPhotoEl) {
          const photoFromDoc = data.photoUrl || "";
          if (photoFromDoc) userPhotoEl.src = photoFromDoc; else if (user.photoURL) userPhotoEl.src = user.photoURL; else userPhotoEl.removeAttribute("src");
        }
        if (homeHeroPhoto) {
          const photoFromDoc = data.photoUrl || "";
          if (photoFromDoc) homeHeroPhoto.src = photoFromDoc; else if (user.photoURL) homeHeroPhoto.src = user.photoURL; else homeHeroPhoto.removeAttribute("src");
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
      // 僅系統管理員載入待審核帳號，避免非管理員被規則擋讀
      if (role === "系統管理員") {
        await loadPendingAccountsFromFirestore();
      }
      if (activeMainTab === "settings" && activeSubTab === "一般") renderSettingsContent("一般");

      // 啟用定位顯示
        initGeolocation();
        startGeoRefresh();

        // 綁定打卡
        checkinBtn.addEventListener("click", () => doCheckin(user, role));
      } else {
        // 顯示登入頁
        appView.classList.add("hidden");
        loginView.classList.remove("hidden");
        userNameEl.textContent = "未登入";
        if (homeHeaderNameEl) homeHeaderNameEl.textContent = "";
        userPhotoEl.removeAttribute("src");
        // 登出時恢復顯示所有分頁
        resetPagePermissions();
        stopGeoRefresh();
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

  // 以 REST 方式建立 Firebase Auth 帳號（不會切換目前登入狀態）
  async function createAuthUserViaRest(email, password) {
    const apiKey = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) || null;
    if (!apiKey) throw new Error("缺少 Firebase apiKey");
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || res.statusText || "建立使用者失敗";
      throw new Error(msg);
    }
    return { uid: data.localId };
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
        items.push({ id: docSnap.id, name: d.name || "", coords: d.coords || "", radiusMeters: d.radiusMeters ?? null });
      });
      // 以雲端資料覆蓋本地預設項目，避免預設示例持續顯示
      appState.companies = items;
      if (activeMainTab === "settings" && activeSubTab === "一般") renderSettingsContent("一般");
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
      // 以雲端資料覆蓋本地預設項目，避免預設示例持續顯示造成誤解
      appState.regions = items;
      if (activeMainTab === "settings" && activeSubTab === "一般") renderSettingsContent("一般");
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
          companyId: d.companyId || null,
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

  // 待審核帳號：從 Firestore 載入
  async function loadPendingAccountsFromFirestore() {
    if (!db || !fns.getDocs || !fns.collection) return;
    try {
      const snap = await fns.getDocs(fns.collection(db, "pendingAccounts"));
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
          licenses: Array.isArray(d.licenses) ? d.licenses : [],
          role: d.role || "一般",
          companyId: d.companyId || null,
          serviceCommunities: Array.isArray(d.serviceCommunities) ? d.serviceCommunities : [],
          pagePermissions: Array.isArray(d.pagePermissions) ? d.pagePermissions : [],
          status: d.status || "待審核",
        });
      });
      // 覆蓋或新增到前端狀態
      items.forEach((it) => {
        const idx = appState.pendingAccounts.findIndex((a) => a.id === it.id);
        if (idx >= 0) appState.pendingAccounts[idx] = { ...appState.pendingAccounts[idx], ...it }; else appState.pendingAccounts.push(it);
      });
      if (activeMainTab === "settings" && activeSubTab === "帳號") renderSettingsContent("帳號");
    } catch (err) {
      console.warn("載入 Firestore pendingAccounts 失敗：", err);
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
    // 首頁專用版面：切換 home-layout 類別
    appView.classList.toggle("home-layout", tab === "home");
    // 首頁專用大圖顯示與時鐘切換
    homeHero?.classList.toggle("hidden", tab !== "home");
    // 首頁：地圖覆蓋層顯示切換
    homeMapOverlay?.classList.toggle("hidden", tab !== "home");
    // 首頁：A/B/C/D/E 堆疊顯示切換
    homeHeaderStack?.classList.toggle("hidden", tab !== "home");
    if (tab === "home") { startHomeClock(); startGeoRefresh(); } else { stopHomeClock(); stopGeoRefresh(); }
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
        // 記錄座標並更新首頁地圖（若在首頁）
        lastCoords = { latitude, longitude };
        updateHomeMap();
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

// 已移除「初始化管理員」按鈕及其功能

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
// ===== 首頁狀態切換（F–K） =====
function setHomeStatus(key, label) {
  const classes = [
    "status-work",
    "status-off",
    "status-out",
    "status-arrive",
    "status-leave",
    "status-return",
    "status-leave-request",
  ];
  document.body.classList.remove(...classes);
  document.body.classList.add(`status-${key}`);
  if (homeStatusEl) homeStatusEl.textContent = label || "";
  // 顯示大照片以便邊框與動畫呈現（若目前隱藏）
  if (homeHero) homeHero.classList.remove("hidden");
}

btnStart?.addEventListener("click", () => setHomeStatus("work", "上班"));
btnEnd?.addEventListener("click", () => setHomeStatus("off", "下班"));
btnOut?.addEventListener("click", () => setHomeStatus("out", "外出"));
btnArrive?.addEventListener("click", () => setHomeStatus("arrive", "抵達"));
btnReturn?.addEventListener("click", () => setHomeStatus("return", "返回"));
btnLeave?.addEventListener("click", () => setHomeStatus("leave", "離開"));
btnLeaveRequest?.addEventListener("click", () => setHomeStatus("leave-request", "請假"));
// 補卡不改變狀態顏色，僅顯示文字（可依需求調整）
btnMakeup?.addEventListener("click", () => {
  if (homeStatusEl) homeStatusEl.textContent = "補卡";
});

// ===== 上班打卡完整流程（位置 → 地圖 → 自拍 → 儲存） =====
async function startCheckinFlow(statusKey = "work", statusLabel = "上班") {
  try {
    // 1) 依角色載入打卡位置選項
    const userRole = appState.currentUserRole || "一般";
    const adminRoles = new Set(["系統管理員", "管理層", "高階主管", "初階主管", "行政"]);
    // 依使用者帳號與角色找出可選位置
    let options = [];
    let sourceType = "company"; // company | community
    if (adminRoles.has(userRole)) {
      options = optionList(appState.companies);
      sourceType = "company";
    } else {
      // 一般/勤務：優先使用使用者的 serviceCommunities；若無則顯示全部社區
      let userAccount = null;
      if (appState.currentUserId) {
        userAccount = appState.accounts.find((a) => a.id === appState.currentUserId) || null;
      }
      const allowedCommunityIds = (userAccount && Array.isArray(userAccount.serviceCommunities)) ? new Set(userAccount.serviceCommunities) : null;
      const communities = appState.communities.filter((c) => !allowedCommunityIds || allowedCommunityIds.has(c.id));
      options = communities.map((c) => ({ value: c.id, label: c.name }));
      sourceType = "community";
    }

    const selectedLocation = await new Promise((resolve) => {
      openModal({
        title: "選擇打卡位置",
        fields: [
          { key: "place", label: "打卡位置", type: "select", options: options },
        ],
        submitText: "確認",
        onSubmit: async (data) => {
          const id = data.place;
          let item = null;
          if (sourceType === "company") {
            item = appState.companies.find((c) => c.id === id) || null;
          } else {
            item = appState.communities.find((c) => c.id === id) || null;
          }
          if (!item) { alert("無法識別選擇的位置"); return false; }
          resolve({
            type: sourceType,
            id: item.id,
            name: item.name || "",
            coords: item.coords || "",
            address: item.address || "",
            radiusMeters: item.radiusMeters ?? null,
          });
          return true;
        },
      });
      // 取消時回傳 null
      const cancelBtn = modalRoot?.querySelector('.modal-footer .btn:not(.btn-primary)');
      cancelBtn?.addEventListener('click', () => resolve(null));
    });
    if (!selectedLocation) return; // 使用者取消

    // 2) 地圖定位檢視（顯示目前位置與打卡範圍），並取得目前位置座標
    const viewerRes = await openCheckinMapViewer({
      targetName: selectedLocation.name,
      targetCoords: selectedLocation.coords || "",
      targetRadius: selectedLocation.radiusMeters ?? 100,
    });
    if (!viewerRes) return; // 使用者取消
    const lat = viewerRes?.lat; const lng = viewerRes?.lng;
    const hasCoords = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);

    // 3) 自拍與留言（浮水印三列）
    const photoDataUrl = await new Promise((resolve) => {
      let captured = null;
      openModal({
        title: "自拍打卡",
        fields: [
          { key: "message", label: "留言（選填，最多 30 字）", type: "text", placeholder: "最多 30 字" },
        ],
        submitText: "確認",
        onSubmit: async (data) => {
          if (!captured) { alert("請先拍照"); return false; }
          // 最多 30 字
          const msg = (data.message || "").slice(0, 30);
          // 於 Canvas 上繪製浮水印三列
          try {
            const img = new Image();
            img.src = captured;
            await new Promise((r) => { img.onload = r; img.onerror = r; });
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 1080;
            canvas.height = img.naturalHeight || 1440;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // 水印樣式
            const pad = Math.floor(canvas.height * 0.02);
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(0, canvas.height - pad*7, canvas.width, pad*7);
            ctx.fillStyle = '#ffffff';
            ctx.font = `${Math.max(16, Math.floor(canvas.height*0.03))}px sans-serif`;
            ctx.textBaseline = 'top';
            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
            const nameElText = (homeHeaderNameEl?.textContent || '').replace(/^歡迎~\s*/, '');
            const line1 = `${dateStr} ${nameElText || '使用者'}`;
            const line2 = `${hasCoords ? `${lat.toFixed(6)},${lng.toFixed(6)}` : '座標未知'} ${statusLabel}`;
            const line3 = msg || '';
            const x = pad; let y = canvas.height - pad*6.5;
            ctx.fillText(line1, x, y); y += pad*2.2;
            ctx.fillText(line2, x, y); y += pad*2.2;
            ctx.fillText(line3, x, y);
            const out = canvas.toDataURL('image/jpeg', 0.92);
            resolve({ photo: out, message: msg });
            return true;
          } catch (e) {
            alert(`生成浮水印失敗：${e?.message || e}`);
            return false;
          }
        },
        afterRender: async ({ body }) => {
          // 建立攝影機預覽與快門
          const video = document.createElement('video');
          video.autoplay = true; video.playsInline = true; video.muted = true;
          video.style.width = '100%'; video.style.maxHeight = '45vh'; video.style.background = '#000';
          video.style.borderRadius = '8px';
          const controls = document.createElement('div');
          controls.style.display = 'flex'; controls.style.gap = '12px'; controls.style.marginTop = '8px';
          const btnSnap = document.createElement('button'); btnSnap.className = 'btn btn-primary'; btnSnap.textContent = '快門'; attachPressInteractions(btnSnap);
          const preview = document.createElement('img'); preview.style.width = '100%'; preview.style.marginTop = '8px'; preview.alt = '預覽照片';
          controls.appendChild(btnSnap);
          body.appendChild(video);
          body.appendChild(controls);
          body.appendChild(preview);
          let stream = null;
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
            video.srcObject = stream;
          } catch (err) {
            const msg = `無法啟用相機：${err?.message || err}`;
            const warn = document.createElement('div'); warn.textContent = msg; warn.style.color = '#b00020'; warn.style.marginTop = '8px'; body.appendChild(warn);
          }
          btnSnap.addEventListener('click', async () => {
            try {
              const track = stream?.getVideoTracks?.()[0];
              const settings = track?.getSettings?.() || {};
              const w = settings.width || 1080; const h = settings.height || 1440;
              const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext('2d');
              // 將影片畫面繪到畫布（簡單直繪，避免裁切）
              ctx.drawImage(video, 0, 0, w, h);
              captured = canvas.toDataURL('image/jpeg', 0.92);
              preview.src = captured;
            } catch (e) {
              alert(`拍照失敗：${e?.message || e}`);
            }
          });
        },
      });
      // 取消時回傳 null
      const cancelBtn = modalRoot?.querySelector('.modal-footer .btn:not(.btn-primary)');
      cancelBtn?.addEventListener('click', () => resolve(null));
    });
    if (!photoDataUrl) return; // 使用者取消

    // 4) 寫入 Firestore 並更新首頁 F 列摘要
    try {
      await ensureFirebase();
      const user = auth?.currentUser || null;
      const role = appState.currentUserRole || "一般";
      const payload = {
        uid: user?.uid || null,
        name: (homeHeaderNameEl?.textContent || '').replace(/^歡迎~\s*/, '') || (user?.email || '使用者'),
        role,
        status: statusLabel,
        locationType: selectedLocation.type,
        locationId: selectedLocation.id,
        locationName: selectedLocation.name,
        lat: hasCoords ? lat : null,
        lng: hasCoords ? lng : null,
        message: photoDataUrl.message || "",
        photoData: photoDataUrl.photo,
        createdAt: fns.serverTimestamp ? fns.serverTimestamp() : new Date().toISOString(),
      };
      if (db && fns.addDoc && fns.collection) {
        await fns.addDoc(fns.collection(db, "checkins"), payload);
      }
      // 更新首頁 F 列摘要
      const fRow = document.querySelector('.row-f');
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      if (fRow) {
        fRow.textContent = `${dateStr} ${selectedLocation.name} ${statusLabel}`;
      }
      // 最終切換狀態顯示與動畫
      setHomeStatus(statusKey, statusLabel);
    } catch (err) {
      alert(`打卡資料寫入失敗：${err?.message || err}`);
    }
  } catch (err) {
    alert(`打卡流程錯誤：${err?.message || err}`);
  }
}

// 將「上班」按鈕改為啟動完整打卡流程
btnStart?.removeEventListener("click", () => setHomeStatus("work", "上班"));
btnStart?.addEventListener("click", () => startCheckinFlow("work", "上班"));