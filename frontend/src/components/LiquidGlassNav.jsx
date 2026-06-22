import { useState, useEffect, useRef, useCallback } from 'react';

const NS = 'http://www.w3.org/2000/svg';

const MENU_DATA = [
  { key: 'product',   label: 'Product',   items: ['Overview', 'Features', 'Integrations', 'Changelog', 'Pricing'] },
  { key: 'resources', label: 'Resources', items: ['Documentation', 'Guides', 'Blog', 'Support'] },
  { key: 'company',   label: 'Company',   items: ['About', 'Careers', 'Contact'] },
];

const CTX_DATA = [
  { label: 'Back',          hint: '⌘[' },
  { label: 'Forward',       hint: '⌘]' },
  { label: 'Reload',        hint: '⌘R' },
  { sep: true },
  { label: 'Copy',          hint: '⌘C' },
  { label: 'Save Page As…', hint: '⌘S' },
  { sep: true },
  { label: 'Inspect',       hint: '' },
];

const RESTING = 95;
const CHROMA = 0.07;

function genMap(w, h, r, bezel) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h); const d = img.data;
  const bcv = document.createElement('canvas'); bcv.width = w; bcv.height = h;
  const bctx = bcv.getContext('2d');
  const bimg = bctx.createImageData(w, h); const bd = bimg.data;
  const cx = w / 2, cy = h / 2, hw = w / 2, hh = h / 2;
  const sd = (px, py) => {
    const qx = Math.abs(px) - (hw - r);
    const qy = Math.abs(py) - (hh - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  };
  const Lx = -0.55, Ly = -0.72, Lz = 0.62, Ll = Math.hypot(Lx, Ly, Lz);
  const lx = Lx / Ll, ly = Ly / Ll, lz = Lz / Ll;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x - cx, py = y - cy;
      const depth = -sd(px, py);
      let R = 128, G = 128, wA = 0, kA = 0;
      if (depth >= 0 && depth < bezel) {
        const s = 1 - depth / bezel;
        const t = s * s * (3 - 2 * s);
        const gx = sd(px + 1, py) - sd(px - 1, py);
        const gy = sd(px, py + 1) - sd(px, py - 1);
        const gl = Math.hypot(gx, gy) || 1;
        const ox = gx / gl, oy = gy / gl;
        R = 128 + ox * t * 127;
        G = 128 + oy * t * 127;
        const slope = t * 2.1;
        let nx = ox * slope, ny = oy * slope, nz = 1;
        const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
        const lambert = nx * lx + ny * ly + nz * lz;
        if (lambert > 0) {
          const spec = Math.pow(lambert, 18);
          wA = Math.min(1, spec * 0.32 * t);
        } else {
          kA = Math.min(1, (-lambert) * 0.5 * t);
        }
      }
      const i = (y * w + x) * 4;
      d[i] = R; d[i + 1] = G; d[i + 2] = 128; d[i + 3] = 255;
      if (wA >= kA) { bd[i] = 255; bd[i + 1] = 255; bd[i + 2] = 255; bd[i + 3] = Math.round(wA * 255); }
      else { bd[i] = 8; bd[i + 1] = 10; bd[i + 2] = 14; bd[i + 3] = Math.round(kA * 255); }
    }
  }
  ctx.putImageData(img, 0, 0);
  bctx.putImageData(bimg, 0, 0);
  return { disp: cv.toDataURL(), bevel: bcv.toDataURL() };
}

function buildFilter(defsEl, id, w, h, mapURL) {
  const old = document.getElementById(id);
  if (old) old.remove();
  const f = document.createElementNS(NS, 'filter');
  f.setAttribute('id', id);
  f.setAttribute('color-interpolation-filters', 'sRGB');
  f.setAttribute('x', '-12%'); f.setAttribute('y', '-12%');
  f.setAttribute('width', '124%'); f.setAttribute('height', '124%');

  const feImg = document.createElementNS(NS, 'feImage');
  feImg.setAttribute('href', mapURL);
  feImg.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', mapURL);
  feImg.setAttribute('x', '0'); feImg.setAttribute('y', '0');
  feImg.setAttribute('width', w); feImg.setAttribute('height', h);
  feImg.setAttribute('preserveAspectRatio', 'none');
  feImg.setAttribute('result', 'map');
  f.appendChild(feImg);

  const mk = (res) => {
    const dm = document.createElementNS(NS, 'feDisplacementMap');
    dm.setAttribute('in', 'SourceGraphic');
    dm.setAttribute('in2', 'map');
    dm.setAttribute('scale', '0');
    dm.setAttribute('xChannelSelector', 'R');
    dm.setAttribute('yChannelSelector', 'G');
    dm.setAttribute('result', res);
    f.appendChild(dm);
    return dm;
  };
  const dR = mk('dR'), dG = mk('dG'), dB = mk('dB');

  const cm = (inp, vals, res) => {
    const c = document.createElementNS(NS, 'feColorMatrix');
    c.setAttribute('in', inp);
    c.setAttribute('type', 'matrix');
    c.setAttribute('values', vals);
    c.setAttribute('result', res);
    f.appendChild(c);
  };
  cm('dR', '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1', 'cR');
  cm('dG', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1', 'cG');
  cm('dB', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0 1', 'cB');

  const blend = (in1, in2, res) => {
    const b = document.createElementNS(NS, 'feBlend');
    b.setAttribute('in', in1); b.setAttribute('in2', in2);
    b.setAttribute('mode', 'screen');
    b.setAttribute('result', res);
    f.appendChild(b);
  };
  blend('cR', 'cG', 'rg');
  blend('rg', 'cB', 'rgb');

  defsEl.appendChild(f);
  return { dR, dG, dB };
}

// ---- GlassPanel: renders a single glass dropdown or context menu ----
function GlassPanel({ id, bevelId, sheenId, style, children }) {
  const panelRef = useRef(null);
  const bevelRef = useRef(null);
  const sheenRef = useRef(null);
  const rafRef = useRef(null);
  const adaptRef = useRef(null);
  const defsRef = useRef(null);
  const scratchRef = useRef(null);

  const applyGlass = useCallback(() => {
    const el = panelRef.current;
    const defsEl = defsRef.current;
    if (!el || !defsEl) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    const radius = 26;
    const bezel = Math.max(22, Math.min(30, Math.min(w, h) * 0.13));
    const { disp, bevel } = genMap(w, h, radius, bezel);
    const filterId = id + '-flt';
    const refs = buildFilter(defsEl, filterId, w, h, disp);
    const s = RESTING, ch = CHROMA;
    refs.dR.setAttribute('scale', s * (1 + ch));
    refs.dG.setAttribute('scale', s);
    refs.dB.setAttribute('scale', s * (1 - ch));
    const bf = `blur(0.8px) saturate(1.06) brightness(0.9) url(#${filterId})`;
    el.style.backdropFilter = bf;
    el.style.webkitBackdropFilter = bf;
    if (bevelRef.current) {
      bevelRef.current.style.backgroundImage = `url(${bevel})`;
      bevelRef.current.style.backgroundSize = '100% 100%';
    }
    // animate displacement settle
    cancelAnimationFrame(rafRef.current);
    const start = performance.now(), dur = 600, s0 = 190, s1 = RESTING;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const sv = s0 + (s1 - s0) * e;
      refs.dR.setAttribute('scale', sv * (1 + ch));
      refs.dG.setAttribute('scale', sv);
      refs.dB.setAttribute('scale', sv * (1 - ch));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [id]);

  // adaptive sheen based on backdrop flatness
  const startAdapt = useCallback(() => {
    clearTimeout(adaptRef.current);
    const video = document.getElementById('lg-video');
    const sheen = sheenRef.current;
    const el = panelRef.current;
    const loop = () => {
      if (video && el && video.readyState >= 2 && video.videoWidth) {
        const W = window.innerWidth, H = window.innerHeight;
        const scale = Math.max(W / video.videoWidth, H / video.videoHeight);
        const offX = (W - video.videoWidth * scale) / 2;
        const offY = (H - video.videoHeight * scale) / 2;
        const r = el.getBoundingClientRect();
        const sx = (r.left - offX) / scale, sy = (r.top - offY) / scale;
        const sw = r.width / scale, sh = r.height / scale;
        if (sw > 0 && sh > 0) {
          const cw = 36, chh = Math.max(8, Math.round(36 * sh / sw));
          if (!scratchRef.current) scratchRef.current = document.createElement('canvas');
          const cv = scratchRef.current; cv.width = cw; cv.height = chh;
          const ctx = cv.getContext('2d', { willReadFrequently: true });
          try {
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, chh);
            const data = ctx.getImageData(0, 0, cw, chh).data;
            let sum = 0, sum2 = 0; const n = cw * chh;
            for (let i = 0; i < data.length; i += 4) {
              const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              sum += l; sum2 += l * l;
            }
            const mean = sum / n;
            const std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
            const flat = Math.max(0, Math.min(1, (26 - std) / 16));
            if (sheen) sheen.style.opacity = (flat * 0.8).toFixed(3);
          } catch (_) {}
        }
      }
      adaptRef.current = setTimeout(loop, 130);
    };
    loop();
  }, []);

  useEffect(() => {
    // defer one frame so the panel has measured size
    const t = requestAnimationFrame(() => applyGlass());
    startAdapt();
    return () => {
      cancelAnimationFrame(t);
      cancelAnimationFrame(rafRef.current);
      clearTimeout(adaptRef.current);
    };
  }, [applyGlass, startAdapt]);

  return (
    <>
      {/* off-screen SVG defs — one per panel */}
      <svg
        width="0" height="0"
        style={{ position: 'absolute', pointerEvents: 'none' }}
        ref={(el) => { defsRef.current = el?.querySelector('defs') || null; }}
      >
        <defs />
      </svg>
      <div ref={panelRef} style={style}>
        {/* 3D bevel shading layer */}
        <div
          ref={bevelRef}
          style={{
            position: 'absolute', inset: 0, borderRadius: 'inherit',
            pointerEvents: 'none', backgroundSize: '100% 100%',
          }}
        />
        {/* adaptive specular sheen */}
        <div
          ref={sheenRef}
          style={{
            position: 'absolute', inset: 0, borderRadius: 'inherit',
            pointerEvents: 'none', opacity: 0, transition: 'opacity .25s ease',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0) 32%)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.22), inset 0 1px 1px rgba(255,255,255,0.4)',
          }}
        />
        {children}
      </div>
    </>
  );
}

// ---- LiquidGlassNav: the full nav + context menu ----
export default function LiquidGlassNav({
  /** Optional: src for the background video */
  videoSrc,
  /** Optional: render children in front of the video but behind the nav */
  children,
}) {
  const [openKey, setOpenKey] = useState(null);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });
  const closeTimerRef = useRef(null);

  const hoverOpen = useCallback((key) => {
    clearTimeout(closeTimerRef.current);
    setOpenKey(key);
    setCtxOpen(false);
  }, []);

  const scheduleClose = useCallback(() => {
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpenKey(null), 140);
  }, []);

  const handleRootCtx = useCallback((e) => {
    e.preventDefault();
    const pad = 12;
    const maxX = window.innerWidth - 228 - pad;
    const maxY = window.innerHeight - 320 - pad;
    setCtxOpen(true);
    setOpenKey(null);
    setCtxPos({
      x: Math.max(pad, Math.min(e.clientX, maxX)),
      y: Math.max(pad, Math.min(e.clientY, maxY)),
    });
  }, []);

  const handleRootClick = useCallback(() => {
    if (openKey || ctxOpen) { setOpenKey(null); setCtxOpen(false); }
  }, [openKey, ctxOpen]);

  // video playback position persistence
  useEffect(() => {
    const v = document.getElementById('lg-video');
    if (!v) return;
    const restore = () => {
      try {
        const saved = parseFloat(localStorage.getItem('lg-video-time'));
        const dur = v.duration;
        if (!isNaN(saved) && isFinite(saved) && (isNaN(dur) || saved < dur - 0.5)) v.currentTime = saved;
      } catch (_) {}
    };
    if (v.readyState >= 1) restore();
    else v.addEventListener('loadedmetadata', restore, { once: true });
    const onTime = () => { try { localStorage.setItem('lg-video-time', String(v.currentTime)); } catch (_) {} };
    const onEnded = () => { v.currentTime = 0; v.play()?.catch(() => {}); };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', onEnded);
    v.play()?.catch(() => {});
    return () => { v.removeEventListener('timeupdate', onTime); v.removeEventListener('ended', onEnded); };
  }, [videoSrc]);

  const panelStyle = {
    position: 'absolute', top: 'calc(100% + 30px)', left: '50%',
    transform: 'translateX(-50%)', minWidth: 236, padding: 9, borderRadius: 26,
    background: 'rgba(14,17,13,0.20)',
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 22px 55px rgba(0,0,0,0.42), inset 0 1px 1px rgba(255,255,255,0.28), inset 0 -2px 4px rgba(0,0,0,0.32)',
    animation: 'lgPanel .44s cubic-bezier(.22,1,.36,1) both',
  };

  const ctxStyle = {
    position: 'fixed', left: ctxPos.x, top: ctxPos.y, zIndex: 30, width: 232,
    padding: 8, borderRadius: 26, background: 'rgba(14,17,13,0.20)',
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 22px 60px rgba(0,0,0,0.46), inset 0 1px 1px rgba(255,255,255,0.28), inset 0 -2px 4px rgba(0,0,0,0.32)',
    animation: 'lgPanel .4s cubic-bezier(.22,1,.36,1) both',
    transformOrigin: 'top left',
  };

  return (
    <div
      id="lg-root"
      onContextMenu={handleRootCtx}
      onClick={handleRootClick}
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        fontFamily: "-apple-system,'SF Pro Display','SF Pro Text',system-ui,'Segoe UI',sans-serif",
        WebkitFontSmoothing: 'antialiased', background: '#0a0a0a',
      }}
    >
      <style>{`
        @keyframes lgPanel {
          from { opacity: 0; transform: translateY(10px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lgItems {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {videoSrc && (
        <video
          id="lg-video"
          autoPlay loop muted playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      )}

      {children}

      {/* nav */}
      <nav style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        display: 'flex', gap: 64, alignItems: 'flex-start', zIndex: 10,
      }}>
        {MENU_DATA.map((m) => (
          <div
            key={m.key}
            style={{ position: 'relative' }}
            onMouseEnter={() => hoverOpen(m.key)}
            onMouseLeave={scheduleClose}
          >
            <button
              onClick={(e) => { e.stopPropagation(); hoverOpen(m.key); }}
              style={{
                position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center',
                gap: 8, background: 'none', border: 'none', padding: '6px 2px', margin: 0,
                cursor: 'pointer', color: '#fff', fontSize: 19, fontWeight: 600,
                letterSpacing: '-0.01em', textShadow: '0 1px 16px rgba(0,0,0,0.35)',
                fontFamily: 'inherit',
              }}
            >
              <span>{m.label}</span>
              <svg
                width="13" height="13" viewBox="0 0 24 24" fill="none"
                style={{
                  transition: 'transform .35s cubic-bezier(.22,1,.36,1)',
                  transform: openKey === m.key ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {openKey === m.key && (
              <div
                onMouseEnter={() => hoverOpen(m.key)}
                onMouseLeave={scheduleClose}
              >
                {/* invisible hover bridge across the 30px gap */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: -32, height: 32 }} />
                <GlassPanel id={`dd-${m.key}`} style={panelStyle}>
                  {m.items.map((label, i) => (
                    <div
                      key={label}
                      onClick={(e) => { e.stopPropagation(); setOpenKey(null); }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = ''}
                      style={{
                        position: 'relative', padding: '11px 18px', borderRadius: 14,
                        color: '#fff', fontSize: 16.5, fontWeight: 500,
                        letterSpacing: '-0.005em', cursor: 'pointer', whiteSpace: 'nowrap',
                        textShadow: '0 1px 12px rgba(0,0,0,0.55)', transition: 'background .15s ease',
                        animation: `lgItems .34s ease ${(0.08 + i * 0.04).toFixed(2)}s both`,
                      }}
                    >
                      {label}
                    </div>
                  ))}
                </GlassPanel>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* context menu */}
      {ctxOpen && (
        <GlassPanel id="lg-ctx" style={ctxStyle}>
          {CTX_DATA.map((c, i) =>
            c.sep ? (
              <div key={i} style={{ height: 1, margin: '6px 12px', background: 'rgba(255,255,255,0.18)' }} />
            ) : (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); setCtxOpen(false); }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
                onMouseLeave={(e) => e.currentTarget.style.background = ''}
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 18, padding: '9px 14px',
                  borderRadius: 13, color: '#fff', fontSize: 15, fontWeight: 500,
                  letterSpacing: '-0.005em', cursor: 'pointer', whiteSpace: 'nowrap',
                  textShadow: '0 1px 12px rgba(0,0,0,0.55)', transition: 'background .15s ease',
                  animation: `lgItems .3s ease ${(0.04 + i * 0.025).toFixed(3)}s both`,
                }}
              >
                <span>{c.label}</span>
                <span style={{ opacity: 0.55, fontSize: 13, fontWeight: 400 }}>{c.hint}</span>
              </div>
            )
          )}
        </GlassPanel>
      )}

      <div style={{
        position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500,
        letterSpacing: '0.01em', textShadow: '0 1px 10px rgba(0,0,0,0.4)', pointerEvents: 'none',
      }}>
        Hover a menu · right-click anywhere
      </div>
    </div>
  );
}
