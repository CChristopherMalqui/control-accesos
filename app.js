const { SUPABASE_URL, SUPABASE_KEY } = window.APP_CONFIG;

const $ = (id) => document.getElementById(id);
const el = {
  used: $("used"), usedOf: $("usedOf"), available: $("available"),
  result: $("result"), title: $("resultTitle"), sub: $("resultSub"),
  reader: $("reader"), start: $("btnStart"), stop: $("btnStop"),
};

let scanner = null;
let busy = false;
let last = { text: "", at: 0 };
const SAME_QR_IGNORE_MS = 6000; // ignora el mismo QR si sigue frente a la cámara
const COOLDOWN_MS = 1200;        // pausa mínima entre lecturas

// ---------- Supabase RPC (fetch directo, sin librería) ----------
async function rpc(fn, body = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

function setStats(used, total) {
  el.used.textContent = used;
  el.usedOf.textContent = `/${total}`;
  el.available.textContent = total - used;
}

async function loadStats() {
  try { const s = await rpc("qr_stats"); setStats(s.used, s.total); }
  catch (e) { console.error(e); }
}

// ---------- UI ----------
function show(kind, title, sub = "") {
  el.result.className = `result ${kind}`;
  el.title.textContent = title;
  el.sub.textContent = sub;
  void el.result.offsetWidth;
  el.result.classList.add("flash");
}

const hora = (iso) => iso ? new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "";

let audioCtx;
function beep(ok) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = ok ? 1200 : 260;
    o.type = ok ? "sine" : "square";
    g.gain.value = 0.25;
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + (ok ? 0.15 : 0.45));
  } catch {}
  if (navigator.vibrate) navigator.vibrate(ok ? 120 : [200, 80, 200]);
}

// ---------- Escaneo ----------
async function onScan(text) {
  const now = Date.now();
  if (busy) return;
  if (text === last.text && now - last.at < SAME_QR_IGNORE_MS) return;
  busy = true;
  last = { text, at: now };

  show("checking", "VERIFICANDO…");
  try {
    const r = await rpc("consume_qr", { p_token: text });
    setStats(r.used, r.total);
    if (r.result === "OK") {
      show("ok", "ACCESO PERMITIDO", r.code);
      beep(true);
    } else if (r.result === "USED") {
      show("bad", "QR YA UTILIZADO", `${r.code} · usado a las ${hora(r.used_at)}`);
      beep(false);
    } else {
      show("bad", "QR NO VÁLIDO", "Código no registrado");
      beep(false);
    }
  } catch (e) {
    console.error(e);
    last = { text: "", at: 0 }; // permite reintentar el mismo QR
    show("warn", "SIN CONEXIÓN", "Vuelve a escanear");
    beep(false);
  } finally {
    setTimeout(() => (busy = false), COOLDOWN_MS);
  }
}

async function startScanner() {
  el.start.disabled = true;
  try {
    el.reader.classList.remove("hidden");
    scanner = scanner || new Html5Qrcode("reader", {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    });
    await scanner.start(
      { facingMode: "environment" },
      {
        fps: 15,
        qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.75); return { width: s, height: s }; },
      },
      onScan,
      () => {}
    );
    el.start.classList.add("hidden");
    el.stop.classList.remove("hidden");
    show("idle", "APUNTA AL QR", "Escaneo continuo activo");
  } catch (e) {
    console.error(e);
    el.reader.classList.add("hidden");
    show("warn", "SIN CÁMARA", "Permite el acceso a la cámara (requiere HTTPS)");
  } finally {
    el.start.disabled = false;
  }
}

async function stopScanner() {
  try { if (scanner && scanner.isScanning) await scanner.stop(); } catch (e) { console.error(e); }
  el.reader.classList.add("hidden");
  el.stop.classList.add("hidden");
  el.start.classList.remove("hidden");
  show("idle", "CÁMARA DETENIDA", "Presiona ESCANEAR QR");
}

el.start.addEventListener("click", startScanner);
el.stop.addEventListener("click", stopScanner);

loadStats();
setInterval(loadStats, 15000); // sincroniza si hay más de un celular
