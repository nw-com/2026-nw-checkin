// app.js
// 單頁應用（SPA）控制：登入與主頁顯示、Firebase Auth、分頁切換、打卡範例

// ===== 1) 設定區：請填入您的 Firebase Web 應用設定 =====
// 取得方式：Firebase Console -> 專案設定 -> 您的應用 -> Firebase SDK snippet
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDdetnrACoNTSV3ZqFBPOSfnZzRtmk5fk8",
  authDomain: "nw-checkin.firebaseapp.com",
  projectId: "nw-checkin",
  storageBucket: "nw-checkin.firebasestorage.app",
  messagingSenderId: "520938520545",
  appId: "1:520938520545:web:fb32a42eb1504aab041ca0",
  measurementId: "G-G6M6NGBC03",
};

// 若您需要使用 Google Maps，請在此填入 API 金鑰（選填，用於定位或地圖顯示）
// export const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

// 角色階層（由高至低），請依需求調整
export const Roles = [
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
let firebaseApp, auth, db;
// 將常用 Firebase 函式存到外層，讓按鈕事件可即時呼叫
let fns = {
  signInWithEmailAndPassword: null,
  createUserWithEmailAndPassword: null,
  doc: null,
  getDoc: null,
  setDoc: null,
  addDoc: null,
  collection: null,
  serverTimestamp: null,
};

async function ensureFirebase() {
  if (!isConfigReady()) return;
  const [{ initializeApp }, { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword }, { getFirestore, doc, getDoc, setDoc, addDoc, collection, serverTimestamp }]
    = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"),
    ]);

  // 初始化 Firebase
  firebaseApp = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);

  // 將函式指派到外層供事件使用
  fns.signInWithEmailAndPassword = signInWithEmailAndPassword;
  fns.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
  fns.doc = doc;
  fns.getDoc = getDoc;
  fns.setDoc = setDoc;
  fns.addDoc = addDoc;
  fns.collection = collection;
  fns.serverTimestamp = serverTimestamp;

  // 監聽登入狀態
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // 顯示主頁
      loginView.classList.add("hidden");
      appView.classList.remove("hidden");

      // 更新頁首使用者資訊
      userNameEl.textContent = user.displayName || user.email || "使用者";
      if (user.photoURL) {
        userPhotoEl.src = user.photoURL;
      } else {
        userPhotoEl.removeAttribute("src");
      }

      // 確認或建立使用者文件（role 欄位）
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
      let role = "一般";
      if (userSnap.exists()) {
        const data = userSnap.data();
        role = data.role || role;
      } else {
        await setDoc(userDocRef, { role, name: user.displayName || "使用者", createdAt: serverTimestamp() });
      }
      // 身份資訊可移至頁首或設定分頁說明；此處改為由子分頁顯示邏輯控制

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
    }
  });

  // 分頁切換
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

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
      checkinSubTitle.textContent = `子分頁：${label}`;
    } else if (activeMainTab === "leader") {
      leaderSubTitle.textContent = `子分頁：${label}`;
    } else if (activeMainTab === "manage") {
      manageSubTitle.textContent = `子分頁：${label}`;
    } else if (activeMainTab === "feature") {
      featureSubTitle.textContent = `子分頁：${label}`;
    } else if (activeMainTab === "settings") {
      settingsSubTitle.textContent = `子分頁：${label}`;
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