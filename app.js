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
};

function id() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function openModal({ title, fields, initial = {}, submitText = "儲存", onSubmit }) {
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
    }
    input.dataset.key = f.key;
    row.appendChild(label);
    row.appendChild(input);
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
    if (ok !== false) closeModal();
    const lbl = featureSubTitle?.textContent?.trim();
    renderSettingsContent(lbl);
  });
  footer.appendChild(btnCancel);
  footer.appendChild(btnSubmit);

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  modalRoot.appendChild(modal);
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

function companyStats(companyId) {
  const communityCount = appState.communities.filter((c) => c.companyId === companyId).length;
  const staff = appState.accounts.filter((a) => a.companyId === companyId);
  const staffCount = staff.length;
  const leaderRoles = new Set(["管理層", "高階主管", "初階主管"]);
  const leaderCount = staff.filter((a) => leaderRoles.has(a.role)).length;
  return { communityCount, leaderCount, staffCount };
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
      onSubmit: (data) => {
        appState.companies.push({ id: id(), name: data.name || "", coords: data.coords || "" });
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
          onSubmit: (data) => {
            co.name = data.name || co.name;
            co.coords = data.coords || co.coords;
          },
        });
      } else if (act === "del") {
        appState.companies = appState.companies.filter((c) => c.id !== cid);
        renderSettingsContent("一般");
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
      onSubmit: (data) => { appState.regions.push({ id: id(), name: data.name || "" }); },
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
        openModal({ title: "編輯區域", fields: [{ key: "name", label: "名稱", type: "text" }], initial: r, onSubmit: (d) => { r.name = d.name || r.name; } });
      } else if (act === "del") {
        appState.regions = appState.regions.filter((x) => x.id !== rid);
        renderSettingsContent("一般");
      }
    });
  });

  // 事件：證照
  const btnAddLicense = document.getElementById("btnAddLicense");
  attachPressInteractions(btnAddLicense);
  btnAddLicense.addEventListener("click", () => {
    openModal({ title: "新增證照", fields: [{ key: "name", label: "名稱", type: "text" }], onSubmit: (d) => { appState.licenses.push({ id: id(), name: d.name || "" }); } });
  });
  settingsContent.querySelectorAll("#block-licenses tbody tr").forEach((tr) => {
    const lid = tr.dataset.id;
    tr.querySelectorAll("button").forEach((b) => attachPressInteractions(b));
    tr.addEventListener("click", (e) => {
      const act = e.target?.dataset?.act;
      const l = appState.licenses.find((x) => x.id === lid);
      if (!l) return;
      if (act === "edit") {
        openModal({ title: "編輯證照", fields: [{ key: "name", label: "名稱", type: "text" }], initial: l, onSubmit: (d) => { l.name = d.name || l.name; } });
      } else if (act === "del") {
        appState.licenses = appState.licenses.filter((x) => x.id !== lid);
        renderSettingsContent("一般");
      }
    });
  });
}

function renderSettingsCommunities() {
  const rows = appState.communities.map((c) => {
    const regionName = appState.regions.find((r) => r.id === c.regionId)?.name || "";
    const companyName = appState.companies.find((co) => co.id === c.companyId)?.name || "";
    return `<tr data-id="${c.id}"><td>${c.code || ""}</td><td>${c.name || ""}</td><td>${c.households ?? ""}</td><td>${regionName}</td><td>${companyName}</td><td>${c.coords || ""}</td><td class="cell-actions"><button class="btn" data-act="edit">編輯</button><button class="btn" data-act="del">刪除</button></td></tr>`;
  }).join("");

  settingsContent.innerHTML = `
    <div class="block" id="block-communities">
      <div class="block-header"><span class="block-title">社區列表</span><div class="block-actions"><button id="btnAddCommunity" class="btn">新增</button></div></div>
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>代號</th><th>名稱</th><th>住戶數</th><th>區域</th><th>公司</th><th>定位座標</th><th>操作</th></tr></thead>
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
        { key: "code", label: "代號", type: "text" },
        { key: "name", label: "名稱", type: "text" },
        { key: "households", label: "住戶數", type: "number" },
        { key: "regionId", label: "區域", type: "select", options: optionList(appState.regions) },
        { key: "companyId", label: "公司", type: "select", options: optionList(appState.companies) },
        { key: "coords", label: "定位座標", type: "text", placeholder: "lat,lng" },
      ],
      onSubmit: (d) => { appState.communities.push({ id: id(), ...d }); },
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
            { key: "code", label: "代號", type: "text" },
            { key: "name", label: "名稱", type: "text" },
            { key: "households", label: "住戶數", type: "number" },
            { key: "regionId", label: "區域", type: "select", options: optionList(appState.regions) },
            { key: "companyId", label: "公司", type: "select", options: optionList(appState.companies) },
            { key: "coords", label: "定位座標", type: "text" },
          ],
          initial: item,
          onSubmit: (d) => { Object.assign(item, d); },
        });
      } else if (act === "del") {
        appState.communities = appState.communities.filter((x) => x.id !== cid);
        renderSettingsContent("社區");
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
      <td>${a.password || ""}</td>
      <td>${a.passwordConfirm || ""}</td>
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
        { key: "status", label: "狀況", type: "select", options: ["在職","離職"].map((x)=>({value:x,label:x})) },
      ],
      onSubmit: (d) => { appState.accounts.push({ id: id(), ...d }); },
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
            { key: "status", label: "狀況", type: "select", options: ["在職","離職"].map((x)=>({value:x,label:x})) },
          ],
          initial: a,
          onSubmit: (d) => { Object.assign(a, d); },
        });
      } else if (act === "del") {
        appState.accounts = appState.accounts.filter((x) => x.id !== aid);
        renderSettingsContent("帳號");
      }
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
        const approved = { ...item, status: "在職" };
        appState.accounts.push(approved);
        appState.pendingAccounts = appState.pendingAccounts.filter((x) => x.id !== pid);
        renderSettingsContent("帳號");
      } else if (act === "del") {
        appState.pendingAccounts = appState.pendingAccounts.filter((x) => x.id !== pid);
        renderSettingsContent("帳號");
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

  // 監聽登入狀態（容錯：若網路或授權網域設定不完整，改為顯示登入頁）
  try {
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