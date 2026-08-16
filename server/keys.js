const crypto = require('crypto')

// Ký tự dễ đọc, bỏ 0/O/1/I để tránh nhầm lẫn
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PREFIX = 'HEXTEKO-'
const CODE_LEN = 10

function generateCode() {
  const bytes = crypto.randomBytes(CODE_LEN)
  let s = ''
  for (const b of bytes) s += CHARS[b % CHARS.length]
  return PREFIX + s
}

function normalize(code) {
  if (!code) return ''
  return String(code).trim().toUpperCase().replace(/[\s\-_]/g, (c) => (c === '-' ? '-' : ''))
}

function isValid(code) {
  const k = normalize(code)
  return /^HEXTEKO-[A-Z0-9]{10}$/.test(k)
}

function addDuration(unit, n) {
  const d = new Date()
  if (String(unit).toLowerCase() === 'month') {
    d.setMonth(d.getMonth() + Math.max(1, n))
  } else {
    d.setDate(d.getDate() + Math.max(1, n))
  }
  return d
}

module.exports = { generateCode, normalize, isValid, addDuration, PREFIX }