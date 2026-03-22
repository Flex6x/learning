#!/usr/bin/env node
/**
 * generate-index.js
 * Scans all subject folders, reads Git commit dates for each HTML file,
 * and writes a fresh index.html.
 *
 * Run locally:  node generate-index.js
 * Run in CI:    called automatically by GitHub Actions
 */

const { execSync } = require("child_process");
const fs   = require("fs");
const path = require("path");

const SUBJECTS = [
  { key: "mathe",      label: "Mathematik", icon: "∑"  },
  { key: "physik",     label: "Physik",      icon: "⚛️" },
  { key: "geschichte", label: "Geschichte",  icon: "🏛️" },
  { key: "musik",      label: "Musik",       icon: "🎵" },
  { key: "deutsch",    label: "Deutsch",     icon: "📝" },
  { key: "biologie",   label: "Biologie",    icon: "🧬" },
  { key: "religion",   label: "Religion",    icon: "☮️" },
  { key: "astronomie", label: "Astronomie",  icon: "🔭" },
  { key: "englisch",   label: "Englisch",    icon: "🇬🇧" },
  { key: "informatik", label: "Informatik",  icon: "💻" },
  { key: "grw",        label: "GRW",         icon: "🏛" },
  { key: "sport",      label: "Sport",       icon: "⚽" },
];

/** Get the date a file was first committed to Git (ISO YYYY-MM-DD). */
function getGitDate(filePath) {
  try {
    const out = execSync(
      `git log --diff-filter=A --follow --format="%aI" -- "${filePath}"`,
      { encoding: "utf8" }
    ).trim();
    // Take the last line (oldest / first-added commit)
    const lines = out.split("\n").filter(Boolean);
    const iso = lines[lines.length - 1];
    if (!iso) throw new Error("no date");
    return iso.slice(0, 10); // YYYY-MM-DD
  } catch {
    // Fallback: file system mtime
    const stat = fs.statSync(filePath);
    return stat.mtime.toISOString().slice(0, 10);
  }
}

/** Turn a filename into a readable title. */
function nameToTitle(filename) {
  return filename
    .replace(/\.html?$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Build data for every subject
const data = {};
for (const subj of SUBJECTS) {
  const dir = path.join(__dirname, subj.key);
  if (!fs.existsSync(dir)) { data[subj.key] = []; continue; }

  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith(".html") && !f.startsWith("."));

  data[subj.key] = files.map(file => ({
    file,
    name: nameToTitle(file),
    date: getGitDate(path.join(subj.key, file)),
  }));
}

// Serialize for embedding in HTML
const dataJson = JSON.stringify(data, null, 2);

// Build card animation delays
const cardDelays = SUBJECTS.map((_, i) =>
  `.card:nth-child(${i + 1}) { animation-delay: ${(i * 0.05 + 0.05).toFixed(2)}s; }`
).join("\n    ");

// Build card HTML
const cards = SUBJECTS.map(s => {
  const count = data[s.key].length;
  const countText = count === 0
    ? "Noch keine Übersichten"
    : count + (count === 1 ? " Übersicht" : " Übersichten");

  return `
  <div class="card" data-subject="${s.key}" onclick="openSubject('${s.key}')">
    <span class="card-arrow">↗</span>
    <span class="card-icon">${s.icon}</span>
    <div class="card-name">${s.label}</div>
    <div class="card-count" id="count-${s.key}">${countText}</div>
    <span class="card-tag">${s.label}</span>
  </div>`;
}).join("\n");

const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Lernübersichten</title>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@300;400;500&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0a0a0f; --surface: #111118; --border: rgba(255,255,255,0.07);
      --text: #f0f0f5; --muted: #6b6b80; --accent: #7c6af7; --accent2: #f97c6e;
      --card-hover: #1a1a24;
    }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--text); font-family: 'Outfit', sans-serif; min-height: 100vh; overflow-x: hidden; }
    body::before {
      content: ''; position: fixed; inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
      pointer-events: none; z-index: 0; opacity: 0.4;
    }
    .blob { position: fixed; border-radius: 50%; filter: blur(120px); opacity: 0.12; pointer-events: none; z-index: 0; }
    .blob1 { width: 600px; height: 600px; background: var(--accent); top: -200px; left: -200px; }
    .blob2 { width: 500px; height: 500px; background: var(--accent2); bottom: -200px; right: -150px; }
    header { position: relative; z-index: 1; padding: 3.5rem 2rem 2rem; text-align: center; animation: fadeDown 0.8s ease both; }
    .logo-label { font-family: 'Syne', sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; color: var(--accent); margin-bottom: 1rem; }
    h1 { font-family: 'Syne', sans-serif; font-size: clamp(2.5rem, 6vw, 4.5rem); font-weight: 800; line-height: 1.05; background: linear-gradient(135deg, #fff 30%, #a09aff 70%, #f97c6e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .subtitle { font-size: 1rem; color: var(--muted); margin-top: 0.8rem; font-weight: 300; }
    .search-wrap { position: relative; z-index: 1; max-width: 440px; margin: 2rem auto 3rem; animation: fadeDown 0.9s ease 0.1s both; }
    .search-wrap input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: 12px; padding: 0.85rem 1rem 0.85rem 3rem; color: var(--text); font-family: 'Outfit', sans-serif; font-size: 0.95rem; outline: none; transition: border-color 0.2s, background 0.2s; }
    .search-wrap input:focus { border-color: var(--accent); background: rgba(124,106,247,0.06); }
    .search-wrap input::placeholder { color: var(--muted); }
    .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 1rem; }
    main { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 0 1.5rem 6rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 1.75rem 1.5rem 1.5rem; cursor: pointer; transition: transform 0.22s ease, background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease; animation: fadeUp 0.6s ease both; text-decoration: none; color: inherit; display: block; position: relative; overflow: hidden; }
    .card::after { content: ''; position: absolute; inset: 0; background: var(--card-glow); opacity: 0; transition: opacity 0.3s; border-radius: inherit; }
    .card:hover { transform: translateY(-5px); background: var(--card-hover); border-color: rgba(255,255,255,0.13); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
    .card:hover::after { opacity: 1; }
    .card-icon { font-size: 2.2rem; margin-bottom: 1rem; display: block; }
    .card-name { font-family: 'Syne', sans-serif; font-size: 1.15rem; font-weight: 700; margin-bottom: 0.35rem; }
    .card-count { font-size: 0.78rem; color: var(--muted); font-weight: 300; }
    .card-tag { display: inline-block; margin-top: 1.1rem; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; padding: 0.28rem 0.7rem; border-radius: 999px; background: var(--tag-bg); color: var(--tag-color); }
    .card-arrow { position: absolute; top: 1.5rem; right: 1.5rem; font-size: 1rem; color: var(--muted); transition: transform 0.2s, color 0.2s; }
    .card:hover .card-arrow { transform: translate(3px,-3px); color: var(--text); }
    .card[data-subject="mathe"]       { --card-glow: linear-gradient(135deg,rgba(124,106,247,0.06),transparent); --tag-bg: rgba(124,106,247,0.15); --tag-color: #a09aff; }
    .card[data-subject="physik"]      { --card-glow: linear-gradient(135deg,rgba(56,189,248,0.06),transparent);  --tag-bg: rgba(56,189,248,0.12);  --tag-color: #7dd3fc; }
    .card[data-subject="geschichte"]  { --card-glow: linear-gradient(135deg,rgba(251,191,36,0.06),transparent);  --tag-bg: rgba(251,191,36,0.12);  --tag-color: #fcd34d; }
    .card[data-subject="musik"]       { --card-glow: linear-gradient(135deg,rgba(249,124,110,0.06),transparent); --tag-bg: rgba(249,124,110,0.12); --tag-color: #fca5a5; }
    .card[data-subject="deutsch"]     { --card-glow: linear-gradient(135deg,rgba(52,211,153,0.06),transparent);  --tag-bg: rgba(52,211,153,0.12);  --tag-color: #6ee7b7; }
    .card[data-subject="biologie"]    { --card-glow: linear-gradient(135deg,rgba(16,185,129,0.06),transparent);  --tag-bg: rgba(16,185,129,0.12);  --tag-color: #34d399; }
    .card[data-subject="religion"]    { --card-glow: linear-gradient(135deg,rgba(245,158,11,0.06),transparent);  --tag-bg: rgba(245,158,11,0.12);  --tag-color: #fbbf24; }
    .card[data-subject="astronomie"]  { --card-glow: linear-gradient(135deg,rgba(167,139,250,0.06),transparent); --tag-bg: rgba(167,139,250,0.12); --tag-color: #c4b5fd; }
    .card[data-subject="englisch"]    { --card-glow: linear-gradient(135deg,rgba(244,63,94,0.06),transparent);   --tag-bg: rgba(244,63,94,0.12);   --tag-color: #fda4af; }
    .card[data-subject="informatik"]  { --card-glow: linear-gradient(135deg,rgba(34,211,238,0.06),transparent);  --tag-bg: rgba(34,211,238,0.12);  --tag-color: #67e8f9; }
    .card[data-subject="grw"]         { --card-glow: linear-gradient(135deg,rgba(234,179,8,0.06),transparent);   --tag-bg: rgba(234,179,8,0.12);   --tag-color: #fde047; }
    .card[data-subject="sport"]       { --card-glow: linear-gradient(135deg,rgba(251,146,60,0.06),transparent);  --tag-bg: rgba(251,146,60,0.12);  --tag-color: #fb923c; }
    .overlay { display: none; position: fixed; inset: 0; z-index: 100; background: rgba(5,5,10,0.85); backdrop-filter: blur(8px); align-items: center; justify-content: center; padding: 1.5rem; }
    .overlay.active { display: flex; }
    .modal { background: #14141e; border: 1px solid rgba(255,255,255,0.1); border-radius: 22px; width: 100%; max-width: 580px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; animation: popIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }
    .modal-header { padding: 1.75rem 1.75rem 1rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 1rem; }
    .modal-icon { font-size: 2rem; }
    .modal-title { font-family: 'Syne', sans-serif; font-size: 1.35rem; font-weight: 800; }
    .modal-subtitle { font-size: 0.82rem; color: var(--muted); margin-top: 0.2rem; }
    .modal-close { margin-left: auto; background: none; border: none; color: var(--muted); font-size: 1.4rem; cursor: pointer; line-height: 1; padding: 0.25rem; border-radius: 6px; transition: color 0.2s, background 0.2s; }
    .modal-close:hover { color: var(--text); background: rgba(255,255,255,0.05); }
    .modal-body { overflow-y: auto; padding: 1.25rem 1.75rem 1.75rem; flex: 1; }
    .file-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .file-item { display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1rem; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); text-decoration: none; color: var(--text); transition: background 0.18s, border-color 0.18s, transform 0.15s; }
    .file-item:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); transform: translateX(4px); }
    .file-date { font-size: 0.72rem; color: var(--muted); font-weight: 300; white-space: nowrap; }
    .file-name { font-size: 0.9rem; font-weight: 400; flex: 1; }
    .file-icon { font-size: 0.85rem; color: var(--muted); }
    .empty-state { text-align: center; padding: 3rem 1rem; color: var(--muted); font-size: 0.9rem; }
    .empty-state .big { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }
    @keyframes fadeDown { from { opacity:0; transform:translateY(-18px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeUp   { from { opacity:0; transform:translateY(22px);  } to { opacity:1; transform:translateY(0); } }
    @keyframes popIn    { from { opacity:0; transform:scale(0.9); }        to { opacity:1; transform:scale(1);   } }
    ${cardDelays}
    footer { position: relative; z-index: 1; text-align: center; padding: 0 1rem 2rem; font-size: 0.78rem; color: var(--muted); }
    @media (max-width: 500px) { main { grid-template-columns: 1fr 1fr; gap: 0.9rem; } .card { padding: 1.25rem 1rem; } .card-icon { font-size: 1.8rem; } }
  </style>
</head>
<body>
<div class="blob blob1"></div>
<div class="blob blob2"></div>
<header>
  <div class="logo-label">📚 Lernübersichten</div>
  <h1>Mein<br>Lernhub</h1>
  <p class="subtitle">Alle Fächer — sauber sortiert, jederzeit verfügbar.</p>
</header>
<div class="search-wrap">
  <span class="search-icon">🔍</span>
  <input type="text" id="search" placeholder="Fach suchen …" autocomplete="off"/>
</div>
<main id="grid">
${cards}
</main>
<footer>Dein persönlicher Lernhub · Gehostet via GitHub Pages</footer>
<div class="overlay" id="overlay" onclick="closeIfBackdrop(event)">
  <div class="modal" id="modal">
    <div class="modal-header">
      <span class="modal-icon" id="modal-icon"></span>
      <div>
        <div class="modal-title" id="modal-title"></div>
        <div class="modal-subtitle" id="modal-subtitle"></div>
      </div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>
<script>
const DATA = ${dataJson};
const META = {
  mathe:      { icon: "∑",   label: "Mathematik" },
  physik:     { icon: "⚛️",  label: "Physik" },
  geschichte: { icon: "🏛️", label: "Geschichte" },
  musik:      { icon: "🎵",  label: "Musik" },
  deutsch:    { icon: "📝",  label: "Deutsch" },
  biologie:   { icon: "🧬",  label: "Biologie" },
  religion:   { icon: "☮️",  label: "Religion" },
  astronomie: { icon: "🔭",  label: "Astronomie" },
  englisch:   { icon: "🇬🇧", label: "Englisch" },
  informatik: { icon: "💻",  label: "Informatik" },
  grw:        { icon: "🏛",  label: "GRW" },
  sport:      { icon: "⚽",  label: "Sport" },
};
function openSubject(subj) {
  const items = [...DATA[subj]].sort((a,b) => b.date.localeCompare(a.date));
  const meta  = META[subj];
  document.getElementById('modal-icon').textContent    = meta.icon;
  document.getElementById('modal-title').textContent   = meta.label;
  document.getElementById('modal-subtitle').textContent =
    items.length + (items.length === 1 ? " Übersicht" : " Übersichten") + " · nach Datum sortiert";
  const body = document.getElementById('modal-body');
  if (items.length === 0) {
    body.innerHTML = '<div class="empty-state"><span class="big">📂</span>Noch keine Übersichten vorhanden.</div>';
  } else {
    body.innerHTML = '<div class="file-list">' + items.map(item =>
      '<a class="file-item" href="' + subj + '/' + item.file + '">' +
      '<span class="file-date">' + formatDate(item.date) + '</span>' +
      '<span class="file-name">' + item.name + '</span>' +
      '<span class="file-icon">→</span></a>'
    ).join('') + '</div>';
  }
  document.getElementById('overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal() { document.getElementById('overlay').classList.remove('active'); document.body.style.overflow = ''; }
function closeIfBackdrop(e) { if (e.target === document.getElementById('overlay')) closeModal(); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
function formatDate(d) { const [y,m,day] = d.split('-'); return day+'.'+m+'.'+y; }
document.getElementById('search').addEventListener('input', function() {
  const q = this.value.toLowerCase();
  document.querySelectorAll('.card').forEach(card => {
    const name = card.querySelector('.card-name').textContent.toLowerCase();
    card.style.display = name.includes(q) ? '' : 'none';
  });
});
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, "index.html"), html, "utf8");
console.log("✅ index.html generated successfully.");
