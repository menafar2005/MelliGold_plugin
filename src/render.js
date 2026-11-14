const MESSAGES = {
  not_found: 'این شخص در ملی گلد حساب ندارد.',
  no_phone: 'برای این شخص شماره‌ی موبایل ثبت نشده.',
  no_person: 'این معامله طرف معامله‌ی شخص ندارد.',
  unavailable: 'ارتباط با ملی گلد برقرار نشد؛ صفحه را رفرش کنید.',
  didar_error: 'اطلاعات مخاطب از دیدار خوانده نشد.',
  launch_expired: 'زمان این پنل تمام شده؛ صفحه را رفرش کنید.',
  unsupported: 'این پنل فقط در صفحه‌ی معامله و شخص کار می‌کند.',
};

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const nf = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 3 });
const tf = new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'medium', timeStyle: 'short' });

function maskMobile(m) {
  const digits = m.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  return `${digits.slice(0, 4)}•••${digits.slice(-4)}`;
}

function page(inner) {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>موجودی ملی گلد</title>
<style>
  :root { color-scheme: light dark; --gold: #b8860b; }
  body { font-family: Tahoma, "Segoe UI", sans-serif; margin: 0; padding: 16px; line-height: 1.7; }
  .title { font-size: 13px; opacity: .75; }
  .grams { font-size: 34px; font-weight: 700; color: var(--gold); margin: 6px 0 2px; }
  .value { font-size: 18px; }
  .muted { font-size: 12px; opacity: .6; margin-top: 4px; }
  .msg { padding: 12px 0; }
</style>
</head>
<body>${inner}</body>
</html>`;
}

export function renderState(state) {
  return page(`<div class="msg">${esc(MESSAGES[state] || MESSAGES.didar_error)}</div>`);
}

export function renderSuccess({ displayName, mobile, gold }) {
  const when = gold.updatedAt ? tf.format(new Date(gold.updatedAt)) : '';
  return page(`
<div class="title">موجودی ملی گلد · ${esc(displayName)}</div>
<div class="grams">${esc(nf.format(gold.grams))} گرم</div>
<div class="value">${esc(nf.format(gold.valueToman))} تومان</div>
<div class="muted">قیمت هر گرم: ${esc(nf.format(gold.pricePerGramToman))} تومان${when ? ` · به‌روزرسانی: ${esc(when)}` : ''}</div>
<div class="muted">پیداشده با ${esc(maskMobile(mobile))}</div>`);
}

export function renderInstalled(ok) {
  return page(`<div class="msg">${ok ? 'نصب شد.' : 'نصب کامل نشد.'}</div>`);
}
