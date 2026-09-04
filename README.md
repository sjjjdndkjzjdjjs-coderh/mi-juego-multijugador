<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Arena Multijugador</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.min.js"></script>
<style>
  :root{--bg:#0a0a0c;--panel:#141518;--text:#e8e2d4;--dim:#8a8578;--ok:#6fae7f;--bad:#d9634a;}
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
  html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;height:100%;overflow:hidden;}
  #app{display:flex;flex-direction:column;height:100vh;}
  #topbar{display:flex;gap:8px;padding:10px 12px;background:var(--panel);align-items:center;}
  #urlbox{flex:1;background:#1d1e22;border:1px solid rgba(232,226,212,0.15);border-radius:8px;color:var(--text);padding:8px 10px;font-size:13px;}
  #connectbtn{background:var(--text);color:#111;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;white-space:nowrap;}
  #status{width:9px;height:9px;border-radius:50%;background:var(--bad);flex-shrink:0;}
  #status.on{background:var(--ok);}
  #infobar{display:flex;justify-content:space-between;padding:8px 14px;font-size:12.5px;color:var(--dim);background:var(--panel);border-top:1px solid rgba(232,226,212,0.06);}
  #arena-wrap{flex:1;position:relative;overflow:hidden;touch-action:none;}
  canvas{display:block;width:100%;height:100%;}
  #hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);font-size:12px;color:var(--dim);background:rgba(20,21,24,0.7);padding:6px 12px;border-radius:14px;pointer-events:none;}
</style>
</head>
<body>
<div id="app">
  <div id="topbar">
    <div id="status"></div>
    <input id="urlbox" placeholder="https://tu-servidor.onrender.com" />
    <button id="connectbtn">Conectar</button>
  </div>
  <div id="infobar">
    <span id="players">Jugadores: -</span>
    <span id="mestatus">Desconectado</span>
  </div>
  <div id="arena-wrap">
    <canvas id="arena"></canvas>
    <div id="hint">Arrastrá para mover tu punto</div>
  </div>
</div>
<script>
const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
const wrap = document.getElementById('arena-wrap');
const urlbox = document.getElementById('urlbox');
const connectbtn = document.getElementById('connectbtn');
const statusdot = document.getElementById('status');
const playersEl = document.getElementById('players');
const mestatus = document.getElementById('mestatus');

let socket = null;
let myId = null;
let myColor = '#'+Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0');
let me = { x: 0, y: 0 };
let target = null;
const others = {};

function resize(){
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
  me.x = canvas.width/2;
  me.y = canvas.height/2;
}
window.addEventListener('resize', resize);
resize();

const savedUrl = localStorage.getItem('arena_server_url');
if (savedUrl) urlbox.value = savedUrl;

function connect(){
  const url = urlbox.value.trim();
  if(!url) return;
  localStorage.setItem('arena_server_url', url);
  if(socket) socket.disconnect();
  mestatus.textContent = 'Conectando...';
  socket = io(url, { transports: ['websocket','polling'] });

  socket.on('connect', () => {
    myId = socket.id;
    statusdot.classList.add('on');
    mestatus.textContent = 'Conectado';
  });
  socket.on('disconnect', () => {
    statusdot.classList.remove('on');
    mestatus.textContent = 'Desconectado';
  });
  socket.on('jugadores', (n) => {
    playersEl.textContent = 'Jugadores: ' + n;
  });
  socket.on('mensaje', (data) => {
    if(!data || data.id === myId) return;
    others[data.id] = { x: data.x, y: data.y, color: data.color, last: Date.now() };
  });
}
connectbtn.addEventListener('click', connect);

function posFromEvent(e){
  const rect = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}
wrap.addEventListener('touchstart', (e) => { target = posFromEvent(e); }, {passive:true});
wrap.addEventListener('touchmove', (e) => { target = posFromEvent(e); }, {passive:true});
wrap.addEventListener('mousedown', (e) => { target = posFromEvent(e); });
wrap.addEventListener('mousemove', (e) => { if(e.buttons) target = posFromEvent(e); });

let lastSent = 0;
function loop(){
  if(target){
    const dx = target.x - me.x, dy = target.y - me.y;
    const dist = Math.hypot(dx,dy);
    if(dist > 2){
      const speed = Math.min(dist, 6);
      me.x += (dx/dist) * speed;
      me.y += (dy/dist) * speed;
    }
  }
  me.x = Math.max(12, Math.min(canvas.width-12, me.x));
  me.y = Math.max(12, Math.min(canvas.height-12, me.y));

  const now = Date.now();
  if(socket && socket.connected && now - lastSent > 80){
    socket.emit('mensaje', { id: myId, x: me.x, y: me.y, color: myColor });
    lastSent = now;
  }
  Object.keys(others).forEach(id => {
    if(now - others[id].last > 4000) delete others[id];
  });
  draw();
  requestAnimationFrame(loop);
}

function draw(){
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = 'rgba(232,226,212,0.05)';
  ctx.lineWidth = 1;
  const step = 40;
  for(let x=0;x<canvas.width;x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
  for(let y=0;y<canvas.height;y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
  Object.values(others).forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 14, 0, Math.PI*2);
    ctx.fillStyle = p.color || '#8a8578';
    ctx.fill();
  });
  ctx.beginPath();
  ctx.arc(me.x, me.y, 16, 0, Math.PI*2);
  ctx.fillStyle = myColor;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#e8e2d4';
  ctx.stroke();
}
requestAnimationFrame(loop);
</script>
</body>
</html>
