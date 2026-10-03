/* ============================================================
   App del celular + panel de simulación + bucle principal
   ============================================================ */
const MAN={f:800,s:20,l:30};
const PHN={idle:['En reposo','Listo para dosificar'],tare:['Preparando','Tarando la celda de carga'],rotor:['Dosificando alimento',''],
  supp:['Dosificando suplemento','Mini tornillo girando'],liq:['Dosificando líquido','Bomba peristáltica en marcha'],
  settle:['Verificando peso','Esperando que la lectura se estabilice'],gate:['Sirviendo en el comedero','Compuerta abierta'],done:['Ración servida','Todo en el comedero']};
const HUDP={idle:'En reposo',tare:'Tarando celda',rotor:'Dosificando alimento (rotor)',supp:'Suplemento (mini tornillo)',liq:'Líquido (bomba)',settle:'Estabilizando peso',gate:'Abriendo compuerta',done:'Ración servida'};

let toastT=0;
UI.toast=msg=>{const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),4200)};

/* ---- pestañas ---- */
$$('.tabs button').forEach(b=>b.addEventListener('click',()=>{
  $$('.tabs button').forEach(x=>x.setAttribute('aria-selected',String(x===b)));
  ['hoy','prog','hist'].forEach(k=>{$('#v-'+k).style.display=(k===b.dataset.tab)?'contents':'none'});
  $('.views').scrollTop=0;
}));

/* ---- ración manual ---- */
$$('.stp').forEach(el=>{
  const k=el.dataset.k,step=+el.dataset.step,mn=+el.dataset.min,mx=+el.dataset.max,out=$('output',el);
  const bs=$$('button',el);
  const paint=()=>{out.textContent=MAN[k]+' g'};
  bs[0].addEventListener('click',()=>{MAN[k]=clamp(MAN[k]-step,mn,mx);paint()});
  bs[1].addEventListener('click',()=>{MAN[k]=clamp(MAN[k]+step,mn,mx);paint()});
  paint();
});
$('#btnManual').addEventListener('click',()=>{const m=$('#manual');m.hidden=!m.hidden;if(!m.hidden)m.scrollIntoView({block:'nearest',behavior:'smooth'})});
$('#btnStart').addEventListener('click',()=>{if(startCycle(MAN.f,MAN.s,MAN.l,'manual')){$('#manual').hidden=true;$('.views').scrollTop=0}});
$('#btnStop').addEventListener('click',abortCycle);

/* ---- horarios ---- */
function schedTotals(){
  const a=SCHED.filter(x=>x.on);
  $('#schedTot').textContent='Total diario: '+a.reduce((n,x)=>n+x.f,0)+' g de alimento · '+a.reduce((n,x)=>n+x.s,0)+' g de suplemento · '+a.reduce((n,x)=>n+x.l,0)+' g de líquido';
}
function renderSched(){
  const box=$('#schedList');box.innerHTML='';
  SCHED.forEach((sc,i)=>{
    const d=document.createElement('div');d.className='card sched'+(sc.on?'':' off');d.dataset.i=i;
    d.innerHTML='<div class="h"><input type="time" data-k="t" value="'+sc.t+'" aria-label="Hora"><span class="row" style="gap:10px"><button class="del" data-del="1">Quitar</button><label class="sw" style="flex-direction:row"><input type="checkbox" data-k="on" '+(sc.on?'checked':'')+' aria-label="Activar horario"><span></span></label></span></div>'
      +'<div class="nums"><label>Alimento g<input type="number" data-k="f" min="0" max="2000" step="50" value="'+sc.f+'"></label><label>Suplem. g<input type="number" data-k="s" min="0" max="100" step="5" value="'+sc.s+'"></label><label>Líquido g<input type="number" data-k="l" min="0" max="100" step="5" value="'+sc.l+'"></label></div>';
    box.appendChild(d);
  });
  $('#btnAdd').hidden=SCHED.length>=6;
  schedTotals();
}
$('#schedList').addEventListener('change',e=>{
  const card=e.target.closest('.sched');if(!card)return;
  const sc=SCHED[+card.dataset.i],k=e.target.dataset.k;if(!sc||!k)return;
  if(k==='t'){if(/^\d\d:\d\d$/.test(e.target.value)){sc.t=e.target.value}else e.target.value=sc.t}
  else if(k==='on'){sc.on=e.target.checked;card.classList.toggle('off',!sc.on)}
  else{const mx=k==='f'?2000:100;sc[k]=clamp(Math.round(+e.target.value||0),0,mx);e.target.value=sc[k]}
  resetFired(sc);saveSched();schedTotals();
});
$('#schedList').addEventListener('click',e=>{
  if(!e.target.dataset.del)return;
  const card=e.target.closest('.sched');SCHED.splice(+card.dataset.i,1);saveSched();renderSched();
});
$('#btnAdd').addEventListener('click',()=>{
  if(SCHED.length>=6)return;
  const sc={id:Date.now(),t:'09:00',f:600,s:0,l:0,on:true};resetFired(sc);SCHED.push(sc);saveSched();renderSched();
});

/* ---- historial ---- */
function renderHist(){
  const box=$('#histList');box.innerHTML='';
  HIST.slice(0,14).forEach(h=>{
    const d=document.createElement('div');d.className='hi';
    const err=h.p.f?((h.r.f-h.p.f)/h.p.f*100):0;
    d.innerHTML='<span class="tm">'+h.time+'</span><span class="dd">'+h.day+(h.aborted?' · detenido':'')+'</span>'
      +'<span class="rs">'+h.p.f+' g → '+Math.round(h.r.f)+' g ('+(err>=0?'+':'')+err.toFixed(1)+'%)'
      +(h.p.s?' · supl. '+h.r.s.toFixed(1)+'/'+h.p.s:'')+(h.p.l?' · líq. '+h.r.l.toFixed(1)+'/'+h.p.l:'')
      +(h.jams?' · <em>atasco resuelto</em>':'')+'</span>';
    box.appendChild(d);
  });
}
UI.hist=renderHist;

/* ---- panel de simulación ---- */
$$('#spd .btn').forEach(b=>b.addEventListener('click',()=>{
  S.speed=+b.dataset.spd;$$('#spd .btn').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
}));
$('#btnPause').addEventListener('click',e=>{S.paused=!S.paused;e.currentTarget.setAttribute('aria-pressed',String(S.paused));e.currentTarget.textContent=S.paused?'Reanudar':'Pausar'});
$$('#clkRate .btn').forEach(b=>b.addEventListener('click',()=>{
  S.clockRate=+b.dataset.r;$$('#clkRate .btn').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
}));
$('#btnSkip').addEventListener('click',()=>{
  if(S.phase!=='idle'){UI.toast('Espera a que termine el ciclo en curso');return}
  const on=SCHED.filter(x=>x.on);if(!on.length){UI.toast('No hay horarios activos');return}
  const tod=S.clock%86400,day=Math.floor(S.clock/86400);
  let best=null;on.forEach(x=>{if(x.sec>tod+2&&(!best||x.sec<best.sec))best=x});
  if(best){S.clock=day*86400+best.sec-6}
  else{const f=on.reduce((a,x)=>x.sec<a.sec?x:a,on[0]);S.clock=(day+1)*86400+f.sec-6;SCHED.forEach(resetFired)}
});
$('#gpv').addEventListener('input',e=>{S.gpv=+e.target.value;$('#gpvVal').textContent=S.gpv+' g'});
$('#btnJam').addEventListener('click',()=>{
  S.jamArmed=true;$('#jamNote').hidden=false;
  UI.toast(S.phase==='rotor'?'Atasco armado: ocurrirá en un momento':'Atasco armado: ocurrirá en la próxima ración');
});
$('#btnRefill').addEventListener('click',()=>{S.stock=7200;S.sup=500;S.liq=1000;UI.toast('Insumos rellenados')});

/* ---- actualización de textos ---- */
function nextInfo(){
  const on=SCHED.filter(x=>x.on);if(!on.length)return null;
  const tod=S.clock%86400;let best=null,add=0;
  on.forEach(x=>{if(x.sec>tod&&(!best||x.sec<best.sec))best=x});
  if(!best){best=on.reduce((a,x)=>x.sec<a.sec?x:a,on[0]);add=86400}
  return{sc:best,left:best.sec+add-tod};
}
function fmtLeft(s){
  if(s<90)return 'en '+Math.max(1,Math.round(s))+' s';
  const m=Math.round(s/60);if(m<60)return 'en '+m+' min';
  return 'en '+Math.floor(m/60)+' h '+pad(m%60)+' min';
}
const setBar=(id,v,t,tgt)=>{$('#b'+id).style.width=(tgt>0?clamp(v/tgt*100,0,100):0)+'%'};
let lastUI=0;
function updateUI(force){
  const now=performance.now();if(!force&&now-lastUI<90)return;lastUI=now;
  const ph=S.phase,jam=S.jamS;
  $('#clk').textContent=fmtTS(S.clock);$('#pClock').textContent=fmtT(S.clock);
  let ti=PHN[ph][0],sub=PHN[ph][1];
  if(ph==='rotor'){
    const turns=Math.max(0,(S.th-S.th0))/TAU;
    sub='Rotor girando · '+turns.toFixed(1)+' vueltas';
    if(jam&&jam.mode!=='pause'){ti='Atasco detectado';sub=jam.mode==='stall'?'Corriente alta en el motor…':jam.mode==='detect'?'Motor detenido por seguridad':'Invirtiendo el giro para liberar'}
    else if(jam)sub='Retomando la ración';
  }
  if(ph==='done'&&S.last&&S.last.r.aborted)ti='Ciclo detenido';
  $('#stTitle').textContent=ti;$('#stSub').textContent=sub;
  const dec=(ph==='supp'||ph==='liq'||ph==='settle')?1:0;
  $('#liveW').textContent=Math.max(0,S.wDisp).toFixed(dec)+' g';
  const pl=S.plan,r=(ph==='idle'||ph==='done')&&S.last?S.last.r:{f:S.chP,s:S.chS,l:S.chL};
  const tg=(ph==='idle'||ph==='done')&&S.last?S.last.p:pl;
  if(tg){
    setBar('F',r.f,0,tg.f);setBar('S',r.s,0,tg.s);setBar('L',r.l,0,tg.l);
    $('#tF').textContent=Math.round(r.f)+' / '+tg.f+' g';
    $('#tS').textContent=tg.s?r.s.toFixed(1)+' / '+tg.s+' g':'—';
    $('#tL').textContent=tg.l?r.l.toFixed(1)+' / '+tg.l+' g':'—';
  }
  const ab=$('#alertBox');
  if(S.alertMsg){ab.hidden=false;ab.innerHTML=S.alertMsg+'<small>'+(jam?'Pico de corriente '+S.curA.toFixed(1)+' A · el ESP32 invierte el giro automáticamente.':'Revisa el alimento de la tolva.')+'</small>'}
  else ab.hidden=true;
  const busy=ph!=='idle'&&ph!=='done';
  $('#btnStop').hidden=!(busy&&ph!=='gate'&&ph!=='settle');
  $('#btnManual').disabled=busy;$('#btnStart').disabled=busy;
  const nx=nextInfo();
  if(nx){$('#nxWhen').textContent=nx.sc.t;$('#nxWhat').innerHTML=nx.sc.f+' g · '+nx.sc.s+' g · '+nx.sc.l+' g<br>'+fmtLeft(nx.left)}
  else{$('#nxWhen').textContent='—';$('#nxWhat').textContent='Sin horarios activos'}
  const kg=S.stock/1000;
  $('#kHop').textContent=kg.toFixed(1)+' kg';$('#kHopB').style.width=clamp(S.stock/HOP_CAP*100,0,100)+'%';
  $('#kSup').textContent=Math.round(S.sup)+' g';$('#kSupB').style.width=clamp(S.sup/500*100,0,100)+'%';
  $('#kLiq').textContent=Math.round(S.liq)+' g';$('#kLiqB').style.width=clamp(S.liq/1000*100,0,100)+'%';
  // HUD 3D
  $('#hudPhase').textContent=(jam&&jam.mode!=='pause')?'ATASCO · '+(jam.mode==='rev'?'reversa':jam.mode==='detect'?'motor detenido':'corriente alta'):HUDP[ph];
  $('#hudW').textContent=Math.max(0,S.wDisp).toFixed(1)+' g';
  $('#hudA').textContent=S.curA.toFixed(1)+' A';
  $('#hudRpm').textContent=(S.w*60/TAU).toFixed(1)+' RPM';
  $('#hudT').textContent=Math.round(S.trM)+' g';
  $('#spdNote').textContent=S.phase==='idle'?'':'ciclo en curso';
  if(!S.jamArmed)$('#jamNote').hidden=true;
}

/* ---- arranque ---- */
renderSched();renderHist();
const V=build3D();
if(!V){$('#fallback').hidden=false}
let lastT=performance.now();
function frame(now){
  const dtR=Math.min(0.1,(now-lastT)/1000);lastT=now;
  if(!S.paused){
    const dtS=dtR*S.speed,n=Math.max(1,Math.ceil(dtS/0.025)),h=dtS/n;
    for(let i=0;i<n;i++)step(h,h/S.speed);
  }
  if(V)V.render(dtR);
  updateUI();
  requestAnimationFrame(frame);
}
updateUI(true);
requestAnimationFrame(frame);
window.__fb={S,startCycle,step,parts,SCHED,HIST};
