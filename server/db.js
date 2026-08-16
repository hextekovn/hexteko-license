const fs = require('fs')
const path = require('path')
const https = require('https')

// Render không lưu file cứng trên bản free. Nếu set đủ 2 biến môi trường:
//   GITHUB_TOKEN  = Personal Access Token (quyền Gists đọc/ghi, miễn phí)
//   GIST_ID       = ID của gist dùng làm "database"
// thì db.js sẽ tự đồng bộ db.json lên GitHub Gist — không bị mất khi Render restart/redeploy.
// Nếu không set 2 biến này (chạy local) thì vẫn dùng file như cũ.
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'db.json')
const GIST_ID = (process.env.GIST_ID || '').trim()
const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || '').trim()
const GIST_FILE = process.env.GIST_FILE || 'db.json'

let cache = null

let syncInFlight = false
let needSync = false

function nowISO() {
  return new Date().toISOString()
}

function emptyDB() {
  return {
    meta: {
      adminPass: 'trankhoi0803',
      createdAt: nowISO()
    },
    sellers: [],
    keys: [],
    logs: []
  }
}

function normalize(db) {
  if (!db || typeof db !== 'object') return emptyDB()
  const base = emptyDB()
  db.meta = Object.assign(base.meta, db.meta || {})
  if (!Array.isArray(db.sellers)) db.sellers = []
  if (!Array.isArray(db.keys)) db.keys = []
  if (!Array.isArray(db.logs)) db.logs = []
  return db
}

// ==================== GITHUB GIST ====================
function ghRequest(method, urlPath, bodyObj) {
  return new Promise((resolve, reject) => {
    const data = bodyObj === undefined ? null : Buffer.from(JSON.stringify(bodyObj))
    const req = https.request(
      {
        host: 'api.github.com',
        path: urlPath,
        method,
        headers: {
          'User-Agent': 'hexteko-license',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          Authorization: 'Bearer ' + GITHUB_TOKEN,
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {})
        },
        timeout: 15000
      },
      (res) => {
        let body = ''
        res.on('data', (c) => (body += c))
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body))
            } catch (e) {
              resolve({})
            }
          } else {
            let detail = body
            try { detail = JSON.parse(body).message || body } catch (e) {}
            reject(new Error('GitHub ' + res.statusCode + ': ' + detail))
          }
        })
      }
    )
    req.on('timeout', () => { req.destroy(new Error('GitHub timeout')) })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

async function loadFromGist() {
  const g = await ghRequest('GET', '/gists/' + GIST_ID)
  const f = g.files && g.files[GIST_FILE]
  if (!f || f.content === undefined) throw new Error('Không thấy file ' + GIST_FILE + ' trong gist')
  return JSON.parse(f.content)
}

async function pushToGist() {
  if (syncInFlight) { needSync = true; return }
  syncInFlight = true
  needSync = false
  try {
    // Chỉ update file db.json trong gist, các file khác giữ nguyên
    const g = await ghRequest('PATCH', '/gists/' + GIST_ID, {
      files: { [GIST_FILE]: { content: JSON.stringify(cache, null, 2) } }
    })
    if (g.files && g.files[GIST_FILE] && g.files[GIST_FILE].truncated) {
      console.error('Gist sync: file > 300KB? Dữ liệu bị cắt.')
    }
  } catch (e) {
    console.error('Gist sync lỗi (sẽ thử lại lần sau):', e.message)
  }
  syncInFlight = false
  if (needSync) setTimeout(pushToGist, 300)
}

// ==================== LOAD / SAVE ====================
async function init() {
  if (cache) return cache
  cache = emptyDB()
  if (GIST_ID && GITHUB_TOKEN) {
    try {
      cache = normalize(await loadFromGist())
      console.log('Đã tải database từ GitHub Gist (' + GIST_ID + ')')
      return cache
    } catch (e) {
      console.error('Không tải được từ Gist, dùng file local:', e.message)
    }
  }
  try {
    if (fs.existsSync(DB_FILE)) {
      cache = normalize(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')))
    }
  } catch (e) {
    console.error('Lỗi đọc db.json:', e.message)
  }
  save()
  return cache
}

function load() {
  if (cache) return cache
  if (GIST_ID && GITHUB_TOKEN) {
    // Chưa khởi tạo xong (bất đồng bộ) — trả db rỗng, init() sẽ nạp lại sau đó
    cache = emptyDB()
    return cache
  }
  try {
    if (fs.existsSync(DB_FILE)) {
      cache = normalize(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')))
    } else {
      cache = emptyDB()
    }
  } catch (e) {
    console.error('Lỗi đọc db.json:', e.message)
    cache = emptyDB()
  }
  return cache
}

function save() {
  if (!cache) return
  try { fs.mkdirSync(path.dirname(DB_FILE), { recursive: true }) } catch (e) {}
  try {
    fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(cache, null, 2))
    fs.renameSync(DB_FILE + '.tmp', DB_FILE)
  } catch (e) {
    console.error('Lỗi lưu file local:', e.message)
  }
  if (GIST_ID && GITHUB_TOKEN) pushToGist()
}

function addLog(actor, role, action, detail, code) {
  const log = { at: nowISO(), actor, role, action, detail, code: code || null }
  load().logs.unshift(log)
  if (load().logs.length > 5000) load().logs.length = 5000
  return log
}

module.exports = { init, load, save, addLog, nowISO, DB_FILE }