'use strict';
function mpDraw() {
    const m = mp, [s, ox, oy] = m.vs || [1, 0, 0], me = m.pl.find(p => p.id === m.id);
    X.shadowBlur = 0; X.fillStyle = 'rgba(5,6,15,.34)'; X.fillRect(0, 0, W, H); spaceGlow();
    X.save(); if (shake > .3) X.translate((R() - .5) * shake, (R() - .5) * shake); X.translate(ox, oy); X.scale(s, s);
    X.strokeStyle = 'rgba(98,174,255,.085)'; X.lineWidth = 1; X.beginPath(); for (let x = 0; x <= AW; x += 60) { X.moveTo(x, 0); X.lineTo(x, AH) } for (let y = 0; y <= AH; y += 60) { X.moveTo(0, y); X.lineTo(AW, y) } X.stroke();
    glow('#3dd6ff'); X.lineWidth = 3; X.strokeRect(0, 0, AW, AH);
    if (m.hole) {
        X.save(); X.translate(m.hole.x, m.hole.y); X.shadowColor = '#a66bff'; X.shadowBlur = 22; X.fillStyle = '#05020b'; X.beginPath(); X.arc(0, 0, 34, 0, TAU); X.fill();
        X.rotate(T * 1.8); X.strokeStyle = '#a66bff'; X.lineWidth = 3; X.beginPath(); X.arc(0, 0, 44, -.8, 1.35); X.stroke(); X.rotate(T * -3.2); X.beginPath(); X.arc(0, 0, 52, 2.1, 4.7); X.stroke(); X.restore(); txt(Math.ceil(m.hole.t) + 's', m.hole.x, m.hole.y + 68, 14, '#c7a6ff', 'center')
    }
    for (const w of MP_WAVES) { const k = Math.min(1, w.t / w.d); X.globalAlpha = 1 - k; X.strokeStyle = w.c; X.shadowColor = w.c; X.shadowBlur = 18; X.lineWidth = 5 * (1 - k) + 1; X.beginPath(); X.arc(w.x, w.y, w.r * k, 0, TAU); X.stroke() } X.globalAlpha = 1; X.shadowBlur = 0;
    for (const b of m.bots) {
        poly(b.x, b.y, 23, 5, T * .7, '#ff5a5a'); txt('BOT', b.x, b.y - 1, 10, '#fff', 'center');
        for (let i = 0; i < 4; i++) { X.shadowBlur = 0; X.fillStyle = i < b.hp ? '#ff5a5a' : 'rgba(255,90,90,.16)'; X.fillRect(b.x - 18 + i * 10, b.y + 30, 7, 4) }
    }
    for (const b of m.bl) { const q = m.pl.find(p => p.id === b.o); dot(b.x, b.y, b.bot ? 4 : 3, b.bot ? '#ff5a5a' : q ? q.col : '#fff') }
    for (const p of m.pl) {
        if (!p.al) continue; const own = p.id === m.id, a = own && m.la != null ? m.la : p.a;
        if (!(p.inv > 0 && Math.floor(T * 14) % 2)) { glow(p.col); X.save(); X.translate(p.x, p.y); X.rotate(a); X.beginPath(); X.moveTo(16, 0); X.lineTo(-11, 10); X.lineTo(-6, 0); X.lineTo(-11, -10); X.closePath(); X.fill(); X.stroke(); X.restore(); if (own) { X.strokeStyle = 'rgba(255,255,255,.7)'; X.shadowColor = '#fff'; X.lineWidth = 1; X.beginPath(); X.arc(p.x, p.y, 20, 0, TAU); X.stroke() } }
        if (p.shield > 0) circ(p.x, p.y, 25, '#7ab8ff');
        if (p.frozen > 0) { X.save(); X.setLineDash([6, 5]); X.strokeStyle = '#e8f6ff'; X.shadowColor = '#e8f6ff'; X.shadowBlur = 10; X.lineWidth = 2; X.beginPath(); X.arc(p.x, p.y, 30, 0, TAU); X.stroke(); X.restore(); txt('FROZEN', p.x, p.y - 46, 10, '#e8f6ff', 'center') }
        txt(p.name, p.x, p.y - 30, 12, own ? '#fff' : p.col, 'center'); X.shadowBlur = 0; for (let i = 0; i < 3; i++) { X.fillStyle = i < p.hull ? p.col : 'rgba(255,255,255,.12)'; X.fillRect(p.x - 14 + i * 10, p.y - 21, 8, 4) }
    }
    for (const p of PT) { X.globalAlpha = p.l / p.ml; X.shadowColor = p.c; X.shadowBlur = 8; X.fillStyle = p.c; X.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s) } X.globalAlpha = 1;
    X.restore();
    const srt = [...m.pl].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
    hudPlate(10, 8, Math.min(190, W * .48), 36 + Math.min(8, srt.length) * 18, '#3dd6ff');
    srt.forEach((p, i) => txt(p.kills + '  ' + p.name, 20, 28 + i * 18, 14, p.id === m.id ? '#fff' : p.col));
    txt('N: RENAME', 20, H - 20, 12, '#8899aa');
    const t = Math.max(0, Math.ceil(m.ph === 1 ? 120 : m.tl)), timerY = W < 520 ? H - 24 : 29; hudPlate(W / 2 - 55, timerY - 21, 110, 42, '#3dd6ff'); txt((t / 60 | 0) + ':' + String(t % 60).padStart(2, '0'), W / 2, timerY, 25, m.ph === 2 && m.tl <= 10 ? '#ff3d3d' : '#cfeaff', 'center');
    if (me) {
        hudPlate(W - 152, 8, 142, 48, '#ff5a8a'); for (let i = 0; i < 3; i++) { X.shadowBlur = 0; X.fillStyle = i < me.hull ? '#ff5a8a' : 'rgba(255,90,138,.12)'; X.fillRect(W - 30 - i * 20, 18, 14, 14) } X.strokeStyle = '#3dd6ff'; X.strokeRect(W - 120.5, 42.5, 100, 6); X.fillStyle = '#3dd6ff'; X.fillRect(W - 120, 43, 100 * (1 - m.cdL / 1.1), 6);
        if (!me.al && m.ph === 2) txt('RESPAWNING...', W / 2, H / 2, 32, '#ff5a8a', 'center')
    }
    if (m.ph === 1) { txt('GET READY', W / 2, H * .35, 60, '#3dd6ff', 'center'); txt(String(Math.max(1, Math.ceil(m.tl))), W / 2, H * .35 + 70, 48, '#ffd23d', 'center') }
    m.msgs.forEach((q, i) => { X.globalAlpha = 1 - q.t / 3; txt(q.s, W / 2, 64 + i * 20, 15, q.c || '#cfeaff', 'center') }); X.globalAlpha = 1;
    if (me && me.powerup) { const power = POWER_BY_ID[me.powerup]; if (power) txt('[E] ' + power.name, W / 2, H - 24, 15, power.color, 'center') }
    if (me && me.shield > 0) txt('SHIELDED', W / 2, H - 48, 13, '#7ab8ff', 'center');
    if (me && me.frozen > 0) txt('FROZEN', W / 2, H - 48, 13, '#e8f6ff', 'center');
    if (m.ph === 3 && srt.length) {
        txt(srt.length > 1 && srt[0].kills === srt[1].kills ? 'DRAW' : srt[0].name.toUpperCase() + ' WINS', W / 2, H * .25, 56, '#ffd23d', 'center');
        srt.forEach((p, i) => txt(p.name.padEnd(13) + 'K ' + p.kills + '  D ' + p.deaths, W / 2, H * .25 + 60 + i * 24, 17, p.col, 'center'));
        txt(m.host ? 'PRESS ENTER FOR A REMATCH' : 'WAITING FOR THE HOST...', W / 2, H * .25 + 80 + srt.length * 24, 18, '#3dd6ff', 'center'); txt('ESC TO LEAVE', W / 2, H * .25 + 108 + srt.length * 24, 13, '#8899aa', 'center')
    }
    X.shadowColor = '#3dd6ff'; X.shadowBlur = 8; X.strokeStyle = '#3dd6ff'; X.lineWidth = 1.5; X.beginPath(); X.arc(mx, my, 9, 0, TAU); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { X.moveTo(mx + a * 5, my + b * 5); X.lineTo(mx + a * 15, my + b * 15) } X.stroke(); X.shadowBlur = 0
}
