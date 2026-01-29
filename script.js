"use strict";

/* ===========
  Love Day Counter
  - requestAnimationFrame loop (mượt) nhưng chỉ update khi đổi giây
  - lưu localStorage
  - link share có query param (names + start)
  - confetti tim (canvas) khi chạm mốc 100/200/300... ngày và mỗi năm
=========== */

const $ = (s) => document.querySelector(s);

const STORAGE_KEY = "love_counter_v1";

// Hàm để thêm số 0 vào trước nếu là số nhỏ hơn 10
function pad2(n){ return String(n).padStart(2, "0"); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function rand(min,max){ return Math.random()*(max-min)+min; }

function formatDateTime(d){
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth()+1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${dd}/${mm}/${yyyy} • ${hh}:${mi}`;
}

// Hàm chuyển đổi ngày tháng và giờ nhập vào thành kiểu dữ liệu Date
function parseFromInputs(dateStr, timeStr){
  // dateStr: YYYY-MM-DD (required)
  // timeStr: HH:mm (optional)
  if (!dateStr) return null;
  const t = timeStr && timeStr.trim() ? timeStr.trim() : "00:00";
  // local time
  const iso = `${dateStr}T${t}:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// Hàm lưu dữ liệu vào localStorage
function saveData(obj){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

// Hàm tải dữ liệu từ localStorage
function loadData(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.startISO) return null;
    const d = new Date(obj.startISO);
    if (Number.isNaN(d.getTime())) return null;
    return obj;
  } catch (error) {
    return null;
  }
}

// Hàm thay đổi giao diện chế độ sáng/tối
function setTheme(next){
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("love_theme", next);
}

(function initTheme(){
  const saved = localStorage.getItem("love_theme");
  if (saved) setTheme(saved);
  $("#btnTheme").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(cur === "dark" ? "light" : "dark");
  });
})();

// Hàm khởi tạo và hiển thị thông tin về ngày yêu nhau
function updateUI(data){
  const nameA = data?.nameA || "";
  const nameB = data?.nameB || "";

  const couple = (nameA || nameB) ? `${nameA || "A"} & ${nameB || "B"}` : "Đếm ngày yêu nhau";
  $("#coupleTitle").textContent = couple;
  $("#headlineText").textContent = (nameA || nameB) ? `${couple} đã yêu nhau được…` : "Tụi mình đã yêu nhau được…";

  const start = data ? new Date(data.startISO) : null;
  $("#startText").textContent = start ? formatDateTime(start) : "—";
}

// Hàm tính toán mốc thời gian
function computeMilestones(days){
  const hundred = Math.floor(days / 100) * 100;
  const lastHundred = Math.max(0, hundred);
  const nextHundred = lastHundred + 100;

  const years = Math.floor(days / 365);
  const lastYear = years * 365;
  const nextYear = (years + 1) * 365;

  const recent = (days - lastYear < days - lastHundred) ? {type:"Năm", day:lastYear} : {type:"Ngày", day:lastHundred};
  const next = (nextYear - days < nextHundred - days) ? {type:"Năm", day:nextYear} : {type:"Ngày", day:nextHundred};

  return { recent, next };
}

// Hàm hiển thị mốc thời gian
function milestoneText(type, day){
  if (day === 0) return "Vừa bắt đầu 💗";
  if (type === "Năm"){
    const y = Math.round(day / 365);
    return `Tròn ${y} năm (${day} ngày) 🎉`;
  }
  return `Mốc ${day} ngày ✨`;
}

// Hàm xử lý vòng lặp và cập nhật giao diện đếm ngày yêu
function timerLoop(){
  const data = loadData();

  // Nếu chưa có data thì mở modal ngay
  if (!data){
    updateUI(null);
    if (modal.classList.contains("hidden")) openModal(null);
    requestAnimationFrame(timerLoop);
    return;
  }

  updateUI(data);

  const start = new Date(data.startISO);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const totalSec = Math.floor(diffMs / 1000);

  const sec = totalSec % 60;
  if (sec !== lastSec){
    lastSec = sec;

    const totalMin = Math.floor(totalSec / 60);
    const min = totalMin % 60;
    const totalHr = Math.floor(totalMin / 60);
    const hr = totalHr % 24;
    const days = Math.floor(totalHr / 24);

    setText("#days", days);
    setText("#hours", pad2(hr));
    setText("#minutes", pad2(min));
    setText("#seconds", pad2(sec));

    // milestones
    const { recent, next } = computeMilestones(days);
    $("#milestoneText").textContent = milestoneText(recent.type, recent.day);
    $("#nextText").textContent = milestoneText(next.type, next.day);
  }

  requestAnimationFrame(timerLoop);
}

timerLoop();

// Hàm thêm hiệu ứng "flip" khi cập nhật giá trị
function setText(id, v){
  const el = $(id);
  if (!el) return;
  if (el.textContent !== String(v)){
    el.textContent = String(v);
    el.classList.remove("flip");
    void el.offsetWidth;
    el.classList.add("flip");
  }
}

// Hàm mở modal nhập thông tin
const modal = $("#modal");
const formError = $("#formError");

function openModal(prefill){
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  formError.textContent = "";

  if (prefill){
    $("#nameA").value = prefill.nameA || "";
    $("#nameB").value = prefill.nameB || "";
    const d = new Date(prefill.startISO);
    if (!Number.isNaN(d.getTime())){
      const yyyy = d.getFullYear();
      const mm = pad2(d.getMonth()+1);
      const dd = pad2(d.getDate());
      $("#startDate").value = `${yyyy}-${mm}-${dd}`;
      $("#startTime").value = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }
  }
}

function closeModal(){
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  formError.textContent = "";
}

// Xử lý đóng modal
$("#modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", (e)=>{ if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && !modal.classList.contains("hidden")) closeModal(); });

// Lưu dữ liệu khi người dùng lưu
$("#btnSave").addEventListener("click", ()=>{
  const nameA = $("#nameA").value.trim();
  const nameB = $("#nameB").value.trim();
  const dateStr = $("#startDate").value;
  const timeStr = $("#startTime").value;

  const start = parseFromInputs(dateStr, timeStr);
  if (!start){
    formError.textContent = "Vui lòng chọn ngày bắt đầu hợp lệ.";
    return;
  }
  if (start.getTime() > Date.now()){
    formError.textContent = "Ngày bắt đầu không thể ở tương lai.";
    return;
  }

  const obj = {
    nameA, nameB,
    startISO: start.toISOString()
  };
  saveData(obj);

  // Cập nhật query param để chia sẻ
  const u = new URL(location.href);
  u.searchParams.set("start", obj.startISO);
  if (nameA) u.searchParams.set("a", nameA);
  else u.searchParams.delete("a");
  if (nameB) u.searchParams.set("b", nameB);
  else u.searchParams.delete("b");
  history.replaceState({}, "", u.toString());

  closeModal();
  fx.burst(1.0);
});

// Xử lý reset dữ liệu
$("#btnReset").addEventListener("click", () => {
  // Xóa dữ liệu trong localStorage
  localStorage.removeItem(STORAGE_KEY);
  
  // Đặt lại giao diện về trạng thái ban đầu
  updateUI(null);
  if (modal.classList.contains("hidden")) openModal(null);

  // Reset các giá trị trong query params để chia sẻ
  const u = new URL(location.href);
  u.searchParams.delete("start");
  u.searchParams.delete("a");
  u.searchParams.delete("b");
  history.replaceState({}, "", u.toString());
});
