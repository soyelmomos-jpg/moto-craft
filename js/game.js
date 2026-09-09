/* ============================================================
   MOTO CRAFT - Carreras de motos 3D estilo Minecraft
   ============================================================ */

// ====== DATOS DE MOTOS (10 motos) ======
const MOTOS = [
  { nombre: 'Roja Veloz',   color: 0xc0392b, stats: { vel: 85, ace: 75, man: 70, nin: 60 } },
  { nombre: 'Azul Rayo',    color: 0x2980b9, stats: { vel: 78, ace: 80, man: 75, nin: 70 } },
  { nombre: 'Verde Trueno', color: 0x27ae60, stats: { vel: 88, ace: 65, man: 65, nin: 68 } },
  { nombre: 'Amarilla Tuerca', color: 0xf39c12, stats: { vel: 70, ace: 90, man: 72, nin: 75 } },
  { nombre: 'Negra Sombra', color: 0x2c3e50, stats: { vel: 92, ace: 70, man: 58, nin: 78 } },
  { nombre: 'Blanca Tormenta', color: 0xecf0f1, stats: { vel: 80, ace: 78, man: 80, nin: 72 } },
  { nombre: 'Naranja Fuego', color: 0xe67e22, stats: { vel: 82, ace: 85, man: 68, nin: 70 } },
  { nombre: 'Púrpura Misterio', color: 0x8e44ad, stats: { vel: 76, ace: 72, man: 85, nin: 74 } },
  { nombre: 'Rosa Turbo',   color: 0xe91e63, stats: { vel: 84, ace: 76, man: 78, nin: 65 } },
  { nombre: 'Oro Campeón',  color: 0xf1c40f, stats: { vel: 90, ace: 85, man: 82, nin: 80 } },
];

// ====== PISTA: puntos de la curva ======
const TRACK_POINTS = [];
{
  const segments = 48;
  const rx = 46, ry = 30;
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    let x = Math.cos(t) * rx;
    let z = Math.sin(t) * ry;
    // deformar el óvalo para que sea más divertido
    x += Math.sin(t * 3) * 6;
    z += Math.cos(t * 2.5) * 5;
    TRACK_POINTS.push(new THREE.Vector3(x, 0, z));
  }
}
const TRACK_WIDTH = 9;
const TRACK_PATH = new THREE.CatmullRomCurve3(TRACK_POINTS, true);

// ====== ESTADO GLOBAL ======
let scene, camera, renderer, clock;
let trackMesh, trackMarkings;
let player, bots = [];
let checkpoints = [];
let currentLap = 1;
let TOTAL_LAPS = 3;
let BOT_COUNT = 4;
let raceActive = false;
let raceStarted = false;
let countdownValue = 3;
let countdownInterval = null;
let raceTime = 0;
let cameraMode = 0; // 0 = chase, 1 = cockpit
let keys = {};
let selectedMotoIndex = 3;
let playerName = 'Player';
let showMinimalUI = false;
let isMobile = false;
let sky;

// ====== MATERIALES MINECRAFT ======
const CUBES = {
  grass:     0x5dbb63,
  grassTop:  0x5dbb63,
  dirt:      0x8b5a2b,
  stone:     0x808080,
  asphalt:   0x333b42,
  asphaltDark: 0x2a3037,
  whiteLine: 0xe8e8e8,
  wood:      0x8b5e3c,
  gold:      0xf1c40f,
  lava:      0xff4500,
  water:     0x3498db,
  sand:      0xdbc05a,
  lens:      0x9fbfdf,
  wheel:     0x1a1a1a,
  tail:      0xff3333,
};

// ====== INICIALIZACIÓN ======
document.addEventListener('DOMContentLoaded', () => {
  setupMenus();
  setupMobile();
  window.addEventListener('resize', onResize);
});

function setupMenus() {
  const motoGrid = document.getElementById('moto-grid');

  MOTOS.forEach((moto, i) => {
    const card = document.createElement('div');
    card.className = 'moto-card';
    card.innerHTML = `
      <div class="moto-preview" style="background: linear-gradient(135deg, #${moto.color.toString(16).padStart(6,'0')}, #2c3e50)"></div>
      <div class="moto-name">${moto.nombre}</div>
      <div class="moto-stats">
        ⚡Vel ${moto.stats.vel}<br>
        🔥Ace ${moto.stats.ace}<br>
        🌀Man ${moto.stats.man}<br>
        💨Nin ${moto.stats.nin}
      </div>`;
    if (i === selectedMotoIndex) card.classList.add('selected');
    card.addEventListener('click', () => {
      document.querySelectorAll('.moto-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedMotoIndex = i;
    });
    motoGrid.appendChild(card);
  });

  document.getElementById('select-moto-btn').addEventListener('click', () => {
    playerName = document.getElementById('player-name').value || 'Player';
    TOTAL_LAPS = parseInt(document.getElementById('lap-count').value);
    BOT_COUNT = parseInt(document.getElementById('bot-count').value);
    currentLap = 1;
    document.getElementById('menu-principal').style.display = 'none';
    document.getElementById('seleccion-moto').style.display = 'flex';
  });

  document.getElementById('start-race-btn').addEventListener('click', () => {
    initGame();
  });

  document.getElementById('back-menu-btn').addEventListener('click', () => {
    document.getElementById('race-result').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('menu-principal').style.display = 'flex';
    document.getElementById('seleccion-moto').style.display = 'none';
  });

  document.getElementById('lap-display').textContent = `Vuelta ${currentLap}/${TOTAL_LAPS}`;
}

function setupMobile() {
  isMobile = 'ontouchstart' in window;
  if (isMobile) {
    document.getElementById('mobile-controls').style.display = 'flex';
  }
  const bindHold = (id, key) => {
    const btn = document.getElementById(id);
    const down = (e) => { e.preventDefault(); keys[key] = true; };
    const up = (e) => { e.preventDefault(); keys[key] = false; };
    btn.addEventListener('touchstart', down);
    btn.addEventListener('touchend', up);
    btn.addEventListener('touchcancel', up);
    btn.addEventListener('mousedown', down);
    btn.addEventListener('mouseup', up);
    btn.addEventListener('mouseleave', up);
  };
  bindHold('mb-up', 'ArrowUp');
  bindHold('mb-down', 'ArrowDown');
  bindHold('mb-left', 'ArrowLeft');
  bindHold('mb-right', 'ArrowRight');
  bindHold('mb-nitro', ' ');
}

document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'c' || e.key === 'C') { cameraMode = (cameraMode + 1) % 2; }
  if ((e.key === 'Escape' || e.key === 'Esc') && raceActive) {
    document.getElementById('race-result').style.display = 'flex';
    document.getElementById('result-title').textContent = 'CARRERA PAUSADA';
    document.getElementById('game-container').style.display = 'none';
    raceActive = false;
  }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

function onResize() {
  if (!renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ====== CREACIÓN DE LA PISTA ======
function buildTrack() {
  const trackGroup = new THREE.Group();

  // Suelo base (bloques de pasto/dirt estilo Minecraft)
  const groundGeo = new THREE.BoxGeometry(260, 1, 200);
  const groundMat = new THREE.MeshLambertMaterial({ color: CUBES.grass });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -1;
  ground.receiveShadow = true;
  trackGroup.add(ground);

  // Bordes de la pista con bloques
  const sampleCount = 96;
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    const p1 = TRACK_PATH.getPoint(t);
    const tan = TRACK_PATH.getTangentAt(t);
    
    // Bloques del camino de asfalto (con bloques individuales)
    const dist = Math.floor(TRACK_WIDTH / 1.25);
    for (let d = -dist; d <= dist; d++) {
      const left = new THREE.Vector3(-tan.z, 0, tan.x);
      left.multiplyScalar(d * 1.25);
      const pos = p1.clone().add(left);
      pos.y = 0.3;
      const b = new THREE.BoxGeometry(1.3, 0.6, 1.3);
      const isDark = (i + d) % 2 === 0;
      const mat = new THREE.MeshLambertMaterial({ color: isDark ? CUBES.asphalt : CUBES.asphaltDark });
      const block = new THREE.Mesh(b, mat);
      block.position.copy(pos);
      block.receiveShadow = true;
      trackGroup.add(block);
    }

    // Marcas centrales
    if (i % 6 === 0) {
      const mark = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.65, 2),
        new THREE.MeshLambertMaterial({ color: CUBES.whiteLine })
      );
      mark.position.copy(p1);
      mark.position.y = 0.6;
      mark.rotation.y = Math.atan2(-tan.x, -tan.z) + Math.PI;
      trackGroup.add(mark);
    }
  }

  // Bloques de borde (bloques verdes de pasto elevados)
  const borderCount = 160;
  for (let i = 0; i < borderCount; i++) {
    const t = i / borderCount;
    const p = TRACK_PATH.getPoint(t);
    const tan = TRACK_PATH.getTangentAt(t);
    const normal = new THREE.Vector3(-tan.z, 0, tan.x);
    
    for (const side of [-1, 1]) {
      const n = normal.clone().multiplyScalar(side * (TRACK_WIDTH / 2 + 0.8));
      const pos = p.clone().add(n);
      pos.y = 0.8;
      const borderBlock = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1.6, 2),
        new THREE.MeshLambertMaterial({ color: CUBES.grass })
      );
      borderBlock.position.copy(pos);
      trackGroup.add(borderBlock);
    }
  }

  // Árboles estilo Minecraft alrededor
  const scenery = trackGroup;
  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 55 + Math.random() * 70;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    // evitar árboles sobre la pista
    const nearest = trackClosestPoint(new THREE.Vector3(x, 0, z));
    if (nearest.distanceTo(new THREE.Vector3(x, 0, z)) < TRACK_WIDTH + 3) continue;

    const isTree = Math.random() > 0.35;
    if (isTree) {
      const trunk = new THREE.Mesh(
        new THREE.BoxGeometry(1, 2 + Math.random() * 2, 1),
        new THREE.MeshLambertMaterial({ color: CUBES.wood })
      );
      trunk.position.set(x, 1.2, z);
      trunk.castShadow = true;
      scenery.add(trunk);
      const leafColor = Math.random() > 0.5 ? 0x2ecc71 : 0x1e8449;
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(3, 3, 3),
        new THREE.MeshLambertMaterial({ color: leafColor })
      );
      leaf.position.set(x, 3.5, z);
      leaf.castShadow = true;
      scenery.add(leaf);
    } else {
      const rock = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1 + Math.random() * 1.5, 1.5),
        new THREE.MeshLambertMaterial({ color: CUBES.stone })
      );
      rock.position.set(x, 0.7, z);
      scenery.add(rock);
    }
  }

  // Bloques dorados decorativos en las curvas
  checkpoints = [];
  const cpCount = TRACK_POINTS.length;
  for (let i = 0; i < cpCount; i++) {
    const p = TRACK_POINTS[i];
    const goldBlock = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 3, 1.5),
      new THREE.MeshLambertMaterial({ color: CUBES.gold })
    );
    goldBlock.position.set(p.x, 1.5, p.z);
    scenery.add(goldBlock);
    checkpoints.push({ index: i, point: new THREE.Vector3(p.x, 0, p.z) });
  }

  // Línea de salida
  const start = TRACK_PATH.getPoint(0);
  const tan = TRACK_PATH.getTangentAt(0);
  const normal = new THREE.Vector3(-tan.z, 0, tan.x);
  for (let d = -4; d <= 4; d++) {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.65, 1.8),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    const pos = start.clone().add(normal.clone().multiplyScalar(d * 1.5));
    pos.y = 0.6;
    block.position.copy(pos);
    block.rotation.y = Math.atan2(-tan.x, -tan.z) + Math.PI;
    scenery.add(block);
  }

  return trackGroup;
}

// ====== CREACIÓN DE MOTO (estilo Minecraft) ======
function createBike(motoData) {
  const group = new THREE.Group();
  const col = motoData.color;

  // Chasis
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 2.2),
    new THREE.MeshLambertMaterial({ color: col })
  );
  body.position.y = 0.7;
  body.castShadow = true;
  group.add(body);

  // Depósito / carenado frontal
  const tank = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.6, 0.8),
    new THREE.MeshLambertMaterial({ color: col })
  );
  tank.position.set(0, 0.9, 0.5);
  group.add(tank);

  // Manubrio
  const handlebar = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.15, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x555555 })
  );
  handlebar.position.set(0, 1.25, 0.75);
  group.add(handlebar);
  const gripL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.25), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  gripL.position.set(-0.6, 1.25, 0.75);
  const gripR = gripL.clone();
  gripR.position.x = 0.6;
  group.add(gripL);
  group.add(gripR);

  // Ruedas
  function makeWheel(x, z) {
    const w = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.25, 10),
      new THREE.MeshLambertMaterial({ color: CUBES.wheel })
    );
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    w.castShadow = true;
    return w;
  }
  const wheelF = makeWheel(0, 0.85);
  const wheelR = makeWheel(0, -0.85);
  group.add(wheelF);
  group.add(wheelR);

  // Cabecera (farolito)
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.4, 0.3),
    new THREE.MeshLambertMaterial({ color: CUBES.lens })
  );
  head.position.set(0, 0.8, 1.15);
  group.add(head);

  // Asiento
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.2, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x8b4513 })
  );
  seat.position.set(0, 1.0, -0.1);
  group.add(seat);

  // Piloto bloque (estilo Steve)
  const pilot = new THREE.Group();
  const headB = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshLambertMaterial({ color: 0xf0c8a0 }));
  headB.position.y = 0.5;
  pilot.add(headB);
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.44), new THREE.MeshLambertMaterial({ color: col }));
  helmet.position.y = 0.7;
  pilot.add(helmet);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.3), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
  torso.position.y = 0.15;
  pilot.add(torso);
  pilot.position.set(0, 1.15, -0.2);
  group.add(pilot);

  // Escape
  const exhaust = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8),
    new THREE.MeshLambertMaterial({ color: 0x7f8c8d })
  );
  exhaust.position.set(0.45, 0.7, -0.6);
  exhaust.rotation.z = Math.PI / 2;
  group.add(exhaust);

  return group;
}

// ====== CLASE MOTO (vehículo con lógica) ======
class Racers {
  constructor(motoIndex, isPlayer, name, startOffset) {
    this.motoIndex = motoIndex;
    this.moto = MOTOS[motoIndex];
    this.isPlayer = isPlayer;
    this.name = name;
    this.group = createBike(this.moto);
    
    this.speed = 0;
    this.maxSpeed = 30 + this.moto.stats.vel * 0.45;
    this.accel = 12 + this.moto.stats.ace * 0.08;
    this.handling = 1.6 + this.moto.stats.man * 0.01;
    this.nitroPower = 1.5 + this.moto.stats.nin * 0.006;
    this.nitro = 100;
    this.boostActive = false;
    
    this.angle = 0;
    this.curvedNormal = { x: 0, z: 1 };
    this.prevCheckpoint = 0;
    this.totalCheckpoints = checkpoints.length;
    this.lap = 1;
    this.finished = false;
    this.finishTime = 0;
    this.racePos = this.totalCheckpoints - 1;
    this.offTrack = 0;
    this.collisionCooldown = 0;

    this.isBot = !isPlayer;
    if (this.isBot) {
      this.skill = 0.75 + Math.random() * 0.25;
      this.botSeek = 0; // progress along track
    }

    // Posicionar en la línea de salida
    const pts = TRACK_POINTS;
    const idx = clamp(Math.floor(startOffset), 0, pts.length - 1);
    const p = pts[idx];
    const tan = TRACK_PATH.getTangentAt(idx / pts.length);
    const normal = new THREE.Vector3(-tan.z, 0, tan.x);
    const grid = startOffset % 5;
    const row = Math.floor(startOffset / 5);
    const laneX = (grid - 2) * 2;
    const backZ = 6 + row * 4;
    
    // Crear vector perpendicular al track: left/right
    const pos = p.clone()
      .add(normal.clone().multiplyScalar(laneX))
      .add(new THREE.Vector3(tan.x, 0, tan.z).multiplyScalar(-backZ));
    pos.y = 0.55;
    this.group.position.copy(pos);
    this.angle = Math.atan2(tan.x, tan.z);
    this.group.rotation.y = this.angle;
    this.setCurvedNormal(normal);
  }

  setCurvedNormal(n) {
    this.curvedNormal.x = n.x;
    this.curvedNormal.z = n.z;
  }

  getTrackPos() {
    const pos = this.group.position;
    return trackClosestPoint(new THREE.Vector3(pos.x, 0, pos.z));
  }

  getTrackProgress() {
    const pos = this.getTrackPos();
    const p2 = new THREE.Vector3(pos.x, 0, pos.z);
    const p1 = new THREE.Vector3(TRACK_POINTS[this.prevCheckpoint].x, 0, TRACK_POINTS[this.prevCheckpoint].z);
    let dist = p1.distanceTo(p2);
    return this.prevCheckpoint + dist / 10;
  }

  updateInput(input) {
    if (this.finished) {
      this.speed *= 0.95;
      if (this.speed < 0.2) this.speed = 0;
      return;
    }
    
    // nitro
    if (input.nitro && this.nitro > 0) {
      this.boostActive = true;
      this.nitro = Math.max(0, this.nitro - 1.2);
    } else {
      this.boostActive = false;
      if (this.nitro < 100) this.nitro = Math.min(100, this.nitro + 0.4);
    }
    const effectiveMaxSpeed = this.maxSpeed * (this.boostActive ? this.nitroPower : 1);

    // dirección
    const steer = input.steer;
    if (input.accel) this.speed = Math.min(this.speed + this.accel / 60, effectiveMaxSpeed);
    else if (input.brake) this.speed = Math.max(this.speed - this.accel * 1.5 / 60, 0);
    else this.speed *= 0.995;

    // fricción de la pista vs tierra
    const onTrack = this.isOnTrack();
    if (!onTrack) {
      this.speed *= 0.965;
      this.offTrack += 1 / 60;
    } else {
      this.offTrack = Math.max(0, this.offTrack - 2 / 60);
    }

    // nitro
    if (input.nitro && this.nitro > 0) {
      this.boostActive = true;
      this.nitro = Math.max(0, this.nitro - 1.2);
      this.speed = Math.min(this.speed + this.accel * 1.8 / 60, this.maxSpeed * this.nitroPower);
    } else {
      this.boostActive = false;
      if (this.nitro < 100) this.nitro = Math.min(100, this.nitro + 0.4);
    }

    // giro
    const turnSpeed = this.handling * (this.speed / 25) * 0.02;
    if (this.speed > 0.5) {
      this.angle += steer * turnSpeed;
    }

    // movimiento
    const forward = new THREE.Vector3(Math.sin(this.angle), 0, Math.cos(this.angle));
    const pos = this.group.position;
    pos.addScaledVector(forward, this.speed / 60);

    // mantener dentro del mapa
    pos.x = clamp(pos.x, -120, 120);
    pos.z = clamp(pos.z, -110, 110);

    // inclinación al girar
    this.group.rotation.y = this.angle;
    this.group.rotation.z = lerpT(this.group.rotation.z, -steer * clamp(this.speed / 20, 0, 1) * 0.35, 0.2);

    // altura sobre la pista
    const nearest = this.getTrackPos();
    const offset = pos.distanceTo(nearest);
    const onTrackY = 0.55;
    const offTrackY = 0.4;
    const targetY = onTrack ? onTrackY : offTrackY;
    pos.y = lerpT(pos.y, targetY, 0.3);

    // colisiones con otros
    this.updateCollisions();

    // checkpoints
    this.checkCheckpoint();
  }

  isOnTrack() {
    const pos = this.group.position;
    const nearest = trackClosestPoint(new THREE.Vector3(pos.x, 0, pos.z));
    return nearest.distanceTo(new THREE.Vector3(pos.x, 0, pos.z)) <= TRACK_WIDTH / 2 + 1;
  }

  updateCollisions() {
    if (this.collisionCooldown > 0) this.collisionCooldown -= 1 / 60;
    const all = [player, ...bots];
    for (const other of all) {
      if (other === this || !other) continue;
      const dx = this.group.position.x - other.group.position.x;
      const dz = this.group.position.z - other.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 1.3 && dist > 0) {
        const push = (1.3 - dist) * 0.5;
        this.group.position.x += (dx / dist) * push;
        this.group.position.z += (dz / dist) * push;
        if (this.collisionCooldown <= 0) {
          this.speed *= 0.92;
          this.collisionCooldown = 0.4;
        }
      }
    }
  }

  checkCheckpoint() {
    const cp = checkpoints;
    for (let i = 0; i < cp.length; i++) {
      const c = cp[i];
      const dist = new THREE.Vector3(this.group.position.x, 0, this.group.position.z)
        .distanceTo(c.point);
      if (dist < 4 && c.index === (this.prevCheckpoint + 1) % this.totalCheckpoints) {
        this.prevCheckpoint = c.index;
        if (this.prevCheckpoint === 0) {
          // completó una vuelta
          if (this.lap >= TOTAL_LAPS) {
            this.finishRace();
          } else {
            this.lap++;
            if (this.isPlayer) {
              currentLap = this.lap;
              document.getElementById('lap-display').textContent = `Vuelta ${currentLap}/${TOTAL_LAPS}`;
              notify(`¡Vuelta ${this.lap}!`);
            }
          }
        }
        break;
      }
    }
  }

  finishRace() {
    this.finished = true;
    this.finishTime = raceTime;
    if (this.isPlayer && !this.playerFinished) {
      this.playerFinished = true;
      const pos = getPlayerRanking();
      setTimeout(() => showResult('¡TERMINASTE LA CARRERA!'), 800);
    }
  }
}

// ====== IA DE BOTS ======
function botInput(bot) {
  // Si terminó, no hace nada
  if (bot.finished) return { steer: 0, accel: false, brake: false, nitro: false };

  // obtener el checkpoint objetivo (adelantarse 2 checkpoints)
  const targetIdx = (bot.prevCheckpoint + 2) % bot.totalCheckpoints;
  const target = checkpoints[targetIdx].point;
  const pos = bot.group.position;
  
  // vector deseado
  const desired = new THREE.Vector3(target.x - pos.x, 0, target.z - pos.z).normalize();
  
  // ángulo actual del bot
  const currentDir = new THREE.Vector3(Math.sin(bot.angle), 0, Math.cos(bot.angle));
  
  // ángulo a la derecha del deseado
  const right = new THREE.Vector3(desired.z, 0, -desired.x);
  
  const dotRight = currentDir.dot(right);
  const dotForward = currentDir.dot(desired);
  
  let steer = 0;
  if (dotRight > 0.25) steer = 1;
  else if (dotRight < -0.25) steer = -1;
  else steer = dotRight * 4;

  // corrección suave: si mira casi en la dirección correcta, ajusta finamente
  if (Math.abs(dotRight) < 0.3) {
    steer = dotRight * clamp(bot.speed / 10, 0.3, 1) * 2;
  }

  // aceleración
  const accel = bot.speed < bot.maxSpeed * 0.98 * bot.skill;
  
  // nitro inteligente: en rectas
  const isStraight = Math.abs(dotRight) < 0.15;
  const nitro = bot.nitro > 60 && isStraight;

  // frenar en curvas cerradas
  const turnAhead = getTurnAhead(bot);
  const brake = turnAhead > 0.55 && bot.speed > 25;

  // margen de error según skill
  if (Math.random() > bot.skill) steer += (Math.random() - 0.5);

  return { steer: clamp(steer, -1, 1), accel, brake, nitro };
}

function getTurnAhead(bot) {
  // medir qué tan cerrada es la curva a 3 checkpoints adelante
  const next = checkpoints[(bot.prevCheckpoint + 3) % bot.totalCheckpoints].point;
  const next2 = checkpoints[(bot.prevCheckpoint + 5) % bot.totalCheckpoints].point;
  const pos = bot.group.position;
  const toNext = new THREE.Vector3(next.x - pos.x, 0, next.z - pos.z).normalize();
  const toNext2 = new THREE.Vector3(next2.x - pos.x, 0, next2.z - pos.z).normalize();
  const dot = toNext.dot(toNext2);
  return 1 - Math.abs(dot); // 0 = recta, ~1 = curva cerrada
}

// ====== ORDENAMIENTO / POSICIONES ======
function getRankings() {
  const all = [player, ...bots].filter(r => r);
  return all.sort((a, b) => {
    // primero los que terminaron
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    // después por vuelta y progreso
    if (a.lap !== b.lap) return b.lap - a.lap;
    const progA = a.getTrackProgress();
    const progB = b.getTrackProgress();
    return progB - progA;
  });
}

function getPlayerRanking() {
  const rankings = getRankings();
  return rankings.findIndex(r => r === player) + 1;
}

function updatePositionUI() {
  const pos = getPlayerRanking();
  document.getElementById('position-display').textContent = `${pos}º`;
}

// ====== CÁMARA ======
function updateCamera() {
  if (!player) return;
  const p = player.group.position;
  
  if (cameraMode === 0) {
    // cámara chase
    const dir = new THREE.Vector3(Math.sin(player.angle), 0, Math.cos(player.angle));
    const camPos = p.clone().sub(dir.clone().multiplyScalar(8));
    camPos.y = p.y + 4.5;
    camera.position.lerp(camPos, 0.1);
    const lookTarget = p.clone();
    lookTarget.y = p.y + 1;
    camera.lookAt(lookTarget);
  } else {
    // cámara cockpit (3ra persona cercana)
    const dir = new THREE.Vector3(Math.sin(player.angle), 0, Math.cos(player.angle));
    const camPos = p.clone().add(dir.clone().multiplyScalar(-2.2));
    camPos.y = p.y + 1.8;
    camera.position.lerp(camPos, 0.15);
    const lookTarget = p.clone().add(dir.clone().multiplyScalar(12));
    lookTarget.y = p.y + 0.8;
    camera.lookAt(lookTarget);
  }
}

// ====== MINIMAPA ======
function drawMinimap() {
  const canvas = document.getElementById('minimap-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 160, 160);
  
  // rango del mapa
  const minX = -120, maxX = 120;
  const minZ = -110, maxZ = 110;
  const scale = 160 / (maxX - minX);

  const map = (v, min, max) => ((v - min) / (max - min)) * 160;

  // dibujar pista aprox (linea)
  ctx.strokeStyle = 'rgba(247,212,76,0.4)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  TRACK_POINTS.forEach((p, i) => {
    const x = map(p.x, minX, maxX);
    const y = map(p.z, minZ, maxZ);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.stroke();

  // punto jugador
  if (player) {
    ctx.fillStyle = '#f7d44c';
    ctx.beginPath();
    ctx.arc(map(player.group.position.x, minX, maxX), map(player.group.position.z, minZ, maxZ), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '6px monospace';
    ctx.fillText('TÚ', map(player.group.position.x, minX, maxX) - 5, map(player.group.position.z, minZ, maxZ) - 6);
  }

  // puntos bots
  bots.forEach(b => {
    if (!b || b.finished) return;
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(map(b.group.position.x, minX, maxX), map(b.group.position.z, minZ, maxZ), 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ====== TIEMPO ======
function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ====== NOTIFICACIONES ======
function notify(msg) {
  const el = document.getElementById('notification');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 2500);
}

// ====== RESULTADO ======
function showResult(title) {
  const rankings = getRankings();
  const list = document.getElementById('result-list');
  list.innerHTML = '';
  rankings.forEach((r, i) => {
    const row = document.createElement('div');
    const medals = ['🥇', '🥈', '🥉'];
    const medal = i < 3 ? medals[i] : `${i + 1}º`;
    row.textContent = `${medal} ${r.name} ${r.finished ? `- ${formatTime(r.finishTime)}` : ''}`;
    if (r.isPlayer) row.classList.add('player-row');
    list.appendChild(row);
  });
  document.getElementById('result-title').textContent = title;
  document.getElementById('race-result').style.display = 'flex';
  raceActive = false;
}

// ====== INICIALIZACIÓN DEL JUEGO ======
function initGame() {
  document.getElementById('seleccion-moto').style.display = 'none';
  document.getElementById('race-result').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';

  // Reset estado
  currentLap = 1;
  raceTime = 0;
  raceActive = false;
  raceStarted = false;
  bots = [];
  player = null;
  countdownValue = 3;
  cameraMode = 0;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 80, 220);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 25, 40);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Luces
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xfffdf0, 1.2);
  dirLight.position.set(60, 80, 30);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.left = -120;
  dirLight.shadow.camera.right = 120;
  dirLight.shadow.camera.top = 120;
  dirLight.shadow.camera.bottom = -120;
  dirLight.shadow.camera.far = 300;
  scene.add(dirLight);
  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x5dbb63, 0.4);
  scene.add(hemi);

  // Nubes estilo Minecraft
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 12; i++) {
    const cloud = new THREE.Mesh(new THREE.BoxGeometry(8 + Math.random() * 8, 1.2, 3 + Math.random() * 4), cloudMat);
    cloud.position.set(-100 + Math.random() * 200, 45 + Math.random() * 8, -100 + Math.random() * 200);
    scene.add(cloud);
  }

  // Pista
  const track = buildTrack();
  scene.add(track);

  // Jugador
  player = new Racers(selectedMotoIndex, true, playerName, 0);
  scene.add(player.group);

  // Bots
  const botNames = ['🧱 Steve', '⛏️ Alex', '🐷 Piggly', '👾 CreeperBot', '🟢 Slime', '🐉 Zombie', '🦴 Skeleton', '🏹 Enderman'];
  for (let i = 0; i < BOT_COUNT; i++) {
    const motoIdx = (i + 3) % MOTOS.length;
    const bot = new Racers(motoIdx, false, botNames[i % botNames.length], 2 + i);
    bot.skill = 0.7 + Math.random() * 0.3;
    scene.add(bot.group);
    bots.push(bot);
  }

  // HUD
  document.getElementById('lap-display').textContent = `Vuelta ${currentLap}/${TOTAL_LAPS}`;
  updatePositionUI();

  clock = new THREE.Clock();
  raceActive = true;

  // Cuenta regresiva
  startCountdown();
  animate();
}

function startCountdown() {
  const cdEl = document.getElementById('countdown');
  const cdText = document.getElementById('countdown-text');
  cdEl.style.display = 'flex';
  
  countdownInterval = setInterval(() => {
    cdEl.style.display = 'flex';
    if (countdownValue > 0) {
      cdText.textContent = countdownValue === 3 ? '3' : countdownValue === 2 ? '2' : '1';
      countdownValue--;
    } else {
      cdText.textContent = '¡YA!';
      raceStarted = true;
      setTimeout(() => {
        cdEl.style.display = 'none';
      }, 600);
      clearInterval(countdownInterval);
    }
  }, 1000);
}

// ====== BUCLE PRINCIPAL ======
function animate() {
  if (!raceActive) return;
  requestAnimationFrame(animate);

  const dt = clock.getDelta();
  if (raceStarted) raceTime += dt;

  // Input del jugador (PC)
  const input = { steer: 0, accel: false, brake: false, nitro: false };
  if (keys['ArrowRight'] || keys['d'] || keys['D']) input.steer = 1;
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) input.steer = -1;
  if (keys['ArrowUp'] || keys['w'] || keys['W']) input.accel = true;
  if (keys['ArrowDown'] || keys['s'] || keys['S']) input.brake = true;
  if (keys[' ']) input.nitro = true;

  if (!raceStarted) { input.accel = false; input.nitro = false; }
  
  player.updateInput(input);
  bots.forEach(bot => {
    bot.updateInput(botInput(bot));
  });

  updateCamera();
  updatePositionUI();
  updateHUD();
  drawMinimap();

  // Animación de ruedas
  const all = [player, ...bots];
  all.forEach(r => {
    r.group.children.forEach(child => {
      if (child.geometry && child.geometry.type === 'CylinderGeometry') {
        child.rotation.z += r.speed * (dt * 4);
      }
    });
  });

  renderer.render(scene, camera);
}

function updateHUD() {
  if (!player) return;
  const speed = Math.round(player.speed * 3.6);
  document.getElementById('speed-display').innerHTML = `${speed} <span>km/h</span>`;
  document.getElementById('boost-fill').style.width = `${player.nitro}%`;
  const boostFill = document.getElementById('boost-fill');
  boostFill.style.background = player.boostActive ? 'linear-gradient(90deg, #ff6b35, #ff0000)' : 'linear-gradient(90deg, #f7d44c, #ff6b35)';
  document.getElementById('timer-display').textContent = formatTime(raceTime);
}

// ====== UTILIDADES ======
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerpT(a, b, t) {
  return a + (b - a) * t;
}

// Punto más cercano sobre la pista (polilínea cerrada de TRACK_POINTS)
function trackClosestPoint(pos) {
  const pts = TRACK_POINTS;
  const n = pts.length;
  let bestDist = Infinity;
  let bestPoint = new THREE.Vector3(pos.x, 0, pos.z);
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const abx = b.x - a.x, abz = b.z - a.z;
    const apx = pos.x - a.x, apz = pos.z - a.z;
    const ab2 = abx * abx + abz * abz;
    if (ab2 === 0) continue;
    let t = (apx * abx + apz * abz) / ab2;
    t = Math.max(0, Math.min(1, t));
    const cx = a.x + abx * t, cz = a.z + abz * t;
    const dx = pos.x - cx, dz = pos.z - cz;
    const d = dx * dx + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      bestPoint.x = cx;
      bestPoint.z = cz;
    }
  }
  return bestPoint;
}