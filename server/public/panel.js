:root {
  --bg0: #030303;
  --bg1: #0c0c0e;
  --stroke: rgba(255, 255, 255, 0.10);
  --stroke-hi: rgba(255, 255, 255, 0.28);
  --accent: #ffffff;
  --accent-dim: rgba(255, 255, 255, 0.55);
  --green: #9dffd0;
  --amber: #ffd9a0;
  --red: #ff7b85;
  --cyan: #8be9ff;
  --txt: #f5f5f7;
  --txt-dim: rgba(245, 245, 247, 0.5);
  --radius: 16px;
  --font: 'Quicksand', 'Segoe UI', system-ui, sans-serif;
  --font-num: 'Nunito', 'Quicksand', 'Segoe UI', sans-serif;
  --glow: rgba(255, 255, 255, 0.65);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { min-height: 100%; }

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  font-family: var(--font);
  color: var(--txt);
  font-size: 14.5px;
  line-height: 1.5;
  background:
    radial-gradient(1100px 620px at 15% -12%, rgba(255, 255, 255, 0.10), transparent 60%),
    radial-gradient(900px 560px at 88% 2%, rgba(255, 255, 255, 0.07), transparent 60%),
    radial-gradient(700px 500px at 50% 110%, rgba(255, 255, 255, 0.05), transparent 60%),
    linear-gradient(165deg, var(--bg0), var(--bg1));
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

/* ===================== AURORA ===================== */
.aurora {
  position: fixed;
  z-index: 0;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.40;
  pointer-events: none;
  animation: float 30s ease-in-out infinite alternate;
  will-change: transform;
}
.aurora { width: 520px; height: 520px; top: -160px; left: -120px; background: radial-gradient(circle, rgba(255, 255, 255, 0.60), transparent 60%); }
.aurora.a2 { width: 600px; height: 600px; bottom: -220px; right: -180px; background: radial-gradient(circle, rgba(255, 255, 255, 0.46), transparent 60%); animation-duration: 38s; }
.aurora.a3 { width: 380px; height: 380px; top: 44%; left: 52%; background: radial-gradient(circle, rgba(255, 255, 255, 0.34), transparent 60%); animation-duration: 46s; }
@keyframes float {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(60px, 40px) scale(1.18); }
}

/* ===================== GLASS ===================== */
.glass {
  position: relative;
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.015) 55%, rgba(255, 255, 255, 0.045));
  border: 1px solid var(--stroke);
  border-radius: var(--radius);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    inset 0 -1px 0 rgba(0, 0, 0, 0.3),
    0 16px 40px rgba(0, 0, 0, 0.55),
    0 0 30px rgba(255, 255, 255, 0.03);
  transition: border-color .25s ease, box-shadow .25s ease, transform .25s ease;
}
.glass::before {
  content: '';
  position: absolute;
  left: 8%; right: 8%; top: 0; height: 1px;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  pointer-events: none;
}

/* Glow tỏa sáng khi hover */
.glass:hover {
  border-color: rgba(255, 255, 255, 0.22);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 20px 55px rgba(0, 0, 0, 0.6),
    0 0 55px rgba(255, 255, 255, 0.10),
    0 0 90px rgba(255, 255, 255, 0.05);
}

/* Hiệu ứng tia sáng quét ngang qua thẻ */
.highlight {
  position: relative;
  overflow: hidden;
}
.highlight::after {
  content: '';
  position: absolute;
  top: 0; left: -60%;
  width: 45%; height: 100%;
  background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.10), transparent);
  transform: skewX(-20deg);
  animation: shine 6.5s ease-in-out infinite;
  pointer-events: none;
}
@keyframes shine {
  0%, 55% { left: -60%; }
  80%, 100% { left: 140%; }
}

.view { position: relative; z-index: 1; min-height: 100vh; }
.hidden { display: none !important; }

/* ===================== INPUT / BUTTON ===================== */
.inp {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--stroke);
  color: var(--txt);
  padding: 11px 14px;
  border-radius: 12px;
  font-size: 15px;
  font-family: var(--font);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color .18s, box-shadow .18s, background .18s;
  width: 100%;
}
.inp:focus {
  border-color: var(--stroke-hi);
  background: rgba(255, 255, 255, 0.09);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.08), 0 0 24px rgba(255, 255, 255, 0.10);
}
.inp::placeholder { color: var(--txt-dim); }
select.inp {
  cursor: pointer;
  background-image: linear-gradient(45deg, transparent 50%, var(--txt-dim) 50%), linear-gradient(135deg, var(--txt-dim) 50%, transparent 50%);
  background-position: calc(100% - 18px) 50%, calc(100% - 13px) 50%;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  padding-right: 30px;
}

.btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--stroke);
  color: var(--txt);
  padding: 11px 18px;
  border-radius: 12px;
  font-size: 14.5px;
  font-family: var(--font);
  font-weight: 600;
  cursor: pointer;
  transition: .18s;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}
.btn:hover { background: rgba(255, 255, 255, 0.15); border-color: rgba(255,255,255,0.2); box-shadow: 0 0 20px rgba(255,255,255,0.06); }
.btn:active { transform: translateY(1px); }
.btn.primary {
  background: linear-gradient(135deg, #ffffff, #d9d9dd);
  color: #000;
  border: none;
  box-shadow: 0 0 22px rgba(255, 255, 255, 0.35);
}
.btn.primary:hover { filter: brightness(1.1); box-shadow: 0 0 34px rgba(255, 255, 255, 0.5); }
.btn.danger { background: rgba(255, 123, 133, 0.12); border-color: rgba(255, 123, 133, 0.4); color: var(--red); }
.btn.danger:hover { background: rgba(255, 123, 133, 0.22); box-shadow: 0 0 22px rgba(255,123,133,0.15); }
.btn.small { padding: 6px 12px; font-size: 12.5px; border-radius: 9px; }
.btn.ghost { background: transparent; }

.msg { min-height: 20px; font-size: 13px; margin-top: 10px; }
.msg.ok { color: var(--green); text-shadow: 0 0 12px rgba(157,255,208,0.4); }
.msg.bad { color: var(--red); text-shadow: 0 0 12px rgba(255,123,133,0.4); }

/* ===================== LOGIN ===================== */
#view-login { display: flex; align-items: center; justify-content: center; padding: 20px; }
.login-box {
  width: 380px;
  max-width: 100%;
  padding: 42px 36px;
  text-align: center;
  overflow: hidden;
}
.login-box .logo { font-size: 44px; margin-bottom: 8px; display: inline-block; text-shadow: 0 0 24px rgba(255,255,255,0.7); }
.login-box h1 { font-size: 23px; font-weight: 700; letter-spacing: 1px; }
.login-box h1 span { background: linear-gradient(90deg, #fff, #d6d6db); -webkit-background-clip: text; background-clip: text; color: transparent; }
.login-box p { color: var(--txt-dim); font-size: 12.5px; margin: 5px 0 24px; letter-spacing: 1.5px; text-transform: uppercase; }
.login-box .inp { margin-bottom: 13px; }
.login-box .btn { width: 100%; padding: 13px; }

/* ===================== TOPBAR ===================== */
.topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 20px;
  position: sticky;
  top: 12px;
  z-index: 10;
  margin: 12px 18px 0;
}
.brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.logo {
  width: 42px; height: 42px; border-radius: 12px;
  display: grid; place-items: center;
  font-size: 20px; color: #000; font-weight: 700;
  background: linear-gradient(135deg, #ffffff, #dcdce0);
  box-shadow: 0 0 26px rgba(255, 255, 255, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
}
.brand-txt { min-width: 0; }
.brand-txt h1 { font-size: 17px; font-weight: 700; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.brand-txt h1 span { background: linear-gradient(90deg, #fff, #d6d6db); -webkit-background-clip: text; background-clip: text; color: transparent; }
.brand-txt p { font-size: 11px; color: var(--txt-dim); letter-spacing: 1.5px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#nav { display: flex; gap: 5px; flex: 1; flex-wrap: wrap; }
#nav button {
  background: transparent;
  border: 1px solid transparent;
  color: var(--txt-dim);
  padding: 9px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13.5px;
  font-family: var(--font);
  font-weight: 600;
  transition: .18s;
  -webkit-tap-highlight-color: transparent;
}
#nav button:hover { color: var(--txt); background: rgba(255, 255, 255, 0.07); }
#nav button.active {
  color: var(--txt);
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.18);
  box-shadow: 0 0 18px rgba(255, 255, 255, 0.08);
}
#nav button .badge { margin-left: 6px; font-size: 11px; color: var(--cyan); }

/* ===================== MAIN ===================== */
#main { padding: 20px 18px 60px; max-width: 1240px; margin: 0 auto; position: relative; z-index: 1; }
.card {
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.015) 55%, rgba(255, 255, 255, 0.04));
  border: 1px solid var(--stroke);
  border-radius: var(--radius);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    0 16px 40px rgba(0, 0, 0, 0.55),
    0 0 30px rgba(255, 255, 255, 0.03);
  padding: 20px;
  margin-bottom: 16px;
  position: relative;
  transition: border-color .25s, box-shadow .25s, transform .25s;
}
.card::before {
  content: '';
  position: absolute;
  left: 8%; right: 8%; top: 0; height: 1px;
  border-radius: inherit;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  pointer-events: none;
}
.card:hover {
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 20px 55px rgba(0, 0, 0, 0.6),
    0 0 50px rgba(255, 255, 255, 0.08);
}
.card h2 { font-size: 15px; margin-bottom: 14px; font-weight: 700; }
.card h2 .hint { font-size: 12px; color: var(--txt-dim); font-weight: 400; }
.row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; }
.row .fld { display: flex; flex-direction: column; gap: 6px; }
.fld label { font-size: 12px; color: var(--accent-dim); font-weight: 600; letter-spacing: 0.3px; }
.fld .inp { min-width: 0; }
.grow { flex: 1; min-width: 150px; }
textarea.inp { resize: vertical; min-height: 42px; }

/* ===================== STATS ===================== */
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 18px; }
.stat {
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.015) 55%, rgba(255, 255, 255, 0.05));
  border: 1px solid var(--stroke);
  border-radius: var(--radius);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.10), 0 14px 34px rgba(0,0,0,0.45), 0 0 26px rgba(255,255,255,0.03);
  padding: 18px;
  position: relative;
  transition: .25s;
}
.stat:hover { border-color: rgba(255,255,255,0.2); box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 46px rgba(0,0,0,0.5), 0 0 44px rgba(255,255,255,0.1); }
.stat .v { font-size: 28px; font-weight: 800; font-family: var(--font-num); color: var(--accent); text-shadow: 0 0 22px rgba(255, 255, 255, 0.4); }
.stat .l { font-size: 12px; color: var(--txt-dim); margin-top: 4px; }

/* ===================== TABLE ===================== */
.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 760px; }
th, td { text-align: left; padding: 11px 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); }
th { color: var(--accent-dim); font-weight: 700; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.6px; }
tr:hover td { background: rgba(255, 255, 255, 0.03); }
.code {
  font-family: var(--font-num), Consolas, monospace;
  color: var(--cyan);
  letter-spacing: 0.5px;
  user-select: all;
  cursor: pointer;
  text-shadow: 0 0 14px rgba(139, 233, 255, 0.3);
  word-break: break-all;
}
.tag { display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; }
.tag.green { background: rgba(157, 255, 208, 0.13); color: var(--green); box-shadow: 0 0 12px rgba(157,255,208,0.12); }
.tag.red { background: rgba(255, 123, 133, 0.13); color: var(--red); box-shadow: 0 0 12px rgba(255,123,133,0.12); }
.tag.amber { background: rgba(255, 217, 160, 0.13); color: var(--amber); box-shadow: 0 0 12px rgba(255,217,160,0.12); }
.tag.gray { background: rgba(255, 255, 255, 0.07); color: var(--txt-dim); }
.tag.cyan { background: rgba(139, 233, 255, 0.13); color: var(--cyan); box-shadow: 0 0 12px rgba(139,233,255,0.12); }
.mono { font-family: Consolas, monospace; }
.nowrap { white-space: nowrap; }
.gen-box { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.key-row {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  margin-bottom: 8px;
  background: rgba(255,255,255,0.03);
}
.key-row .code { flex: 1; }
.act-group { display: flex; gap: 5px; flex-wrap: wrap; }
.empty { color: var(--txt-dim); font-size: 13px; padding: 22px 0; text-align: center; }
.logs { font-size: 12.5px; }
.logs .li { display: flex; gap: 12px; padding: 8px 4px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.logs .t { color: var(--txt-dim); white-space: nowrap; }
.logs .a { color: var(--amber); font-weight: 700; white-space: nowrap; }
.logs .d { flex: 1; color: var(--txt); word-break: break-all; }
.seller-chip { color: var(--green); font-weight: 700; text-shadow: 0 0 12px rgba(157,255,208,0.3); }
.detail { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 12px; }
.detail .d {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 11px;
  padding: 11px 13px;
  transition: .2s;
}
.detail .d:hover { border-color: rgba(255,255,255,0.18); box-shadow: 0 0 18px rgba(255,255,255,0.06); }
.detail .d .k { font-size: 11px; color: var(--accent-dim); font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
.detail .d .val { font-size: 14px; margin-top: 3px; font-family: var(--font-num); }
.hwids { margin-top: 14px; }
.hwids .h { display: flex; gap: 10px; padding: 8px 2px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 12.5px; align-items: center; }
.hwids .h .mono { color: var(--amber); flex: 1; word-break: break-all; text-shadow: 0 0 12px rgba(255,217,160,0.25); }

/* ===================== TOAST ===================== */
.toast {
  position: fixed; bottom: 22px; left: 50%;
  transform: translateX(-50%) translateY(80px);
  z-index: 99;
  padding: 12px 22px;
  border-radius: 13px;
  font-size: 13.5px; font-weight: 600;
  background: rgba(18, 18, 20, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.24);
  backdrop-filter: blur(18px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55), 0 0 20px rgba(255, 255, 255, 0.2);
  color: #fff;
  opacity: 0;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s;
  pointer-events: none;
  max-width: calc(100vw - 32px);
  text-align: center;
}
.toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
.toast.ok { border-color: rgba(157, 255, 208, 0.55); box-shadow: 0 10px 30px rgba(0,0,0,0.55), 0 0 24px rgba(157,255,208,0.25); }
.toast.bad { border-color: rgba(255, 123, 133, 0.55); box-shadow: 0 10px 30px rgba(0,0,0,0.55), 0 0 24px rgba(255,123,133,0.25); }

/* ===================== MOBILE ===================== */
@media (max-width: 760px) {
  body { font-size: 14px; }
  .topbar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin: 8px 10px 0;
    padding: 14px;
    top: 8px;
  }
  .topbar .btn.ghost { align-self: flex-end; }
  #nav { justify-content: flex-start; }
  #nav button { flex: 1 1 auto; text-align: center; padding: 10px 8px; }
  #main { padding: 14px 10px 60px; }
  .card { padding: 16px; }
  .row > * { flex-basis: 100%; }
  .fld.grow, .grow { min-width: 0; }
  .stats { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .stat { padding: 14px; }
  .stat .v { font-size: 24px; }
  .detail { grid-template-columns: 1fr; }
  .login-box { padding: 32px 22px; }
  .key-row { flex-wrap: wrap; }
  .key-row .code { flex-basis: 100%; }
  .logs .li { flex-wrap: wrap; gap: 6px; }
  .brand-txt h1 { font-size: 16px; }
  .btn, .inp { font-size: 15px; } /* tránh iOS zoom khi focus */
}

/* Màn hình rất nhỏ (<400px) */
@media (max-width: 400px) {
  .stats { grid-template-columns: 1fr; }
  #nav button { font-size: 13px; }
  .brand .logo { width: 36px; height: 36px; font-size: 17px; }
}

/* Giảm animate cho ai set "giảm chuyển động" */
@media (prefers-reduced-motion: reduce) {
  .aurora, .highlight::after { animation: none !important; }
  * { transition: none !important; }
}
