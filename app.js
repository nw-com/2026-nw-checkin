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
const googleSignInBtn = document.getElementById("googleSignIn");

const userNameEl = document.getElementById("userName");
const userPhotoEl = document.getElementById("userPhoto");
const subHeaderText = document.getElementById("subHeaderText");

const homeSection = document.getElementById("homeSection");
const checkinSection = document.getElementById("checkinSection");
const settingsSection = document.getElementById("settingsSection");
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));

const locationInfo = document.getElementById("locationInfo");
const checkinBtn = document.getElementById("checkinBtn");
const checkinResult = document.getElementById("checkinResult");

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
  googleSignInBtn.disabled = true;
} else {
  setupWarning.classList.add("hidden");
  googleSignInBtn.disabled = false;
}

// ===== 4) 動態載入 Firebase 模組並初始化 =====
let firebaseApp, auth, db;

async function ensureFirebase() {
  if (!isConfigReady()) return;
  const [{ initializeApp }, { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut }, { getFirestore, doc, getDoc, setDoc, addDoc, collection, serverTimestamp }]
    = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"),
    ]);

  // 初始化 Firebase
  firebaseApp = initializeApp(FIREBASE_CONFIG);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);

  // 綁定登入事件
  googleSignInBtn.addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      alert(`登入失敗：${err?.message || err}`);
    }
  });

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
      subHeaderText.textContent = `身份：${role}`;

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
    tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    homeSection.classList.toggle("hidden", tab !== "home");
    checkinSection.classList.toggle("hidden", tab !== "checkin");
    settingsSection.classList.toggle("hidden", tab !== "settings");
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

// 啟動
(async () => {
  if (isConfigReady()) {
    await ensureFirebase();
  }
})();