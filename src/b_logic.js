/* ============================================================
   FeederBox — lógica del ciclo (unidades: cm, g, s)
   ============================================================ */
const $=(s,r)=>(r||document).querySelector(s);
const $$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(6.2831853*v)};
const approach=(v,t,d)=>v<t?Math.min(t,v+d):Math.max(t,v-d);
const TAU=Math.PI*2, HP=Math.PI/2;

/* geometría (cm) */
const R_OUT=5.715, R_IN=5.56;
const G=18, CH_H=18, FUN_H=4, CH_R=7.8;
const TUBE_Y0=44, TUBE_Y1=80, ROTOR_Y=63;
const BOX_Y0=50, BOX_Y1=75;
const SX=-6.6, SZ=3.6, SY=55.5;           // salida del mini tornillo
const NZX=3.5, NZZ=6.0, NZY=46.8;          // boquilla del líquido
const GRAV=160;                            // gravedad "visual" (más lenta que la real)
const RHO=0.65;                            // g/cm³ alimento
const CH_AREA=Math.PI*CH_R*CH_R;
const W_ROT=12*TAU/60;                     // 12 RPM
const HOP_CYL_AREA=Math.PI*14*14, CONE_G=1260, HOP_CAP=9260;

const S={
  phase:'idle', pt:0, t:0,
  clock:5*3600+55*60, clockRate:60, speed:2, paused:false,
  gpv:250, stock:7200, sup:500, liq:1000,
  plan:null, cyc:null, res:null, last:null,
  chP:0, chS:0, chL:0, flyP:0, flyS:0, flyL:0, flyD:0, trM:0,
  th:0, thMax:0, th0:0, w:0, kq:1, qIdx:0, accP:0, rotorStop:false, shake:0,
  augA:0, wa:0, accS:0, suppStarted:false, suppBase:0, suppStop:false,
  pumpA:0, wp:0, accL:0, liqStarted:false, liqEm:0, liqStop:false, coast:0, coastT:0,
  gate:0, gateT:0, gMode:0, gt:0, accD:0, eatWait:0,
  curA:0, wDisp:0, jamArmed:false, jamS:null, alertMsg:'',
  cube:{on:false,mode:'',t:0,x:0,y:0,z:0,vy:0,rx:0,ry:0,rz:0}
};
const parts=[];
const UI={toast(){},hist(){},sched(){}};
const HIST=[
  {day:'Ayer',time:'18:00',p:{f:800,s:20,l:30},r:{f:803,s:20.4,l:30.2},jams:0},
  {day:'Ayer',time:'12:00',p:{f:600,s:0,l:20},r:{f:598,s:0,l:20.3},jams:0},
  {day:'Ayer',time:'06:00',p:{f:800,s:20,l:30},r:{f:794,s:19.8,l:30.1},jams:0}
];
let SCHED=[
  {id:1,t:'06:00',f:800,s:20,l:30,on:true},
  {id:2,t:'12:00',f:600,s:0,l:20,on:true},
  {id:3,t:'18:00',f:800,s:20,l:30,on:true}
];
const toSec=t=>{const m=/^(\d{1,2}):(\d{2})/.exec(t||'');return m?(+m[1])*3600+(+m[2])*60:0};
const pad=n=>String(n).padStart(2,'0');
const fmtT=sec=>{sec=Math.floor(sec%86400);return pad(Math.floor(sec/3600))+':'+pad(Math.floor(sec%3600/60))};
const fmtTS=sec=>{sec=Math.floor(sec%86400);return pad(Math.floor(sec/3600))+':'+pad(Math.floor(sec%3600/60))+':'+pad(sec%60)};
function resetFired(sc){const tod=S.clock%86400,day=Math.floor(S.clock/86400);sc.sec=toSec(sc.t);sc.fired=(tod>=sc.sec)?day:-1}
try{
  const raw=localStorage.getItem('feederbox-sched-v2');
  if(raw){const a=JSON.parse(raw);if(Array.isArray(a)&&a.length&&a.length<=6){SCHED=a.map((x,i)=>({id:i+1,t:/^\d\d:\d\d$/.test(x.t)?x.t:'06:00',f:clamp(+x.f||0,0,2000),s:clamp(+x.s||0,0,100),l:clamp(+x.l||0,0,100),on:!!x.on}))}}
}catch(e){}
SCHED.forEach(resetFired);
function saveSched(){try{localStorage.setItem('feederbox-sched-v2',JSON.stringify(SCHED.map(({t,f,s,l,on})=>({t,f,s,l,on}))))}catch(e){}}

const chT=()=>S.chP+S.chS+S.chL;
const chH=()=>chT()/(RHO*CH_AREA);
function troughShape(){const V=S.trM/RHO,f=V/1201;const sq=Math.sqrt(Math.min(1,f));return{rx:Math.max(0.01,17*sq),rz:Math.max(0.01,7.5*sq),h:f<=0?0:(f>1?3*f:3)}}
const hopLevel=()=>Math.max(0,(S.stock-CONE_G)/(HOP_CYL_AREA*RHO));

/* ---------- partículas ---------- */
function spawnPart(k,x,y,z,m,dest,vx,vy,vz,delay){
  parts.push({k,x,y,z,vx:vx||0,vy:vy||0,vz:vz||0,m,dest,delay:delay||0,rot:rnd(0,6),vr:rnd(-6,6),c:(Math.random()*4)|0});
  if(k==='p'&&dest==='ch'){S.flyP+=m;S.stock-=m}
  else if(k==='s'){S.flyS+=m;S.sup-=m}
  else if(k==='l'){S.flyL+=m;S.liq-=m}
  else if(k==='d'){S.flyD+=m}
}
function land(p){
  if(p.k==='p'&&p.dest==='ch'){S.flyP-=p.m;S.chP+=p.m}
  else if(p.k==='s'){S.flyS-=p.m;S.chS+=p.m}
  else if(p.k==='l'){S.flyL-=p.m;S.chL+=p.m}
  else if(p.k==='d'){S.flyD-=p.m;S.trM+=p.m}
}
function stepParts(dt){
  const chTop=G+0.4+chH();
  const ts=troughShape(),trTop=0.5+ts.h*0.8;
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];
    if(p.delay>0){p.delay-=dt;continue}
    p.vy-=GRAV*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.rot+=p.vr*dt;
    if(p.dest==='ch'){
      const lim=p.y>TUBE_Y0?(p.k==='p'?R_IN-0.45:9):CH_R-0.4;
      const r=Math.hypot(p.x,p.z);
      if(r>lim&&p.k==='p'){p.x*=lim/r;p.z*=lim/r;p.vx*=-0.3;p.vz*=-0.3}
      if(p.y<=chTop){land(p);parts.splice(i,1)}
    }else if(p.y<=trTop){land(p);parts.splice(i,1)}
  }
}

/* ---------- ciclo ---------- */
function setPhase(p){S.phase=p;S.pt=0}
function needs(ph){const pl=S.plan;if(!pl)return false;return ph==='rotor'?pl.f>0:ph==='supp'?pl.s>0:ph==='liq'?pl.l>0:true}
const ORDER=['tare','rotor','supp','liq','settle','gate'];
function goNext(cur){
  let i=ORDER.indexOf(cur)+1;
  while(i<ORDER.length&&!needs(ORDER[i]))i++;
  const nx=ORDER[i]||'gate';
  setPhase(nx);
  if(nx==='rotor'){S.rotorStop=false;S.th0=S.th;S.thMax=Math.max(S.thMax,S.th);S.accP=0}
  if(nx==='supp'){S.suppStarted=false;S.suppStop=false;S.accS=0}
  if(nx==='liq'){S.liqStarted=false;S.liqStop=false;S.accL=0;S.liqEm=0}
  if(nx==='gate'){S.gMode=0}
}
function startCycle(f,s,l,src){
  if(S.phase!=='idle')return false;
  f=clamp(Math.round(f),0,2000);s=clamp(+s||0,0,100);l=clamp(+l||0,0,100);
  if(f+s+l<=0){UI.toast('Configura al menos un gramo para dosificar');return false}
  if(S.stock<f+40){UI.toast('Tolva casi vacía: rellénala para esta ración');return false}
  if(S.sup<s+5){UI.toast('Falta suplemento en la mini tolva');return false}
  if(S.liq<l+5){UI.toast('Falta líquido en la botella');return false}
  S.plan={f,s,l,src:src||'manual'};
  S.cyc={t0:S.clock,jams:0,ts:S.t};
  S.res=null;S.abortFlag=false;
  setPhase('tare');
  return true;
}
function abortCycle(){
  if(!S.plan||S.phase==='idle'||S.phase==='gate'||S.phase==='done')return;
  S.rotorStop=true;S.suppStop=true;S.liqStop=true;S.jamS=null;S.cube.on=false;S.alertMsg='';
  S.w=0;S.wa=0;S.wp=0;S.coast=0;
  if(S.cube.on){if(S.cube.mode==='release'){S.flyP-=20;S.chP+=20}S.cube.on=false}
  S.abortFlag=true;
  setPhase('settle');S.pt=1.2;
}
function finishCycle(){
  const r=S.res||{f:S.chP,s:S.chS,l:S.chL};
  HIST.unshift({day:'Hoy',time:fmtT(S.cyc.t0),p:{f:S.plan.f,s:S.plan.s,l:S.plan.l},r:{f:r.f,s:r.s,l:r.l},jams:S.cyc.jams,aborted:!!r.aborted,sim:true});
  if(HIST.length>40)HIST.pop();
  S.last={p:S.plan,r:r};
  S.eatWait=3.5;
  setPhase('done');
  UI.hist();
  UI.toast(r.aborted?'Ciclo detenido. Se sirvió '+Math.round(r.f+r.s+r.l)+' g':'Ración servida: '+Math.round(r.f)+' g'+(S.plan.s?' + '+r.s.toFixed(1)+' g supl.':'')+(S.plan.l?' + '+r.l.toFixed(1)+' g líq.':''));
}

/* rotor + atasco */
function emitRotor(dth){
  const prev=S.th;S.th+=dth;
  const gain=Math.max(0,S.th-Math.max(prev,S.thMax));
  S.thMax=Math.max(S.thMax,S.th);
  if(gain<=0)return;
  const q=Math.floor(S.th/HP);
  if(q!==S.qIdx){S.qIdx=q;S.kq=1+0.06*gauss()}
  S.accP+=(S.gpv/TAU)*(1+0.8*Math.cos(4*S.th+0.6))*S.kq*gain;
  while(S.accP>=5){
    S.accP-=5;
    spawnPart('p',rnd(-3.4,3.4),ROTOR_Y-4.2,rnd(-1.9,1.9),5,'ch',rnd(-4,4),-rnd(0,10),rnd(-3,3),rnd(0,0.15));
  }
}
function spawnCube(){
  const c=S.cube;c.on=true;c.mode='fall';c.t=0;c.x=0.2;c.y=ROTOR_Y+11;c.z=1.9;c.rx=rnd(0,1);c.ry=rnd(0,1);c.rz=rnd(-.4,.4);
}
function doRotor(dt){
  const alpha=8,c=S.cube;
  if(c.on&&c.mode==='fall'){
    c.t+=dt;const u=clamp(c.t/0.6,0,1);c.y=ROTOR_Y+11-(6.4*u*u);
    S.th+=0; // el rotor sigue girando mientras el cubo cae
    if(u>=1){
      c.mode='stuck';
      let thS=Math.floor(S.th/HP)*HP+0.3;while(thS<S.th+0.3)thS+=HP;
      S.jamS={mode:'stall',t:0,thS:thS,hi:0};
    }
  }
  if(S.jamS){rotorJam(dt);return}
  if(S.jamArmed&&!c.on&&S.th-S.th0>1.2&&!S.rotorStop)spawnCube();
  if(!S.rotorStop){
    const coastM=(S.w*S.w/(2*alpha))*S.gpv/TAU;
    if(S.chP+S.flyP+coastM>=S.plan.f&&!c.on)S.rotorStop=true;
    if(S.stock<=1){S.rotorStop=true;S.alertMsg='Tolva vacía';UI.toast('La tolva se quedó sin alimento')}
  }
  S.wT=S.rotorStop?0:W_ROT;
  S.w=approach(S.w,S.wT,alpha*dt);
  emitRotor(S.w*dt);
  S.curA=approach(S.curA,2.3+0.25*Math.sin(S.t*9),12*dt);
  if(S.rotorStop&&S.w<0.02&&!c.on){S.w=0;goNext('rotor')}
}
function rotorJam(dt){
  const j=S.jamS,c=S.cube;j.t+=dt;
  if(j.mode==='stall'){
    S.w=approach(S.w,W_ROT,8*dt);
    const nth=S.th+S.w*dt;
    if(nth>=j.thS){S.th=j.thS;S.w=0;S.shake=0.025;S.curA=approach(S.curA,5.9,9*dt)}
    else{emitRotor(S.w*dt);S.curA=approach(S.curA,3.0,6*dt)}
    if(S.curA>4.8)j.hi+=dt;
    if(j.hi>0.5){j.mode='detect';j.t=0;S.shake=0;S.cyc.jams++;S.alertMsg='Atasco detectado';j.thD=S.th}
  }else if(j.mode==='detect'){
    S.w=0;S.curA=approach(S.curA,0,14*dt);
    if(j.t>0.9){j.mode='rev';j.t=0;j.rel=false}
  }else if(j.mode==='rev'){
    S.w=-W_ROT*1.1;S.th+=S.w*dt;S.curA=approach(S.curA,3.2,10*dt);
    if(!j.rel&&S.th<j.thD-0.9){j.rel=true;c.mode='release';c.vy=0;S.flyP+=20;S.stock-=20}
    if(S.th<=j.thD-2.5){S.w=0;j.mode='pause';j.t=0}
  }else if(j.mode==='pause'){
    S.curA=approach(S.curA,0,8*dt);
    if(j.t>0.8){S.jamS=null;S.jamArmed=false;S.alertMsg='';UI.toast('Atasco resuelto: el rotor invirtió el giro y retomó la ración')}
  }
}
function stepCube(dt){
  const c=S.cube;
  if(c.on&&c.mode==='release'){
    c.vy-=GRAV*dt;c.y+=c.vy*dt;c.rx+=dt*3;c.rz+=dt*2;
    if(c.y<=G+0.4+chH()+1.2){c.on=false;S.flyP-=20;S.chP+=20}
  }
}
function doSupp(dt){
  if(!S.suppStarted){
    if(S.flyP>0.01||S.flyL>0.01)return;
    S.suppStarted=true;S.suppBase=chT();
  }
  S.wa=approach(S.wa,S.suppStop?0:7,20*dt);
  if(!S.suppStop){
    S.accS+=5*(1+0.05*Math.sin(S.t*2.3))*dt;
    while(S.accS>=0.5){S.accS-=0.5;spawnPart('s',SX+rnd(-.3,.3),SY,SZ+rnd(-.3,.3),0.5,'ch',0,-rnd(0,6),0,rnd(0,0.08))}
    const gain=chT()-S.suppBase+0.15*gauss();
    if(gain+3.0>=S.plan.s)S.suppStop=true;
    S.curA=approach(S.curA,0.45,6*dt);
  }else{
    S.curA=approach(S.curA,0,6*dt);
    if(S.wa<0.05&&S.flyS<0.01){S.wa=0;goNext('supp')}
  }
}
function doLiq(dt){
  if(!S.liqStarted){
    if(S.flyP>0.01||S.flyS>0.01)return;
    S.liqStarted=true;S.liqEm=0;
  }
  S.wp=approach(S.wp,S.liqStop?0:6,16*dt);
  if(!S.liqStop){
    S.accL+=6*(1+0.04*Math.sin(S.t*1.7))*dt;
    while(S.accL>=0.5){S.accL-=0.5;S.liqEm+=0.5;spawnPart('l',NZX+rnd(-.05,.05),NZY,NZZ+rnd(-.05,.05),0.5,'ch',0,0,0,0)}
    if(S.liqEm+1.0>=S.plan.l){S.liqStop=true;S.coast=Math.max(0,Math.round((1.0+0.4*gauss())/0.5));S.coastT=0}
    S.curA=approach(S.curA,0.6,6*dt);
  }else{
    S.curA=approach(S.curA,0,6*dt);
    S.coastT+=dt;
    if(S.coast>0&&S.coastT>0.25){S.coastT=0;S.coast--;S.liqEm+=0.5;spawnPart('l',NZX,NZY,NZZ,0.5,'ch',0,0,0,0)}
    if(S.coast<=0&&S.wp<0.05&&S.flyL<0.01){S.wp=0;goNext('liq')}
  }
}
function doGate(dt){
  S.gate=approach(S.gate,S.gateT,2.6*dt);
  if(S.gMode===0){
    S.gateT=1.75;
    if(S.gate>1.5){S.gMode=1}
  }else if(S.gMode===1){
    const tot=chT();
    if(tot>0.5){
      const dm=Math.min(tot,400*dt),fr=dm/tot;
      S.chP-=S.chP*fr;S.chS-=S.chS*fr;S.chL-=S.chL*fr;S.accD+=dm;
      while(S.accD>=5){S.accD-=5;spawnPart('d',rnd(-5,5),G-0.6,rnd(-4,4),5,'tr',rnd(-9,9),-rnd(4,20),rnd(-2,2),0)}
    }else{
      S.accD+=tot;S.chP=S.chS=S.chL=0;
      if(S.accD>0.01){spawnPart('d',rnd(-3,3),G-0.6,rnd(-3,3),S.accD,'tr',0,-8,0,0);S.accD=0}
      if(S.flyD<0.01){S.gMode=2;S.gt=0}
    }
  }else if(S.gMode===2){
    S.gt+=dt;
    if(S.gt>1.0)S.gateT=0;
    if(S.gt>1.0&&S.gate<0.03){S.gate=0;finishCycle()}
  }
}

/* paso de simulación (dt = segundos de simulación) */
function step(dt,dtReal){
  S.t+=dt;S.pt+=dt;
  S.clock+=(S.phase==='idle'&&!S.cyc_busy)?dtReal*S.clockRate:dt;
  S.augA+=S.wa*dt;S.pumpA+=S.wp*dt;
  if(S.shake>0&&!S.jamS)S.shake=0;
  switch(S.phase){
    case 'idle':{
      const tod=S.clock%86400,day=Math.floor(S.clock/86400);
      S.curA=approach(S.curA,0,10*dt);
      for(const sc of SCHED){
        if(sc.on&&sc.fired!==day&&tod>=sc.sec){sc.fired=day;startCycle(sc.f,sc.s,sc.l,'horario '+sc.t);break}
      }
      break}
    case 'tare': S.curA=0.15;if(S.pt>1.0)goNext('tare');break;
    case 'rotor': doRotor(dt);break;
    case 'supp': doSupp(dt);break;
    case 'liq': doLiq(dt);break;
    case 'settle':
      S.curA=approach(S.curA,0,10*dt);
      if(S.pt>2.2){
        S.res={f:S.chP,s:S.chS,l:S.chL,aborted:!!S.abortFlag};S.abortFlag=false;
        setPhase('gate');S.gMode=0;
      }
      break;
    case 'gate': doGate(dt);break;
    case 'done':
      S.curA=approach(S.curA,0,10*dt);
      if(S.pt>1.5){S.phase='idle';S.pt=0}
      break;
  }
  stepCube(dt);
  stepParts(dt);
  if(S.eatWait>0)S.eatWait-=dt;
  else if(S.trM>0)S.trM=Math.max(0,S.trM-18*dt);
  S.wDisp+=(chT()+0.12*gauss()*(S.phase==='idle'?0:1)-S.wDisp)*(1-Math.exp(-14*dt));
}
