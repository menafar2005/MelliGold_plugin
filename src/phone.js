const PERSIAN_ZERO = 0x06f0;
const ARABIC_ZERO = 0x0660;
const MAX_MOBILES = 3;

function toLatinDigits(str) {
  return str.replace(/[۰-۹٠-٩]/g, (ch) => {
    const code = ch.charCodeAt(0);
    return String(code >= PERSIAN_ZERO && code <= PERSIAN_ZERO + 9 ? code - PERSIAN_ZERO : code - ARABIC_ZERO);
  });
}

/** Pull Iranian mobile numbers out of free-text phone fields. Returns up to 3 unique `09XXXXXXXXX`. */
export function extractMobiles(...values) {
  const out = [];
  for (const raw of values.flat()) {
    if (typeof raw !== 'string') continue;
    const text = toLatinDigits(raw).replace(/[\s\-‌‎‏]/g, '');
    const re = /(?<!\d)(?:\+98|0098|98|0)?(9\d{9})(?!\d)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const mobile = '0' + m[1];
      if (!out.includes(mobile)) out.push(mobile);
      if (out.length >= MAX_MOBILES) return out;
    }
  }
  return out;
}
