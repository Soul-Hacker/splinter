'use strict';
const S=io();
const C=document.getElementById('c'),X=C.getContext('2d'),M=document.getElementById('menu');
const R=Math.random,TAU=Math.PI*2,cl=(v,a,b)=>v<a?a:v>b?b:v,MONO='ui-monospace,Menlo,Consolas,monospace';
let W=0,H=0,st='menu',T=0,mx=0,my=0,down=false,dashReq=false,useReq=false,muted=false,hi=0;
const keys={};
try{hi=+localStorage.getItem('neonswarm.hi')||0}catch(e){}
const stars=Array.from({length:140},()=>({x:R(),y:R(),z:.2+R()*.8}));
function rs(){const d=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;C.width=W*d;C.height=H*d;C.style.width=W+'px';C.style.height=H+'px';X.setTransform(d,0,0,d,0,0);X.fillStyle='#05060f';X.fillRect(0,0,W,H)}
addEventListener('resize',rs);rs();
/* ---------- audio ---------- */
let AC=null;
function audioMessage(message){const el=document.getElementById('msg');if(el)el.textContent=message}
function unlockAudio(){if(muted)return;const AudioContextType=window.AudioContext||window.webkitAudioContext;
if(!AudioContextType){audioMessage('Audio is not supported in this browser.');return}
try{AC=AC||new AudioContextType();if(AC.state==='suspended')AC.resume().catch(()=>audioMessage('Audio could not start. Check your browser sound permissions.'))}
catch(e){audioMessage('Audio could not start. Check your browser sound permissions.')}}
function beep(f,d,ty,v,sl,delay){if(muted)return;if(!AC)unlockAudio();if(!AC)return;
try{if(AC.state==='suspended')AC.resume().catch(()=>audioMessage('Audio could not start. Check your browser sound permissions.'));
const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime+(delay||0);o.type=ty||'square';o.frequency.setValueAtTime(f,t);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(20,sl),t+d);g.gain.setValueAtTime(v||.06,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.02)}
catch(e){audioMessage('Audio could not start. Check your browser sound permissions.')}}
addEventListener('pointerdown',unlockAudio);addEventListener('keydown',unlockAudio);
/* ---------- data ---------- */
const TY={grunt:{n:4,r:14,hp:2,sp:95,c:'#ff3d7f',p:10},dart:{n:3,r:10,hp:1,sp:200,c:'#ffd23d',p:15},shooter:{n:4,r:15,hp:3,sp:80,c:'#3dffb0',p:30},tank:{n:6,r:25,hp:9,sp:52,c:'#a66bff',p:50},boss:{n:8,r:48,hp:70,sp:60,c:'#ff7a1a',p:500}};
const PUS={T:'#3dd6ff',R:'#ffd23d',S:'#7ab8ff',H:'#ff5a8a',B:'#ff7a1a'};
let P,E,PB,EB,PU,PT,TX,score,wave,combo,comboT,shake,spawnLeft,spawnT,clearT,banner,overT,newHi;
function newGame(){P={x:W/2,y:H/2,vx:0,vy:0,a:0,hull:5,inv:1,fire:0,dash:0,cd:0,dx:1,dy:0,tri:0,rap:0,sh:false};E=[];PB=[];EB=[];PU=[];PT=[];TX=[];score=0;wave=0;combo=0;comboT=0;shake=0;spawnLeft=0;spawnT=0;clearT=0;banner=null;newHi=false;overT=0;dashReq=false;useReq=false;st='play';C.style.cursor='none';M.style.display='none';nextWave()}
function toMenu(m){st='menu';M.style.display='flex';C.style.cursor='none';document.getElementById('msg').textContent=typeof m==='string'?m:'';document.getElementById('hi').textContent='HIGH SCORE '+hi}
function nextWave(){wave++;const b=wave%5===0;spawnLeft=b?4+wave:4+2*wave;spawnT=b?.8:.3;banner={t:2,s:b?'BOSS WAVE '+wave:'WAVE '+wave,c:b?'#ff7a1a':'#3dd6ff'};if(b)spawn('boss');beep(b?90:220,b?.6:.3,b?'sawtooth':'sine',.08,b?50:440)}
function pickType(){const p=['grunt','grunt'];if(wave>=2)p.push('dart','dart');if(wave>=3)p.push('shooter');if(wave>=4)p.push('tank');return p[R()*p.length|0]}
function spawn(t){const d=TY[t],s=R()*4|0,m=d.r+30;let x,y;if(s===0){x=R()*W;y=-m}else if(s===1){x=W+m;y=R()*H}else if(s===2){x=R()*W;y=H+m}else{x=-m;y=R()*H}
const hp=t==='boss'?70+8*wave:d.hp;E.push({t:t,x:x,y:y,r:d.r,n:d.n,c:d.c,hp:hp,mh:hp,rot:R()*TAU,rs:(R()-.5)*(t==='boss'?1:3),fl:0,fire:1+R()*1.5,ph:R()*TAU,sg:R()<.5?1:-1,kx:0,ky:0,age:0,dead:false})}
function burst(x,y,c,n,sp){for(let i=0;i<n;i++){const a=R()*TAU,s=R()*sp,l=.4+R()*.5;PT.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:l,ml:l,c:c,s:2+R()*3})}}
function ebul(x,y,a,s){EB.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l:8})}
function hurt(){if(P.dash>0||P.inv>0||st!=='play')return;
if(P.sh){P.sh=false;P.inv=.6;beep(500,.2,'triangle',.08,200);shake=Math.max(shake,6);return}
P.hull--;P.inv=1.2;shake=Math.max(shake,14);combo=0;beep(150,.3,'sawtooth',.1,40);burst(P.x,P.y,'#3dd6ff',16,200);if(P.hull<=0){P.hull=0;over()}}
function over(){st='over';overT=0;burst(P.x,P.y,'#3dd6ff',40,350);shake=24;if(score>hi){hi=score;newHi=true;try{localStorage.setItem('neonswarm.hi',String(hi))}catch(e){}}beep(200,.8,'sawtooth',.1,30)}
function dmg(e,n){if(e.dead)return;e.hp-=n;e.fl=.08;if(e.hp<=0)kill(e);else beep(e.t==='boss'?120:300,.04,'square',.04)}
function kill(e){e.dead=true;combo++;comboT=2.5;const m=Math.min(8,1+(combo>>2)),pts=TY[e.t].p*m,b=e.t==='boss';score+=pts;TX.push({x:e.x,y:e.y,t:0,s:'+'+pts,c:e.c});burst(e.x,e.y,e.c,b?60:14,b?400:220);shake=Math.max(shake,b?25:7);beep(300,.15,'triangle',.08,70);if(b||R()<.12)PU.push({x:e.x,y:e.y,k:'TRSHB'[R()*5|0],t:9})}
function nova(){for(const e of E){if(e.t==='boss')dmg(e,15);else dmg(e,999)}EB.length=0;shake=22;for(let i=0;i<80;i++){const a=i/80*TAU;PT.push({x:P.x,y:P.y,vx:Math.cos(a)*700,vy:Math.sin(a)*700,l:.6,ml:.6,c:'#ff7a1a',s:4})}beep(80,.5,'sawtooth',.1,600)}
function pick(k){beep(520,.15,'square',.07,1040);if(k==='T')P.tri=9;else if(k==='R')P.rap=9;else if(k==='S')P.sh=true;else if(k==='H')P.hull=Math.min(5,P.hull+1);else nova();TX.push({x:P.x,y:P.y-16,t:0,s:{T:'TRIPLE',R:'RAPID',S:'SHIELD',H:'+HULL',B:'NOVA'}[k],c:PUS[k]})}
/* ---------- update ---------- */
function step(dt){T+=dt;if(st==='menu'||st==='room')return;
if(st==='play'){
 let ix=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),iy=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);const il=Math.hypot(ix,iy);if(il){ix/=il;iy/=il}
 P.a=Math.atan2(my-P.y,mx-P.x);
 if(dashReq){dashReq=false;if(P.cd<=0){let dx=ix,dy=iy;if(!il){dx=Math.cos(P.a);dy=Math.sin(P.a)}P.dx=dx;P.dy=dy;P.dash=.18;P.cd=1.1;beep(300,.15,'sine',.08,1000)}}
 if(P.dash>0){P.dash-=dt;P.vx=P.dx*900;P.vy=P.dy*900;PT.push({x:P.x,y:P.y,vx:0,vy:0,l:.3,ml:.3,c:'#3dd6ff',s:9})}
 else{const f=Math.min(1,10*dt);P.vx+=(ix*270-P.vx)*f;P.vy+=(iy*270-P.vy)*f}
 P.cd=Math.max(0,P.cd-dt);P.inv=Math.max(0,P.inv-dt);P.tri=Math.max(0,P.tri-dt);P.rap=Math.max(0,P.rap-dt);
 P.x=cl(P.x+P.vx*dt,12,W-12);P.y=cl(P.y+P.vy*dt,12,H-12);
 P.fire-=dt;
 if((down||keys.KeyH)&&P.fire<=0){P.fire=P.rap>0?.065:.14;for(const o of P.tri>0?[0,-.2,.2]:[0]){const a=P.a+o+(R()-.5)*.04;PB.push({x:P.x+Math.cos(a)*16,y:P.y+Math.sin(a)*16,vx:Math.cos(a)*640,vy:Math.sin(a)*640,l:1})}beep(880,.05,'square',.025,440)}
 if(comboT>0){comboT-=dt;if(comboT<=0)combo=0}
 for(const b of PB){b.x+=b.vx*dt;b.y+=b.vy*dt;b.l-=dt;for(const e of E){if(!e.dead&&Math.hypot(e.x-b.x,e.y-b.y)<e.r+3){b.l=0;dmg(e,1);break}}}
 PB=PB.filter(b=>b.l>0);
 const sf=1+Math.min(.5,.02*wave);
 for(const e of E){if(e.dead)continue;e.age+=dt;e.rot+=e.rs*dt;e.fl=Math.max(0,e.fl-dt);
  const dx=P.x-e.x,dy=P.y-e.y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d,px=-uy,py=ux,sp=TY[e.t].sp*sf;let vx=ux*sp,vy=uy*sp;
  if(e.t==='dart'){const w=Math.sin(e.age*5+e.ph)*.9;vx=(ux+px*w)*sp;vy=(uy+py*w)*sp}
  else if(e.t==='shooter'){if(d<190){vx=-ux*sp;vy=-uy*sp}else if(d<280){vx=px*e.sg*sp;vy=py*e.sg*sp}
   e.fire-=dt;if(e.fire<=0){e.fire=Math.max(.9,1.9-.05*wave)*(.85+R()*.3);ebul(e.x,e.y,Math.atan2(dy,dx),230)}}
  else if(e.t==='boss'){if(d<=240){vx=px*e.sg*sp+ux*(d-200)*.6;vy=py*e.sg*sp+uy*(d-200)*.6}
   e.fire-=dt;if(e.fire<=0){const half=e.hp<e.mh/2,n=half?16:12,o=R()*TAU;e.fire=half?1.1:1.8;for(let i=0;i<n;i++)ebul(e.x,e.y,o+i/n*TAU,190);beep(110,.25,'sawtooth',.07,60)}}
  e.x+=(vx+e.kx)*dt;e.y+=(vy+e.ky)*dt;const k=Math.exp(-8*dt);e.kx*=k;e.ky*=k;
  if(d<e.r+12){if(e.t!=='boss'){e.kx=-ux*320;e.ky=-uy*320}hurt()}}
 for(let i=0;i<E.length;i++)for(let j=i+1;j<E.length;j++){const a=E[i],b=E[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.01,o=a.r+b.r-d;if(o>0){const nx=dx/d*o/2,ny=dy/d*o/2;a.x-=nx;a.y-=ny;b.x+=nx;b.y+=ny}}
 for(const b of EB){b.x+=b.vx*dt;b.y+=b.vy*dt;b.l-=dt;if(P.dash<=0&&Math.hypot(P.x-b.x,P.y-b.y)<16){b.l=0;hurt()}}
 EB=EB.filter(b=>b.l>0&&b.x>-60&&b.x<W+60&&b.y>-60&&b.y<H+60);
 for(const u of PU){u.t-=dt;if(Math.hypot(P.x-u.x,P.y-u.y)<26){u.t=0;pick(u.k)}}
 PU=PU.filter(u=>u.t>0);
 E=E.filter(e=>!e.dead);
 if(spawnLeft>0){spawnT-=dt;if(spawnT<=0){spawn(pickType());spawnLeft--;spawnT=Math.max(.18,.8-.05*(wave-1))}}
 else if(E.length===0){clearT+=dt;if(clearT>=1.5){clearT=0;nextWave()}}else clearT=0;
 if(banner){banner.t-=dt;if(banner.t<=0)banner=null}
}else if(st==='over')overT+=dt;
for(const p of PT){p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt}PT=PT.filter(p=>p.l>0);
for(const t of TX){t.t+=dt;t.y-=40*dt}TX=TX.filter(t=>t.t<1);
shake*=Math.exp(-9*dt);}
