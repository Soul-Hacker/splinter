'use strict';
/* ---------- multiplayer ---------- */
const COLS=['#3dd6ff','#ff3d7f','#ffd23d','#3dffb0','#a66bff','#ff7a1a','#7ab8ff','#ff8ad8'],AW=1600,AH=900,MP_TICK=1/20;
const NR=window.NeonSwarmRules,POWER_BY_ID=Object.fromEntries(NR.POWER_UPS.map(p=>[p.id,p]));
let mp=null,myName='PILOT';try{myName=localStorage.getItem('neonswarm.name')||'PILOT'}catch(e){}
let MP_WAVES=[];
const U=document.getElementById('ui'),rd=v=>Math.round(v*10)/10,cn=s=>String(s==null?'':s).replace(/[\u0000-\u001f]/g,'').trim().slice(0,12);
function mk(t,a){const e=document.createElement(t);Object.assign(e,a||{});return e}
function show(...k){const panel=mk('section');panel.className='ui-panel';panel.append(...k);U.replaceChildren(panel);U.style.display='flex'}
function plist(a){const d=mk('div');d.className='player-list';for(const p of a){const r=mk('div',{textContent:'● '+p.name});r.style.color=p.col;d.append(r)}return d}
function playerName(name,except){const b=cn(name)||'PILOT';let n=b,k=2;while(mp.pl.some(p=>p!==except&&p.name===n))n=b.slice(0,10)+k++;return n}
function renameMe(){if(!mp)return;const value=prompt('Rename your pilot (up to 12 characters):',myName);if(value===null)return;const n=cn(value)||'PILOT';
if(mp.host){const p=mp.pl.find(p=>p.id===mp.id);if(!p)return;p.name=playerName(n,p);myName=p.name;try{localStorage.setItem('neonswarm.name',myName)}catch(e){}lobby()}
else if(S.connected&&mp.id!=null){myName=n;try{localStorage.setItem('neonswarm.name',myName)}catch(e){}send({k:'rename',n:n})}}
function copyBtn(ta){return mk('button',{textContent:'Copy',onclick:()=>{ta.select();try{navigator.clipboard.writeText(ta.value)}catch(e){document.execCommand('copy')}}})}
function mkP(id,name){const used=mp.pl.map(p=>p.col),col=COLS.find(c=>!used.includes(c))||COLS[0],n=playerName(name);
const p={id:id,name:n,col:col,x:800,y:450,tx:800,ty:450,a:0,vx:0,vy:0,hull:3,kills:0,deaths:0,al:false,inv:0,dash:0,cd:0,fire:0,rt:0,dx:1,dy:0,dn:0,un:0,powerup:null,shield:0,frozen:0,inp:{ix:0,iy:0,a:0,f:false,dreq:false,ureq:false}};mp.pl.push(p);return p}
function leave(msg){if(!mp)return;S.emit('neon:leave');mp=null;U.style.display='none';toMenu(msg)}
function mpMenu(){st='room';M.style.display='none';const n=mk('input',{maxLength:12,value:myName,placeholder:'Your name'}),go=f=>{myName=cn(n.value)||'PILOT';try{localStorage.setItem('neonswarm.name',myName)}catch(e){}f()};
show(mk('h2',{textContent:'MULTIPLAYER'}),n,mk('button',{textContent:'Host a room',onclick:()=>go(hostNew)}),mk('button',{textContent:'Join a room',onclick:()=>go(joinNew)}),mk('button',{textContent:'Back',onclick:()=>{U.style.display='none';toMenu()}}))}
document.getElementById('mp').addEventListener('click',mpMenu);
/* host side */
function hostNew(){S.timeout(5000).emit('neon:create',{name:myName},(error,result)=>{
if(error||!result||!result.ok){toMenu(result&&result.error||'Could not create a room. Check your connection.');return}
mp={host:true,id:0,pl:[],nid:0,ph:0,tl:0,bl:[],bots:[],hole:null,ev:[],msgs:[],cdL:0,dn:0,un:0,sacc:0,acc:0,pend:{},code:result.code};mkP(0,result.name);hostRoom()})}
function hostRoom(){st='room';M.style.display='none';const list=mk('div'),req=mk('div'),note=mk('div'),start=mk('button',{textContent:'Start match',onclick:hostStart}),cd=mk('div',{textContent:mp.code.slice(0,3)+' '+mp.code.slice(3)}),tip=mk('div',{textContent:'Keep this tab open: it runs the match for everyone.'}),actions=mk('div'),copy=mk('button',{textContent:'Copy code',onclick:()=>{try{navigator.clipboard.writeText(mp.code)}catch(e){}}}),rename=mk('button',{textContent:'Rename pilot',onclick:renameMe});
list.className='player-list';req.className='request-list';note.className='status-note';cd.className='room-code';tip.className='room-tip';mp.req=req;mp.note=note;
actions.className='button-row';actions.append(copy,rename);
mp.refresh=()=>{list.replaceChildren(plist(mp.pl));start.disabled=mp.pl.length<2};
show(mk('h2',{textContent:'ROOM / HOST'}),mk('div',{textContent:'Share this code with your crew'}),cd,actions,list,req,note,tip,start,mk('button',{textContent:'Close room',onclick:()=>leave()}));mp.refresh()}
function send(o,transient=false){if(!mp||!S.connected)return;
if(transient){S.volatile.emit('neon:message',{data:o});return}
S.emit('neon:message',{data:o},result=>{if(!result||!result.ok){if(mp&&mp.note)mp.note.textContent=result&&result.error||'Could not send game update.'}})}
function lobby(){send({k:'lobby',p:mp.pl.map(p=>[p.id,p.name,p.col])});if(mp.refresh&&st==='room')mp.refresh()}
function hostMsg(fromId,d){if(!d||typeof d!=='object'||!mp||!mp.host)return;const p=mp.pl.find(p=>p.id===fromId);if(!p)return;
if(d.k==='rename'){p.name=playerName(d.n,p);lobby()}
else if(d.k==='in'){const i=p.inp,s=NR.sanitizeInput(d,p);i.ix=s.ix;i.iy=s.iy;i.a=s.a;i.f=s.f;
if(s.dreq){p.dn=s.dn;i.dreq=true}if(s.ureq){p.un=s.un;i.ureq=true}}}
S.on('neon:message',message=>{if(!mp||!message||!message.data)return;if(mp.host)hostMsg(message.fromId,message.data);else cliMsg(message.data)});
S.on('neon:join-request',request=>{if(!mp||!mp.host||!request)return;if(mp.ph!==0){S.emit('neon:respond',{requestId:request.requestId,accept:false});return}
const requestId=String(request.requestId||''),name=cn(request.name)||'PILOT';if(!requestId||mp.pend[requestId])return;
const row=mk('div');mp.pend[requestId]={row:row,name:name};
row.append(mk('span',{textContent:name+' wants to join '}),mk('button',{textContent:'Accept',onclick:()=>S.timeout(5000).emit('neon:respond',{requestId:requestId,accept:true},(error,result)=>{
if(!mp||!mp.host)return;row.remove();delete mp.pend[requestId];if(error||!result||!result.ok){mp.note.textContent=result&&result.error||'Could not accept that player.';return}
mkP(result.playerId,result.name);lobby()})}),mk('button',{textContent:'Reject',onclick:()=>S.emit('neon:respond',{requestId:requestId,accept:false},(result)=>{
if(!mp||!mp.host)return;row.remove();delete mp.pend[requestId];if(!result||!result.ok)mp.note.textContent=result&&result.error||'Could not reject that player.'})}));
mp.req.append(row)});
S.on('neon:request-cancelled',request=>{if(!mp||!mp.host||!request)return;const pending=mp.pend[request.requestId];if(pending){pending.row.remove();delete mp.pend[request.requestId]}});
S.on('neon:player-left',player=>{if(!mp||!mp.host||!player)return;mp.pl=mp.pl.filter(p=>p.id!==player.playerId);mp.bl=mp.bl.filter(b=>b.bot||b.o!==player.playerId);lobby()});
S.on('neon:joined',result=>{if(!mp||mp.host||!result||mp.code&&mp.code!==result.code)return;mp.code=result.code;mp.id=result.playerId;mp.requestId=null;myName=result.name;
mp.lob=(result.roster||[]).map(p=>({id:p.id,name:cn(p.name),col:COLS[p.id%COLS.length]}));try{localStorage.setItem('neonswarm.name',myName)}catch(e){}joinView()});
S.on('neon:join-rejected',result=>{if(!mp||mp.host||!result||mp.requestId!==result.requestId)return;mp.requestId=null;if(mp.joinButton)mp.joinButton.disabled=false;if(mp.note)mp.note.textContent=result.message||'The host declined your request.'});
S.on('neon:closed',()=>{if(!mp||mp.host)return;if(mp.id!=null){leave('Connection to the host was lost.');return}if(mp.note)mp.note.textContent='The host closed the room.';if(mp.joinButton)mp.joinButton.disabled=false});
S.on('disconnect',()=>{if(!mp)return;if(mp.id!=null||mp.host){mp=null;U.style.display='none';toMenu('Connection to the game server was lost. Please rejoin.');return}
if(mp.note)mp.note.textContent='Connection to the game server was lost. Try again.';if(mp.joinButton)mp.joinButton.disabled=false});
S.on('connect_error',()=>{if(mp&&mp.note)mp.note.textContent='Cannot connect to the game server.'});
function spot(){let best={x:800,y:450},bd=-1;for(let i=0;i<14;i++){const x=60+R()*(AW-120),y=60+R()*(AH-120);let d=1e9;for(const q of mp.pl)if(q.al)d=Math.min(d,Math.hypot(q.x-x,q.y-y));if(d>bd){bd=d;best={x:x,y:y}}}return best}
function respawn(p,quiet){const s=spot();Object.assign(p,{x:s.x,y:s.y,tx:s.x,ty:s.y,vx:0,vy:0,hull:3,al:true,inv:1.5,dash:0,shield:0,frozen:0});if(!quiet)ev(['r',rd(s.x),rd(s.y)])}
function hostStart(){const m=mp;if(m.pl.length<2)return;for(const requestId of Object.keys(m.pend))S.emit('neon:respond',{requestId:requestId,accept:false});m.pend={};m.req.replaceChildren();
const plan=NR.createMatchPlan();m.botTimes=plan.botTimes;m.botPowerUps=plan.botPowerUps;m.botIndex=0;m.nextBotId=0;m.matchElapsed=0;m.bots=[];m.hole=null;m.dn=0;m.un=0;m.cdL=0;
for(const p of m.pl){p.kills=p.deaths=0;p.al=false;p.powerup=null;p.shield=0;p.frozen=0;p.dn=0;p.un=0;p.inp.dreq=p.inp.ureq=false}
for(const p of m.pl)respawn(p,1);m.bl=[];m.ev=[];m.msgs=[];MP_WAVES=[];m.ph=1;m.tl=3;send({k:'start'});enter()}
function enter(){st='mp';M.style.display='none';U.style.display='none';C.style.cursor='none';PT=[];TX=[];MP_WAVES=[];shake=0;mp.cdL=0}
function ev(e){mp.ev.push(e);applyEv(e)}
function feed(s,c){mp.msgs.push({s:s,t:0,c:c})}
function killPlayer(p,killer,cause){if(!p.al)return;p.al=false;p.rt=2;p.deaths++;p.shield=0;p.frozen=0;
if(killer)killer.kills++;
ev(['k',killer?killer.name:cause,p.name,rd(p.x),rd(p.y),p.col,p.id])}
function killBot(b,killer){if(b.dead)return;b.dead=true;ev(['bot-killed',b.id,killer.id,rd(b.x),rd(b.y),b.powerup]);
killer.kills++;killer.powerup=b.powerup;ev(['powerup',killer.id,killer.name,b.powerup])}
function damageBot(b,killer){if(b.dead)return;b.hp--;ev(['bot-hit',b.id,rd(b.x),rd(b.y),b.hp]);
if(b.hp<=0){if(killer)killBot(b,killer);else b.dead=true}}
function spawnBot(){const m=mp,index=m.botIndex++;if(m.bots.filter(b=>!b.dead).length>=NR.MAX_ACTIVE_BOTS)return;
const side=R()*4|0,pad=30;let x,y;
if(side===0){x=R()*AW;y=pad}else if(side===1){x=AW-pad;y=R()*AH}else if(side===2){x=R()*AW;y=AH-pad}else{x=pad;y=R()*AH}
const b={id:m.nextBotId++,x:x,y:y,hp:4,ttl:25,powerup:m.botPowerUps[index],dead:false};
m.bots.push(b);ev(['bot-spawned',b.id,rd(b.x),rd(b.y),b.powerup])}
function usePowerUp(p,key){const m=mp;
if(key==='nuke'){
ev(['nuke',p.id,rd(p.x),rd(p.y)]);
for(const q of m.pl){const d=Math.hypot(q.x-p.x,q.y-p.y);if(NR.canBeNuked(q,p.id,d))killPlayer(q,p,'NUCLEAR BOMB')}
for(const b of m.bots){if(!b.dead&&Math.hypot(b.x-p.x,b.y-p.y)<=300)killBot(b,p)}
}else if(key==='black-hole'){
m.hole={ownerId:p.id,x:800,y:450,t:5};ev(['black-hole',p.id])
}else if(key==='shield'){
p.shield=8;ev(['shield',p.id])
}else if(key==='light'){
ev(['freeze',p.id,rd(p.x),rd(p.y)]);
for(const q of m.pl)if(NR.canBeFrozen(q,p.id))q.frozen=5
}}
function moveBots(dt){const m=mp;
for(const b of m.bots){if(b.dead)continue;b.ttl-=dt;if(b.ttl<=0){b.dead=true;ev(['bot-left',b.id,rd(b.x),rd(b.y)]);continue}
let target=null,nearest=Infinity;
for(const p of m.pl){if(!p.al)continue;const d=Math.hypot(p.x-b.x,p.y-b.y);if(d<nearest){nearest=d;target=p}}
if(!target)continue;
const dx=target.x-b.x,dy=target.y-b.y,d=nearest||1,ux=dx/d,uy=dy/d,px=-uy,py=ux;
const radial=d>220?Math.min(110,(d-220)*.8):0,tangent=d>220?35:100;
let vx=ux*radial+px*tangent,vy=uy*radial+py*tangent,speed=Math.hypot(vx,vy)||1;
b.x=cl(b.x+vx/speed*Math.min(110,speed)*dt,20,AW-20);b.y=cl(b.y+vy/speed*Math.min(110,speed)*dt,20,AH-20)}
m.bots=m.bots.filter(b=>!b.dead)}
function moveBlackHole(p,dt){const hole=mp.hole;if(!hole||p.shield>0)return;
const dx=hole.x-p.x,dy=hole.y-p.y,d=Math.hypot(dx,dy)||1,speed=NR.blackHolePullSpeed(d);
p.x=cl(p.x+dx/d*speed*dt,12,AW-12);p.y=cl(p.y+dy/d*speed*dt,12,AH-12);
if(NR.canBeKilledByBlackHole(p,hole.ownerId,Math.hypot(hole.x-p.x,hole.y-p.y))){
const owner=mp.pl.find(q=>q.id===hole.ownerId);killPlayer(p,owner,'BLACK HOLE')}}
function moveBullets(dt){const m=mp;
for(const b of m.bl){b.x+=b.vx*dt;b.y+=b.vy*dt;b.l-=dt;
if(b.l<=0||b.x<0||b.x>AW||b.y<0||b.y>AH){b.l=0;continue}
if(b.bot){for(const p of m.pl){if(!NR.canTakeBulletDamage(p))continue;
if(Math.hypot(p.x-b.x,p.y-b.y)<15){b.l=0;p.hull--;if(p.hull>0)ev(['h',rd(b.x),rd(b.y),p.col,p.id]);else killPlayer(p,null,'BOT');break}}}
else{let hit=false;for(const bot of m.bots){if(!bot.dead&&Math.hypot(bot.x-b.x,bot.y-b.y)<28){b.l=0;damageBot(bot,m.pl.find(p=>p.id===b.o));hit=true;break}}
if(!hit){for(const p of m.pl){if(p.id===b.o||!NR.canTakeBulletDamage(p))continue;
if(Math.hypot(p.x-b.x,p.y-b.y)<15){b.l=0;p.hull--;const killer=m.pl.find(q=>q.id===b.o);
if(p.hull>0)ev(['h',rd(b.x),rd(b.y),p.col,p.id]);else killPlayer(p,killer,'PILOT');break}}}}}
m.bl=m.bl.filter(b=>b.l>0)}
function applyEv(e){const m=mp;if(!Array.isArray(e))return;const t=e[0],col=c=>COLS.includes(c)?c:'#fff';
if(t==='h'){burst(+e[1]||0,+e[2]||0,col(e[3]),8,180);beep(260,.07,'square',.05);if(e[4]===m.id)shake=Math.max(shake,12)}
else if(t==='k'){burst(+e[3]||0,+e[4]||0,col(e[5]),30,320);m.msgs.push({s:String(e[1]).slice(0,12)+' > '+String(e[2]).slice(0,12),t:0});beep(300,.15,'triangle',.08,70);shake=Math.max(shake,e[6]===m.id?20:8)}
else if(t==='shot')beep(880,.05,'square',.025,440)
else if(t==='bot-spawned'){feed('POWER-UP BOT INCOMING!','#ff5a5a');burst(+e[2]||0,+e[3]||0,'#ff5a5a',12,140);beep(540,.11,'square',.07,720)}
else if(t==='bot-hit'){burst(+e[2]||0,+e[3]||0,'#ff5a5a',4,90);beep(260,.04,'square',.04)}
else if(t==='bot-killed'){burst(+e[3]||0,+e[4]||0,'#ff5a5a',24,260);beep(280,.13,'triangle',.08,80)}
else if(t==='bot-left'){burst(+e[2]||0,+e[3]||0,'#ff5a5a',8,100)}
else if(t==='powerup'){const power=POWER_BY_ID[e[3]];if(power)feed(String(e[2]).slice(0,12)+' GOT '+power.name,power.color);beep(680,.13,'square',.06,1100)}
else if(t==='nuke'){MP_WAVES.push({x:+e[2]||0,y:+e[3]||0,t:0,d:0.7,r:300,c:'#ff7a1a'});shake=Math.max(shake,30);beep(70,.7,'sawtooth',.16,30);beep(140,.45,'square',.07,35,.03);beep(850,.5,'sine',.05,55,.08)}
else if(t==='black-hole'){beep(220,.45,'sawtooth',.06,50);beep(165,.6,'sine',.07,35,.08);beep(110,.85,'triangle',.06,25,.18)}
else if(t==='shield'){beep(360,.3,'triangle',.07,720);beep(540,.3,'sine',.06,1080,.12);beep(720,.45,'triangle',.05,1200,.24)}
else if(t==='freeze'){MP_WAVES.push({x:+e[2]||0,y:+e[3]||0,t:0,d:0.7,r:1000,c:'#e8f6ff'});beep(1350,.12,'square',.07,650);beep(950,.12,'square',.06,400,.14);beep(1200,.2,'sine',.06,500,.28)}
else if(t==='d')beep(300,.12,'sine',.05,900);
else if(t==='r'){burst(+e[1]||0,+e[2]||0,'#fff',16,150);beep(440,.15,'sine',.06,880)}
else if(t==='e')beep(220,.7,'sawtooth',.08,40)}
function hostStep(dt){const m=mp;
let justStarted=false;
if(m.ph===1){m.tl-=dt;if(m.tl<=0){m.ph=2;m.tl=120;m.matchElapsed=0;justStarted=true}}
else if(m.ph===2){m.matchElapsed+=dt;while(m.botIndex<m.botTimes.length&&m.matchElapsed>=m.botTimes[m.botIndex])spawnBot();
m.tl-=dt;if(m.tl<=0){m.tl=0;m.ph=3;m.hole=null;m.bots=[];m.bl=[];ev(['e'])}}
const play=m.ph===2;
if(play&&justStarted)while(m.botIndex<m.botTimes.length&&m.matchElapsed>=m.botTimes[m.botIndex])spawnBot();
if(m.hole){m.hole.t-=dt;if(m.hole.t<=0)m.hole=null}
for(const p of m.pl){const i=p.inp;
 if(!p.al){if(play){p.rt-=dt;if(p.rt<=0)respawn(p)}i.dreq=false;i.ureq=false;continue}
 p.inv=Math.max(0,p.inv-dt);p.cd=Math.max(0,p.cd-dt);p.shield=Math.max(0,p.shield-dt);p.frozen=Math.max(0,p.frozen-dt);p.fire-=dt}
for(const p of m.pl){const i=p.inp,requested=i.ureq;i.ureq=false;
if(requested&&NR.canUsePowerUp(p,m.ph)){const key=p.powerup;p.powerup=null;usePowerUp(p,key)}}
for(const p of m.pl){const i=p.inp;if(!p.al){i.dreq=false;continue}
const frozen=play&&p.frozen>0;let ix=play&&!frozen?i.ix:0,iy=play&&!frozen?i.iy:0;
const l=Math.hypot(ix,iy);if(l){ix/=l;iy/=l}
if(i.dreq){i.dreq=false;if(play&&!frozen&&p.cd<=0){p.dx=l?ix:Math.cos(i.a);p.dy=l?iy:Math.sin(i.a);p.dash=.18;p.cd=1.1;ev(['d',rd(p.x),rd(p.y)])}}
if(frozen){p.vx=0;p.vy=0;p.dash=0}
else if(p.dash>0){p.dash=Math.max(0,p.dash-dt);p.vx=p.dx*900;p.vy=p.dy*900}
else{const f=Math.min(1,10*dt);p.vx+=(ix*270-p.vx)*f;p.vy+=(iy*270-p.vy)*f}
p.a=i.a;p.x=cl(p.x+p.vx*dt,12,AW-12);p.y=cl(p.y+p.vy*dt,12,AH-12);
if(play)moveBlackHole(p,dt);
if(play&&!frozen&&i.f&&p.fire<=0){p.fire=.16;m.bl.push({x:p.x+Math.cos(p.a)*16,y:p.y+Math.sin(p.a)*16,vx:Math.cos(p.a)*640,vy:Math.sin(p.a)*640,l:1,o:p.id,bot:false});ev(['shot',p.id])}}
if(play){moveBots(dt);moveBullets(dt)}
for(const q of MP_WAVES)q.t+=dt;MP_WAVES=MP_WAVES.filter(q=>q.t<q.d);
for(const p of PT){p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt}PT=PT.filter(p=>p.l>0);
for(const q of m.msgs)q.t+=dt;m.msgs=m.msgs.filter(q=>q.t<3);shake*=Math.exp(-9*dt)}
function snapshotSend(){const m=mp,events=m.ev;
send({k:'s',ph:m.ph,tl:+m.tl.toFixed(2),
p:m.pl.map(p=>[p.id,rd(p.x),rd(p.y),+p.a.toFixed(2),p.hull,p.kills,p.deaths,
(p.al?1:0)|(p.inv>0?2:0)|(p.dash>0?4:0)|(p.shield>0?8:0)|(p.frozen>0?16:0),p.powerup]),
b:m.bl.map(b=>[rd(b.x),rd(b.y),rd(b.vx),rd(b.vy),b.o,b.bot?1:0]),
z:m.bots.map(b=>[b.id,rd(b.x),rd(b.y),b.hp]),h:m.hole?[m.hole.ownerId,+m.hole.t.toFixed(2)]:null,ev:events},events.length===0);m.ev=[]}
/* client side */
function joinNew(){mp={host:false,id:null,pl:[],bl:[],bots:[],hole:null,ph:0,tl:0,msgs:[],lob:[],cdL:0,dn:0,un:0,acc:0,code:null,requestId:null,note:null,joinButton:null};joinScreen()}
function joinScreen(){st='room';M.style.display='none';const inp=mk('input',{maxLength:7,placeholder:'6-digit room code',inputMode:'numeric'}),note=mk('div'),go=mk('button',{textContent:'Join'});
note.className='status-note';mp.note=note;mp.joinButton=go;
go.onclick=()=>{const c=inp.value.replace(/\D/g,'');if(c.length!==6){note.textContent='Enter the 6-digit room code.';return}go.disabled=true;note.textContent='Contacting the host…';
S.timeout(5000).emit('neon:join',{code:c,name:myName},(error,result)=>{if(!mp||mp.host)return;if(error||!result||!result.ok){go.disabled=false;note.textContent=result&&result.error||'Could not reach the game server.';return}
mp.code=c;mp.requestId=result.requestId;note.textContent='Request sent. Waiting for the host to accept…'})};
show(mk('h2',{textContent:'JOIN A ROOM'}),inp,go,note,mk('button',{textContent:'Back',onclick:()=>leave()}))}
function joinView(){st='room';M.style.display='none';show(mk('h2',{textContent:'ROOM'}),plist(mp.lob),mk('div',{textContent:'Connected. Waiting for the host to start…'}),mk('button',{textContent:'Rename pilot',onclick:renameMe}),mk('button',{textContent:'Leave',onclick:()=>leave()}))}
function cliMsg(d){if(!d||typeof d!=='object'||!mp||mp.host)return;
if(d.k==='lobby'&&Array.isArray(d.p)){mp.lob=d.p.filter(Array.isArray).map(a=>({id:a[0],name:cn(a[1]),col:COLS.includes(a[2])?a[2]:COLS[0]}));for(const p of mp.pl){const q=mp.lob.find(q=>q.id===p.id);if(q)p.name=q.name}const me=mp.lob.find(p=>p.id===mp.id);if(me){myName=me.name;try{localStorage.setItem('neonswarm.name',myName)}catch(e){}}if(st==='room'){mp.bl=[];mp.ph=0;joinView()}}
else if(d.k==='start'){mp.pl=[];mp.bl=[];mp.bots=[];mp.hole=null;mp.msgs=[];mp.dn=0;mp.un=0;MP_WAVES=[];enter()}
else if(d.k==='s'&&Array.isArray(d.p)&&d.ph>0){const m=mp,ids=new Set();
 for(const a of d.p){const inf=m.lob.find(q=>q.id===a[0]);let p=m.pl.find(q=>q.id===a[0]);if(!p){p={id:a[0],name:inf?inf.name:'?',col:inf?inf.col:COLS[0],x:a[1],y:a[2],tx:a[1],ty:a[2],al:false};m.pl.push(p)}
  if((a[7]&1)&&!p.al){p.x=a[1];p.y=a[2]}p.tx=a[1];p.ty=a[2];p.a=+a[3]||0;p.hull=a[4];p.kills=a[5];p.deaths=a[6];p.al=!!(a[7]&1);p.inv=a[7]&2?1:0;p.dash=a[7]&4?1:0;p.shield=a[7]&8?1:0;p.frozen=a[7]&16?1:0;p.powerup=POWER_BY_ID[a[8]]?a[8]:null;ids.add(a[0])}
 m.pl=m.pl.filter(p=>ids.has(p.id));m.ph=d.ph;m.tl=+d.tl||0;
 m.bl=(d.b||[]).map(a=>({x:a[0],y:a[1],vx:a[2],vy:a[3],o:a[4],bot:!!a[5]}));
 m.bots=(d.z||[]).map(a=>({id:a[0],x:a[1],y:a[2],hp:a[3]}));
 m.hole=Array.isArray(d.h)&&d.h.length===2?{ownerId:d.h[0],x:800,y:450,t:+d.h[1]||0}:null;
 if(st!=='mp')enter();for(const x of d.ev||[])applyEv(x)}}
/* shared per-frame */
function mpStep(dt){T+=dt;const m=mp,me=m.pl.find(p=>p.id===m.id);
if(dashReq){dashReq=false;if(m.cdL<=0&&m.ph===2){m.cdL=1.1;m.dn++;if(m.host&&me)me.inp.dreq=true}}
if(useReq){useReq=false;if(m.un<Number.MAX_SAFE_INTEGER){m.un++;if(m.host&&me)me.inp.ureq=true}}
m.cdL=Math.max(0,m.cdL-dt);
const ix=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),iy=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0),s=Math.min(W/AW,H/AH),ox=(W-AW*s)/2,oy=(H-AH*s)/2;m.vs=[s,ox,oy];
const a=me?Math.atan2((my-oy)/s-me.y,(mx-ox)/s-me.x):0,f=down||!!keys.KeyH;m.la=a;
if(m.host){if(me)Object.assign(me.inp,{ix:ix,iy:iy,a:a,f:f});hostStep(dt);m.sacc+=dt;if(m.sacc>=MP_TICK){m.sacc%=MP_TICK;snapshotSend()}}
else{const k=Math.min(1,15*dt);for(const p of m.pl){p.x+=(p.tx-p.x)*k;p.y+=(p.ty-p.y)*k}for(const b of m.bl){b.x+=b.vx*dt;b.y+=b.vy*dt}
 m.acc+=dt;if(m.acc>=MP_TICK){m.acc%=MP_TICK;if(S.connected)send({k:'in',ix:ix,iy:iy,a:+a.toFixed(3),f:f,dn:m.dn,un:m.un},true)}}
for(const p of m.pl)if(p.dash>0&&p.al)PT.push({x:p.x,y:p.y,vx:0,vy:0,l:.3,ml:.3,c:p.col,s:8});
for(const p of PT){p.x+=p.vx*dt;p.y+=p.vy*dt;p.l-=dt}PT=PT.filter(p=>p.l>0);
for(const q of m.msgs)q.t+=dt;m.msgs=m.msgs.filter(q=>q.t<3);shake*=Math.exp(-9*dt)}
addEventListener('keydown',e=>{if(typing(e.target)||!mp)return;if(e.code==='KeyN'&&st==='mp')renameMe();else if(e.code==='Escape'&&st==='mp')leave();else if(e.code==='Enter'&&st==='mp'&&mp.host&&mp.ph===3){mp.ph=0;mp.bl=[];lobby();hostRoom()}});
