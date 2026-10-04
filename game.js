/* Little Bombers Returns — 3D clone (Bomberman-like). Desktop + 3D + 4 players + menus + synth sounds. */
(function(){
"use strict";
var TILE=2, W=15, H=13;
var settings={sound:true,music:true,vol:0.7,shadow:true,shake:true};
var mode="menu", paused=false, gameOver=false;
var setupMode="adventure";
var selectedChar=0;
var battleSlots=[{type:"human"},{type:"cpu"},{type:"cpu"},{type:"cpu"}];
var roundsToWin=3, mapType="classic", timeLimit=180, stageNum=1, difficulty="normal";
var wins=[0,0,0,0];

var CHARS=[
 {id:0,name:"بومبر أبيض",en:"White",color:0xf2f2f2,css:"#f2f2f2",dark:0x9e9e9e,desc:"البطل الأصلي! متوازن وسريع."},
 {id:1,name:"بومبر أحمر",en:"Red",color:0xe53935,css:"#e53935",dark:0x8e1414,desc:"شرس وقوي، المفضل في المعركة."},
 {id:2,name:"بومبر أزرق",en:"Blue",color:0x1e88e5,css:"#1e88e5",dark:0x0d3c66,desc:"هادئ وذكي، يراوغ ببراعة."},
 {id:3,name:"بومبر أخضر",en:"Green",color:0x43a047,css:"#43a047",dark:0x1b4d1e,desc:"مرح وخفيف الحركة في المتاهة."}
];
var CONTROLS=[
 {up:"KeyW",down:"KeyS",left:"KeyA",right:"KeyD",bomb:"Space"},
 {up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight",bomb:"Enter"},
 {up:"KeyI",down:"KeyK",left:"KeyJ",right:"KeyL",bomb:"KeyU"},
 {up:"Numpad8",down:"Numpad5",left:"Numpad4",right:"Numpad6",bomb:"Numpad0"}
];
var CTRL_LABEL=["WASD + مسافة","أسهم + Enter","IJKL + U","Numpad + 0"];

/* ================= AUDIO (synth, LBR-like) ================= */
var AC=null, musicTimer=null, musicStep=0, noiseBuf=null;
function ac(){ if(!AC){ try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} } if(AC&&AC.state==="suspended")AC.resume(); return AC; }
function master(g){ g.gain.value=settings.vol; return g; }
function beep(freq,dur,type,vol,slide){
 if(!settings.sound)return; var c=ac(); if(!c)return;
 var o=c.createOscillator(),g=c.createGain(); o.type=type||"square"; o.frequency.value=freq;
 if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,slide),c.currentTime+dur);
 g.gain.value=(vol||0.25)*settings.vol; o.connect(g); g.connect(c.destination);
 o.start(); o.stop(c.currentTime+dur);
}
function noise(dur,vol,lp){
 if(!settings.sound)return; var c=ac(); if(!c)return;
 if(!noiseBuf){ noiseBuf=c.createBuffer(1,c.sampleRate*1,c.sampleRate); var d=noiseBuf.getChannelData(0); for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1; }
 var s=c.createBufferSource(); s.buffer=noiseBuf; s.loop=true;
 var f=c.createBiquadFilter(); f.type="lowpass"; f.frequency.value=lp||1200;
 var g=c.createGain(); g.gain.value=(vol||0.4)*settings.vol;
 s.connect(f); f.connect(g); g.connect(c.destination); s.start(); s.stop(c.currentTime+dur);
}
var SFX={
 move:function(){beep(220,0.03,"square",0.05);},
 select:function(){beep(660,0.08,"square",0.2);setTimeout(function(){beep(880,0.1,"square",0.2);},70);},
 back:function(){beep(440,0.08,"square",0.15);},
 place:function(){beep(180,0.15,"sine",0.35,90);noise(0.05,0.1,3000);},
 explode:function(){noise(0.7,0.5,900);beep(120,0.5,"sawtooth",0.3,30);},
 brick:function(){noise(0.25,0.3,2500);},
 power:function(){var n=[523,659,784,1046];n.forEach(function(f,i){setTimeout(function(){beep(f,0.12,"square",0.2);},i*70);});},
 death:function(){var n=[400,300,220,140,80];n.forEach(function(f,i){setTimeout(function(){beep(f,0.15,"sawtooth",0.25);},i*100);});},
 win:function(){var n=[523,659,784,1046,1318];n.forEach(function(f,i){setTimeout(function(){beep(f,0.2,"square",0.25);},i*120);});},
 door:function(){beep(392,0.15,"sine",0.25);setTimeout(function(){beep(587,0.25,"sine",0.25);},120);},
 kick:function(){beep(300,0.08,"square",0.2,600);},
 deny:function(){beep(150,0.15,"square",0.2);}
};
// chiptune loop
var MELODY=[262,0,294,0,330,0,392,0,330,0,294,0,262,0,0,0, 196,0,220,0,247,0,262,0,294,330,294,220,196,0,0,0];
var BASS=[131,131,0,131, 98,98,0,98, 110,110,0,110, 131,0,98,0];
function startMusic(){ stopMusic(); if(!settings.music)return; musicStep=0;
 musicTimer=setInterval(function(){ if(!settings.music||!settings.sound)return; var c=ac(); if(!c)return;
  var m=MELODY[musicStep%MELODY.length], b=BASS[Math.floor(musicStep/2)%BASS.length];
  if(m){var o=c.createOscillator(),g=c.createGain();o.type="square";o.frequency.value=m;g.gain.value=0.06*settings.vol;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+0.18);}
  if(b&&musicStep%2===0){var o2=c.createOscillator(),g2=c.createGain();o2.type="triangle";o2.frequency.value=b;g2.gain.value=0.12*settings.vol;o2.connect(g2);g2.connect(c.destination);o2.start();o2.stop(c.currentTime+0.3);}
  musicStep++;
 },170);
}
function stopMusic(){ if(musicTimer){clearInterval(musicTimer);musicTimer=null;} }

/* ================= INPUT ================= */
var keys={};
window.addEventListener("keydown",function(e){
 keys[e.code]=true;
 if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code)>=0)e.preventDefault();
 if(e.code==="KeyP"&&mode.indexOf("play")===0)togglePause();
 if(e.code==="KeyM")toggleMute();
 if(e.code==="KeyF")toggleFull();
 if(e.code==="Enter"&&mode==="menu")openSetup("adventure");
 ac();
});
window.addEventListener("keyup",function(e){keys[e.code]=false;});

/* ================= GAME STATE ================= */
var grid=[], bricks=[], bombs=[], flames=[], powers=[], enemies=[], players=[], door=null;
var timeLeft=180, roundNum=1, levelNum=1, shakeT=0;
var scene,camera,renderer,canvas,ctx2d,use3D=true;
var cellMeshes=[], bomberMeshes=[], bombMeshes={}, flameMeshes=[], powerMeshes={}, enemyMeshes={};
var floorMesh=null, lightExp=null;
var lastT=0, aiTick=0, msgTimeout=null;

canvas=document.getElementById("c3d");

function show(id){ document.querySelectorAll(".screen").forEach(function(s){s.classList.remove("active");}); document.getElementById(id).classList.add("active"); }
function banner(t,ms){ var b=document.getElementById("msg-banner"); b.textContent=t; b.classList.remove("hidden"); if(msgTimeout)clearTimeout(msgTimeout); if(ms)msgTimeout=setTimeout(function(){b.classList.add("hidden");},ms); }

/* ---------- setup UI ---------- */
function buildCharGrid(){
 var g=document.getElementById("char-grid"); g.innerHTML="";
 CHARS.forEach(function(c,i){
  var d=document.createElement("div"); d.className="char-card"+(i===selectedChar?" selected":"");
  d.innerHTML='<div class="face">💣</div><div class="dot" style="background:'+c.css+'"></div><h3>'+c.name+'</h3><p>'+c.desc+'</p>';
  d.onclick=function(){selectedChar=i;SFX.select();buildCharGrid();};
  g.appendChild(d);
 });
}
function buildSlots(){
 var w=document.getElementById("slot-rows"); w.innerHTML="";
 CHARS.forEach(function(c,i){
  var row=document.createElement("div"); row.className="slot";
  row.innerHTML='<div class="dot" style="background:'+c.css+'"></div><b>'+c.name+'</b><span style="font-size:12px;color:#9d8fc7">'+CTRL_LABEL[i]+'</span>';
  var sel=document.createElement("select");
  var opts=i===0?["human","cpu","off"]:["cpu","human","off"];
  var labels={human:"🧑 إنسان",cpu:"🤖 كمبيوتر",off:"⛔ متوقف"};
  opts.forEach(function(o){var op=document.createElement("option");op.value=o;op.textContent=labels[o];sel.appendChild(op);});
  sel.value=battleSlots[i].type;
  sel.onchange=function(){battleSlots[i].type=sel.value;SFX.select();};
  row.appendChild(sel); w.appendChild(row);
 });
 var st=document.getElementById("sel-stage"); if(!st.options.length){ for(var i=1;i<=8;i++){var o=document.createElement("option");o.value=i;o.textContent="مرحلة "+i;st.appendChild(o);} }
}
function openSetup(m){
 setupMode=m; SFX.select(); ac(); startMusic();
 document.getElementById("setup-title").textContent = m==="adventure"?"🎮 المغامرة — اختر شخصيتك":"⚔️ المعركة — ٤ لاعبين";
 document.getElementById("setup-desc").textContent = m==="adventure"?"العب مثل Little Bombers الأصلية: وحوش + باب سري + ٨ مراحل":"اضبط كل لاعب: إنسان على نفس الكيبورد أو كمبيوتر ذكي";
 document.getElementById("battle-config").classList.toggle("hidden",m!=="battle");
 document.getElementById("adv-config").classList.toggle("hidden",m!=="adventure");
 buildCharGrid(); buildSlots(); show("screen-setup");
}

/* ---------- map gen ---------- */
function genMap(){
 grid=[];bricks=[];powers=[];bombs=[];flames=[];enemies=[];door=null;
 for(var y=0;y<H;y++){grid.push([]);for(var x=0;x<W;x++){
   if(x===0||y===0||x===W-1||y===H-1)grid[y].push(1);
   else if(x%2===0&&y%2===0)grid[y].push(1);
   else grid[y].push(0);
 }}
 var density = mapType==="arena"?0.3:(difficulty==="hard"?0.62:0.52);
 if(mapType==="arena"){ for(var y=1;y<H-1;y++)for(var x=1;x<W-1;x++){ if(grid[y][x]===1)continue; grid[y][x]=0; } }
 var safe=[[1,1],[1,2],[2,1],[W-2,H-2],[W-3,H-2],[W-2,H-3],[1,H-2],[2,H-2],[1,H-3],[W-2,1],[W-3,1],[W-2,2]];
 function isSafe(x,y){return safe.some(function(s){return s[0]===x&&s[1]===y;});}
 for(var y=1;y<H-1;y++)for(var x=1;x<W-1;x++){
  if(grid[y][x]!==0||isSafe(x,y))continue;
  if(mapType==="arena"&&(x+y)%3===0)continue;
  if(Math.random()<density){grid[y][x]=2;bricks.push({x:x,y:y});}
 }
 // powerups hidden
 var ptypes=["fire","fire","bomb","bomb","speed","kick","shield","life"];
 bricks.forEach(function(b){ if(Math.random()<0.34){b.power=ptypes[Math.floor(Math.random()*ptypes.length)];} });
 if(mode==="play-adv"){
  // door under random brick
  var cands=bricks.filter(function(b){return !b.power;});
  var pick=cands.length?cands[Math.floor(Math.random()*cands.length)]:bricks[Math.floor(Math.random()*bricks.length)];
  if(pick){pick.door=true;}
 }
}
function cellBlocked(x,y,forBomb){
 if(x<0||y<0||x>=W||y>=H)return true;
 if(grid[y][x]===1||grid[y][x]===2)return true;
 if(forBomb){ for(var i=0;i<bombs.length;i++)if(bombs[i].x===x&&bombs[i].y===y)return true; }
 return false;
}
function spawnPlayers(isAdv){
 players=[];
 var starts=[{x:1,y:1},{x:W-2,y:H-2},{x:W-2,y:1},{x:1,y:H-2}];
 for(var i=0;i<4;i++){
  var human;
  if(isAdv)human=(i===selectedChar);
  else human=(battleSlots[i].type==="human");
  var active=isAdv?(i===selectedChar):(battleSlots[i].type!=="off");
  // adventure: only selected plays, others hidden; but battle needs all active
  if(isAdv&&i!==selectedChar){active=false;}
  players.push({id:i,char:CHARS[i],x:starts[i].x,y:starts[i].y,px:starts[i].x,py:starts[i].y,
   alive:active,active:active,human:human, speed:isAdv?4.4:4.2, maxBombs:1,fire:2,kick:false,shield:0,
   dir:null,moving:false,ai:{dir:null,t:0},bombCool:0,inv:0});
 }
}
function spawnEnemies(){
 enemies=[];enemyMeshes={};
 var count=Math.min(2+levelNum, stageNum+2+ (difficulty==="hard"?2:0));
 if(difficulty==="easy")count=Math.max(2,count-1);
 var types=["balloon","drop","ghost"];
 for(var i=0;i<count;i++){
  var x,y,tries=0;
  do{x=3+Math.floor(Math.random()*(W-6));y=3+Math.floor(Math.random()*(H-6));tries++;}
  while(tries<80&&(grid[y][x]!==0||Math.abs(x-1)+Math.abs(y-1)<5));
  if(grid[y]&&grid[y][x]===0){
   var tp=types[Math.floor(Math.random()*Math.min(types.length,1+Math.floor(levelNum/2)))];
   if(levelNum>=3&&Math.random()<0.3)tp="ghost";
   enemies.push({x:x,y:y,px:x,py:y,dir:{x:1,y:0},speed:tp==="drop"?2.6:(tp==="ghost"?1.8:1.4),type:tp,alive:true,t:Math.random()*5});
  }
 }
}

/* ================= THREE SETUP ================= */
function canvasTex(draw){
 var c=document.createElement("canvas");c.width=c.height=128;draw(c.getContext("2d"));var t=new THREE.CanvasTexture(c);return t;
}
var texFloor,texBrick,texWall;
function initThree(){
 try{
  if(typeof THREE==="undefined"){use3D=false;init2D();return;}
  renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  if(settings.shadow)renderer.shadowMap.enabled=true;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x120a24);scene.fog=new THREE.Fog(0x120a24,30,70);
  camera=new THREE.PerspectiveCamera(46,1,0.1,200);
  positionCam();
  var amb=new THREE.AmbientLight(0xffffff,0.55);scene.add(amb);
  var dir=new THREE.DirectionalLight(0xfff2cc,0.9);dir.position.set(8,20,6);dir.castShadow=settings.shadow;
  dir.shadow.camera.left=-20;dir.shadow.camera.right=20;dir.shadow.camera.top=20;dir.shadow.camera.bottom=-20;scene.add(dir);
  lightExp=new THREE.PointLight(0xff7722,0,25);lightExp.position.set(0,4,0);scene.add(lightExp);
  texFloor=canvasTex(function(g){g.fillStyle="#3e8948";g.fillRect(0,0,128,128);g.fillStyle="#379a44";for(var i=0;i<8;i++)for(var j=0;j<8;j++)if((i+j)%2===0)g.fillRect(i*16,j*16,16,16);g.strokeStyle="rgba(0,0,0,.25)";g.strokeRect(0,0,128,128);});
  texBrick=canvasTex(function(g){g.fillStyle="#b5651d";g.fillRect(0,0,128,128);g.fillStyle="#d98a3d";g.fillRect(4,4,120,26);g.fillRect(4,34,58,26);g.fillRect(66,34,58,26);g.fillRect(4,64,58,26);g.fillRect(66,64,58,26);g.fillRect(4,94,120,26);g.strokeStyle="#5d2f0c";g.lineWidth=6;g.strokeRect(0,0,128,128);});
  texWall=canvasTex(function(g){var gr=g.createLinearGradient(0,0,0,128);gr.addColorStop(0,"#8e9eab");gr.addColorStop(1,"#4a5a6a");g.fillStyle=gr;g.fillRect(0,0,128,128);g.fillStyle="rgba(255,255,255,.25)";g.fillRect(0,0,128,14);g.fillStyle="rgba(0,0,0,.3)";for(var i=0;i<4;i++)g.fillRect(i*32,40,4,88);g.strokeStyle="#222";g.lineWidth=8;g.strokeRect(0,0,128,128);});
  resize();window.addEventListener("resize",resize);
 }catch(e){use3D=false;init2D();}
}
function positionCam(){
 var cx=0,cz=2.5,cy=21;
 camera.position.set(cx,cy,cz+9);camera.lookAt(cx,0,cz-1);
}
function resize(){
 var w=document.getElementById("canvas-wrap");
 var ww=w.clientWidth||800,hh=w.clientHeight||500;
 canvas.width=ww;canvas.height=hh;
 if(use3D&&renderer){renderer.setSize(ww,hh,false);camera.aspect=ww/hh;camera.updateProjectionMatrix();}
}
function init2D(){ ctx2d=canvas.getContext("2d"); resize(); }

function wx(x){return (x-W/2+0.5)*TILE;}
function wz(y){return (y-H/2+0.5)*TILE;}

function clearMeshes(){
 if(!use3D)return;
 for(var i=scene.children.length-1;i>=0;i--){var o=scene.children[i];if(o.isLight&&o!==lightExp){} }
 // remove dynamic groups
 [cellMeshes,flameMeshes].forEach(function(arr){arr.forEach(function(m){scene.remove(m);});arr.length=0;});
 Object.keys(bombMeshes).forEach(function(k){scene.remove(bombMeshes[k]);delete bombMeshes[k];});
 Object.keys(powerMeshes).forEach(function(k){scene.remove(powerMeshes[k]);delete powerMeshes[k];});
 Object.keys(enemyMeshes).forEach(function(k){scene.remove(enemyMeshes[k]);delete enemyMeshes[k];});
 bomberMeshes.forEach(function(m){if(m)scene.remove(m);});bomberMeshes=[];
 if(floorMesh){scene.remove(floorMesh);floorMesh=null;}
 // remove leftover walls by tag
 var rm=[];scene.traverse(function(o){if(o.userData&&o.userData.tag)rm.push(o);});rm.forEach(function(o){scene.remove(o);});
}
function buildStatic(){
 if(!use3D)return;
 clearMeshes();
 // floor
 var fg=new THREE.PlaneGeometry(W*TILE+6,H*TILE+6);
 var fm=new THREE.MeshLambertMaterial({map:texFloor});
 texFloor.wrapS=texFloor.wrapT=THREE.RepeatWrapping;texFloor.repeat.set(W,H);
 floorMesh=new THREE.Mesh(fg,fm);floorMesh.rotation.x=-Math.PI/2;floorMesh.receiveShadow=true;scene.add(floorMesh);
 // cells
 var wallG=new THREE.BoxGeometry(TILE,TILE,TILE),wallM=new THREE.MeshLambertMaterial({map:texWall});
 var brickG=new THREE.BoxGeometry(TILE*0.96,TILE*0.9,TILE*0.96),brickM=new THREE.MeshLambertMaterial({map:texBrick});
 for(var y=0;y<H;y++)for(var x=0;x<W;x++){
  if(grid[y][x]===1){var m=new THREE.Mesh(wallG,wallM);m.position.set(wx(x),TILE/2,wz(y));m.castShadow=true;m.receiveShadow=true;m.userData.tag="wall";scene.add(m);cellMeshes.push(m);}
  else if(grid[y][x]===2){var b=new THREE.Mesh(brickG,brickM);b.position.set(wx(x),TILE*0.45,wz(y));b.castShadow=true;b.userData.tag="brick";b.userData.gx=x;b.userData.gy=y;scene.add(b);cellMeshes.push(b);}
 }
 // door marker
 if(doorMesh){scene.remove(doorMesh);doorMesh=null;}
 bomberMeshes=[];
 players.forEach(function(p){ if(!p.active)return; var m=makeBomber(p.char.color); m.position.set(wx(p.px),0,wz(p.py)); scene.add(m); bomberMeshes[p.id]=m; });
 enemies.forEach(function(e,i){ var m=makeEnemy(e.type); m.position.set(wx(e.px),0,wz(e.py)); scene.add(m); enemyMeshes[i]=m; });
}
var doorMesh=null;
function makeBomber(color){
 var g=new THREE.Group();
 var bodyM=new THREE.MeshPhongMaterial({color:color,shininess:60});
 var body=new THREE.Mesh(new THREE.SphereGeometry(0.75,20,16),bodyM);body.position.y=0.95;body.castShadow=true;g.add(body);
 var belt=new THREE.Mesh(new THREE.TorusGeometry(0.55,0.12,10,20),new THREE.MeshPhongMaterial({color:0x222222}));belt.rotation.x=Math.PI/2;belt.position.y=0.7;g.add(belt);
 var buckle=new THREE.Mesh(new THREE.BoxGeometry(0.3,0.22,0.1),new THREE.MeshPhongMaterial({color:0xffd54f}));buckle.position.set(0,0.7,0.6);g.add(buckle);
 var face=new THREE.Mesh(new THREE.SphereGeometry(0.5,16,12,0,Math.PI*2,0,Math.PI/2.4),new THREE.MeshPhongMaterial({color:0xfff8e1}));face.position.set(0,1.05,0.28);face.rotation.x=-0.3;g.add(face);
 var eM=new THREE.MeshBasicMaterial({color:0x111111});
 var e1=new THREE.Mesh(new THREE.SphereGeometry(0.11,10,8),eM);e1.position.set(-0.2,1.15,0.68);g.add(e1);
 var e2=e1.clone();e2.position.x=0.2;g.add(e2);
 var ant=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.5),new THREE.MeshPhongMaterial({color:0x333333}));ant.position.y=1.85;g.add(ant);
 var tip=new THREE.Mesh(new THREE.SphereGeometry(0.14,12,10),new THREE.MeshBasicMaterial({color:0xff5252}));tip.position.y=2.12;g.add(tip);g.userData.tip=tip;
 var fM=new THREE.MeshPhongMaterial({color:0x333333});
 var f1=new THREE.Mesh(new THREE.SphereGeometry(0.22,10,8),fM);f1.position.set(-0.3,0.22,0.1);g.add(f1);
 var f2=f1.clone();f2.position.x=0.3;g.add(f2);g.userData.f1=f1;g.userData.f2=f2;
 g.userData.body=body;
 return g;
}
function makeEnemy(type){
 var g=new THREE.Group();var col=type==="ghost"?0xce93d8:(type==="drop"?0x4fc3f7:0xba68c8);
 var b=new THREE.Mesh(new THREE.SphereGeometry(0.65,16,12),new THREE.MeshPhongMaterial({color:col}));b.position.y=0.7;b.castShadow=true;g.add(b);
 var eM=new THREE.MeshBasicMaterial({color:0xffffff});
 var pM=new THREE.MeshBasicMaterial({color:0x111111});
 [-0.2,0.2].forEach(function(x){var e=new THREE.Mesh(new THREE.SphereGeometry(0.18,10,8),eM);e.position.set(x,0.85,0.5);g.add(e);var p=new THREE.Mesh(new THREE.SphereGeometry(0.08,8,6),pM);p.position.set(x,0.85,0.65);g.add(p);});
 g.userData.body=b;return g;
}
function makeBombMesh(){
 var g=new THREE.Group();
 var b=new THREE.Mesh(new THREE.SphereGeometry(0.6,18,14),new THREE.MeshPhongMaterial({color:0x161616,shininess:80}));b.position.y=0.6;b.castShadow=true;g.add(b);
 var cap=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.16,0.2),new THREE.MeshPhongMaterial({color:0x8d6e63}));cap.position.y=1.2;g.add(cap);
 var spark=new THREE.Mesh(new THREE.SphereGeometry(0.14,10,8),new THREE.MeshBasicMaterial({color:0xffeb3b}));spark.position.y=1.45;g.add(spark);g.userData.spark=spark;
 var skull=new THREE.Mesh(new THREE.SphereGeometry(0.3,12,10),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9}));skull.position.y=0.6;skull.scale.set(0.6,0.7,0.2);skull.visible=false;g.add(skull);
 return g;
}
function makeFlameMesh(){
 var g=new THREE.BoxGeometry(TILE*0.9,1.1,TILE*0.9);
 var m=new THREE.MeshBasicMaterial({color:0xff9800,transparent:true,opacity:0.95});
 var mesh=new THREE.Mesh(g,m);mesh.position.y=0.55;mesh.userData.tag="fx";return mesh;
}
function powerColor(t){return t==="fire"?"#ff5722":t==="bomb"?"#222":t==="speed"?"#ffeb3b":t==="kick"?"#8d6e63":t==="shield"?"#1e88e5":"#e91e63";}
function powerIcon(t){return t==="fire"?"🔥":t==="bomb"?"💣":t==="speed"?"⚡":t==="kick"?"👟":t==="shield"?"🛡️":"❤️";}
function makePowerMesh(t){
 var g=new THREE.Group();
 var box=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.9,0.9),new THREE.MeshPhongMaterial({color:powerColor(t),emissive:0x333333}));box.position.y=0.6;box.castShadow=true;g.add(box);
 // icon sprite
 var cv=document.createElement("canvas");cv.width=cv.height=64;var c2=cv.getContext("2d");c2.font="44px serif";c2.textAlign="center";c2.textBaseline="middle";c2.fillText(powerIcon(t),32,36);
 var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv)}));sp.scale.set(0.9,0.9,1);sp.position.y=0.65;g.add(sp);
 g.userData.box=box;return g;
}

/* ================= GAME FLOW ================= */
function startGame(){
 mode = setupMode==="adventure"?"play-adv":"play-battle";
 document.getElementById("overlay-end").classList.add("hidden");
 document.getElementById("overlay-pause").classList.add("hidden");
 paused=false;gameOver=false;
 if(mode==="play-adv"){ levelNum=stageNum; timeLeft=200; roundNum=1; }
 else { levelNum=1; timeLeft=timeLimit; roundNum=1; wins=[0,0,0,0]; }
 // read selects
 roundsToWin=parseInt(document.getElementById("sel-rounds").value||"3");
 mapType=document.getElementById("sel-map").value||"classic";
 timeLimit=parseInt(document.getElementById("sel-time").value||"180");
 stageNum=parseInt(document.getElementById("sel-stage").value||"1");
 difficulty=document.getElementById("sel-diff").value||"normal";
 if(mode==="play-battle")timeLeft=timeLimit; else timeLeft=200;
 if(mode==="play-adv")levelNum=stageNum;
 newRound();
 show("screen-game");resize();SFX.select();
}
function newRound(){
 genMap();
 spawnPlayers(mode==="play-adv");
 if(mode==="play-adv")spawnEnemies();
 else {enemies=[];}
 bombs=[];flames=[];powers=[];
 // reveal door object placeholder (actual pos from brick with door flag)
 door=null;
 buildStatic();
 refreshPowerMeshes();refreshHUD();
 banner(mode==="play-adv"?("المرحلة "+levelNum+" — اقضِ على الوحوش! 👾"):("الجولة "+roundNum+" — قاتل! ⚔️"),2200);
 SFX.door();
 lastT=performance.now();
}
function refreshHUD(){
 var w=document.getElementById("hud-players");w.innerHTML="";
 players.forEach(function(p){
  if(!p.active&&mode!=="play-adv")return;
  if(mode==="play-adv"&&!p.active)return;
  var d=document.createElement("div");d.className="pcard"+(p.alive?"":" dead");
  d.innerHTML='<div class="dot" style="background:'+p.char.css+'"></div><span>'+p.char.name+(p.human?" 🧑":" 🤖")+'</span><span class="score">💣'+p.maxBombs+' 🔥'+p.fire+'</span>'+(mode==="play-battle"?'<span class="score">🏆'+wins[p.id]+'</span>':"")+(p.shield?'<span>🛡️</span>':"");
  w.appendChild(d);
 });
 document.getElementById("hud-level").textContent=mode==="play-adv"?("🚪 المرحلة "+levelNum+" • 👾 "+enemies.filter(function(e){return e.alive;}).length):("⚔️ الجولة "+roundNum+" / "+roundsToWin);
}
function endRound(winnerId){
 if(gameOver)return;
 gameOver=true;
 var t=document.getElementById("end-title"),s=document.getElementById("end-sub");
 document.getElementById("overlay-end").classList.remove("hidden");
 if(mode==="play-adv"){
  if(winnerId==="win"){ SFX.win(); t.textContent="🎉 أحسنت! المرحلة كاملة"; 
   if(levelNum>=8){s.textContent="ختمت القلعة كلها! أنت بطل المفجرين 👑";levelNum=8;}
   else{s.textContent="استعد للمرحلة "+(levelNum+1)+"...";setTimeout(function(){levelNum++;stageNum=levelNum;timeLeft=200;gameOver=false;document.getElementById("overlay-end").classList.add("hidden");newRound();},2500);return;}
  } else { SFX.death(); t.textContent="💀 خسرت!"; s.textContent="حاول مجدداً — اضغط العب مجدداً"; }
 } else {
  if(winnerId==null||winnerId===undefined){SFX.deny();t.textContent="🤝 تعادل!";s.textContent="لا يوجد فائز في هذه الجولة";}
  else{wins[winnerId]++;SFX.win();t.textContent="🏆 الفائز: "+players[winnerId].char.name;var lead=wins.indexOf(Math.max.apply(null,wins));s.textContent="النقاط: "+wins.map(function(v,i){return CHARS[i].en+" "+v;}).join(" • ");}
  var champ=wins.findIndex(function(v){return v>=roundsToWin;});
  if(champ>=0){t.textContent="👑 بطل المعركة: "+players[champ].char.name+"!";s.textContent="فاز بـ "+wins[champ]+" جولات!";}
  else{ s.textContent+=" — الجولة القادمة..."; setTimeout(function(){ if(mode==="play-battle"&&gameOver){roundNum++;timeLeft=timeLimit;gameOver=false;document.getElementById("overlay-end").classList.add("hidden");newRound();} },2600); return; }
 }
 refreshHUD();
}

/* ================= ACTIONS ================= */
function tryPlaceBomb(p){
 if(!p.alive||gameOver||paused)return;
 if(p.bombCool>0)return;
 var gx=Math.round(p.px),gy=Math.round(p.py);
 for(var i=0;i<bombs.length;i++)if(bombs[i].x===gx&&bombs[i].y===gy)return;
 var active=bombs.filter(function(b){return b.owner===p.id;}).length;
 if(active>=p.maxBombs){if(p.human)SFX.deny();return;}
 bombs.push({x:gx,y:gy,t:2.5,fire:p.fire,owner:p.id,px:gx,py:gy,slide:null});
 p.bombCool=0.25;SFX.place();
 if(use3D){var m=makeBombMesh();m.position.set(wx(gx),0,wz(gy));scene.add(m);bombMeshes[gx+","+gy]=m;}
}
function explodeBomb(b){
 // remove
 var idx=bombs.indexOf(b);if(idx>=0)bombs.splice(idx,1);
 if(use3D&&bombMeshes[b.x+","+b.y]){scene.remove(bombMeshes[b.x+","+b.y]);delete bombMeshes[b.x+","+b.y];}
 var cells=[{x:b.x,y:b.y}];
 var dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
 dirs.forEach(function(d){
  for(var i=1;i<=b.fire;i++){
   var nx=b.x+d.x*i,ny=b.y+d.y*i;
   if(nx<0||ny<0||nx>=W||ny>=H)break;
   if(grid[ny][nx]===1)break;
   cells.push({x:nx,y:ny});
   if(grid[ny][nx]===2){break;}
  }
 });
 // chain + destroy
 cells.forEach(function(c){
  flames.push({x:c.x,y:c.y,t:0.65});
  // destroy brick
  if(grid[c.y]&&grid[c.y][c.x]===2){
   // only the first brick per dir already included; destroy it
   grid[c.y][c.x]=0;
   // remove brick mesh
   if(use3D){for(var k=0;k<cellMeshes.length;k++){var m=cellMeshes[k];if(m.userData.gx===c.x&&m.userData.gy===c.y){scene.remove(m);cellMeshes.splice(k,1);break;}}}
   var br=bricks.find(function(bb){return bb.x===c.x&&bb.y===c.y;});
   if(br){ if(br.power)powers.push({x:c.x,y:c.y,type:br.power}); if(br.door){door={x:c.x,y:c.y,open:false};SFX.door();banner("🚪 ظهر الباب السري!",1800);} }
   SFX.brick();
  }
  // chain other bombs
  bombs.slice().forEach(function(ob){ if(ob.x===c.x&&ob.y===c.y)setTimeout(function(){if(bombs.indexOf(ob)>=0)explodeBomb(ob);},30); });
 });
 SFX.explode();
 if(settings.shake)shakeT=0.35;
 if(lightExp)lightExp.intensity=3;
 if(use3D){cells.forEach(function(c){var m=makeFlameMesh();m.position.set(wx(c.x),0,wz(c.y));scene.add(m);flameMeshes.push(m);});}
 refreshPowerMeshes();
}
function refreshPowerMeshes(){
 if(!use3D)return;
 Object.keys(powerMeshes).forEach(function(k){scene.remove(powerMeshes[k]);delete powerMeshes[k];});
 powers.forEach(function(pw){var m=makePowerMesh(pw.type);m.position.set(wx(pw.x),0,wz(pw.y));scene.add(m);powerMeshes[pw.x+","+pw.y]=m;});
 if(door&&!doorMesh){var g=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.3,1.2),new THREE.MeshPhongMaterial({color:0x3e2723}));g.position.set(wx(door.x),0.15,wz(door.y));g.userData.tag="door";scene.add(g);doorMesh=g;}
 if(!door&&doorMesh){scene.remove(doorMesh);doorMesh=null;}
 if(doorMesh&&door){doorMesh.position.set(wx(door.x),0.15,wz(door.y));doorMesh.material.color.setHex(door.open?0x00e676:0x3e2723);}
}

/* ================= UPDATE ================= */
function collide(px,py,r){
 // check 4 corners
 var pts=[{x:px-r,y:py-r},{x:px+r,y:py-r},{x:px-r,y:py+r},{x:px+r,y:py+r}];
 for(var i=0;i<pts.length;i++){
  var gx=Math.floor(pts[i].x+0.5),gy=Math.floor(pts[i].y+0.5);
  // allow center pass: use rounded cell of point
  if(cellBlocked(gx,gy)) {
   // but bombs: allow walking off the bomb you just placed
   var onBomb=false;
   for(var b=0;b<bombs.length;b++){ if(bombs[b].x===Math.round(px)&&bombs[b].y===Math.round(py)){/*standing*/} }
   return true;
  }
 }
 return false;
}
function isBombCell(gx,gy,exceptStand){
 for(var i=0;i<bombs.length;i++){if(bombs[i].x===gx&&bombs[i].y===gy)return true;}
 return false;
}
function tryMove(p,dx,dy,dt){
 if(!p.alive)return;
 var sp=p.speed*dt;
 var nx=p.px+dx*sp, ny=p.py+dy*sp;
 // per-axis with radius
 var r=0.32;
 function free(x,y){
  var gx=Math.round(x),gy=Math.round(y);
  // check target cell walkability sampling the bbox
  var cells=[[Math.floor(x-r+0.5),Math.floor(y-r+0.5)],[Math.floor(x+r+0.5),Math.floor(y-r+0.5)],[Math.floor(x-r+0.5),Math.floor(y+r+0.5)],[Math.floor(x+r+0.5),Math.floor(y+r+0.5)]];
  // simpler: check grid at rounded probe points
  var probes=[{x:x-r,y:y-r},{x:x+r,y:y-r},{x:x-r,y:y+r},{x:x+r,y:y+r}];
  for(var i=0;i<probes.length;i++){var cx=Math.round(probes[i].x),cy=Math.round(probes[i].y);
   if(cx<0||cy<0||cx>=W||cy>=H)return false;
   if(grid[cy][cx]===1||grid[cy][cx]===2)return false;
   // bomb collision (allow if currently standing on it)
   var standX=Math.round(p.px),standY=Math.round(p.py);
   if(isBombCell(cx,cy)&&(cx!==standX||cy!==standY)){
    // kick?
    if(p.kick){ kickBomb(cx,cy,dx,dy); return false; }
    return false;
   }
  }
  return true;
 }
 if(dx!==0){ if(free(nx,p.py))p.px=nx; else { // snap assist
   var gy=Math.round(p.py); if(Math.abs(p.py-gy)>0.08){ p.py+= (gy>p.py?1:-1)*sp*0.7; } } }
 if(dy!==0){ if(free(p.px,ny))p.py=ny; else { var gx=Math.round(p.px); if(Math.abs(p.px-gx)>0.08){ p.px+=(gx>p.px?1:-1)*sp*0.7; } } }
 p.px=Math.max(1,Math.min(W-2,p.px));p.py=Math.max(1,Math.min(H-2,p.py));
}
function kickBomb(gx,gy,dx,dy){
 var b=bombs.find(function(bb){return bb.x===gx&&bb.y===gy;});
 if(!b||b.slide)return;
 var sx=Math.sign(dx),sy=Math.sign(dy);
 if(sx===0&&sy===0)return;
 var tx=gx+sx,ty=gy+sy;
 if(tx<0||ty<0||tx>=W||ty>=H||grid[ty][tx]!==0||isBombCell(tx,ty))return;
 b.slide={dx:sx,dy:sy};SFX.kick();
}
function hurt(p){
 if(!p.alive||p.inv>0)return;
 if(p.shield>0){p.shield--;p.inv=1.5;SFX.power();refreshHUD();return;}
 p.alive=false;SFX.death();
 checkEnd();
}
function checkEnd(){
 var aliveP=players.filter(function(p){return p.active&&p.alive;});
 if(mode==="play-adv"){
  var me=players.find(function(p){return p.active;});
  if(me&&!me.alive)endRound("lose");
  // win checked via door entry, not here
 } else {
  if(aliveP.length<=1){
   if(aliveP.length===1)endRound(aliveP[0].id); else endRound(null);
  }
 }
}
function dangerAt(gx,gy){
 for(var i=0;i<bombs.length;i++){var b=bombs[i];
  if(b.x===gx&&b.y===gy)return 3;
  if(b.x===gx&&Math.abs(b.y-gy)<=b.fire){
   var step=b.y<gy?1:-1,blocked=false;
   for(var y=b.y+step;y!==gy+step;y+=step){if(grid[y]&&grid[y][gx]===1){blocked=true;break;}if(grid[y]&&grid[y][gx]===2&&y!==gy){blocked=true;break;}}
   if(!blocked)return Math.max(0.5,2-b.t);
  }
  if(b.y===gy&&Math.abs(b.x-gx)<=b.fire){
   var stepx=b.x<gx?1:-1,bl=false;
   for(var x=b.x+stepx;x!==gx+stepx;x+=stepx){if(grid[gy]&&grid[gy][x]===1){bl=true;break;}if(grid[gy]&&grid[gy][x]===2&&x!==gx){bl=true;break;}}
   if(!bl)return Math.max(0.5,2-b.t);
  }
 }
 for(var f=0;f<flames.length;f++)if(flames[f].x===gx&&flames[f].y===gy)return 5;
 return 0;
}
function aiControl(p,dt){
 p.ai.t-=dt;
 if(p.ai.t>0&&p.ai.dir)return p.ai.dir;
 // decide
 var gx=Math.round(p.px),gy=Math.round(p.py);
 var opts=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1},{x:0,y:0}];
 function walkable(x,y){ if(x<1||y<1||x>=W-1||y>=H-1)return false; if(grid[y][x]!==0)return false; if(isBombCell(x,y))return x===gx&&y===gy; return true; }
 // if in danger -> move to safest neighbor
 var d0=dangerAt(gx,gy);
 var best=null,bestScore=999;
 // find target: nearest enemy/player or powerup
 var targets=[];
 if(mode==="play-adv")enemies.forEach(function(e){if(e.alive)targets.push({x:Math.round(e.px),y:Math.round(e.py),w:2});});
 else players.forEach(function(q){if(q.active&&q.alive&&q.id!==p.id)targets.push({x:Math.round(q.px),y:Math.round(q.py),w:3});});
 powers.forEach(function(pw){targets.push({x:pw.x,y:pw.y,w:-4});});
 opts.forEach(function(o){
  var nx=gx+o.x,ny=gy+o.y;
  if(!walkable(nx,ny))return;
  var score=dangerAt(nx,ny)*10+Math.random()*2;
  if(targets.length){var dd=Math.min.apply(null,targets.map(function(t){return Math.abs(t.x-nx)+Math.abs(t.y-ny)+ (t.w||0);}));score+=dd*0.6;}
  // prefer continuing
  if(p.ai.dir&&p.ai.dir.x===o.x&&p.ai.dir.y===o.y)score-=0.5;
  if(score<bestScore){bestScore=score;best=o;}
 });
 p.ai.dir=best||{x:0,y:0};p.ai.t=0.22+Math.random()*0.15;
 // drop bomb logic: if adjacent to brick or enemy/player and safe escape exists
 if(d0<1){
  var nearBrick=[[1,0],[-1,0],[0,1],[0,-1]].some(function(dd){var nx=gx+dd[0],ny=gy+dd[1];return nx>=0&&ny>=0&&nx<W&&ny<H&&grid[ny][nx]===2;});
  var nearFoe=targets.some(function(t){return Math.abs(t.x-gx)+Math.abs(t.y-gy)<=2&&t.w>0;});
  var escape=opts.some(function(o){var nx=gx+o.x,ny=gy+o.y;return walkable(nx,ny)&&dangerAt(nx,ny)===0;});
  if((nearBrick||nearFoe||Math.random()<0.02)&&escape&&Math.random()<(mode==="play-adv"?0.5:0.35))tryPlaceBomb(p);
 }
 return p.ai.dir;
}

function update(dt){
 if(paused||gameOver||mode.indexOf("play")!==0)return;
 timeLeft-=dt;
 if(timeLeft<=0){timeLeft=0; if(mode==="play-battle"){ // sudden death: kill all? decide by alive count
   var a=players.filter(function(p){return p.active&&p.alive;});
   if(a.length===1)endRound(a[0].id); else endRound(null);
  } else { var me=players.find(function(p){return p.active;}); if(me&&me.alive){hurt(me);} }
 }
 if(timeLeft<20)document.getElementById("hud-timer").classList.add("low");else document.getElementById("hud-timer").classList.remove("low");
 document.getElementById("hud-timer").textContent=Math.ceil(timeLeft);
 // players
 players.forEach(function(p){
  if(!p.active||!p.alive)return;
  if(p.bombCool>0)p.bombCool-=dt;
  if(p.inv>0)p.inv-=dt;
  var dx=0,dy=0;
  if(p.human){
   var c=CONTROLS[p.id];
   // P1 arabic keyboards: also allow KeyF as bomb
   if(keys[c.left])dx-=1;if(keys[c.right])dx+=1;if(keys[c.up])dy-=1;if(keys[c.down])dy+=1;
   if(keys[c.bomb]||(p.id===0&&(keys["KeyF"]||keys["KeyG"])))tryPlaceBomb(p);
  } else {
   var d=aiControl(p,dt);dx=d.x;dy=d.y;
  }
  // normalize diagonal
  if(dx!==0&&dy!==0){dx*=0.707;dy*=0.707;}
  p.moving=(dx!==0||dy!==0);
  // grid-aligned smoothing: prefer axis with larger intent when both pressed
  if(dx!==0&&dy!==0){ if(Math.abs(dx)>Math.abs(dy))dy=0;else dx=0; }
  tryMove(p,dx,dy,dt);
  // pickups
  for(var i=powers.length-1;i>=0;i--){var pw=powers[i];
   if(Math.round(p.px)===pw.x&&Math.round(p.py)===pw.y){
    powers.splice(i,1);
    if(pw.type==="fire")p.fire=Math.min(8,p.fire+1);
    if(pw.type==="bomb")p.maxBombs=Math.min(6,p.maxBombs+1);
    if(pw.type==="speed")p.speed=Math.min(7.5,p.speed+0.7);
    if(pw.type==="kick")p.kick=true;
    if(pw.type==="shield")p.shield=Math.min(2,p.shield+1);
    if(pw.type==="life"&&mode==="play-battle"){/*extra*/p.shield=Math.min(2,p.shield+1);}
    SFX.power();if(p.human)banner(p.char.name+": "+powerIcon(pw.type)+" قوة!",900);refreshHUD();
   }
  }
  // flames kill
  for(var f=0;f<flames.length;f++){ if(Math.round(p.px)===flames[f].x&&Math.round(p.py)===flames[f].y){hurt(p);break;} }
  // enemies touch (adv)
  if(mode==="play-adv"){ for(var e=0;e<enemies.length;e++){var en=enemies[e];if(!en.alive)continue;
   if(Math.abs(en.px-p.px)<0.7&&Math.abs(en.py-p.py)<0.7){hurt(p);break;} } }
  // door entry
  if(mode==="play-adv"&&door&&door.open){ if(Math.round(p.px)===door.x&&Math.round(p.py)===door.y){endRound("win");return;} }
 });
 // bombs timers + sliding
 bombs.slice().forEach(function(b){
  if(b.slide){ b.px+=b.slide.dx*dt*7;b.py+=b.slide.dy*dt*7;
   var cx=Math.round(b.px),cy=Math.round(b.py);
   if(grid[cy]&&(grid[cy][cx]!==0||isBombCell(cx,cy)&&!(cx===b.x&&cy===b.y))){b.x=Math.round(b.px-b.slide.dx*0.3);b.y=Math.round(b.py-b.slide.dy*0.3);b.px=b.x;b.py=b.y;b.slide=null;}
   else if(Math.abs(b.px-b.x)>=1||Math.abs(b.py-b.y)>=1){b.x=cx;b.y=cy;b.px=b.x;b.py=b.y;
    if(grid[cy][cx]!==0||Math.random()<0.1)b.slide=null;
    else {var aheadX=cx+b.slide.dx,aheadY=cy+b.slide.dy;if(grid[aheadY]&&(grid[aheadY][aheadX]!==0||isBombCell(aheadX,aheadY)))b.slide=null;}
   }
   if(use3D&&bombMeshes[b.x+","+b.y]===undefined){/*mesh follows*/} 
  }
  b.t-=dt; if(b.t<=0)explodeBomb(b);
 });
 // flames
 for(var i=flames.length-1;i>=0;i--){flames[i].t-=dt;if(flames[i].t<=0)flames.splice(i,1);}
 // check flame kills again for standing players
 players.forEach(function(p){ if(!p.active||!p.alive)return;
  for(var f=0;f<flames.length;f++)if(Math.round(p.px)===flames[f].x&&Math.round(p.py)===flames[f].y){hurt(p);break;}
 });
 // enemies
 if(mode==="play-adv"){
  enemies.forEach(function(en){
   if(!en.alive)return;
   en.t+=dt;
   var sp=en.speed*dt;
   var nx=en.px+en.dir.x*sp,ny=en.py+en.dir.y*sp;
   function eFree(x,y){var cx=Math.round(x),cy=Math.round(y);if(cx<0||cy<0||cx>=W||cy>=H)return false;
    if(en.type==="ghost"){ if(grid[cy]&&grid[cy][cx]===1&&(cx===0||cy===0||cx===W-1||cy===H-1))return false; if(isBombCell(cx,cy))return false; return true;}
    if(grid[cy]&&grid[cy][cx]!==0)return false;if(isBombCell(cx,cy))return false;return true;}
   // ghost can pass bricks but not solid/border
   if(!eFree(nx,en.py))en.dir.x*=-1;else en.px=nx;
   if(!eFree(en.px,ny))en.dir.y*=-1;else en.py=ny;
   if(Math.random()<dt*0.7){ // random turn
    var dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    var d=dirs[Math.floor(Math.random()*4)];
    if(eFree(en.px+d.x*0.4,en.py+d.y*0.4))en.dir=d;
   }
   // chase (drop type)
   if(en.type==="drop"){var me=players.find(function(p){return p.active&&p.alive;});
    if(me&&Math.random()<dt*1.2){var dx=Math.sign(me.px-en.px),dy=Math.sign(me.py-en.py);
     if(Math.abs(me.px-en.px)>Math.abs(me.py-en.py)){if(eFree(en.px+dx*0.4,en.py))en.dir={x:dx,y:0};}
     else{if(eFree(en.px,en.py+dy*0.4))en.dir={x:0,y:dy};}}}
   // flame kills enemy
   for(var f=0;f<flames.length;f++)if(Math.round(en.px)===flames[f].x&&Math.round(en.py)===flames[f].y){en.alive=false;SFX.brick();break;}
  });
  var left=enemies.filter(function(e){return e.alive;}).length;
  if(door&&left===0&&!door.open){door.open=true;SFX.win();banner("🚪 الباب مفتوح! ادخل!",2200);refreshPowerMeshes();}
  document.getElementById("hud-level").textContent="🚪 المرحلة "+levelNum+" • 👾 "+left;
  if(left===0&&!door){door={x:1,y:1,open:true};refreshPowerMeshes();}
 }
 // sync meshes
 syncMeshes(dt);
 if(lightExp&&lightExp.intensity>0)lightExp.intensity=Math.max(0,lightExp.intensity-dt*6);
 if(shakeT>0)shakeT-=dt;
}

function syncMeshes(dt){
 var t=performance.now()/1000;
 if(!use3D){draw2D();return;}
 players.forEach(function(p){
  var m=bomberMeshes[p.id];if(!m)return;
  m.visible=p.active&&p.alive;
  if(!m.visible)return;
  m.position.x+=(wx(p.px)-m.position.x)*Math.min(1,dt*18);
  m.position.z+=(wz(p.py)-m.position.z)*Math.min(1,dt*18);
  if(p.moving){m.position.y=Math.abs(Math.sin(t*12))*0.12;m.rotation.y+=dt*2;
   if(m.userData.f1){m.userData.f1.position.z=0.1+Math.sin(t*12)*0.12;m.userData.f2.position.z=0.1-Math.sin(t*12)*0.12;}}
  else m.position.y*=0.9;
  if(m.userData.tip)m.userData.tip.material.color.setHex(Math.sin(t*8)>0?0xff5252:0xffeb3b);
  if(p.inv>0)m.visible=(Math.floor(t*10)%2===0);
 });
 // bombs pulse
 Object.keys(bombMeshes).forEach(function(k){
  var m=bombMeshes[k];var s=1+Math.sin(t*10)*0.12;m.scale.set(s,1/s,s);
  if(m.userData.spark){m.userData.spark.material.color.setHex(Math.random()>0.5?0xffeb3b:0xff5722);}
 });
 // flames flicker
 flameMeshes.forEach(function(m){var s=0.8+Math.random()*0.4;m.scale.set(s,1,s);m.material.color.setHex([0xff9800,0xff5722,0xffeb3b][Math.floor(Math.random()*3)]);});
 // remove dead flame meshes beyond count
 while(flameMeshes.length>flames.length){var old=flameMeshes.pop();scene.remove(old);}
 // powers bob
 Object.keys(powerMeshes).forEach(function(k){var m=powerMeshes[k];m.rotation.y+=dt*2;m.position.y=Math.sin(t*3)*0.15;});
 // enemies
 enemies.forEach(function(en,i){var m=enemyMeshes[i];if(!m)return;m.visible=en.alive;if(!en.alive)return;
  m.position.x+=(wx(en.px)-m.position.x)*Math.min(1,dt*10);
  m.position.z+=(wz(en.py)-m.position.z)*Math.min(1,dt*10);
  m.position.y=Math.abs(Math.sin(t*6+i))*0.15;
 });
 // camera shake
 if(settings.shake&&shakeT>0){camera.position.x=(Math.random()-0.5)*0.8;camera.position.y=21+(Math.random()-0.5)*0.8;}
 else{positionCam();}
 renderer.render(scene,camera);
}

/* ---- 2D fallback (no WebGL) ---- */
function draw2D(){
 var w=canvas.width,h=canvas.height;if(!ctx2d)return;
 ctx2d.fillStyle="#1c4d28";ctx2d.fillRect(0,0,w,h);
 var cw=w/W,ch=h/H;
 for(var y=0;y<H;y++)for(var x=0;x<W;x++){
  if(grid[y][x]===1){ctx2d.fillStyle="#7b8a99";ctx2d.fillRect(x*cw,y*ch,cw,ch);ctx2d.strokeStyle="#222";ctx2d.strokeRect(x*cw,y*ch,cw,ch);}
  else if(grid[y][x]===2){ctx2d.fillStyle="#b5651d";ctx2d.fillRect(x*cw,y*ch,cw,ch);ctx2d.strokeStyle="#5d2f0c";ctx2d.strokeRect(x*cw,y*ch,cw,ch);}
 }
 powers.forEach(function(p){ctx2d.font=Math.floor(cw*0.6)+"px serif";ctx2d.textAlign="center";ctx2d.fillText(powerIcon(p.type),p.x*cw+cw/2,p.y*ch+ch*0.75);});
 if(door){ctx2d.fillStyle=door.open?"#00e676":"#3e2723";ctx2d.fillRect(door.x*cw+4,door.y*ch+4,cw-8,ch-8);}
 ctx2d.font=Math.floor(cw*0.7)+"px serif";ctx2d.textAlign="center";
 bombs.forEach(function(b){ctx2d.fillText("💣",b.x*cw+cw/2,b.y*ch+ch*0.78);});
 flames.forEach(function(f){ctx2d.fillStyle="rgba(255,120,0,.85)";ctx2d.fillRect(f.x*cw,f.y*ch,cw,ch);});
 enemies.forEach(function(e){if(e.alive)ctx2d.fillText("👾",e.px*cw+cw/2,e.py*ch+ch*0.75);});
 players.forEach(function(p){if(!p.active||!p.alive)return;ctx2d.fillText("💣",p.px*cw+cw/2,p.py*ch+ch*0.78);ctx2d.fillStyle=p.char.css;ctx2d.beginPath();ctx2d.arc(p.px*cw+cw/2,p.py*ch+ch/2,cw*0.28,0,7);ctx2d.fill();});
}

/* ================= LOOP ================= */
function loop(t){
 requestAnimationFrame(loop);
 if(!lastT)lastT=t;
 var dt=Math.min(0.05,(t-lastT)/1000);lastT=t;
 if(mode.indexOf("play")===0&&!paused)update(dt);
 else if(use3D&&renderer&&mode.indexOf("play")===0){syncMeshes(dt);}
}

/* ================= UI wiring ================= */
document.getElementById("btn-adventure").onclick=function(){openSetup("adventure");};
document.getElementById("btn-battle").onclick=function(){openSetup("battle");};
document.getElementById("btn-help").onclick=function(){SFX.select();document.getElementById("modal-help").classList.remove("hidden");};
document.getElementById("btn-settings").onclick=function(){SFX.select();document.getElementById("modal-settings").classList.remove("hidden");};
document.getElementById("btn-close-help").onclick=function(){SFX.back();document.getElementById("modal-help").classList.add("hidden");};
document.getElementById("btn-close-settings").onclick=function(){SFX.back();document.getElementById("modal-settings").classList.add("hidden");};
document.getElementById("btn-back-menu").onclick=function(){SFX.back();mode="menu";show("screen-menu");};
document.getElementById("btn-start-game").onclick=function(){ac();startGame();};
document.getElementById("btn-pause").onclick=function(){togglePause();};
document.getElementById("btn-resume").onclick=function(){togglePause();};
document.getElementById("btn-restart").onclick=function(){SFX.select();gameOver=false;paused=false;document.getElementById("overlay-pause").classList.add("hidden");newRound();};
document.getElementById("btn-quit").onclick=quitToMenu;
document.getElementById("btn-quit2").onclick=quitToMenu;
document.getElementById("btn-home").onclick=quitToMenu;
document.getElementById("btn-again").onclick=function(){SFX.select();document.getElementById("overlay-end").classList.add("hidden");gameOver=false;
 if(mode==="play-battle"){var champ=wins.findIndex(function(v){return v>=roundsToWin;});if(champ>=0){wins=[0,0,0,0];roundNum=1;}else{roundNum++;}timeLeft=timeLimit;newRound();}
 else{timeLeft=200;newRound();}};
document.getElementById("btn-mute").onclick=function(){toggleMute();};
document.getElementById("btn-music").onclick=function(){settings.music=!settings.music;document.getElementById("btn-music").classList.toggle("off",!settings.music);if(settings.music)startMusic();else stopMusic();};
document.getElementById("btn-full").onclick=function(){toggleFull();};
document.getElementById("set-sound").onchange=function(e){settings.sound=e.target.checked;};
document.getElementById("set-music").onchange=function(e){settings.music=e.target.checked;if(settings.music)startMusic();else stopMusic();};
document.getElementById("set-vol").oninput=function(e){settings.vol=e.target.value/100;};
document.getElementById("set-shadow").onchange=function(e){settings.shadow=e.target.checked;if(renderer)renderer.shadowMap.enabled=settings.shadow;};
document.getElementById("set-shake").onchange=function(e){settings.shake=e.target.checked;};
function togglePause(){ if(mode.indexOf("play")!==0||gameOver)return; paused=!paused; document.getElementById("overlay-pause").classList.toggle("hidden",!paused); SFX.back(); }
function toggleMute(){ settings.sound=!settings.sound; document.getElementById("btn-mute").textContent=settings.sound?"🔊":"🔇"; document.getElementById("btn-mute").classList.toggle("off",!settings.sound); document.getElementById("set-sound").checked=settings.sound; }
function toggleFull(){ if(document.fullscreenElement)document.exitFullscreen(); else document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen(); setTimeout(resize,300); }
function quitToMenu(){ mode="menu";paused=false;gameOver=false;stopMusic();show("screen-menu");SFX.back(); }

initThree();buildCharGrid();buildSlots();
show("screen-menu");
requestAnimationFrame(loop);
window.addEventListener("resize",resize);
setTimeout(resize,300);
})();
