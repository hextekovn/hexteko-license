/* HEXTEKO License Panel */
const $ = (s) => document.querySelector(s)
const $$ = (s) => document.querySelectorAll(s)
const TOKEN_KEY = 'hexteko_token'
const ROLE_KEY = 'hexteko_role'
const USER_KEY = 'hexteko_user'

let SESSION = null
let currentTab = ''

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

let toastTimer = null
function toast(msg, ok) {
  const el = $('#toast')
  el.textContent = msg
  el.className = 'toast show' + (ok ? ' ok' : ' bad')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (el.className = 'toast'), 3000)
}

async function api(path, timeoutMs = 30000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch('/api' + path, { signal: ctrl.signal })
    clearTimeout(timer)
    const ct = r.headers.get('content-type') || ''
    if (!ct.includes('application/json')) {
      const txt = await r.text().catch(() => '')
      return { ok: false, msg: 'Server trả kết quả không hợp lệ (HTTP ' + r.status + ')', raw: txt.slice(0, 200) }
    }
    return await r.json()
  } catch (e) {
    clearTimeout(timer)
    const nm = e && e.name === 'AbortError'
    return { ok: false, msg: nm ? 'Hết thời gian chờ server (Render free đang khởi động?). F5 thử lại.' : 'Không kết nối được server: ' + (e.message || 'lỗi mạng') }
  }
}

function fmtMoney(n) {
  return new Intl.NumberFormat('vi-VN').format(n || 0)
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  return d.toLocaleString('vi-VN', { hour12: false })
}

// ==================== LOGIN ====================
function setMsg(el, text, ok, loading) {
  el.className = 'msg'
  if (loading) { el.classList.add('loading'); el.textContent = text; return }
  if (ok) el.classList.add('ok'); else el.classList.add('bad')
  el.textContent = text
}

async function doLogin() {
  const u = $('#in-user').value.trim()
  const p = $('#in-pass').value
  const msgEl = $('#login-msg')
  const btn = $('#btn-login')
  if (!u || !p) { setMsg(msgEl, 'Nhập username và password', false); return }
  btn.disabled = true
  setMsg(msgEl, 'Đang đăng nhập...', true, true)
  const res = await api('/login?u=' + encodeURIComponent(u) + '&p=' + encodeURIComponent(p))
  btn.disabled = false
  if (!res.ok) {
    setMsg(msgEl, res.msg || 'Đăng nhập thất bại', false)
    return
  }
  localStorage.setItem(TOKEN_KEY, res.token)
  localStorage.setItem(ROLE_KEY, res.role)
  localStorage.setItem(USER_KEY, res.username)
  enterApp({ token: res.token, role: res.role, username: res.username })
}

function enterApp(s) {
  SESSION = s
  $('#view-login').classList.add('hidden')
  $('#view-app').classList.remove('hidden')
  $('#who').textContent = (s.role === 'admin' ? '👑 Admin ' : '🛒 Seller ') + esc(s.username)
  setTimeout(() => s.role === 'admin' ? switchTab('stats') : switchTab('create'), 0)
}

async function logout() {
  try {
    if (SESSION) await api('/logout?token=' + SESSION.token)
  } catch (e) {}
  SESSION = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(USER_KEY)
  $('#view-app').classList.add('hidden')
  $('#view-login').classList.remove('hidden')
  $('#in-pass').value = ''
  $('#login-msg').textContent = ''
}

function session() {
  if (SESSION) return SESSION
  const token = localStorage.getItem(TOKEN_KEY)
  const role = localStorage.getItem(ROLE_KEY)
  const username = localStorage.getItem(USER_KEY)
  if (!token) return null
  return { token, role, username }
}

// ==================== NAV ====================
const TABS = {
  admin: [
    ['stats', '📊 Tổng quan'],
    ['sellers', '🛒 Seller'],
    ['create', '✨ Tạo key'],
    ['keys', '🔑 Quản lý key'],
    ['logs', '📜 Lịch sử']
  ],
  seller: [
    ['create', '✨ Tạo key'],
    ['mykeys', '🔑 Key của tôi'],
    ['logs', '📜 Lịch sử']
  ]
}

function renderNav() {
  const nav = $('#nav')
  nav.innerHTML = ''
  for (const [id, label] of TABS[SESSION.role]) {
    const b = document.createElement('button')
    b.dataset.tab = id
    b.textContent = label
    if (id === currentTab) b.classList.add('active')
    nav.appendChild(b)
  }
}

function switchTab(id) {
  currentTab = id
  renderNav()
  const main = $('#main')
  main.innerHTML = '<div class="card" style="text-align:center;color:var(--dim);padding:40px">Đang tải…</div>'
  const fn = { stats: viewStats, sellers: viewSellers, create: viewCreate, keys: viewKeys, mykeys: viewMyKeys, logs: viewLogs }[id]
  if (fn) fn()
}

// ==================== VIEWS ====================
async function viewStats() {
  const res = await api('/me?token=' + SESSION.token)
  if (!res.ok) return handleErr()
  const role = res.role
  if (role === 'admin') return adminStats()
  const out = await api('/seller/stats?token=' + SESSION.token)
  $('#main').innerHTML = `
    <div class="stats">
      <div class="stat"><div class="v">${out.stats.total}</div><div class="l">Tổng key đã tạo</div></div>
      <div class="stat"><div class="v" style="color:var(--green)">${out.stats.active}</div><div class="l">Key còn hạn</div></div>
      <div class="stat"><div class="v" style="color:var(--amber)">${out.stats.used}</div><div class="l">Lượt kích hoạt</div></div>
    </div>
    <div class="card"><h2>HEXTEKO License</h2><p style="color:var(--dim)">Dùng mục ✨ Tạo key (bên trên) để tạo key bán cho khách hoặc dùng cho bản thân.</p></div>
  `
}

async function adminStats() {
  const out = await api('/admin/stats?token=' + SESSION.token)
  const s = out.stats
  let bySeller = ''
  for (const [k, v] of Object.entries(s.bySeller || {})) {
    bySeller += `<div class="detail" style="grid-template-columns:1fr 1fr"><div class="d"><div class="k">Seller ${esc(k)}</div><div class="val">${v} key</div></div></div>`
  }
  $('#main').innerHTML = `
    <div class="stats">
      <div class="stat"><div class="v">${s.sellers}</div><div class="l">Seller</div></div>
      <div class="stat"><div class="v">${s.total}</div><div class="l">Tổng key</div></div>
      <div class="stat"><div class="v" style="color:var(--green)">${s.active}</div><div class="l">Còn hạn</div></div>
      <div class="stat"><div class="v" style="color:var(--amber)">${s.expired}</div><div class="l">Hết hạn</div></div>
      <div class="stat"><div class="v" style="color:var(--red)">${s.banned}</div><div class="l">Bị khóa</div></div>
      <div class="stat"><div class="v" style="color:var(--cyan)">${s.activations}</div><div class="l">Lượt kích hoạt</div></div>
    </div>
    <div class="card"><h2>📊 Key theo seller</h2>${bySeller || '<div class="empty">Chưa có key</div>'}</div>
    <div class="card"><h2>💡 Hướng dẫn</h2><p style="color:var(--dim)">- 🛒 Seller: tạo/thay đổi mật khẩu seller.<br>- ✨ Tạo key: tạo key cho app.<br>- 🔑 Quản lý key: xem mọi key, kích hoạt/khóa/xóa chéo giữa seller.</p></div>
  `
}

async function viewSellers() {
  const out = await api('/admin/sellers?token=' + SESSION.token)
  let rows = ''
  for (const s of out.sellers || []) {
    rows += `
      <tr>
        <td><span class="seller-chip">🛒 ${esc(s.username)}</span></td>
        <td>${esc(s.note || '—')}</td>
        <td class="nowrap">${fmtDate(s.createdAt)}</td>
        <td><button class="btn danger small" onclick="sellerResetPass('${esc(s.username)}')">Đổi MK</button> <button class="btn danger small" onclick="sellerRemove('${esc(s.username)}')">Xóa</button></td>
      </tr>`
  }
  $('#main').innerHTML = `
    <div class="card"><h2>🛒 Quản lý seller</h2>
      <div class="row">
        <div class="fld grow"><label>Username seller</label><input id="su" class="inp" placeholder="vd: shop.example"></div>
        <div class="fld grow"><label>Password</label><input id="sp" class="inp" placeholder="Mật khẩu cho seller"></div>
        <div class="fld grow"><label>Ghi chú</label><input id="sn" class="inp" placeholder="vd: Zalo 09xxxx"></div>
        <button class="btn primary" onclick="sellerAdd()">➕ Thêm seller</button>
      </div>
    </div>
    <div class="card"><h2>Danh sách seller</h2>
      <table><thead><tr><th>Username</th><th>Ghi chú</th><th>Tạo lúc</th><th>Thao tác</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4"><div class="empty">Chưa có seller</div></td></tr>'}</tbody></table>
    </div>
  `
}

async function sellerAdd() {
  const u = $('#su').value.trim()
  const p = $('#sp').value
  const n = $('#sn').value.trim()
  if (!u || !p) return toast('Nhập username + password seller', false)
  const res = await api('/admin/seller/add?token=' + SESSION.token + '&u=' + encodeURIComponent(u) + '&p=' + encodeURIComponent(p) + '&note=' + encodeURIComponent(n))
  if (!res.ok) return toast(res.msg || 'Lỗi', false)
  toast('Đã thêm seller ' + u, true)
  viewSellers()
}

async function sellerResetPass(u) {
  const p = prompt('Mật khẩu mới cho ' + u + ':')
  if (!p) return
  const res = await api('/admin/seller/pass?token=' + SESSION.token + '&u=' + encodeURIComponent(u) + '&p=' + encodeURIComponent(p))
  if (!res.ok) return toast(res.msg || 'Lỗi', false)
  toast('Đã đổi mật khẩu', true)
}

async function sellerRemove(u) {
  if (!confirm('Xóa seller ' + u + '?')) return
  const res = await api('/admin/seller/remove?token=' + SESSION.token + '&u=' + encodeURIComponent(u))
  if (!res.ok) return toast(res.msg || 'Lỗi', false)
  toast('Đã xóa seller ' + u, true)
  viewSellers()
}

// ---- TẠO KEY (admin + seller dùng chung) ----
function createCard(mode) {
  const role = SESSION.role
  return `
    <div class="card highlight"><h2>✨ Tạo key ${mode === 'admin' ? '' : '(bán cho khách)'}</h2>
      <div class="row">
        <div class="fld"><label>Loại thời hạn</label>
          <select id="k-unit" class="inp">
            <option value="day">Ngày</option>
            <option value="month">Tháng</option>
          </select>
        </div>
        <div class="fld"><label>Số ngày / tháng</label><input id="k-duration" class="inp" type="number" min="1" value="30"></div>
        <div class="fld"><label>Số acc treo</label>
          <select id="k-accs" class="inp"><option value="1">1 acc</option><option value="3">3 acc</option><option value="0">Vô hạn acc</option></select>
        </div>
        <div class="fld"><label>Số thiết bị (0 = vô hạn)</label><input id="k-devices" class="inp" type="number" min="0" value="1"></div>
        <div class="fld"><label>Số lượng key</label><input id="k-qty" class="inp" type="number" min="1" value="1"></div>
        <div class="fld grow"><label>Ghi chú (tên khách / sđt)</label><input id="k-note" class="inp" placeholder="vd: khách A - 09xx"></div>
        <button class="btn primary" onclick="createKeys()">⚡ Tạo key</button>
      </div>
      <div class="hint" style="color:var(--dim);font-size:12px;margin-top:10px">Key dạng <span class="code">HEXTEKO-XXXXXXXXXX</span>. Acc treo: 1 / 3 / vô hạn. Thiết bị: 0 = vô hạn thiết bị.</div>
    </div>
    <div class="card"><h2>🔑 Key vừa tạo</h2><div id="gen-result"><div class="empty">Chưa tạo key nào.</div></div></div>
  `
}

async function viewCreate() {
  $('#main').innerHTML = createCard(SESSION.role)
}

async function createKeys() {
  const unit = $('#k-unit').value
  const duration = $('#k-duration').value
  const accs = $('#k-accs').value
  const devices = $('#k-devices').value
  const qty = $('#k-qty').value
  const note = $('#k-note').value.trim()
  const g = $('#gen-result')
  g.innerHTML = '<div class="empty">Đang tạo…</div>'
  const path = SESSION.role === 'admin' ? '/admin/create' : '/seller/create'
  const res = await api(path + '?token=' + SESSION.token +
    '&unit=' + unit + '&duration=' + encodeURIComponent(duration) +
    '&accs=' + accs + '&devices=' + encodeURIComponent(devices) +
    '&qty=' + encodeURIComponent(qty) + '&note=' + encodeURIComponent(note))
  if (!res.ok) return g.innerHTML = `<div class="empty" style="color:var(--red)">${esc(res.msg || 'Lỗi')}</div>`
  const box = res.codes.map((c) => `<div class="key-row"><span class="code" title="Bấm để copy">${esc(c)}</span><button class="btn small" onclick="copyKey('${esc(c)}')">Copy</button></div>`).join('')
  toast('Đã tạo ' + res.codes.length + ' key', true)
  g.innerHTML = box
  for (const el of $$('.code')) el.onclick = () => copyKey(el.textContent)
}

function copyKey(code) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => toast('Đã copy ' + code, true)).catch(() => prompt('Copy key:', code))
  } else prompt('Copy key:', code)
}

// ---- DANH SÁCH KEY (admin: xem tất cả / filter seller, seller: key của mình) ----
function keyTableHtml(rows, mode) {
  if (!rows.length) return '<div class="empty">Không có key</div>'
  return `<div class="table-wrap"><table>
    <thead><tr><th>Key</th><th>Seller</th><th>Thời hạn</th><th>Hạn tới</th><th>Acc</th><th>TB</th><th>Đã dùng</th><th>TT</th><th>Ghi chú</th><th>Thao tác</th></tr></thead>
    <tbody>${rows.map((r) => {
      const accTxt = r.accLimit === 0 ? 'Vô hạn' : r.accLimit + ' acc'
      const tbTxt = r.deviceLimit === 0 ? 'Vô hạn' : r.deviceLimit + ' TB'
      const status = r.banned ? '<span class="tag red">Đã khóa</span>' : r.expired ? '<span class="tag gray">Hết hạn</span>' : '<span class="tag green">Hoạt động</span>'
      return `<tr>
        <td><span class="code" onclick="copyKey('${esc(r.code)}')">${esc(r.code)}</span></td>
        <td class="nowrap"><span class="seller-chip">${esc(r.createdBy || 'admin')}</span></td>
        <td class="nowrap">${r.unit === 'month' ? r.duration + ' tháng' : r.duration + ' ngày'}</td>
        <td class="nowrap" style="color:${r.expired ? 'var(--red)' : 'var(--dim)'}">${fmtDate(r.expiresAt)}</td>
        <td class="nowrap">${accTxt}</td>
        <td class="nowrap">${tbTxt}</td>
        <td>${r.used}</td>
        <td>${status}</td>
        <td>${esc(r.note || '—')}</td>
        <td>${mode === 'admin' ? `
          <div class="act-group">
            <button class="btn small" onclick="viewKeyDetail('${esc(r.code)}')">Chi tiết</button>
            <button class="btn small" onclick="openEditKey('${esc(r.code)}', '${esc(r.unit || 'day')}', '${esc(r.duration)}', '${esc(r.accLimit)}', '${esc(r.deviceLimit)}', '${esc(r.note || '')}')">Sửa</button>
            <button class="btn small danger" onclick="toggleBan('${esc(r.code)}', ${r.banned ? 0 : 1})">${r.banned ? 'Mở khóa' : 'Khóa'}</button>
            <button class="btn small danger" onclick="delKey('${esc(r.code)}')">Xóa</button>
          </div>` : `
          <div class="act-group">
            <button class="btn small" onclick="viewKeyDetail('${esc(r.code)}')">Chi tiết</button>
            <button class="btn small" onclick="openEditKey('${esc(r.code)}', '${esc(r.unit || 'day')}', '${esc(r.duration)}', '${esc(r.accLimit)}', '${esc(r.deviceLimit)}', '${esc(r.note || '')}')">Sửa / Gia hạn</button>
            ${r.banned ? '' : '<button class="btn small danger" onclick="revokeKey(\'' + esc(r.code) + '\')">Thu hồi</button>'}
          </div>`}
      </tr>`}).join('')}</tbody></table></div>`
}

async function viewKeys() {
  const filterRows = `
    <div class="row">
      <div class="fld grow"><label>Tìm key / ghi chú</label><input id="kq" class="inp" value="" placeholder="Nhập key hoặc ghi chú..."></div>
      <div class="fld grow"><label>Lọc theo seller</label><input id="ks" class="inp" value="" placeholder="username seller (để trống = tất cả)"></div>
      <button class="btn" onclick="loadKeys()">🔍 Tìm</button>
    </div>`
  $('#main').innerHTML = `<div class="card"><h2>🔑 Quản lý key (admin)</h2>${filterRows}</div><div class="card" id="keys-wrap"><div class="empty">Đang tải…</div></div>`
  loadKeys()
}

async function loadKeys() {
  const q = $('#kq').value.trim()
  const seller = $('#ks').value.trim()
  const res = await api('/admin/keys?token=' + SESSION.token + '&all=1&q=' + encodeURIComponent(q) + '&seller=' + encodeURIComponent(seller))
  if (!res.ok) return handleErr()
  $('#keys-wrap').innerHTML = keyTableHtml(res.keys || [], 'admin')
}

async function viewMyKeys() {
  const res = await api('/seller/keys?token=' + SESSION.token)
  if (!res.ok) return handleErr()
  $('#main').innerHTML = `<div class="card"><h2>🔑 Key của tôi</h2>${keyTableHtml(res.keys || [], 'seller')}</div>`
}

async function toggleBan(code, ban) {
  const res = await api('/admin/key/ban?token=' + SESSION.token + '&code=' + encodeURIComponent(code) + '&ban=' + ban)
  if (!res.ok) return toast(res.msg || 'Lỗi', false)
  toast(ban ? 'Đã khóa key' : 'Đã mở khóa', true)
  viewKeys()
}

async function delKey(code) {
  if (!confirm('Xóa key ' + code + '?')) return
  const res = await api('/admin/key/delete?token=' + SESSION.token + '&code=' + encodeURIComponent(code))
  if (!res.ok) return toast(res.msg || 'Lỗi', false)
  toast('Đã xóa key', true)
  viewKeys()
}

async function revokeKey(code) {
  if (!confirm('Thu hồi (khóa) key ' + code + '?')) return
  const res = await api('/seller/revoke?token=' + SESSION.token + '&code=' + encodeURIComponent(code))
  if (!res.ok) return toast(res.msg || 'Lỗi', false)
  toast('Đã thu hồi key', true)
  viewMyKeys()
}

async function viewKeyDetail(code) {
  const out = await api('/admin/key?token=' + SESSION.token + '&code=' + encodeURIComponent(code))
  $('#main').innerHTML = `
    <div class="card"><h2>🔑 ${esc(code)} <button class="btn small" onclick="${SESSION.role === 'admin' ? 'viewKeys()' : 'viewMyKeys()'}">← Quay lại</button></h2>
      ${out.ok ? `
      <div class="detail">
        <div class="d"><div class="k">Tạo bởi</div><div class="val">${esc(out.key.createdBy)}</div></div>
        <div class="d"><div class="k">Ngày tạo</div><div class="val">${fmtDate(out.key.createdAt)}</div></div>
        <div class="d"><div class="k">Hạn tới</div><div class="val" style="color:${out.key.expired ? 'var(--red)' : ''}">${fmtDate(out.key.expiresAt)}</div></div>
        <div class="d"><div class="k">Số acc treo</div><div class="val">${out.key.accLimit === 0 ? 'Vô hạn' : out.key.accLimit + ' acc'}</div></div>
        <div class="d"><div class="k">Số thiết bị</div><div class="val">${out.key.deviceLimit === 0 ? 'Vô hạn' : out.key.deviceLimit + ' TB'}</div></div>
        <div class="d"><div class="k">Trạng thái</div><div class="val">${out.key.banned ? '<span class="tag red">Đã khóa</span>' : out.key.expired ? '<span class="tag gray">Hết hạn</span>' : '<span class="tag green">Hoạt động</span>'}</div></div>
        <div class="d"><div class="k">Số thiết bị đã dùng</div><div class="val">${out.key.used}/${out.key.deviceLimit === 0 ? '∞' : out.key.deviceLimit}</div></div>
        <div class="d"><div class="k">Ghi chú</div><div class="val">${esc(out.key.note || '—')}</div></div>
      </div>
      <div class="hwids"><div class="lbl" style="font-size:12px;color:var(--dim);margin-bottom:6px">Thiết bị đã kích hoạt:</div>
        ${(out.key.hwids || []).map((h) => `<div class="h"><span class="mono">${esc(h.hwid)}</span><span style="color:var(--dim)">lần đầu: ${fmtDate(h.firstSeen)}</span><span style="color:var(--dim)">cuối: ${fmtDate(h.lastSeen)}</span></div>`).join('') || '<div class="empty">Chưa có thiết bị nào kích hoạt</div>'}
      </div>` : `<div class="empty" style="color:var(--red)">${esc(out.msg || 'Key không tồn tại')}</div>`}
    </div>`
}

// ---- SỬA / GIA HẠN KEY ----
function openEditKey(code, unit, duration, accs, devices, note) {
  let ov = $('#edit-overlay')
  if (!ov) {
    ov = document.createElement('div')
    ov.id = 'edit-overlay'
    ov.className = 'edit-overlay'
    ov.innerHTML = `
      <div class="edit-modal glass">
        <h3>Sửa key</h3>
        <div class="edit-code" id="edit-code"></div>
        <div class="row">
          <div class="fld"><label>Loại thời hạn</label>
            <select id="edit-unit" class="inp">
              <option value="day">Ngày</option>
              <option value="month">Tháng</option>
            </select>
          </div>
          <div class="fld"><label>Số ngày / tháng</label><input id="edit-duration" class="inp" type="number" min="1" max="120"></div>
          <div class="fld"><label>Số acc treo</label>
            <select id="edit-accs" class="inp"><option value="1">1 acc</option><option value="3">3 acc</option><option value="0">Vô hạn acc</option></select>
          </div>
          <div class="fld"><label>Thiết bị (0 = vô hạn)</label><input id="edit-devices" class="inp" type="number" min="0" max="100"></div>
        </div>
        <div class="fld" style="margin-top:10px"><label>Ghi chú</label><input id="edit-note" class="inp" placeholder="vd: khách A - 09xx"></div>
        <div class="row" style="margin-top:14px;align-items:center">
          <label class="chk"><input type="checkbox" id="edit-replace"> Tính lại từ bây giờ (không cộng dồn)</label>
        </div>
        <div class="msg" id="edit-msg"></div>
        <div class="row" style="margin-top:12px;justify-content:flex-end">
          <button class="btn" onclick="closeEditKey()">Hủy</button>
          <button class="btn primary" onclick="saveEditKey()">💾 Lưu</button>
        </div>
      </div>`
    document.body.appendChild(ov)
  }
  ov.classList.add('show')
  $('#edit-code').textContent = code
  $('#edit-unit').value = unit
  $('#edit-duration').value = duration
  $('#edit-accs').value = String(accs)
  $('#edit-devices').value = String(devices)
  $('#edit-note').value = note
  $('#edit-replace').checked = false
  $('#edit-msg').textContent = ''
  ov.dataset.code = code
}

function closeEditKey() {
  const ov = $('#edit-overlay')
  if (ov) ov.classList.remove('show')
}

async function saveEditKey() {
  const ov = $('#edit-overlay')
  if (!ov) return
  const code = ov.dataset.code
  const unit = $('#edit-unit').value
  const duration = $('#edit-duration').value
  const accs = $('#edit-accs').value
  const devices = $('#edit-devices').value
  const note = $('#edit-note').value.trim()
  const replace = $('#edit-replace').checked ? '1' : '0'
  const msg = $('#edit-msg')
  msg.className = 'msg loading'
  msg.textContent = 'Đang lưu…'
  const path = SESSION.role === 'admin' ? '/admin/key/edit' : '/seller/edit'
  const res = await api(path + '?token=' + SESSION.token +
    '&code=' + encodeURIComponent(code) +
    '&unit=' + unit + '&duration=' + encodeURIComponent(duration) +
    '&accs=' + accs + '&devices=' + encodeURIComponent(devices) +
    '&note=' + encodeURIComponent(note) + '&replace=' + replace)
  if (!res.ok) {
    msg.className = 'msg bad'
    msg.textContent = res.msg || 'Lỗi'
    return
  }
  toast('Đã sửa key ' + code, true)
  closeEditKey()
  if (SESSION.role === 'admin') loadKeys(); else viewMyKeys()
}

// ---- LOGS ----
async function viewLogs() {
  const isAdmin = SESSION.role === 'admin'
  const path = isAdmin ? '/admin/logs' : '/seller/logs'
  const rowsHtml = `
    <div class="row"><div class="fld grow"><label>Tìm trong lịch sử</label><input id="lq" class="inp" placeholder="key / seller / nội dung..."></div><button class="btn" onclick="loadLogs()">🔍 Tìm</button></div>`
  $('#main').innerHTML = `<div class="card"><h2>📜 Lịch sử</h2>${isAdmin ? rowsHtml : ''}</div><div class="card" id="logs-wrap"><div class="empty">Đang tải…</div></div>`
  if (isAdmin) loadLogs()
  else {
    const res = await api(path + '?token=' + SESSION.token)
    $('#logs-wrap').innerHTML = logsHtml(res.logs || [])
  }
}

async function loadLogs() {
  const q = ($('#lq') && $('#lq').value.trim()) || ''
  const res = await api('/admin/logs?token=' + SESSION.token + '&q=' + encodeURIComponent(q))
  if (!res.ok) return handleErr()
  $('#logs-wrap').innerHTML = logsHtml(res.logs || [])
}

function logsHtml(logs) {
  if (!logs.length) return '<div class="empty">Không có lịch sử</div>'
  return '<div class="logs">' + logs.map((l) => `
    <div class="li">
      <span class="t">${fmtDate(l.at)}</span>
      <span class="a">${esc(l.role === 'admin' ? '👑 ' + (l.actor === 'admin' ? 'admin' : l.actor) : '🛒 ' + (l.actor || ''))}</span>
      <span class="d">${esc(l.detail || '')}${l.code ? ' <span class="code">' + esc(l.code) + '</span>' : ''}</span>
    </div>`).join('') + '</div>'
}

function handleErr() {
  $('#main').innerHTML = '<div class="card"><div class="empty">Phiên hết hạn, đăng nhập lại.</div></div>'
  setTimeout(logout, 800)
}

// ==================== BOOT ====================
function boot() {
  const s = session()
  if (s) {
    enterApp(s)
  }
  $('#btn-login').addEventListener('click', doLogin)
  $('#in-user').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin() })
  $('#in-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin() })
  $('#btn-logout').addEventListener('click', logout)
  $('#nav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]')
    if (b) switchTab(b.dataset.tab)
  })
}

boot()
