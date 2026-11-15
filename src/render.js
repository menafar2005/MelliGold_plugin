const STATES = {
  not_found: { tone: 'info', title: 'حساب ملی گلد ندارد', text: 'با شماره‌های این شخص حسابی در ملی گلد پیدا نشد.' },
  no_phone: { tone: 'info', title: 'شماره‌ی موبایل ندارد', text: 'برای این شخص شماره‌ی موبایل ثبت نشده.' },
  no_person: { tone: 'info', title: 'شخصی وصل نیست', text: 'این معامله طرف معامله‌ی شخص ندارد.' },
  unsupported: { tone: 'info', title: 'این‌جا در دسترس نیست', text: 'این پنل فقط در صفحه‌ی معامله و شخص کار می‌کند.' },
  unavailable: { tone: 'warn', title: 'ملی گلد در دسترس نیست', text: 'ارتباط با ملی گلد برقرار نشد؛ صفحه را رفرش کنید.' },
  didar_error: { tone: 'warn', title: 'خطا در خواندن اطلاعات', text: 'اطلاعات مخاطب از دیدار خوانده نشد.' },
  launch_expired: { tone: 'warn', title: 'زمان پنل تمام شده', text: 'صفحه را رفرش کنید تا پنل دوباره بارگذاری شود.' },
};

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const nf = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 3 });
const tf = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'medium', timeStyle: 'short' });

function maskMobile(m) {
  const digits = m.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  // Not "•••": in Persian fonts it looks like ۰ (zero). Spaces keep it readable.
  return `${digits.slice(0, 4)} *** ${digits.slice(-4)}`;
}

const ICONS = {
  coin: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v9M9.5 10a2.5 2 0 0 1 2.5-1.5h.6a2 2 0 0 1 0 4h-1.2a2 2 0 0 0 0 4h.6a2.5 2 0 0 0 2.5-1.5"/></svg>`,
  info: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 2.8 19.5h18.4L12 4z"/><path d="M12 10v4.5M12 17h.01"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.6 2.5L16 9.5"/></svg>`,
};

const STYLE = `
:root {
  color-scheme: light dark;
  --bg: #ffffff; --surface: #fbfaf6; --text: #1d1f23; --muted: #6b6f76; --line: #ece8dd;
  --gold: #a87a0a; --gold-strong: #8a6300; --gold-soft: #fbf3dc;
  --warn: #b4531a; --warn-soft: #fdf0e6; --info: #4a6a8a; --info-soft: #eef3f8;
  --radius: 14px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #17181b; --surface: #1f2024; --text: #ecebe7; --muted: #9a9ca3; --line: #2e2f34;
    --gold: #e0b443; --gold-strong: #f0c95e; --gold-soft: #2c2614;
    --warn: #f0965a; --warn-soft: #2f2218; --info: #8fb0d2; --info-soft: #1d2631;
  }
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--text); }
body {
  font-family: Vazirmatn, Tahoma, sans-serif; font-size: 14px; line-height: 1.6;
  padding: 12px; -webkit-font-smoothing: antialiased;
}
svg { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }

.card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; }

.head { display: flex; align-items: center; gap: 10px; }
.mark { flex: none; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center;
  background: var(--gold-soft); color: var(--gold); padding: 7px; }
.eyebrow { font-size: 12px; color: var(--muted); }
.name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.head > div { min-width: 0; }

.balance { margin: 16px 0 14px; }
.grams { display: flex; align-items: baseline; gap: 6px; color: var(--gold-strong); }
.grams .num { font-size: 32px; font-weight: 800; letter-spacing: -.5px; line-height: 1.15; }
.grams .unit { font-size: 15px; font-weight: 600; }
.value { margin-top: 4px; font-size: 15px; font-weight: 600; }
.value small { font-size: 12px; font-weight: 400; color: var(--muted); }

.meta { margin: 0; padding-top: 12px; border-top: 1px dashed var(--line); display: grid; gap: 6px; }
.meta div { display: flex; justify-content: space-between; gap: 12px; font-size: 12.5px; }
.meta dt { color: var(--muted); }
.meta dd { margin: 0; font-weight: 500; text-align: left; }

.state { display: flex; gap: 10px; align-items: flex-start; }
.state .icon { flex: none; width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; padding: 7px; }
.state.info .icon { background: var(--info-soft); color: var(--info); }
.state.warn .icon { background: var(--warn-soft); color: var(--warn); }
.state.ok .icon { background: var(--gold-soft); color: var(--gold); }
.state .title { font-weight: 600; }
.state .text { color: var(--muted); font-size: 13px; margin-top: 1px; }
.code { margin-top: 10px; display: inline-block; font: 11px/1.4 ui-monospace, Consolas, monospace; color: var(--muted);
  background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 2px 6px; }
`;

function page(inner) {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>موجودی ملی گلد</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css">
<style>${STYLE}</style>
</head>
<body><main class="card">${inner}</main></body>
</html>`;
}

function stateBlock(tone, title, text, code) {
  return `<div class="state ${tone}">
  <span class="icon">${ICONS[tone === 'ok' ? 'check' : tone]}</span>
  <div><div class="title">${esc(title)}</div>${text ? `<div class="text">${esc(text)}</div>` : ''}</div>
</div>${code ? `<span class="code" dir="ltr">${esc(code)}</span>` : ''}`;
}

/** `code` is a short, non-secret error code (e.g. LAUNCH_CODE_ALREADY_USED) shown small, for support. */
export function renderState(state, code) {
  const s = STATES[state] || STATES.didar_error;
  return page(stateBlock(s.tone, s.title, s.text, code));
}

export function renderSuccess({ displayName, mobile, gold }) {
  const when = gold.updatedAt ? tf.format(new Date(gold.updatedAt)) : '';
  return page(`
<header class="head">
  <span class="mark">${ICONS.coin}</span>
  <div><div class="eyebrow">موجودی ملی گلد</div><div class="name" title="${esc(displayName)}">${esc(displayName || '—')}</div></div>
</header>
<section class="balance">
  <div class="grams"><span class="num">${esc(nf.format(gold.grams))}</span><span class="unit">گرم طلا</span></div>
  <div class="value">${esc(nf.format(gold.valueToman))} <small>تومان</small></div>
</section>
<dl class="meta">
  <div><dt>قیمت هر گرم</dt><dd>${esc(nf.format(gold.pricePerGramToman))} تومان</dd></div>
  ${when ? `<div><dt>به‌روزرسانی</dt><dd>${esc(when)}</dd></div>` : ''}
  <div><dt>پیداشده با</dt><dd dir="ltr">${esc(maskMobile(mobile))}</dd></div>
</dl>`);
}

export function renderInstalled(ok) {
  return page(
    ok
      ? stateBlock('ok', 'نصب شد', 'پنل ملی گلد در صفحه‌ی معامله و شخص دیدار نمایش داده می‌شود.')
      : stateBlock('warn', 'نصب کامل نشد', 'دوباره از دیدار نصب کنید.'),
  );
}
