/* ============================================================
   Escena 3D (Three.js r128). Unidades: cm. Y arriba.
   ============================================================ */
function build3D(){
  if(typeof THREE==='undefined')return null;
  const canvas=$('#cv'),vp=$('#vp');
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'})}catch(e){return null}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setClearColor(0x000000,0);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(36,1,1,700);

  /* ---- luces ---- */
  scene.add(new THREE.HemisphereLight(0xffffff,0x8a7a62,0.85));
  const key=new THREE.DirectionalLight(0xffffff,0.85);key.position.set(70,130,110);scene.add(key);
  const fill=new THREE.DirectionalLight(0xdfe8ff,0.35);fill.position.set(-90,60,60);scene.add(fill);

  /* ---- texturas ---- */
  function ctex(w,h,draw,rep){
    const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
    const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);t.anisotropy=4;return t;
  }
  const pelletTex=ctex(256,256,(g,w,h)=>{
    g.fillStyle='#6d4a28';g.fillRect(0,0,w,h);
    const pal=['#8a6238','#5b3d20','#7a5530','#4d3a1e','#6f7a3a','#9a7344'];
    for(let i=0;i<420;i++){
      g.save();g.translate(Math.random()*w,Math.random()*h);g.rotate(Math.random()*6.28);
      g.fillStyle=pal[(Math.random()*pal.length)|0];
      const L=9+Math.random()*8,Wd=5+Math.random()*3;
      g.beginPath();g.ellipse(0,0,L/2,Wd/2,0,0,6.283);g.fill();g.restore();
    }
  },[3,2]);
  const woodTex=ctex(512,512,(g,w,h)=>{
    const n=8,pw=w/n;
    for(let i=0;i<n;i++){
      const l=60+Math.random()*10;
      g.fillStyle='hsl(33,'+(28+Math.random()*10)+'%,'+(l)+'%)';g.fillRect(i*pw,0,pw,h);
      for(let k=0;k<26;k++){
        g.strokeStyle='rgba(70,45,20,'+(0.05+Math.random()*0.1)+')';g.lineWidth=0.6+Math.random()*1.2;
        const x=i*pw+Math.random()*pw;g.beginPath();g.moveTo(x,0);
        g.bezierCurveTo(x+Math.random()*6-3,h*0.3,x+Math.random()*6-3,h*0.6,x+Math.random()*4-2,h);g.stroke();
      }
      g.fillStyle='rgba(40,25,10,.55)';g.fillRect(i*pw,0,2,h);
    }
  });
  const labelTex=ctex(512,128,(g,w,h)=>{
    g.fillStyle='rgba(0,0,0,0)';g.clearRect(0,0,w,h);
    g.fillStyle='#f3efe3';g.font='700 76px "Barlow Condensed","Arial Narrow",Arial,sans-serif';g.textBaseline='middle';g.fillText('FeederBox',8,h/2+2);
    g.fillStyle='#5fc2a0';g.fillRect(430,28,70,72);
  });labelTex.wrapS=labelTex.wrapT=THREE.ClampToEdgeWrapping;

  /* ---- materiales ---- */
  const std=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:0.55,metalness:0.1},o||{}));
  const M={
    steel:std(0xaab1b8,{metalness:0.85,roughness:0.32}),
    dark:std(0x2b2f33,{metalness:0.5,roughness:0.55}),
    boxm:std(0x6a737c,{metalness:0.45,roughness:0.55}),
    glass:std(0xcfe8ff,{transparent:true,opacity:0.17,roughness:0.08,metalness:0,side:THREE.DoubleSide,depthWrite:false}),
    hopper:std(0xa9c9e6,{transparent:true,opacity:0.24,roughness:0.15,side:THREE.DoubleSide,depthWrite:false}),
    rotor:std(0xe9792a,{roughness:0.5}),
    pet:std(0x1f2226,{roughness:0.6}),
    gold:std(0xb9a66b,{metalness:0.6,roughness:0.4}),
    can:std(0xc6cbd1,{metalness:0.85,roughness:0.3}),
    pcb:std(0x1e6e45,{roughness:0.6}),
    red:std(0xb03a2e,{roughness:0.5}),
    blue:std(0x2a5b9c,{roughness:0.5}),
    wood:new THREE.MeshStandardMaterial({map:woodTex,color:0xffffff,roughness:0.95}),
    floor:std(0xa38f66,{roughness:1}),
    pellet:new THREE.MeshStandardMaterial({map:pelletTex,roughness:0.95}),
    pelletCol:new THREE.MeshStandardMaterial({map:pelletTex,roughness:0.95,transparent:true,opacity:0.62}),
    liquid:std(0xd99a2b,{transparent:true,opacity:0.78,roughness:0.2}),
    powder:std(0xf1ead3,{roughness:0.9}),
    zinc:std(0x9aa1a8,{metalness:0.8,roughness:0.4}),
    cube:std(0x9fc23c,{roughness:0.9}),
    front:std(0x6a737c,{metalness:0.5,roughness:0.5,transparent:true,opacity:0.1,depthWrite:false})
  };
  const led=new THREE.MeshStandardMaterial({color:0x222222,emissive:0x2ecc71,emissiveIntensity:1,roughness:0.4});
  const ledB=new THREE.MeshStandardMaterial({color:0x222222,emissive:0x2ecc71,emissiveIntensity:1,roughness:0.4});

  /* ---- helpers ---- */
  const add=(m,p)=>{(p||scene).add(m);return m};
  const box=(w,h,d,mat,x,y,z,p)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);return add(m,p)};
  const cylY=(r1,r2,h,mat,x,y,z,seg,open,p)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg||40,1,!!open),mat);m.position.set(x,y,z);return add(m,p)};
  const cylX=(r,h,mat,x,y,z,seg,p)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg||32),mat);m.rotation.z=HP;m.position.set(x,y,z);return add(m,p)};
  const cylZ=(r,h,mat,x,y,z,seg,p)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg||32),mat);m.rotation.x=HP;m.position.set(x,y,z);return add(m,p)};
  const ring=(r,t,mat,y,x,z)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,10,56),mat);m.rotation.x=HP;m.position.set(x||0,y,z||0);return add(m)};
  function platHoles(w,d,thk,holes,mat,yTop){
    const sh=new THREE.Shape();sh.moveTo(-w/2,-d/2);sh.lineTo(w/2,-d/2);sh.lineTo(w/2,d/2);sh.lineTo(-w/2,d/2);sh.lineTo(-w/2,-d/2);
    holes.forEach(h=>{const p=new THREE.Path();p.absarc(h[0],h[1],h[2],0,TAU,true);sh.holes.push(p)});
    const g=new THREE.ExtrudeGeometry(sh,{depth:thk,bevelEnabled:false,curveSegments:32});g.rotateX(HP);
    const m=new THREE.Mesh(g,mat);m.position.y=yTop;return add(m);
  }

  /* ---- establo: pared y piso ---- */
  const wall=new THREE.Mesh(new THREE.PlaneGeometry(200,150),M.wood);wall.position.set(0,52,-13.4);scene.add(wall);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,80),M.floor);floor.rotation.x=-HP;floor.position.set(0,-0.05,26);scene.add(floor);

  /* ---- caja de acero ---- */
  const BYC=(BOX_Y0+BOX_Y1)/2;
  box(40.8,25.5,0.5,M.boxm,0,BYC,-8.75);                       // fondo
  box(0.5,25.5,17.5,M.boxm,-20.25,BYC,0);box(0.5,25.5,17.5,M.boxm,20.25,BYC,0);
  platHoles(40.8,17,0.45,[[0,0,R_OUT+0.12],[NZX,NZZ,0.5]],M.boxm,BOX_Y1+0.45);      // tapa
  platHoles(40.8,17,0.45,[[0,0,R_OUT+0.12],[SX,SZ,0.75],[NZX,NZZ,0.5]],M.boxm,BOX_Y0+0.45); // base
  const front=box(40.8,25.5,0.5,M.front,0,BYC,8.75);
  const frontLabel=new THREE.Mesh(new THREE.PlaneGeometry(14,3.5),new THREE.MeshBasicMaterial({map:labelTex,transparent:true}));
  frontLabel.position.set(-10,BYC+6,9.03);frontLabel.visible=false;scene.add(frontLabel);
  const ledFront=new THREE.Mesh(new THREE.SphereGeometry(0.55,16,12),ledB);ledFront.position.set(16.5,BYC+6,9.1);scene.add(ledFront);
  // tornillos de las esquinas
  [[-19,-11.5],[19,-11.5],[-19,11.5],[19,11.5]].forEach(c=>cylZ(0.5,0.3,M.steel,c[0],BYC+c[1],9.05,12));

  /* ---- tubo 4" ---- */
  const tubeH=TUBE_Y1-TUBE_Y0;
  cylY(R_OUT,R_OUT,tubeH,M.glass,0,TUBE_Y0+tubeH/2,0,56,true);
  ring(R_OUT,0.22,M.steel,TUBE_Y0+0.2);
  /* columna de alimento sobre el rotor */
  const tubeFeed=cylY(R_IN-0.1,R_IN-0.1,TUBE_Y1-(ROTOR_Y+1.8),M.pelletCol,0,(TUBE_Y1+ROTOR_Y+1.8)/2,0,40);

  /* ---- tolva ---- */
  cylY(14,R_OUT,6,M.hopper,0,83,0,56,true);
  cylY(14,14,20,M.hopper,0,96,0,56,true);
  ring(14.05,0.35,M.steel,106);ring(14.05,0.3,M.steel,86);ring(14.05,0.3,M.steel,96);
  const hopConeFeed=cylY(13.6,5.5,6,M.pellet,0,83,0,40);
  const hopCylFeed=cylY(13.7,13.7,1,M.pellet,0,86.5,0,48);
  const hopLid=cylY(14.6,14.6,0.7,M.hopper,0,106.4,0,48);hopLid.visible=false; // sin tapa (visible el nivel)

  /* ---- rotor (eje X) ---- */
  const rotorG=new THREE.Group();rotorG.position.set(0,ROTOR_Y,0);scene.add(rotorG);
  {
    const Rv=4.25,x0=1.1;
    const sh=new THREE.Shape();sh.moveTo(Rv,x0);sh.absarc(0,x0,Rv,0,Math.PI,false);
    const vg=new THREE.ExtrudeGeometry(sh,{depth:0.44,bevelEnabled:false,curveSegments:56});vg.translate(0,0,-0.22);
    for(let k=0;k<4;k++){const v=new THREE.Mesh(vg,M.rotor);v.rotation.x=k*HP;rotorG.add(v)}
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,8.5,40),M.rotor);hub.rotation.z=HP;rotorG.add(hub);
    // eje de 8 mm, acople y eje del motor
    const sft=new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,15.6,20),M.steel);sft.rotation.z=HP;sft.position.x=(-6.8+8.8)/2;rotorG.add(sft);
    const cp=new THREE.Mesh(new THREE.CylinderGeometry(0.97,0.97,2.5,32),M.can);cp.rotation.z=HP;cp.position.x=7.7;rotorG.add(cp);
    for(let i=0;i<4;i++){const gr=new THREE.Mesh(new THREE.TorusGeometry(0.97,0.06,6,32),M.dark);gr.rotation.y=HP;gr.position.x=6.9+i*0.55;rotorG.add(gr)}
    const sc=new THREE.Mesh(new THREE.SphereGeometry(0.2,10,8),M.dark);sc.position.set(7.6,0.97,0);rotorG.add(sc);
    const pin=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,2.9,10),M.steel);pin.position.set(0,0,0);rotorG.add(pin);
  }
  /* soportes impresos y motorreductor */
  box(0.55,6.2,7.4,M.pet,R_OUT+0.45,ROTOR_Y,-0.6);                // placa del buje del motor
  [[2.2,1.8],[2.2,-2.4],[-2.2,1.8],[-2.2,-2.4]].forEach(c=>box(0.6,0.6,0.6,M.pet,8.0,ROTOR_Y+c[0],c[1]));
  [[2.2,1.8],[2.2,-2.4],[-2.2,1.8],[-2.2,-2.4]].forEach(c=>box(3.2,0.55,0.55,M.pet,7.7,ROTOR_Y+c[0],c[1]));
  box(0.6,5.4,4.6,M.pet,9.4,ROTOR_Y,-0.3);                         // brida
  box(2.52,4.6,3.2,M.gold,10.96,ROTOR_Y+0.4,0);                    // caja reductora
  const can=new THREE.Mesh(new THREE.CylinderGeometry(1.22,1.22,3.08,28),M.can);can.position.set(10.96,ROTOR_Y+0.4-2.3-1.54,0);scene.add(can);
  cylY(1.1,1.1,0.4,M.dark,10.96,ROTOR_Y-4.2-1.0+0.4,0,24);
  /* soporte del rodamiento 608 (lado izquierdo) */
  box(0.55,5.6,6,M.pet,-(R_OUT+0.45),ROTOR_Y,0);
  cylX(1.7,1.35,M.pet,-(R_OUT+0.6+0.7),ROTOR_Y,0,36);
  cylX(1.1,0.8,M.steel,-(R_OUT+0.6+1.35),ROTOR_Y,0,28);

  /* ---- electrónica en el fondo de la caja ---- */
  const bz=-8.35,ey=BOX_Y1-4;
  box(5.8,0.2,3.0,M.pcb,-14.5,ey,bz);box(1.6,0.14,1.4,M.dark,-13.8,ey+0.18,bz+0.05);box(2.6,0.08,1.1,M.steel,-15.5,ey+0.15,bz+0.1);
  const espLed=new THREE.Mesh(new THREE.SphereGeometry(0.2,10,8),led);espLed.position.set(-12.0,ey+0.25,bz+0.8);scene.add(espLed);
  box(3.8,0.2,2.3,M.blue,-9,ey,bz);cylZ(0.55,0.2,M.can,-9,ey,bz+0.2,18);
  box(4.8,0.2,4.2,M.red,9,ey,bz);box(4.2,1.3,3.6,M.zinc,9,ey+0.7,bz+0.1);
  box(8.5,3.2,0.9,M.zinc,16,ey-0.2,bz-0.2);
  box(5,1.6,0.2,M.dark,2,ey,bz);  // regleta
  // cables
  function wire(pts,c){const cu=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p[0],p[1],p[2])));const m=new THREE.Mesh(new THREE.TubeGeometry(cu,40,0.09,6,false),std(c,{roughness:0.8}));scene.add(m)}
  wire([[9,ey-1,bz+0.5],[9.5,ROTOR_Y+5,-4],[10.5,ROTOR_Y+3,-1.5],[10.96,ROTOR_Y+1,-1.2]],0xd23a2a);
  wire([[8.2,ey-1,bz+0.5],[8.5,ROTOR_Y+5.5,-5],[9.8,ROTOR_Y+3,-1.8],[10.5,ROTOR_Y+1,-1.4]],0x222222);
  wire([[-14.5,ey-0.5,bz+0.5],[-12,ey-3,-6],[-4,ey-1,-6],[7,ey-0.8,bz+0.5]],0x2c6ccf);

  /* ---- mini tolva + tornillo sin fin (suplemento) ---- */
  const AY=56,AZ=4;
  cylY(3.2,0.9,8,M.hopper,-14,AY+7,AZ,32,true);
  cylY(0.9,0.9,1.4,M.hopper,-14,AY+2.4,AZ,20,true);
  ring(3.25,0.2,M.steel,AY+11);
  const supCone=cylY(3.0,0.85,7.5,M.powder,-14,AY+6.9,AZ,28);
  cylX(1.15,11.5,M.glass,-12.75,AY,AZ,28);
  cylY(0.65,0.65,AY-BOX_Y0+8,M.glass,SX,(AY+BOX_Y0-8)/2+0.5,SZ,20,true);   // pico hacia el comedero
  const augerG=new THREE.Group();augerG.position.set(0,AY,AZ);scene.add(augerG);
  {
    const pts=[],N=160,turns=9,x0=-18,x1=SX+0.2;
    for(let i=0;i<=N;i++){const u=i/N,a=u*turns*TAU;pts.push(new THREE.Vector3(x0+(x1-x0)*u,0.72*Math.cos(a),0.72*Math.sin(a)))}
    augerG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),200,0.17,6,false),M.steel));
    const ax=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,11.6,10),M.steel);ax.rotation.z=HP;ax.position.x=(-18+SX)/2;augerG.add(ax);
  }
  cylX(0.65,2.6,M.can,-19.0,AY,AZ,20);cylX(0.55,1.4,M.gold,-17.4,AY,AZ,20);

  /* ---- botella de líquido + celda de carga + bomba peristáltica ---- */
  const BX=16,BZ=-3;
  box(6.5,1.0,1.4,M.zinc,BX,53.3,BZ);box(1.2,0.06,0.9,M.blue,BX+1.5,53.84,BZ);
  cylY(3.5,3.5,14,M.glass,BX,54.4+7,BZ,40);
  cylY(1.2,1.2,1.2,M.dark,BX,54.4+14.6,BZ,24);
  const bottleLiq=cylY(3.3,3.3,1,M.liquid,BX,54.9,BZ,36);
  const PX=10.5,PY=53.3,PZ=5.3;
  box(5.2,5.2,3.6,M.dark,PX,PY,PZ);
  const pumpG=new THREE.Group();pumpG.position.set(PX,PY,PZ+2.3);scene.add(pumpG);
  {
    const d=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.7,0.8,32),M.zinc);d.rotation.x=HP;pumpG.add(d);
    for(let i=0;i<3;i++){const a=i*TAU/3;const r=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,1.1,16),M.steel);r.rotation.x=HP;r.position.set(Math.cos(a)*1.25,Math.sin(a)*1.25,0.2);pumpG.add(r)}
  }
  cylZ(2.15,0.5,M.glass,PX,PY,PZ+2.1,36);
  {
    const hp=[
      [BX,54.4,BZ],[BX,53,BZ],[BX-0.4,51.8,2],[13.4,52.4,6.2],[PX+2.2,PY,PZ+2.9],
      [PX+1.5,PY+1.6,PZ+2.9],[PX,PY+2.3,PZ+2.9],[PX-1.5,PY+1.6,PZ+2.9],[PX-2.2,PY,PZ+2.9],
      [8,52.2,6.4],[5.2,51.2,6.2],[NZX,50.4,NZZ],[NZX,NZY+0.2,NZZ]
    ].map(p=>new THREE.Vector3(p[0],p[1],p[2]));
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hp),140,0.27,8,false),std(0xe9c36a,{transparent:true,opacity:0.8,roughness:0.3})));
  }
  cylY(0.42,0.2,0.9,M.steel,NZX,NZY+0.35,NZZ,12);

  /* ---- cámara de pesado ---- */
  cylY(CH_R+0.1,CH_R+0.1,CH_H,M.glass,0,G+CH_H/2,0,56,true);
  ring(CH_R+0.1,0.35,M.steel,G);ring(CH_R+0.1,0.35,M.steel,G+CH_H);
  cylY(10,CH_R+0.1,FUN_H,M.glass,0,G+CH_H+FUN_H/2,0,56,true);
  ring(10,0.3,M.steel,G+CH_H+FUN_H);
  // celda de carga (viga en voladizo) + soporte a la pared
  box(7,11,0.5,M.zinc,0,G+10,-12.95);
  box(3.4,1.9,5.8,M.steel,0,G+10,-10.3);box(1.4,0.06,2.4,M.blue,0,G+11,-10.3);
  box(2.2,1.2,1.2,M.zinc,0,G+10,-7.8);
  const chPile=new THREE.Mesh(new THREE.CylinderGeometry(CH_R-0.1,CH_R-0.1,1,40),M.pellet);scene.add(chPile);
  /* compuerta con servo */
  const gateG=new THREE.Group();gateG.position.set(0,G,-8);scene.add(gateG);
  {
    const d=new THREE.Mesh(new THREE.CylinderGeometry(8.4,8.4,0.5,56),M.dark);d.position.set(0,-0.25,8);gateG.add(d);
    const tab=new THREE.Mesh(new THREE.BoxGeometry(3,0.5,2),M.dark);tab.position.set(0,-0.25,-0.8);gateG.add(tab);
  }
  cylX(0.3,20,M.steel,1,G,-8,12);
  box(2.6,2.3,4.2,M.blue,11.8,G,-8);
  const horn=box(0.5,3.4,0.6,M.can,13.4,G,-8);

  /* ---- comedero ---- */
  box(36.8,0.5,18.5,M.zinc,0,0.25,0);
  box(36.8,7,0.5,M.zinc,0,3.5,9.1);box(36.8,7,0.5,M.zinc,0,3.5,-9.1);
  box(0.5,7,18.5,M.zinc,-18.4,3.5,0);box(0.5,7,18.5,M.zinc,18.4,3.5,0);
  box(37.6,0.7,0.9,M.wood,0,7.1,9.1);box(37.6,0.7,0.9,M.wood,0,7.1,-9.1);
  const trPile=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,40),M.pellet);scene.add(trPile);

  /* ---- indicador de nivel de la tolva ya está en hopConeFeed / hopCylFeed ---- */

  /* ---- cubo de alfalfa (atasco) ---- */
  const cubeMesh=new THREE.Mesh(new THREE.BoxGeometry(2.6,2.6,4.4),M.cube);cubeMesh.visible=false;scene.add(cubeMesh);

  /* ---- partículas ---- */
  const dummy=new THREE.Object3D();
  const pelCols=[0xc08a4c,0xd09a5a,0xa87238,0x9aa84e].map(c=>new THREE.Color(c));
  function inst(geo,mat,cap){const m=new THREE.InstancedMesh(geo,mat,cap);m.count=0;m.frustumCulled=false;m.setColorAt(0,new THREE.Color(1,1,1));scene.add(m);return m}
  const iPel=inst(new THREE.CylinderGeometry(0.42,0.42,0.9,10),new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.9}),900);
  const iPow=inst(new THREE.SphereGeometry(0.3,6,5),new THREE.MeshStandardMaterial({color:0xfaf5e4,roughness:1,emissive:0x555044}),400);
  const iDrp=inst(new THREE.SphereGeometry(0.36,10,8),new THREE.MeshStandardMaterial({color:0xf0b030,emissive:0x4a3000,roughness:0.15,metalness:0.1}),200);

  /* ---- cámara orbital ---- */
  const PORTRAIT=(vp.clientWidth/Math.max(1,vp.clientHeight))<0.95;
  const PRE={
    general:PORTRAIT?{az:0.42,el:0.17,r:225,tx:0,ty:60,tz:0}:{az:0.42,el:0.17,r:208,tx:0,ty:51,tz:0},
    rotor:{az:0.30,el:0.10,r:64,tx:2,ty:ROTOR_Y,tz:0},
    dosif:{az:0.05,el:0.14,r:78,tx:2,ty:55,tz:0},
    camara:{az:0.55,el:0.16,r:80,tx:0,ty:28,tz:0},
    comedero:{az:0.55,el:0.36,r:78,tx:0,ty:8,tz:0}
  };
  const cam=Object.assign({},PRE.general),camT=Object.assign({},PRE.general);
  function applyCam(){
    const ce=Math.cos(cam.el);
    camera.position.set(cam.tx+cam.r*ce*Math.sin(cam.az),cam.ty+cam.r*Math.sin(cam.el),cam.tz+cam.r*ce*Math.cos(cam.az));
    camera.lookAt(cam.tx,cam.ty,cam.tz);
  }
  function setCam(name){Object.assign(camT,PRE[name]);$$('.camBtn').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cam===name)))}
  function userMoved(){Object.assign(camT,cam);$$('.camBtn').forEach(b=>b.setAttribute('aria-pressed','false'))}
  const ptrs=new Map();let pinch0=0,r0=0;
  canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});if(ptrs.size===2){const a=[...ptrs.values()];pinch0=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);r0=cam.r}});
  canvas.addEventListener('pointermove',e=>{
    const p=ptrs.get(e.pointerId);if(!p)return;
    const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
    if(ptrs.size===1){cam.az-=dx*0.0065;cam.el=clamp(cam.el+dy*0.005,-0.15,1.3);userMoved()}
    else if(ptrs.size===2){const a=[...ptrs.values()];const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch0>0){cam.r=clamp(r0*pinch0/d,35,300);userMoved()}}
  });
  const endP=e=>{ptrs.delete(e.pointerId)};
  canvas.addEventListener('pointerup',endP);canvas.addEventListener('pointercancel',endP);
  canvas.addEventListener('wheel',e=>{e.preventDefault();cam.r=clamp(cam.r*(1+e.deltaY*0.0012),35,300);userMoved()},{passive:false});
  $$('.camBtn').forEach(b=>b.addEventListener('click',()=>setCam(b.dataset.cam)));

  /* ---- etiquetas HTML ---- */
  const LB=[
    ['Tolva',[14,98,0]],['Tubo 4″ (transparente aquí)',[5.8,77,0]],['Rotor de 4 aspas',[0,ROTOR_Y-5,5]],['Motor 12 V + reductor',[12.4,ROTOR_Y+2.8,0]],
    ['ESP32 + RTC',[-14.5,BOX_Y1-4,-8]],
    ['Mini tornillo (suplemento)',[-15,AY+9,AZ]],['Botella + celda de carga',[BX+3.6,60,BZ]],['Bomba peristáltica',[PX+3,PY+1,PZ+2]],
    ['Cámara de pesado',[-CH_R-0.3,G+8,0]],['Celda de carga',[2,G+11.2,-10.3]],['Compuerta + servo',[14.2,G,-8]],['Comedero',[19,4,0]]
  ];
  const lblWrap=$('#labels');
  const LEFT={'Mini tornillo (suplemento)':1,'ESP32 + RTC':1,'Cámara de pesado':1};
  const lbls=LB.map(l=>{const d=document.createElement('div');d.className='lbl'+(LEFT[l[0]]?' l':'');d.textContent=l[0];lblWrap.appendChild(d);return{el:d,v:new THREE.Vector3(l[1][0],l[1][1],l[1][2])}});
  let showLabels=window.innerWidth>760;
  const tmpV=new THREE.Vector3();
  function updLabels(w,h){
    lblWrap.style.display=showLabels?'block':'none';if(!showLabels)return;
    for(const l of lbls){
      tmpV.copy(l.v).project(camera);
      const ok=tmpV.z<1&&Math.abs(tmpV.x)<1.05&&Math.abs(tmpV.y)<1.05;
      l.el.style.display=ok?'block':'none';
      if(ok){l.el.style.left=((tmpV.x*0.5+0.5)*w)+'px';l.el.style.top=((-tmpV.y*0.5+0.5)*h)+'px'}
    }
  }
  const btnL=$('#btnLabels');btnL.setAttribute('aria-pressed',String(showLabels));
  btnL.addEventListener('click',()=>{showLabels=!showLabels;btnL.setAttribute('aria-pressed',String(showLabels))});
  let closed=false;const btnC=$('#btnClosed');
  btnC.addEventListener('click',()=>{
    closed=!closed;btnC.setAttribute('aria-pressed',String(closed));
    M.front.opacity=closed?1:0.1;M.front.depthWrite=closed;frontLabel.visible=closed;
  });

  /* ---- tamaño ---- */
  let W=0,H=0;
  function resize(){
    const r=vp.getBoundingClientRect();W=Math.max(10,r.width);H=Math.max(10,r.height);
    renderer.setSize(W,H,false);camera.aspect=W/H;camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(vp);resize();

  /* ---- tema (pared/piso) ---- */
  function applyTheme(){
    const t=getComputedStyle(document.documentElement).getPropertyValue('--wall-tint').trim()||'#d6cdbb';
    M.wood.color.set(t);M.floor.color.set(t==='#d6cdbb'?0xa38f66:0x5a4d36);
  }
  applyTheme();
  try{window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme)}catch(e){}
  new MutationObserver(applyTheme).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

  /* ---- render (lee el estado S) ---- */
  const wetCol=new THREE.Color();
  let tm=0;
  function render(dtReal){
    tm+=dtReal;
    // cámara suave
    const k=1-Math.exp(-6*dtReal);
    for(const key2 of ['az','el','r','tx','ty','tz'])cam[key2]+=(camT[key2]-cam[key2])*k;
    applyCam();
    // rotor
    rotorG.rotation.x=S.th+(S.shake?S.shake*Math.sin(tm*70):0);
    rotorG.position.y=ROTOR_Y+(S.shake?0.06*Math.sin(tm*83):0);
    augerG.rotation.x=S.augA;pumpG.rotation.z=-S.pumpA;
    gateG.rotation.x=S.gate;horn.rotation.x=S.gate;horn.position.set(13.4,G-1.5*Math.sin(S.gate)*0,-8);
    // nivel tolva / suministros
    const lv=hopLevel();
    hopCylFeed.visible=lv>0.05;hopCylFeed.scale.y=Math.max(0.01,lv);hopCylFeed.position.y=86+lv/2;
    const cf=clamp(S.stock/CONE_G,0,1);hopConeFeed.visible=cf>0.02;hopConeFeed.scale.set(Math.max(0.2,cf),Math.max(0.05,cf),Math.max(0.2,cf));hopConeFeed.position.y=80+3*Math.max(0.05,cf);
    tubeFeed.visible=S.stock>5;
    const sf=clamp(S.sup/500,0,1);supCone.visible=sf>0.02;supCone.scale.set(1,Math.max(0.05,sf),1);supCone.position.y=AY+3.15+7.5*sf/2;
    const bl=clamp(S.liq/1000,0,1)*13;bottleLiq.visible=bl>0.05;bottleLiq.scale.y=Math.max(0.01,bl);bottleLiq.position.y=54.4+0.5+bl/2;
    // montón en la cámara
    const h=chH();
    chPile.visible=h>0.03;chPile.scale.set(1,Math.max(0.01,h),1);chPile.position.set(0,G+0.3+h/2,0);
    const wet=clamp(S.chL/Math.max(1,chT())*8,0,0.55);
    wetCol.setRGB(1-wet*0.7,1-wet*0.75,1-wet*0.8);M.pellet.color.copy(wetCol);
    // montón en el comedero
    const ts=troughShape();
    trPile.visible=S.trM>0.5;trPile.scale.set(ts.rx,Math.max(0.01,ts.h),ts.rz);trPile.position.set(0,0.5+ts.h/2,0);
    // cubo
    const c=S.cube;cubeMesh.visible=!!c.on;
    if(c.on){
      if(c.mode==='stuck'||c.mode==='fall'){cubeMesh.position.set(c.x+0.2,c.y,c.z);cubeMesh.rotation.set(0.6+c.rx*0.3,0.4,0.9+c.rz*0.3)}
      else{cubeMesh.position.set(c.x+0.2,c.y,c.z);cubeMesh.rotation.set(c.rx,c.ry,c.rz)}
    }
    // partículas
    let np=0,ns=0,nd=0;
    for(let i=0;i<parts.length;i++){
      const p=parts[i];if(p.delay>0)continue;
      dummy.position.set(p.x,p.y,p.z);
      if(p.k==='p'||p.k==='d'){if(np>=900)continue;dummy.rotation.set(p.rot,p.rot*0.7,p.rot*0.4);dummy.scale.set(1,1,1);dummy.updateMatrix();iPel.setMatrixAt(np,dummy.matrix);iPel.setColorAt(np,pelCols[p.c]);np++}
      else if(p.k==='s'){if(ns>=400)continue;dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();iPow.setMatrixAt(ns++,dummy.matrix)}
      else{if(nd>=200)continue;dummy.rotation.set(0,0,0);dummy.scale.set(1,1.25,1);dummy.updateMatrix();iDrp.setMatrixAt(nd++,dummy.matrix)}
    }
    iPel.count=np;iPow.count=ns;iDrp.count=nd;
    iPel.instanceMatrix.needsUpdate=true;iPow.instanceMatrix.needsUpdate=true;iDrp.instanceMatrix.needsUpdate=true;
    if(iPel.instanceColor)iPel.instanceColor.needsUpdate=true;
    // LED de estado
    const jam=S.jamS&&S.jamS.mode!=='pause';
    const run=S.phase!=='idle'&&S.phase!=='done';
    const col=jam?0xe74c3c:run?0x3b9dff:0x2ecc71;
    const pulse=jam?(0.5+0.5*Math.sin(tm*14)):run?(0.6+0.4*Math.sin(tm*6)):(0.45+0.55*Math.max(0,Math.sin(tm*2.2)));
    led.emissive.setHex(col);led.emissiveIntensity=0.3+pulse*1.4;ledB.emissive.setHex(col);ledB.emissiveIntensity=0.3+pulse*1.4;
    renderer.render(scene,camera);
    updLabels(W,H);
  }
  applyCam();
  return{render,setCam};
}
