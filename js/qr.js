// A minimal byte-mode QR encoder — versions 1–10, error correction level M.
// Enough for a member number the till can scan.
//
// Ported from Code Concept's qr.js, which was verified module for module
// against the `segno` reference encoder. Only the wrapper changed: an ES module
// instead of a global, TextEncoder instead of encodeURIComponent for the bytes.

// [ecCodewordsPerBlock, group1Blocks, group1DataCw, group2Blocks, group2DataCw]
const RS_M = {
  1: [10, 1, 16, 0, 0],
  2: [16, 1, 28, 0, 0],
  3: [26, 1, 44, 0, 0],
  4: [18, 2, 32, 0, 0],
  5: [24, 2, 43, 0, 0],
  6: [16, 4, 27, 0, 0],
  7: [18, 4, 31, 0, 0],
  8: [22, 2, 38, 2, 39],
  9: [22, 3, 36, 2, 37],
  10: [26, 4, 43, 1, 44],
};

const ALIGN = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

/* ---- GF(256) ------------------------------------------------------------ */
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x; LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;                 // x^8 + x^4 + x^3 + x^2 + 1
  }
  for (let j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
})();

const gmul = (a, b) => ((a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGenerator(deg) {
  let poly = [1];
  for (let i = 0; i < deg; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gmul(poly[j], 1);
      next[j + 1] ^= gmul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGenerator(ecLen);
  const res = new Array(ecLen).fill(0);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.shift(); res.push(0);
    if (factor !== 0) {
      for (let j = 0; j < gen.length - 1; j++) res[j] ^= gmul(gen[j + 1], factor);
    }
  }
  return res;
}

/* ---- matrix ------------------------------------------------------------- */
function newMatrix(size) {
  const m = [];
  for (let i = 0; i < size; i++) m.push(new Array(size).fill(null));   // null = free module
  return m;
}

function placeFinder(m, row, col) {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r, cc = col + c;
      if (rr < 0 || cc < 0 || rr >= m.length || cc >= m.length) continue;
      const inner = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                    (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                    (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      m[rr][cc] = inner;
    }
  }
}

function placeAlignment(m, version) {
  const pos = ALIGN[version], last = pos.length - 1;
  for (let i = 0; i <= last; i++) {
    for (let j = 0; j <= last; j++) {
      // skip the three corners already taken by finder patterns
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      const row = pos[i], col = pos[j];
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) m[row + r][col + c] = (Math.max(Math.abs(r), Math.abs(c)) !== 1);
      }
    }
  }
}

function reserveFormat(m) {
  const size = m.length;
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) { m[8][i] = false; m[i][8] = false; }     // index 6 is timing
  }
  for (let i = 0; i < 8; i++) { m[8][size - 1 - i] = false; m[size - 1 - i][8] = false; }
  m[size - 8][8] = true;                                     // always-dark module
}

function formatBits(mask) {
  const data = (0 << 3) | mask;                              // EC level M = 0b00
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10);
  return ((data << 10) | rem) ^ 0x5412;
}

function versionBits(version) {
  let rem = version << 12;
  for (let i = 17; i >= 12; i--) if ((rem >>> i) & 1) rem ^= 0x1f25 << (i - 12);
  return (version << 12) | rem;
}

function applyFormat(m, mask) {
  const bitsVal = formatBits(mask), size = m.length;
  for (let i = 0; i < 15; i++) {
    const bit = ((bitsVal >>> i) & 1) === 1;
    if (i < 6) m[i][8] = bit;
    else if (i === 6) m[7][8] = bit;
    else if (i === 7) m[8][8] = bit;
    else if (i === 8) m[8][7] = bit;
    else m[8][14 - i] = bit;
    if (i < 8) m[8][size - 1 - i] = bit;
    else m[size - 15 + i][8] = bit;
  }
  m[size - 8][8] = true;
}

function applyVersion(m, version) {
  if (version < 7) return;
  const bitsVal = versionBits(version), size = m.length;
  for (let i = 0; i < 18; i++) {
    const bit = ((bitsVal >>> i) & 1) === 1;
    const a = Math.floor(i / 3), b = i % 3;
    m[size - 11 + b][a] = bit;
    m[a][size - 11 + b] = bit;
  }
}

function maskFn(mask, i, j) {
  switch (mask) {
    case 0: return (i + j) % 2 === 0;
    case 1: return i % 2 === 0;
    case 2: return j % 3 === 0;
    case 3: return (i + j) % 3 === 0;
    case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
    case 5: return ((i * j) % 2) + ((i * j) % 3) === 0;
    case 6: return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
    case 7: return (((i + j) % 2) + ((i * j) % 3)) % 2 === 0;
  }
  return false;
}

function penalty(m) {
  const size = m.length;
  let score = 0, dark = 0;

  function lineScore(get) {
    let s = 0, prev = get(0), len = 1;
    const hist = [];
    for (let k = 1; k < size; k++) {
      const v = get(k);
      if (v === prev) len++;
      else { if (len >= 5) s += 3 + (len - 5); hist.push([prev, len]); prev = v; len = 1; }
    }
    if (len >= 5) s += 3 + (len - 5);
    hist.push([prev, len]);
    // rule 3: a 1:1:3:1:1 finder-like run with four light modules on one side
    let seq = "";
    for (const [bit, n] of hist) seq += (bit ? "1" : "0").repeat(n);
    let idx = -1;
    while ((idx = seq.indexOf("10111010000", idx + 1)) !== -1) s += 40;
    idx = -1;
    while ((idx = seq.indexOf("00001011101", idx + 1)) !== -1) s += 40;
    return s;
  }

  for (let i = 0; i < size; i++) {
    score += lineScore((k) => m[i][k]);
    score += lineScore((k) => m[k][i]);
  }
  for (let i = 0; i < size - 1; i++) {
    for (let j = 0; j < size - 1; j++) {
      const a = m[i][j];
      if (a === m[i][j + 1] && a === m[i + 1][j] && a === m[i + 1][j + 1]) score += 3;
    }
  }
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (m[i][j]) dark++;
  const pct = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return score;
}

// A module is a function module (never masked) if it belongs to a finder,
// separator, timing line, alignment pattern, format/version area or the dark module.
function isFunctionModule(version, size, r, c) {
  if (r <= 8 && c <= 8) return true;
  if (r <= 8 && c >= size - 8) return true;
  if (r >= size - 8 && c <= 8) return true;
  if (r === 6 || c === 6) return true;
  if (version >= 7) {
    if (r < 6 && c >= size - 11 && c < size - 8) return true;
    if (c < 6 && r >= size - 11 && r < size - 8) return true;
  }
  const pos = ALIGN[version], last = pos.length - 1;
  for (let i = 0; i <= last; i++) {
    for (let j = 0; j <= last; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      if (Math.abs(r - pos[i]) <= 2 && Math.abs(c - pos[j]) <= 2) return true;
    }
  }
  return false;
}

/** encode(text) → { size, modules: boolean[][], version, mask } */
export function encode(text, minVersion = 1, forceMask = null) {
  const bytes = [...new TextEncoder().encode(String(text))];
  let version = minVersion, spec, capacity;
  for (; version <= 10; version++) {
    spec = RS_M[version];
    capacity = spec[1] * spec[2] + spec[3] * spec[4];
    const need = 4 + (version < 10 ? 8 : 16) + bytes.length * 8;
    if (need <= capacity * 8) break;
  }
  if (version > 10) throw new Error("qr: payload too large");
  spec = RS_M[version];
  capacity = spec[1] * spec[2] + spec[3] * spec[4];

  const bits = [];
  const put = (value, length) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  put(4, 4);                                                 // byte mode
  put(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  const maxBits = capacity * 8;
  put(0, Math.min(4, maxBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const cw = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k];
    cw.push(b);
  }
  const padBytes = [0xec, 0x11];
  for (let p = 0; cw.length < capacity; p++) cw.push(padBytes[p % 2]);

  // split into blocks, RS-encode, interleave
  const blocks = [], ecBlocks = [];
  let offset = 0;
  for (let n = 0; n < spec[1]; n++) { blocks.push(cw.slice(offset, offset + spec[2])); offset += spec[2]; }
  for (let n = 0; n < spec[3]; n++) { blocks.push(cw.slice(offset, offset + spec[4])); offset += spec[4]; }
  for (const blk of blocks) ecBlocks.push(rsEncode(blk, spec[0]));

  const interleaved = [], maxData = Math.max(spec[2], spec[4]);
  for (let i = 0; i < maxData; i++) {
    for (const blk of blocks) if (i < blk.length) interleaved.push(blk[i]);
  }
  for (let i = 0; i < spec[0]; i++) {
    for (const ec of ecBlocks) interleaved.push(ec[i]);
  }

  // build the matrix
  const size = version * 4 + 17;
  const m = newMatrix(size);
  placeFinder(m, 0, 0);
  placeFinder(m, 0, size - 7);
  placeFinder(m, size - 7, 0);
  placeAlignment(m, version);
  for (let i = 8; i < size - 8; i++) { m[6][i] = i % 2 === 0; m[i][6] = i % 2 === 0; }
  reserveFormat(m);
  if (version >= 7) {
    for (let i = 0; i < 6; i++) for (let b2 = 0; b2 < 3; b2++) {
      m[size - 11 + b2][i] = false; m[i][size - 11 + b2] = false;
    }
  }

  // zigzag data placement
  const dataBits = [];
  for (const byte of interleaved) for (let k = 7; k >= 0; k--) dataBits.push(((byte >>> k) & 1) === 1);
  let bitIdx = 0, upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;                                    // skip the vertical timing line
    for (let rowStep = 0; rowStep < size; rowStep++) {
      const row = upward ? size - 1 - rowStep : rowStep;
      for (let c2 = 0; c2 < 2; c2++) {
        const cc = col - c2;
        if (m[row][cc] !== null) continue;
        m[row][cc] = bitIdx < dataBits.length ? dataBits[bitIdx] : false;
        bitIdx++;
      }
    }
    upward = !upward;
  }

  // choose the mask with the lowest penalty
  let best = null, bestScore = Infinity, bestMask = 0;
  for (let mask = 0; mask < 8; mask++) {
    if (forceMask != null && mask !== forceMask) continue;
    const t = m.map((r) => r.slice());
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (isFunctionModule(version, size, i, j)) continue;
        if (maskFn(mask, i, j)) t[i][j] = !t[i][j];
      }
    }
    applyFormat(t, mask);
    applyVersion(t, version);
    const sc = penalty(t);
    if (sc < bestScore) { bestScore = sc; best = t; bestMask = mask; }
  }
  return { size, modules: best, version, mask: bestMask };
}

/** qrSVG(text, opts) → an SVG string: one path, quiet zone included. */
export function qrSVG(text, { quiet = 2, fg = "#000", bg = "#fff", label = "QR code", cls = "" } = {}) {
  const res = encode(text);
  const n = res.size, total = n + quiet * 2;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (res.modules[r][c]) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }
  return `<svg${cls ? ` class="${cls}"` : ""} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img" aria-label="${label}">`
    + `<rect width="${total}" height="${total}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
}
