const http = require('http')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { load, save, addLog, nowISO, init } = require('./db')
const { generateCode, normalize, isValid, addDuration } = require('./keys')

const PORT = Number(process.env.PORT) || 3000
const PUBLIC_DIR = path.join(__dirname, 'public')
const sessions = new Map() // token -> { role, username, createdAt }

// ==================== HELPERS ====================
function json(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve) => {
    let d = ''
    req.on('data', (c) => (d += c))
    req.on('end', () => resolve(d))
    req.on('error', () => resolve(''))
  })
}

function token() {
  return crypto.randomBytes(24).toString('hex')
}

function sha256(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex')
}

function newSession(role, username) {
  const t = token()
  sessions.set(t, { role, username, createdAt: nowISO() })
  return t
}

function requireAuth(q, roles) {
  const t = q.get('token')
  const s = sessions.get(t)
  if (!s) return { error: { ok: false, msg: 'Phiên đăng nhập không hợp lệ' } }
  if (roles && !roles.includes(s.role)) {
    return { error: { ok: false, msg: 'Không có quyền thực hiện' } }
  }
  return { session: s }
}

function isExpired(key) {
  return key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()
}

function fmtDT(d) {
  if (!d || isNaN(new Date(d).getTime())) return '—'
  const p = (n) => String(n).padStart(2, '0')
  const x = new Date(d)
  return `${p(x.getDate())}/${p(x.getMonth() + 1)}/${x.getFullYear()} ${p(x.getHours())}:${p(x.getMinutes())}`
}

function keyView(k) {
  const used = (k.hwids || []).length
  return {
    code: k.code,
    createdBy: k.createdBy,
    createdAt: k.createdAt,
    expiresAt: k.expiresAt,
    expired: isExpired(k),
    unit: k.unit,
    duration: k.duration,
    accLimit: k.accLimit,
    deviceLimit: k.deviceLimit,
    banned: !!k.banned,
    note: k.note || '',
    used: used,
    hwids: (k.hwids || []).map((h) => ({ hwid: h.hwid, firstSeen: h.firstSeen, lastSeen: h.lastSeen }))
  }
}

// ==================== ROUTES ====================
async function route(req, res, q, pathname) {
  // ---- STATIC PANEL ----
  if (pathname === '/' || pathname === '/index.html') return serveFile(res, 'index.html')
  if (pathname === '/panel.js') return serveFile(res, 'panel.js')
  if (pathname === '/style.css') return serveFile(res, 'style.css')

  if (pathname === '/api/ping') return json(res, 200, { ok: true, time: nowISO() })

  // ---- APP: verify key + hwid ----
  if (pathname === '/api/verify') {
    const code = normalize(q.get('key'))
    const hwid = (q.get('hwid') || '').trim()
    const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '')
    if (!code || !hwid) return json(res, 200, { ok: false, msg: 'Thiếu key hoặc HWID' })
    const key = load().keys.find((k) => k.code === code)
    if (!key) return json(res, 200, { ok: false, msg: 'Key không tồn tại' })
    if (key.banned) return json(res, 200, { ok: false, msg: 'Key đã bị khóa', banned: true })
    if (isExpired(key)) return json(res, 200, { ok: false, msg: 'Key đã hết hạn', expired: true })

    key.hwids = key.hwids || []
    const existing = key.hwids.find((h) => h.hwid === hwid)
    const now = nowISO()
    if (existing) {
      existing.lastSeen = now
    } else if (key.deviceLimit === 0 || key.hwids.length < key.deviceLimit) {
      key.hwids.push({ hwid, firstSeen: now, lastSeen: now })
      key.used++
      addLog('app', 'app', 'activate', `Kích hoạt trên thiết bị ${hwid.slice(0, 12)}… (${ip})`, code)
    } else {
      return json(res, 200, { ok: false, msg: 'Key đã hết số thiết bị được phép', deviceFull: true })
    }
    save()
    addLog('app', 'app', 'verify', `Xác thực thiết bị ${hwid.slice(0, 12)}… (${ip})`, code)
    return json(res, 200, {
      ok: true,
      code: key.code,
      createdBy: key.createdBy,
      expiresAt: key.expiresAt,
      accLimit: key.accLimit,
      deviceLimit: key.deviceLimit
    })
  }

  // ---- PUBLIC: check key info (tra cứu nhanh) ----
  if (pathname === '/api/check') {
    const code = normalize(q.get('key'))
    if (!code) return json(res, 200, { ok: false, msg: 'Thiếu key' })
    const key = load().keys.find((k) => k.code === code)
    if (!key) return json(res, 200, { ok: false, msg: 'Key không tồn tại' })
    const v = keyView(key)
    return json(res, 200, { ok: true, key: v })
  }

  // ---- LOGIN ----
  if (pathname === '/api/login') {
    const u = (q.get('u') || '').trim()
    const p = q.get('p') || ''
    if (u === 'admin') {
      const current = load().meta ? load().meta.adminPass : ''
      if (sha256(p) !== sha256(current)) {
        console.log(`[LOGIN] admin thất bại (ip ${(req.socket.remoteAddress || '').replace(/^::ffff:/, '')})`)
        return json(res, 200, { ok: false, msg: 'Sai mật khẩu admin' })
      }
      const t = newSession('admin', 'admin')
      addLog('admin', 'admin', 'login', 'Đăng nhập admin')
      console.log('[LOGIN] admin thành công')
      return json(res, 200, { ok: true, token: t, role: 'admin', username: 'admin' })
    }
    const seller = load().sellers.find((s) => s.username === u)
    if (!seller) return json(res, 200, { ok: false, msg: 'Seller không tồn tại' })
    if (seller.password !== p) return json(res, 200, { ok: false, msg: 'Sai mật khẩu seller' })
    const t = newSession('seller', u)
    addLog(u, 'seller', 'login', 'Đăng nhập seller')
    return json(res, 200, { ok: true, token: t, role: 'seller', username: u })
  }

  if (pathname === '/api/logout') {
    const t = q.get('token')
    if (t) sessions.delete(t)
    return json(res, 200, { ok: true })
  }

  if (pathname === '/api/me') {
    const { error, session } = requireAuth(q)
    if (error) return json(res, 200, error)
    return json(res, 200, { ok: true, role: session.role, username: session.username })
  }

  // ==================== ADMIN ====================
  if (pathname.startsWith('/api/admin/')) {
    const { error, session } = requireAuth(q, ['admin'])
    if (error) return json(res, 200, error)

    if (pathname === '/api/admin/sellers') {
      return json(res, 200, { ok: true, sellers: load().sellers.map((s) => ({ username: s.username, note: s.note || '', createdAt: s.createdAt })) })
    }

    if (pathname === '/api/admin/create') {
      const unit = (q.get('unit') || 'day').toLowerCase()
      const duration = parseInt(q.get('duration') || '0', 10)
      const accs = q.get('accs')
      const devices = q.get('devices')
      const qty = Math.max(1, parseInt(q.get('qty') || '1', 10))
      const note = (q.get('note') || '').trim()
      const owner = (q.get('as') || '').trim() || 'admin' // tạo hộ cho seller nào, mặc định admin
      if (!['day', 'month'].includes(unit)) return json(res, 200, { ok: false, msg: 'Đơn vị phải là day hoặc month' })
      if (![1, 3, 0].includes(Number(accs))) return json(res, 200, { ok: false, msg: 'Loại acc phải là 1, 3 hoặc 0 (vô hạn)' })
      if (isNaN(duration) || duration < 1 || duration > 120) return json(res, 200, { ok: false, msg: 'Thời hạn phải từ 1 đến 120' })
      if (isNaN(devices) || devices < 0 || devices > 100) return json(res, 200, { ok: false, msg: 'Số thiết bị phải từ 0 (vô hạn) đến 100' })
      if (qty > 100) return json(res, 200, { ok: false, msg: 'Mỗi lần tối đa 100 key' })
      if (owner !== 'admin' && !load().sellers.some((s) => s.username === owner)) {
        return json(res, 200, { ok: false, msg: 'Seller không tồn tại' })
      }
      const codes = []
      const db = load()
      for (let i = 0; i < qty; i++) {
        let code = ''
        let guard = 0
        do {
          code = generateCode()
          guard++
        } while (db.keys.some((k) => k.code === code) && guard < 50)
        db.keys.push({
          code, createdAt: nowISO(), createdBy: owner, unit, duration,
          accLimit: Number(accs), deviceLimit: Number(devices),
          expiresAt: addDuration(unit, duration).toISOString(),
          banned: false, note, hwids: [], used: 0
        })
        codes.push(code)
      }
      save()
      addLog(session.username, 'admin', 'key_create', `Admin tạo ${qty} key cho ${owner} (${unit} ${duration}, acc=${accs}, devices=${devices})`, codes.join(','))
      return json(res, 200, { ok: true, codes, keys: codes.map((c) => load().keys.find((k) => k.code === c)).filter(Boolean).map(keyView) })
    }

    if (pathname === '/api/admin/seller/add') {
      const u = (q.get('u') || '').trim()
      const p = q.get('p') || ''
      const note = (q.get('note') || '').trim()
      if (!u || !p) return json(res, 200, { ok: false, msg: 'Thiếu username hoặc password seller' })
      if (u === 'admin') return json(res, 200, { ok: false, msg: 'Không được dùng tên admin' })
      if (load().sellers.some((s) => s.username === u)) return json(res, 200, { ok: false, msg: 'Seller đã tồn tại' })
      load().sellers.push({ username: u, password: p, note, createdAt: nowISO() })
      save()
      addLog(session.username, 'admin', 'seller_add', `Tạo seller ${u}`)
      return json(res, 200, { ok: true })
    }

    if (pathname === '/api/admin/seller/remove') {
      const u = (q.get('u') || '').trim()
      const db = load()
      const before = db.sellers.length
      db.sellers = db.sellers.filter((s) => s.username !== u)
      if (db.sellers.length === before) return json(res, 200, { ok: false, msg: 'Seller không tồn tại' })
      save()
      addLog(session.username, 'admin', 'seller_remove', `Xóa seller ${u}`)
      return json(res, 200, { ok: true })
    }

    if (pathname === '/api/admin/seller/pass') {
      const u = (q.get('u') || '').trim()
      const p = q.get('p') || ''
      const seller = load().sellers.find((s) => s.username === u)
      if (!seller) return json(res, 200, { ok: false, msg: 'Seller không tồn tại' })
      if (!p) return json(res, 200, { ok: false, msg: 'Password trống' })
      seller.password = p
      save()
      addLog(session.username, 'admin', 'seller_pass', `Đổi mật khẩu seller ${u}`)
      return json(res, 200, { ok: true })
    }

    if (pathname === '/api/admin/keys') {
      const qs = (q.get('q') || '').toLowerCase()
      const seller = (q.get('seller') || '').toLowerCase()
      const showAll = q.get('all') === '1'
      let list = load().keys
      if (seller) list = list.filter((k) => (k.createdBy || '').toLowerCase() === seller)
      if (qs) list = list.filter((k) => k.code.toLowerCase().includes(qs) || (k.note || '').toLowerCase().includes(qs))
      if (!showAll) list = list.filter((k) => !k.banned && !isExpired(k))
      list = list.slice(0, 500).map(keyView)
      return json(res, 200, { ok: true, keys: list })
    }

    if (pathname === '/api/admin/key') {
      const code = normalize(q.get('code'))
      const key = load().keys.find((k) => k.code === code)
      if (!key) return json(res, 200, { ok: false, msg: 'Key không tồn tại' })
      return json(res, 200, { ok: true, key: keyView(key) })
    }

    if (pathname === '/api/admin/key/ban') {
      const code = normalize(q.get('code'))
      const ban = q.get('ban') === '1'
      const key = load().keys.find((k) => k.code === code)
      if (!key) return json(res, 200, { ok: false, msg: 'Key không tồn tại' })
      key.banned = ban
      save()
      addLog(session.username, 'admin', ban ? 'key_ban' : 'key_unban', `${ban ? 'Khóa' : 'Mở khóa'} key ${code}`)
      return json(res, 200, { ok: true })
    }

    if (pathname === '/api/admin/key/delete') {
      const code = normalize(q.get('code'))
      const db = load()
      const before = db.keys.length
      db.keys = db.keys.filter((k) => k.code !== code)
      if (db.keys.length === before) return json(res, 200, { ok: false, msg: 'Key không tồn tại' })
      save()
      addLog(session.username, 'admin', 'key_delete', `Xóa key ${code}`)
      return json(res, 200, { ok: true })
    }

    // ---- SỬA KEY: đổi thời hạn / gia hạn / đổi giới hạn acc / thiết bị / ghi chú ----
    // unit=duration tính theo ngày/tháng. Mặc định CỘNG DỒN từ hạn cũ (gia hạn thêm),
    // dùng replace=1 để tính lại từ thời điểm hiện tại (như tạo mới).
    if (pathname === '/api/admin/key/edit') {
      const code = normalize(q.get('code'))
      const db = load()
      const key = db.keys.find((k) => k.code === code)
      if (!key) return json(res, 200, { ok: false, msg: 'Key không tồn tại' })

      const unit = (q.get('unit') || key.unit || 'day').toLowerCase()
      const duration = parseInt(q.get('duration') !== null ? q.get('duration') : (key.duration || 1), 10)
      const accs = q.get('accs') !== null ? q.get('accs') : String(key.accLimit)
      const devices = q.get('devices') !== null ? q.get('devices') : String(key.deviceLimit)
      const note = q.get('note') !== null ? q.get('note') : (key.note || '')
      const replace = q.get('replace') === '1'

      if (!['day', 'month'].includes(unit)) return json(res, 200, { ok: false, msg: 'Đơn vị phải là day hoặc month' })
      if (![1, 3, 0].includes(Number(accs))) return json(res, 200, { ok: false, msg: 'Loại acc phải là 1, 3 hoặc 0 (vô hạn)' })
      if (isNaN(duration) || duration < 1 || duration > 120) return json(res, 200, { ok: false, msg: 'Thời hạn phải từ 1 đến 120' })
      if (isNaN(devices) || devices < 0 || devices > 100) return json(res, 200, { ok: false, msg: 'Số thiết bị phải từ 0 (vô hạn) đến 100' })

      let base = Date.now()
      if (!replace && key.expiresAt) {
        const cur = new Date(key.expiresAt).getTime()
        if (cur > Date.now()) base = cur // còn hạn → gia hạn thêm từ hạn cũ
      }
      const expiresAt = addDuration(unit, duration, base).toISOString()
      const old = `${key.unit || 'day'} ${key.duration || 1} hạn ${fmtDT(new Date(key.expiresAt))}`
      key.unit = unit
      key.duration = duration
      key.accLimit = Number(accs)
      key.deviceLimit = Number(devices)
      key.note = note
      key.expiresAt = expiresAt
      save()
      addLog(session.username, 'admin', 'key_edit', `Sửa key ${code} (Trước: ${old} → Sau: ${unit} ${duration}, hạn ${fmtDT(new Date(expiresAt))}, acc=${accs}, devices=${devices})`, code)
      return json(res, 200, { ok: true, key: keyView(key) })
    }

    if (pathname === '/api/admin/logs') {
      const qs = (q.get('q') || '').toLowerCase()
      let logs = load().logs
      if (qs) logs = logs.filter((l) => (l.code || '').toLowerCase().includes(qs) || (l.actor || '').toLowerCase().includes(qs) || (l.detail || '').toLowerCase().includes(qs))
      return json(res, 200, { ok: true, logs: logs.slice(0, 1000) })
    }

    if (pathname === '/api/admin/stats') {
      const db = load()
      const now = Date.now()
      const total = db.keys.length
      const active = db.keys.filter((k) => !k.banned && k.expiresAt && new Date(k.expiresAt).getTime() > now).length
      const expired = db.keys.filter((k) => k.expiresAt && new Date(k.expiresAt).getTime() <= now).length
      const banned = db.keys.filter((k) => k.banned).length
      const activations = db.logs.filter((l) => l.action === 'activate').length
      const bySeller = {}
      for (const k of db.keys) {
        const owner = k.createdBy || 'admin'
        bySeller[owner] = (bySeller[owner] || 0) + 1
      }
      return json(res, 200, {
        ok: true,
        stats: {
          sellers: db.sellers.length,
          total,
          active,
          expired,
          banned,
          activations,
          bySeller
        }
      })
    }

    return json(res, 200, { ok: false, msg: 'Admin route không hợp lệ' })
  }

  // ==================== SELLER ====================
  if (pathname.startsWith('/api/seller/')) {
    const { error, session } = requireAuth(q, ['seller'])
    if (error) return json(res, 200, error)

    if (pathname === '/api/seller/create') {
      const unit = (q.get('unit') || 'day').toLowerCase() // day | month
      const duration = parseInt(q.get('duration') || '0', 10)
      const accs = q.get('accs') // '1' | '3' | '0'
      const devices = q.get('devices') // number, 0 = unlimited
      const qty = Math.max(1, parseInt(q.get('qty') || '1', 10))
      const note = (q.get('note') || '').trim()
      if (!['day', 'month'].includes(unit)) return json(res, 200, { ok: false, msg: 'Đơn vị phải là day hoặc month' })
      if (![1, 3, 0].includes(Number(accs))) return json(res, 200, { ok: false, msg: 'Loại acc phải là 1, 3 hoặc 0 (vô hạn)' })
      if (isNaN(duration) || duration < 1 || duration > 120) return json(res, 200, { ok: false, msg: 'Thời hạn phải từ 1 đến 120' })
      if (isNaN(devices) || devices < 0 || devices > 100) return json(res, 200, { ok: false, msg: 'Số thiết bị phải từ 0 (vô hạn) đến 100' })
      if (qty > 100) return json(res, 200, { ok: false, msg: 'Mỗi lần tối đa 100 key' })

      const codes = []
      const db = load()
      for (let i = 0; i < qty; i++) {
        let code = ''
        let guard = 0
        do {
          code = generateCode()
          guard++
        } while (db.keys.some((k) => k.code === code) && guard < 50)
        const expiresAt = addDuration(unit, duration).toISOString()
        db.keys.push({
          code,
          createdAt: nowISO(),
          createdBy: session.username,
          unit,
          duration,
          accLimit: Number(accs),
          deviceLimit: Number(devices),
          expiresAt,
          banned: false,
          note,
          hwids: [],
          used: 0
        })
        codes.push(code)
      }
      save()
      addLog(session.username, 'seller', 'key_create', `Tạo ${qty} key (${unit} ${duration}, acc=${accs}, devices=${devices})`, codes.join(','))
      return json(res, 200, { ok: true, codes, keys: codes.map((c) => load().keys.find((k) => k.code === c)).filter(Boolean).map(keyView) })
    }

    if (pathname === '/api/seller/keys') {
      const qs = (q.get('q') || '').toLowerCase()
      let list = load().keys.filter((k) => k.createdBy === session.username)
      if (qs) list = list.filter((k) => k.code.toLowerCase().includes(qs) || (k.note || '').toLowerCase().includes(qs))
      list = list.slice(0, 500).map(keyView)
      return json(res, 200, { ok: true, keys: list })
    }

    if (pathname === '/api/seller/revoke') {
      const code = normalize(q.get('code'))
      const key = load().keys.find((k) => k.code === code)
      if (!key) return json(res, 200, { ok: false, msg: 'Key không tồn tại' })
      if (key.createdBy !== session.username) return json(res, 200, { ok: false, msg: 'Không phải key của bạn' })
      key.banned = true
      save()
      addLog(session.username, 'seller', 'key_revoke', `Thu hồi key ${code}`)
      return json(res, 200, { ok: true })
    }

    // ---- SỬA KEY (seller): đổi thời hạn / gia hạn / giới hạn acc / thiết bị / ghi chú ----
    // Mặc định CỘNG DỒN từ hạn cũ (gia hạn thêm). replace=1 → tính lại từ bây giờ.
    if (pathname === '/api/seller/edit') {
      const code = normalize(q.get('code'))
      const db = load()
      const key = db.keys.find((k) => k.code === code)
      if (!key) return json(res, 200, { ok: false, msg: 'Key không tồn tại' })
      if (key.createdBy !== session.username) return json(res, 200, { ok: false, msg: 'Không phải key của bạn' })

      const unit = (q.get('unit') || key.unit || 'day').toLowerCase()
      const duration = parseInt(q.get('duration') !== null ? q.get('duration') : (key.duration || 1), 10)
      const accs = q.get('accs') !== null ? q.get('accs') : String(key.accLimit)
      const devices = q.get('devices') !== null ? q.get('devices') : String(key.deviceLimit)
      const note = q.get('note') !== null ? q.get('note') : (key.note || '')
      const replace = q.get('replace') === '1'

      if (!['day', 'month'].includes(unit)) return json(res, 200, { ok: false, msg: 'Đơn vị phải là day hoặc month' })
      if (![1, 3, 0].includes(Number(accs))) return json(res, 200, { ok: false, msg: 'Loại acc phải là 1, 3 hoặc 0 (vô hạn)' })
      if (isNaN(duration) || duration < 1 || duration > 120) return json(res, 200, { ok: false, msg: 'Thời hạn phải từ 1 đến 120' })
      if (isNaN(devices) || devices < 0 || devices > 100) return json(res, 200, { ok: false, msg: 'Số thiết bị phải từ 0 (vô hạn) đến 100' })

      let base = Date.now()
      if (!replace && key.expiresAt) {
        const cur = new Date(key.expiresAt).getTime()
        if (cur > Date.now()) base = cur // còn hạn → gia hạn thêm từ hạn cũ
      }
      const expiresAt = addDuration(unit, duration, base).toISOString()
      const old = `${key.unit || 'day'} ${key.duration || 1} hạn ${fmtDT(new Date(key.expiresAt))}`
      key.unit = unit
      key.duration = duration
      key.accLimit = Number(accs)
      key.deviceLimit = Number(devices)
      key.note = note
      key.expiresAt = expiresAt
      save()
      addLog(session.username, 'seller', 'key_edit', `Sửa key ${code} (Trước: ${old} → Sau: ${unit} ${duration}, hạn ${fmtDT(new Date(expiresAt))}, acc=${accs}, devices=${devices})`, code)
      return json(res, 200, { ok: true, key: keyView(key) })
    }

    if (pathname === '/api/seller/stats') {
      const my = load().keys.filter((k) => k.createdBy === session.username)
      return json(res, 200, {
        ok: true,
        stats: {
          total: my.length,
          active: my.filter((k) => !k.banned && !isExpired(k)).length,
          used: my.reduce((a, k) => a + (k.hwids || []).length, 0)
        }
      })
    }

    return json(res, 200, { ok: false, msg: 'Seller route không hợp lệ' })
  }

  return json(res, 404, { ok: false, msg: 'Không tìm thấy' })
}

function serveFile(res, name) {
  const p = path.join(PUBLIC_DIR, name)
  if (!fs.existsSync(p)) return json(res, 404, { ok: false, msg: 'Không tìm thấy' })
  const ext = path.extname(name)
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }[ext] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': mime })
  res.end(fs.readFileSync(p))
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost')
    await route(req, res, u.searchParams, u.pathname)
  } catch (e) {
    console.error('Lỗi server:', e)
    json(res, 500, { ok: false, msg: 'Lỗi server: ' + e.message })
  }
})

init().then(() => {
  server.listen(PORT, () => {
    console.log(`HEXTEKO License API đang chạy: http://0.0.0.0:${PORT}`)
    console.log(`Admin panel: http://localhost:${PORT}/  (mk admin: ${load().meta.adminPass})`)
    if (process.env.GIST_ID && process.env.GITHUB_TOKEN) console.log('DB trên GitHub Gist:', process.env.GIST_ID)
  })
}).catch((e) => {
  console.error('Khởi động thất bại:', e.message)
  process.exit(1)
})

module.exports = { server }
