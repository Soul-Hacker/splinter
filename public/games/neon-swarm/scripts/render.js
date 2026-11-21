'use strict';
/* ---------- drawing ---------- */
function glow(c) { X.shadowColor = c; X.shadowBlur = 12; X.strokeStyle = c; X.fillStyle = 'rgba(6,8,22,.55)'; X.lineWidth = 2 }
function poly(x, y, r, n, rot, c) { glow(c); X.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i * TAU / n; X.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) } X.closePath(); X.fill(); X.stroke() }
function circ(x, y, r, c) { glow(c); X.beginPath(); X.arc(x, y, r, 0, TAU); X.stroke() }
function dot(x, y, r, c) { X.shadowColor = c; X.shadowBlur = 10; X.fillStyle = c; X.beginPath(); X.arc(x, y, r, 0, TAU); X.fill() }
function txt(s, x, y, sz, c, al) { X.font = 'bold ' + sz + 'px ' + MONO; X.textAlign = al || 'left'; X.textBaseline = 'middle'; X.shadowColor = c; X.shadowBlur = 10; X.fillStyle = c; X.fillText(s, x, y) }
function spaceGlow() {
    let g = X.createRadialGradient(W * .2, H * .28, 0, W * .2, H * .28, Math.max(W, H) * .8); g.addColorStop(0, 'rgba(39,115,208,.16)'); g.addColorStop(.42, 'rgba(96,57,172,.07)'); g.addColorStop(1, 'rgba(5,6,15,0)'); X.fillStyle = g; X.fillRect(0, 0, W, H);
    g = X.createRadialGradient(W * .82, H * .76, 0, W * .82, H * .76, Math.max(W, H) * .62); g.addColorStop(0, 'rgba(195,41,134,.12)'); g.addColorStop(1, 'rgba(5,6,15,0)'); X.fillStyle = g; X.fillRect(0, 0, W, H)
}
function hudPlate(x, y, w, h, c) { X.save(); X.fillStyle = 'rgba(6,10,24,.76)'; X.fillRect(x, y, w, h); X.globalAlpha = .36; X.strokeStyle = c; X.lineWidth = 1; X.strokeRect(x + .5, y + .5, w - 1, h - 1); X.restore() }
function draw() {
    X.shadowBlur = 0; X.fillStyle = 'rgba(5,6,15,.34)'; X.fillRect(0, 0, W, H); spaceGlow();
    X.save(); if (shake > .3) X.translate((R() - .5) * shake, (R() - .5) * shake);
    X.strokeStyle = 'rgba(98,174,255,.085)'; X.lineWidth = 1; X.beginPath(); for (let x = 0; x < W; x += 60) { X.moveTo(x, 0); X.lineTo(x, H) } for (let y = 0; y < H; y += 60) { X.moveTo(0, y); X.lineTo(W, y) } X.stroke();
    const cx = st === 'menu' ? W / 2 : P.x, cy = st === 'menu' ? H / 2 : P.y; X.fillStyle = '#fff';
    for (const s of stars) { const x = ((s.x * W - (cx - W / 2) * s.z * .06 + T * (2 + s.z * 3)) % W + W) % W, y = ((s.y * H - (cy - H / 2) * s.z * .06 + T * s.z) % H + H) % H; X.globalAlpha = (.28 + s.z * .42) * (.78 + Math.sin(T * 2 + s.x * 18) * .22); X.fillStyle = s.z > .82 ? '#a8eaff' : '#e5e9ff'; X.shadowColor = s.z > .82 ? '#49cfff' : '#fff'; X.shadowBlur = s.z > .9 ? 7 : 0; X.fillRect(x, y, s.z * 1.7, s.z * 1.7) } X.globalAlpha = 1; X.shadowBlur = 0;
    if (st !== 'menu') {
        for (const u of PU) { if (u.t < 2 && Math.floor(T * 10) % 2) continue; const c = PUS[u.k]; circ(u.x, u.y, 11 + Math.sin(T * 6) * 2, c); txt(u.k, u.x, u.y + 1, 13, c, 'center') }
        for (const e of E) { const c = e.fl > 0 ? '#fff' : e.c; poly(e.x, e.y, e.r, e.n, e.rot, c); if (e.t === 'tank' || e.t === 'boss') poly(e.x, e.y, e.r * .55, e.n, -e.rot, c) }
        for (const b of PB) dot(b.x, b.y, 3, '#3dd6ff');
        for (const b of EB) dot(b.x, b.y, 4, '#ff5a5a');
        if (st !== 'over' && !(P.inv > 0 && P.dash <= 0 && Math.floor(T * 14) % 2)) { glow('#3dd6ff'); X.save(); X.translate(P.x, P.y); X.rotate(P.a); X.beginPath(); X.moveTo(16, 0); X.lineTo(-11, 10); X.lineTo(-6, 0); X.lineTo(-11, -10); X.closePath(); X.fill(); X.stroke(); X.restore(); if (P.sh) circ(P.x, P.y, 20, '#7ab8ff') }
        for (const p of PT) { X.globalAlpha = p.l / p.ml; X.shadowColor = p.c; X.shadowBlur = 8; X.fillStyle = p.c; X.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s) } X.globalAlpha = 1;
        for (const t of TX) { X.globalAlpha = 1 - t.t; txt(t.s, t.x, t.y, 14, t.c, 'center') } X.globalAlpha = 1;
    }
    X.restore();
    if (st === 'menu') return;
    const leftW = Math.min(190, W * .53), rightW = Math.min(140, W * .4), rightX = W - rightW - 10;
    hudPlate(10, 8, leftW, 66, '#3dd6ff'); txt(String(score).padStart(6, '0'), 20, 28, 26, '#3dd6ff'); txt('WAVE ' + wave + '   HI ' + hi, 20, 56, 14, '#cfeaff');
    hudPlate(rightX, 8, rightW, 55, '#ff5a8a');
    for (let i = 0; i < 5; i++) { const x = W - 30 - i * 20; X.shadowColor = '#ff5a8a'; X.shadowBlur = i < P.hull ? 10 : 0; X.strokeStyle = '#ff5a8a'; X.fillStyle = i < P.hull ? '#ff5a8a' : 'rgba(255,90,138,.1)'; X.lineWidth = 1; X.fillRect(x, 18, 14, 14); X.strokeRect(x, 18, 14, 14) }
    X.shadowBlur = 0; X.strokeStyle = '#3dd6ff'; X.strokeRect(W - 120.5, 42.5, 100, 6); X.fillStyle = P.cd <= 0 ? '#3dd6ff' : 'rgba(61,214,255,.5)'; X.fillRect(W - 120, 43, 100 * (1 - P.cd / 1.1), 6);
    let ty = 66; if (P.tri > 0) { txt('TRIPLE ' + P.tri.toFixed(1), W - 20, ty, 13, '#3dd6ff', 'right'); ty += 18 } if (P.rap > 0) { txt('RAPID ' + P.rap.toFixed(1), W - 20, ty, 13, '#ffd23d', 'right'); ty += 18 } if (P.sh) txt('SHIELD', W - 20, ty, 13, '#7ab8ff', 'right');
    if (combo > 0) { txt('x' + Math.min(8, 1 + (combo >> 2)) + ' COMBO ' + combo, W / 2, 28, 20, '#ffd23d', 'center'); X.shadowBlur = 0; X.fillStyle = '#ffd23d'; X.fillRect(W / 2 - 60, 42, 120 * comboT / 2.5, 3) }
    const bo = E.find(e => e.t === 'boss'); if (bo) { const w = Math.min(600, W * .6); X.shadowBlur = 0; X.strokeStyle = '#ff7a1a'; X.strokeRect(W / 2 - w / 2 + .5, 64.5, w, 10); X.shadowColor = '#ff7a1a'; X.shadowBlur = 8; X.fillStyle = '#ff7a1a'; X.fillRect(W / 2 - w / 2, 65, w * cl(bo.hp / bo.mh, 0, 1), 9) }
    if (banner) { X.globalAlpha = Math.min(1, banner.t); txt(banner.s, W / 2, H * .32, Math.min(64, W * .09), banner.c, 'center'); X.globalAlpha = 1 }
    if (muted) txt('MUTED', 20, H - 20, 12, '#8899aa');
    if (st === 'over') {
        const panelW = Math.min(480, W - 32), panelX = (W - panelW) / 2; hudPlate(panelX, H * .3 - 42, panelW, 214, '#ff3d7f'); txt('GAME OVER', W / 2, H * .3, Math.min(64, W * .14), '#ff3d7f', 'center'); txt('SCORE ' + score + '   /   WAVE ' + wave, W / 2, H * .3 + 54, 20, '#cfeaff', 'center'); if (newHi) txt('NEW HIGH SCORE!', W / 2, H * .3 + 88, 20, '#ffd23d', 'center');
        if (overT > .8) { txt('CLICK OR PRESS ENTER TO PLAY AGAIN', W / 2, H * .3 + 132, Math.min(16, W * .045), '#3dd6ff', 'center'); txt('ESC FOR MENU', W / 2, H * .3 + 166, 13, '#8899aa', 'center') }
    }
    X.shadowColor = '#3dd6ff'; X.shadowBlur = 8; X.strokeStyle = '#3dd6ff'; X.lineWidth = 1.5; X.beginPath(); X.arc(mx, my, 9, 0, TAU); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { X.moveTo(mx + a * 5, my + b * 5); X.lineTo(mx + a * 15, my + b * 15) } X.stroke(); X.shadowBlur = 0;
}
