/* Brand scenes for the new tab that opens a social profile. Plain HTML + CSS
   strings, because the tab is a blank document with nothing loaded. `icon` is
   the platform's SVG markup (from the same icon set the site uses). */

export const SCENE_PLATFORMS = ["github", "linkedin", "instagram", "facebook", "tiktok", "whatsapp", "youtube", "x"] as const;
export type ScenePlatform = (typeof SCENE_PLATFORMS)[number];
export const hasScene = (p: string | null): p is ScenePlatform => !!p && (SCENE_PLATFORMS as readonly string[]).includes(p);

const BRAND: Record<ScenePlatform, string> = {
  github: "currentColor",
  linkedin: "#0a66c2",
  instagram: "#e1306c",
  facebook: "#1877f2",
  tiktok: "currentColor",
  whatsapp: "#25d366",
  youtube: "#ff0000",
  x: "currentColor",
};

/** Same pseudo-random order every time, so the grid fills "naturally". */
const order = (i: number): number => (i * 37 + 11) % 40;

export function socialScene(p: ScenePlatform, icon: string): { css: string; html: string } {
  const brand = BRAND[p];
  const base = `
.stage{position:relative;display:grid;place-items:center;width:11rem;height:11rem}
.icon{width:4.5rem;height:4.5rem;color:${brand};display:grid;place-items:center;animation:pop .45s cubic-bezier(.2,1.4,.4,1) both}
.icon svg{width:100%;height:100%}
@keyframes pop{from{scale:.3;opacity:0}}`;

  switch (p) {
    case "github": {
      const cells = Array.from({ length: 40 }, (_, i) => `<i style="animation-delay:${0.25 + order(i) * 0.014}s;--l:${[0.25, 0.45, 0.7, 1][order(i) % 4]}"></i>`).join("");
      return {
        css: `${base}.icon{width:3.6rem;height:3.6rem;margin-bottom:.9rem}.grid{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;width:12rem}
.grid i{aspect-ratio:1;border-radius:2px;background:color-mix(in oklab,var(--ink) 10%,transparent);animation:cell .2s ease both}
@keyframes cell{to{background:color-mix(in oklab,#2da44e calc(var(--l)*100%),transparent)}}`,
        html: `<div class="col"><div class="icon">${icon}</div><div class="grid">${cells}</div></div>`,
      };
    }
    case "linkedin": {
      const nodes = Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        return [Math.round(100 + Math.cos(a) * 78), Math.round(100 + Math.sin(a) * 78)] as const;
      });
      const lines = nodes.map(([x, y], i) => `<line x1="100" y1="100" x2="${x}" y2="${y}" pathLength="1" style="animation-delay:${0.25 + i * 0.08}s"/>`).join("");
      const ring = nodes.map(([x, y], i) => { const [nx, ny] = nodes[(i + 1) % 6]!; return `<line x1="${x}" y1="${y}" x2="${nx}" y2="${ny}" pathLength="1" style="animation-delay:${0.6 + i * 0.05}s"/>`; }).join("");
      const dots = nodes.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="7" style="animation-delay:${0.33 + i * 0.08}s"/>`).join("");
      return {
        css: `${base}.net{position:absolute;inset:-1.5rem;width:calc(100% + 3rem);height:calc(100% + 3rem)}
.net line{stroke:${brand};stroke-width:2;stroke-dasharray:1;stroke-dashoffset:1;animation:draw .3s ease forwards}
.net circle{fill:${brand};transform-box:fill-box;transform-origin:center;scale:0;animation:dot .25s cubic-bezier(.2,1.6,.4,1) forwards}
.icon{width:3.4rem;height:3.4rem}
@keyframes draw{to{stroke-dashoffset:0}}@keyframes dot{to{scale:1}}`,
        html: `<div class="stage"><svg class="net" viewBox="0 0 200 200">${lines}${ring}${dots}</svg><div class="icon">${icon}</div></div>`,
      };
    }
    case "instagram":
      return {
        css: `${base}.lens{position:absolute;inset:0;border-radius:2.4rem;background:linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5);animation:pop .4s ease both}
.icon{position:relative;color:#fff;width:5rem;height:5rem}
.iris{position:absolute;inset:18%;border-radius:50%;border:0 solid var(--bg);animation:iris .35s ease-in-out .45s both}
.flash{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;animation:flash .35s ease-out .62s both}
@keyframes iris{50%{border-width:3.2rem}to{border-width:0}}@keyframes flash{from{opacity:.85}to{opacity:0}}`,
        html: `<div class="stage"><div class="lens"></div><div class="icon">${icon}</div><div class="iris"></div></div><div class="flash"></div>`,
      };
    case "facebook":
      return {
        css: `${base}.like{position:absolute;right:-.4rem;bottom:-.4rem;width:3.4rem;height:3.4rem;border-radius:50%;background:${brand};display:grid;place-items:center;font-size:1.7rem;scale:0;animation:like .4s cubic-bezier(.2,1.7,.4,1) .4s forwards}
.ring{position:absolute;inset:0;border-radius:50%;border:3px solid ${brand};opacity:0;animation:ring .7s ease-out .45s}
@keyframes like{to{scale:1}}@keyframes ring{from{opacity:.9;scale:.5}to{opacity:0;scale:1.6}}`,
        html: `<div class="stage"><div class="ring"></div><div class="icon">${icon}</div><div class="like">👍</div></div>`,
      };
    case "tiktok":
      return {
        css: `${base}.icon{animation:pop .4s ease both,split .5s steps(2) .35s 2}
.note{position:absolute;font-size:1.6rem;color:var(--ink);opacity:0;animation:note 1s ease-out both}
.n1{left:1rem;top:4rem;animation-delay:.3s}.n2{right:1.2rem;top:5rem;animation-delay:.5s;color:#fe2c55}.n3{left:2.6rem;top:6rem;animation-delay:.65s;color:#25f4ee}
@keyframes split{0%{filter:drop-shadow(-3px 0 #25f4ee) drop-shadow(3px 0 #fe2c55)}50%{filter:drop-shadow(3px 1px #25f4ee) drop-shadow(-3px -1px #fe2c55);translate:2px 0}}
@keyframes note{from{opacity:0;translate:0 0}30%{opacity:1}to{opacity:0;translate:0 -4.5rem;rotate:-12deg}}`,
        html: `<div class="stage"><div class="icon">${icon}</div><span class="note n1">♪</span><span class="note n2">♫</span><span class="note n3">♪</span></div>`,
      };
    case "whatsapp":
      return {
        css: `${base}.bubble{position:absolute;right:-1.4rem;top:.6rem;display:flex;gap:5px;padding:.7rem .85rem;border-radius:1.1rem 1.1rem 1.1rem .2rem;background:${brand};scale:0;transform-origin:0 100%;animation:like .35s cubic-bezier(.2,1.6,.4,1) .35s forwards}
.bubble i{width:8px;height:8px;border-radius:50%;background:#fff;animation:typing .6s ease-in-out infinite}
.bubble i:nth-child(2){animation-delay:.15s}.bubble i:nth-child(3){animation-delay:.3s}
@keyframes like{to{scale:1}}@keyframes typing{50%{translate:0 -5px;opacity:.5}}`,
        html: `<div class="stage"><div class="icon">${icon}</div><div class="bubble"><i></i><i></i><i></i></div></div>`,
      };
    case "youtube":
      return {
        css: `${base}.btn{width:7.5rem;height:5.2rem;border-radius:1.4rem;background:${brand};display:grid;place-items:center;animation:pop .4s ease both,press .45s ease .5s both}
.btn svg{width:2.2rem;fill:#fff;margin-left:.3rem}
@keyframes press{40%{scale:.82}75%{scale:1.1}to{scale:1}}`,
        html: `<div class="stage"><div class="btn"><svg viewBox="0 0 10 12"><path d="M0 0L10 6L0 12Z"/></svg></div></div>`,
      };
    case "x":
      return {
        css: `${base}.icon{animation:none}.icon path{fill:transparent;stroke:var(--ink);stroke-width:.5;stroke-dasharray:120;stroke-dashoffset:120;animation:xdraw .6s ease forwards,xfill .25s ease .55s forwards}
@keyframes xdraw{to{stroke-dashoffset:0}}@keyframes xfill{to{fill:var(--ink)}}`,
        html: `<div class="stage"><div class="icon">${icon}</div></div>`,
      };
  }
}
