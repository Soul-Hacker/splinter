'use strict';
/* ---------- pause / input ---------- */
function pause() { st = 'pause'; C.style.cursor = 'default'; X.shadowBlur = 0; X.fillStyle = 'rgba(5,6,15,.62)'; X.fillRect(0, 0, W, H); spaceGlow(); hudPlate(W / 2 - 175, H / 2 - 72, 350, 144, '#3dd6ff'); txt('PAUSED', W / 2, H / 2 - 14, 52, '#3dd6ff', 'center'); txt('PRESS P / ESC TO RESUME', W / 2, H / 2 + 36, 15, '#cfeaff', 'center') }
function resume() { st = 'play'; C.style.cursor = 'none'; dashReq = false; useReq = false }
const typing = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
addEventListener('keydown', e => {
    if (typing(e.target)) return;
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    keys[e.code] = true; if (e.repeat) return;
    if (e.code === 'Space') dashReq = true;
    if (e.code === 'KeyE' || e.code === 'KeyF') { e.preventDefault(); if (st === 'mp') useReq = true }
    if (e.code === 'KeyP' || e.code === 'Escape') { if (st === 'play') pause(); else if (st === 'pause') resume(); else if (st === 'over' && e.code === 'Escape') toMenu() }
    if (e.code === 'KeyM') muted = !muted;
    if (e.code === 'Enter' && st === 'over' && overT > .8) newGame()
});
addEventListener('keyup', e => { keys[e.code] = false });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; down = false; if (st === 'play') pause() });
C.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY });
C.addEventListener('mousedown', e => { mx = e.clientX; my = e.clientY; if (e.button === 0) { down = true; if (st === 'over' && overT > .8) newGame() } else if (e.button === 2) dashReq = true });
addEventListener('mouseup', e => { if (e.button === 0) down = false });
addEventListener('contextmenu', e => e.preventDefault());
document.getElementById('sp').addEventListener('click', newGame);
let last = 0;
function loop(ts) { requestAnimationFrame(loop); const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; if (st === 'pause' || st === 'room') return; if (st === 'mp') { mpStep(dt); mpDraw(); return } step(dt); draw() }
toMenu(); requestAnimationFrame(loop);
