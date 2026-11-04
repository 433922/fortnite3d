// bots.js - Master Battle Royale Engine, Bot AI State Machine, Storm Zone & Victory System

// =============================================================================
// 1. GAME STATE & BATTLE ROYALE MATCH CONFIGURATION
// =============================================================================
const MATCH_STATE = {
  PREGAME: 'PREGAME',
  PLAYING: 'PLAYING',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT'
};

let currentMatchState = MATCH_STATE.PREGAME;
let totalAlivePlayers = 25;
let playerEliminations = 0;

// Match Timers
let matchStartTime = 0;
let lastFrameTime = performance.now();
let deltaTime = 0;

// =============================================================================
// 2. STORM CIRCLE SYSTEM (SHRINKING BATTLE ZONE)
// =============================================================================
const StormSystem = {
  mesh: null,
  currentRadius: 550,
  targetRadius: 550,
  centerX: 0,
  centerZ: 0,
  targetCenterX: 0,
  targetCenterZ: 0,
  damagePerSecond: 2,
  phase: 0,
  phaseTimer: 45, // seconds before storm shrinks
  isShrinking: false,
  shrinkSpeed: 0.25,

  init() {
    // Transparent purple storm cylinder wall
    const stormGeo = new THREE.CylinderGeometry(
      this.currentRadius,
      this.currentRadius,
      300,
      64,
      1,
      true
    );
    const stormMat = new THREE.MeshBasicMaterial({
      color: 0x9900ff,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(stormGeo, stormMat);
    this.mesh.position.set(0, 100, 0);
    scene.add(this.mesh);

    this.setupStormHUD();
  },

  setupStormHUD() {
    const stormHud = document.createElement('div');
    stormHud.id = 'storm-hud';
    stormHud.style.position = 'absolute';
    stormHud.style.top = '15px';
    stormHud.style.right = '15px';
    stormHud.style.color = '#ffffff';
    stormHud.style.background = 'rgba(150, 0, 255, 0.4)';
    stormHud.style.border = '2px solid #9900ff';
    stormHud.style.padding = '8px 16px';
    stormHud.style.borderRadius = '8px';
    stormHud.style.fontWeight = '800';
    stormHud.style.fontSize = '14px';
    stormHud.style.textShadow = '0 0 6px #000';
    stormHud.style.zIndex = '10';
    stormHud.style.backdropFilter = 'blur(4px)';
    stormHud.innerHTML = '⚡ STORM EYE: SAFE | ALIVE: <span id="alive-cnt">25</span>';
    document.body.appendChild(stormHud);
  },

  update(dt) {
    if (currentMatchState !== MATCH_STATE.PLAYING) return;

    // Handle storm timer and shrinking phases
    if (!this.isShrinking) {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        this.nextPhase();
      }
    } else {
      // Interpolate storm radius towards target
      if (this.currentRadius > this.targetRadius) {
        this.currentRadius -= this.shrinkSpeed * (dt * 60);
        this.centerX += (this.targetCenterX - this.centerX) * 0.002;
        this.centerZ += (this.targetCenterZ - this.centerZ) * 0.002;

        // Rebuild storm geometry with updated radius
        this.mesh.geometry.dispose();
        this.mesh.geometry = new THREE.CylinderGeometry(
          this.currentRadius,
          this.currentRadius,
          300,
          64,
          1,
          true
        );
        this.mesh.position.set(this.centerX, 100, this.centerZ);
      } else {
        this.isShrinking = false;
        this.phaseTimer = 30; // reset wait timer for next phase
      }
    }

    // Check if player is outside the storm safe circle
    if (player) {
      const dx = player.position.x - this.centerX;
      const dz = player.position.z - this.centerZ;
      const distFromCenter = Math.sqrt(dx * dx + dz * dz);

      if (distFromCenter > this.currentRadius) {
        this.applyStormDamageToPlayer(dt);
      }
    }

    // Update Storm HUD Text
    const aliveEl = document.getElementById('alive-cnt');
    if (aliveEl) aliveEl.innerText = totalAlivePlayers;
  },

  nextPhase() {
    this.phase++;
    this.isShrinking = true;
    this.damagePerSecond += 2; // Increase storm tick damage each phase

    // Shrink radius by 40% each stage
    this.targetRadius = Math.max(20, this.currentRadius * 0.6);

    // Shift new circle center toward map center
    this.targetCenterX = this.centerX + (Math.random() - 0.5) * (this.currentRadius * 0.5);
    this.targetCenterZ = this.centerZ + (Math.random() - 0.5) * (this.currentRadius * 0.5);

    addKillFeedEntry("⚡ The storm is shrinking!", "#9900ff");
  },

  applyStormDamageToPlayer(dt) {
    const dmg = this.damagePerSecond * dt;
    
    // Storm penetrates shield and directly damages Health (HP)
    playerStats.hp -= dmg;
    if (playerStats.hp < 0) playerStats.hp = 0;

    // Update Health HUD Bar
    const hpVal = document.getElementById('hp-val');
    const hpBar = document.getElementById('hp-bar');
    if (hpVal) hpVal.innerText = Math.ceil(playerStats.hp);
    if (hpBar) hpBar.style.width = (playerStats.hp / playerStats.maxHp * 100) + '%';

    // Flash screen red tint on storm damage
    triggerDamageFlash();

    if (playerStats.hp <= 0) {
      triggerDefeat();
    }
  }
};

// =============================================================================
// 3. SUPPLY DROPS & AIRDROP SYSTEM
// =============================================================================
let supplyDrops = [];

function spawnSupplyDrop() {
  const dropGroup = new THREE.Group();

  // Supply Crate Box
  const crateGeo = new THREE.BoxGeometry(3.5, 3.5, 3.5);
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x1e88e5,
    metalness: 0.6,
    roughness: 0.3
  });
  const crate = new THREE.Mesh(crateGeo, crateMat);
  crate.position.y = 1.75;
  crate.castShadow = true;
  dropGroup.add(crate);

  // Parachute Canopy
  const chuteGeo = new THREE.ConeGeometry(8, 4, 8, 1, true);
  const chuteMat = new THREE.MeshStandardMaterial({
    color: 0xffeb3b,
    side: THREE.DoubleSide
  });
  const chute = new THREE.Mesh(chuteGeo, chuteMat);
  chute.position.y = 12;
  dropGroup.add(chute);

  // Parachute Strings
  const stringMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
    const points = [];
    points.push(new THREE.Vector3(Math.cos(angle) * 7, 10, Math.sin(angle) * 7));
    points.push(new THREE.Vector3(0, 3.5, 0));
    const stringGeo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(stringGeo, stringMat);
    dropGroup.add(line);
  }

  // Position high in the sky above storm safe zone
  const dropX = StormSystem.centerX + (Math.random() - 0.5) * (StormSystem.currentRadius * 0.8);
  const dropZ = StormSystem.centerZ + (Math.random() - 0.5) * (StormSystem.currentRadius * 0.8);
  dropGroup.position.set(dropX, 180, dropZ);

  dropGroup.userData = {
    isSupplyDrop: true,
    isLanded: false,
    fallSpeed: 0.35
  };

  scene.add(dropGroup);
  supplyDrops.push(dropGroup);

  addKillFeedEntry("📦 Supply Drop incoming in the safe zone!", "#ffcc00");
}

function updateSupplyDrops(dt) {
  supplyDrops.forEach(drop => {
    if (!drop.userData.isLanded) {
      drop.position.y -= drop.userData.fallSpeed * (dt * 60);

      // Ground collision check
      if (drop.position.y <= 0) {
        drop.position.y = 0;
        drop.userData.isLanded = true;

        // Remove Parachute on landing
        drop.children = drop.children.filter(c => c.geometry.type === 'BoxGeometry');

        // Add golden light glow to landed crate
        const crateGlow = new THREE.PointLight(0xffaa00, 3, 15);
        crateGlow.position.set(0, 2, 0);
        drop.add(crateGlow);
      }
    }
  });
}

// =============================================================================
// 4. AI ENEMY BOT ENGINE & STATE MACHINE
// =============================================================================
let botEnemies = [];

// BOT SKIN COLORS & VARIATIONS
const BOT_SKINS = [
  { name: 'Dark Voyager', body: 0x111111, head: 0xffaa00, rank: 'PRO' },
  { name: 'Raven', body: 0x221133, head: 0x8800cc, rank: 'ELITE' },
  { name: 'Cuddle Team', body: 0xff66cc, head: 0xffb3de, rank: 'CASUAL' },
  { name: 'Skull Trooper', body: 0x1a1a1a, head: 0xffffff, rank: 'TRYHARD' },
  { name: 'Raptor', body: 0xb35900, head: 0xffd11a, rank: 'PRO' }
];

const BOT_STATES = {
  WANDER: 'WANDER',
  PURSUE: 'PURSUE',
  ATTACK: 'ATTACK',
  BUILD_COVER: 'BUILD_COVER',
  TAKE_LOOT: 'TAKE_LOOT'
};

function spawnBotEnemy(id) {
  const botGroup = new THREE.Group();
  const skin = BOT_SKINS[Math.floor(Math.random() * BOT_SKINS.length)];

  // Bot Character Model Assembly
  const bodyGeo = new THREE.BoxGeometry(1.3, 2.0, 0.85);
  const bodyMat = new THREE.MeshStandardMaterial({ color: skin.body, roughness: 0.6 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 2.0;
  body.castShadow = true;
  botGroup.add(body);

  const headGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
  const headMat = new THREE.MeshStandardMaterial({ color: skin.head, roughness: 0.4 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 3.4;
  head.castShadow = true;
  botGroup.add(head);

  const armGeo = new THREE.BoxGeometry(0.4, 1.6, 0.4);
  const leftArm = new THREE.Mesh(armGeo, bodyMat);
  leftArm.position.set(-0.95, 2.0, 0);
  botGroup.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, bodyMat);
  rightArm.position.set(0.95, 2.0, 0);
  botGroup.add(rightArm);

  const legGeo = new THREE.BoxGeometry(0.5, 1.5, 0.5);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x151515 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.4, 0.75, 0);
  botGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.4, 0.75, 0);
  botGroup.add(rightLeg);

  // Bot Gun Mesh Prop
  const gunGeo = new THREE.BoxGeometry(0.2, 0.35, 1.8);
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
  const gun = new THREE.Mesh(gunGeo, gunMat);
  gun.position.set(0.7, 1.8, -0.6);
  botGroup.add(gun);

  // Spawn position within map boundaries
  const spawnRadius = 380;
  const x = (Math.random() - 0.5) * spawnRadius;
  const z = (Math.random() - 0.5) * spawnRadius;
  botGroup.position.set(x, 0, z);

  // Bot State Data & Methods
  botGroup.userData = {
    isBot: true,
    id: `Bot_${id}`,
    skinName: skin.name,
    rank: skin.rank,
    hp: 100,
    shield: 50,
    maxHp: 100,
    state: BOT_STATES.WANDER,
    moveSpeed: skin.rank === 'TRYHARD' ? 0.35 : 0.26,
    shootCooldown: 0,
    fireRate: skin.rank === 'TRYHARD' ? 350 : 700, // ms between shots
    accuracy: skin.rank === 'TRYHARD' ? 0.85 : 0.55,
    targetPos: new THREE.Vector3(x, 0, z),
    changeTargetTimer: 0,
    
    takeDamage: function(damageAmount) {
      // First absorb damage with Shield
      if (this.shield > 0) {
        this.shield -= damageAmount;
        if (this.shield < 0) {
          this.hp += this.shield; // remaining damage spills into HP
          this.shield = 0;
        }
      } else {
        this.hp -= damageAmount;
      }

      // Enter aggressive ATTACK state if shot
      this.state = BOT_STATES.ATTACK;

      // Check Bot Elimination
      if (this.hp <= 0) {
        this.eliminate();
      }
    },

    eliminate: function() {
      scene.remove(botGroup);
      botEnemies = botEnemies.filter(b => b !== botGroup);
      totalAlivePlayers--;
      playerEliminations++;

      // Trigger Floating Loot Drop on Bot Death
      spawnLootOnDeath(botGroup.position);

      // Add to HUD Kill Feed
      addKillFeedEntry(`🎯 You eliminated ${this.skinName} (${this.rank})!`, "#00ff55");

      // Check Victory Condition
      if (totalAlivePlayers <= 1) {
        triggerVictory();
      }
    }
  };

  // Tag children for hitscan raycasting
  body.userData = botGroup.userData;
  head.userData = botGroup.userData;

  scene.add(botGroup);
  botEnemies.push(botGroup);
}

function initializeAllBots() {
  for (let i = 1; i < totalAlivePlayers; i++) {
    spawnBotEnemy(i);
  }
}

// -----------------------------------------------------------------------------
// 5. BOT AI TICK & BEHAVIOR LOGIC
// -----------------------------------------------------------------------------
function updateBotAI(dt) {
  if (currentMatchState !== MATCH_STATE.PLAYING || !player) return;

  const now = Date.now();

  botEnemies.forEach(bot => {
    const data = bot.userData;
    const distToPlayer = bot.position.distanceTo(player.position);

    // Update Bot AI State Machine
    if (distToPlayer < 70) {
      data.state = BOT_STATES.ATTACK;
    } else if (distToPlayer < 180) {
      data.state = BOT_STATES.PURSUE;
    } else {
      data.state = BOT_STATES.WANDER;
    }

    // STATE 1: WANDER RANDOM WAYPOINTS
    if (data.state === BOT_STATES.WANDER) {
      data.changeTargetTimer -= dt;
      if (data.changeTargetTimer <= 0) {
        data.changeTargetTimer = 5 + Math.random() * 8;
        // Target random point toward storm center
        data.targetPos.set(
          StormSystem.centerX + (Math.random() - 0.5) * StormSystem.currentRadius,
          0,
          StormSystem.centerZ + (Math.random() - 0.5) * StormSystem.currentRadius
        );
      }

      moveBotToward(bot, data.targetPos, data.moveSpeed);
    }

    // STATE 2: PURSUE PLAYER
    else if (data.state === BOT_STATES.PURSUE) {
      moveBotToward(bot, player.position, data.moveSpeed * 1.2);
    }

    // STATE 3: ATTACK & COMBAT ENGAGEMENT
    else if (data.state === BOT_STATES.ATTACK) {
      bot.lookAt(player.position.x, bot.position.y, player.position.z);

      // Keep optimal combat distance
      if (distToPlayer > 18) {
        moveBotToward(bot, player.position, data.moveSpeed);
      }

      // Shoot Player with Accuracy Roll
      if (now - data.shootCooldown > data.fireRate) {
        data.shootCooldown = now;
        botFireAtPlayer(bot, data);
      }
    }

    // Periodic Storm Damage to Bots outside safe circle
    const distFromStorm = Math.sqrt(
      Math.pow(bot.position.x - StormSystem.centerX, 2) +
      Math.pow(bot.position.z - StormSystem.centerZ, 2)
    );
    if (distFromStorm > StormSystem.currentRadius) {
      data.hp -= StormSystem.damagePerSecond * dt;
      if (data.hp <= 0) {
        data.eliminate();
      }
    }
  });
}

function moveBotToward(bot, targetVector, speed) {
  bot.lookAt(targetVector.x, bot.position.y, targetVector.z);
  const dir = new THREE.Vector3().subVectors(targetVector, bot.position).normalize();
  dir.y = 0; // Lock to ground plane
  bot.position.add(dir.multiplyScalar(speed));
}

function botFireAtPlayer(bot, data) {
  // Play Bot Gunshot Sound
  if (typeof AudioEngine !== 'undefined' && AudioEngine.playGunshot) {
    AudioEngine.playGunshot('Assault Rifle');
  }

  // Create tracer line from bot to player
  createBulletTracer(bot.position.clone().add(new THREE.Vector3(0, 1.8, 0)), player.position);

  // Roll accuracy test
  if (Math.random() < data.accuracy) {
    const dmg = data.rank === 'TRYHARD' ? 18 : 12;

    // Apply Damage to Player Shield then HP
    if (playerStats.shield > 0) {
      playerStats.shield -= dmg;
      if (playerStats.shield < 0) {
        playerStats.hp += playerStats.shield;
        playerStats.shield = 0;
      }
    } else {
      playerStats.hp -= dmg;
    }

    if (playerStats.hp < 0) playerStats.hp = 0;

    // Update HUD Vitals
    const hpVal = document.getElementById('hp-val');
    const hpBar = document.getElementById('hp-bar');
    const sVal = document.getElementById('shield-val');
    const sBar = document.getElementById('shield-bar');

    if (hpVal) hpVal.innerText = Math.ceil(playerStats.hp);
    if (hpBar) hpBar.style.width = (playerStats.hp / playerStats.maxHp * 100) + '%';
    if (sVal) sVal.innerText = Math.ceil(playerStats.shield);
    if (sBar) sBar.style.width = (playerStats.shield / playerStats.maxShield * 100) + '%';

    triggerDamageFlash();

    if (playerStats.hp <= 0) {
      triggerDefeat();
    }
  }
}

// =============================================================================
// 6. LOOT DROPS, TRACERS, & PARTICLE EFFECTS
// =============================================================================
function spawnLootOnDeath(position) {
  const lootGroup = new THREE.Group();

  // Floating Shield Potion Model
  const potGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.0, 8);
  const potMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, emissive: 0x0066aa, emissiveIntensity: 0.8 });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.y = 1.0;
  lootGroup.add(pot);

  // Golden Glow Light
  const light = new THREE.PointLight(0x00d2ff, 2, 8);
  light.position.y = 1.5;
  lootGroup.add(light);

  lootGroup.position.copy(position);
  scene.add(lootGroup);

  // Automatically give materials reward
  playerStats.wood += 50;
  playerStats.stone += 30;
  playerStats.metal += 15;

  const wEl = document.getElementById('wood-cnt');
  if (wEl) wEl.innerText = playerStats.wood;
}

function createBulletTracer(startPos, endPos) {
  const points = [startPos, endPos];
  const tracerGeo = new THREE.BufferGeometry().setFromPoints(points);
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.8 });
  const line = new THREE.Line(tracerGeo, tracerMat);

  scene.add(line);
  setTimeout(() => scene.remove(line), 60);
}

function triggerDamageFlash() {
  let flash = document.getElementById('dmg-flash');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'dmg-flash';
    flash.style.position = 'absolute';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.background = 'rgba(255, 0, 0, 0.25)';
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '15';
    flash.style.transition = 'opacity 0.2s';
    document.body.appendChild(flash);
  }

  flash.style.opacity = '1';
  setTimeout(() => { flash.style.opacity = '0'; }, 150);
}

// =============================================================================
// 7. KILL FEED & VICTORY / DEFEAT UI SYSTEM
// =============================================================================
function addKillFeedEntry(message, colorHex) {
  let feedContainer = document.getElementById('kill-feed');
  if (!feedContainer) {
    feedContainer = document.createElement('div');
    feedContainer.id = 'kill-feed';
    feedContainer.style.position = 'absolute';
    feedContainer.style.bottom = '100px';
    feedContainer.style.left = '20px';
    feedContainer.style.zIndex = '10';
    feedContainer.style.display = 'flex';
    feedContainer.style.flexDirection = 'column';
    feedContainer.style.gap = '6px';
    document.body.appendChild(feedContainer);
  }

  const msg = document.createElement('div');
  msg.innerText = message;
  msg.style.color = colorHex || '#ffffff';
  msg.style.background = 'rgba(0, 0, 0, 0.65)';
  msg.style.padding = '6px 12px';
  msg.style.borderRadius = '4px';
  msg.style.fontSize = '13px';
  msg.style.fontWeight = '700';
  msg.style.textShadow = '1px 1px 2px #000';
  msg.style.backdropFilter = 'blur(4px)';

  feedContainer.appendChild(msg);

  // Fade out and remove after 4 seconds
  setTimeout(() => {
    msg.style.transition = 'opacity 0.5s';
    msg.style.opacity = '0';
    setTimeout(() => msg.remove(), 500);
  }, 4000);
}

function triggerVictory() {
  currentMatchState = MATCH_STATE.VICTORY;

  const victoryBanner = document.createElement('div');
  victoryBanner.style.position = 'absolute';
  victoryBanner.style.top = '20%';
  victoryBanner.style.left = '50%';
  victoryBanner.style.transform = 'translate(-50%, -50%)';
  victoryBanner.style.background = 'linear-gradient(135deg, #ffcc00, #ff8800)';
  victoryBanner.style.color = '#000000';
  victoryBanner.style.padding = '24px 60px';
  victoryBanner.style.borderRadius = '12px';
  victoryBanner.style.fontSize = '48px';
  victoryBanner.style.fontWeight = '900';
  victoryBanner.style.textAlign = 'center';
  victoryBanner.style.boxShadow = '0 0 40px rgba(255, 204, 0, 0.9)';
  victoryBanner.style.zIndex = '30';
  victoryBanner.innerHTML = '🏆 VICTORY ROYALE! 🏆<br><span style="font-size: 20px;">#1 - ELIMINATIONS: ' + playerEliminations + '</span>';

  document.body.appendChild(victoryBanner);
  document.exitPointerLock();
}

function triggerDefeat() {
  if (currentMatchState === MATCH_STATE.DEFEAT) return;
  currentMatchState = MATCH_STATE.DEFEAT;

  const defeatBanner = document.createElement('div');
  defeatBanner.style.position = 'absolute';
  defeatBanner.style.top = '25%';
  defeatBanner.style.left = '50%';
  defeatBanner.style.transform = 'translate(-50%, -50%)';
  defeatBanner.style.background = 'rgba(200, 0, 0, 0.85)';
  defeatBanner.style.color = '#ffffff';
  defeatBanner.style.padding = '20px 50px';
  defeatBanner.style.borderRadius = '12px';
  defeatBanner.style.fontSize = '38px';
  defeatBanner.style.fontWeight = '900';
  defeatBanner.style.textAlign = 'center';
  defeatBanner.style.boxShadow = '0 0 30px rgba(255, 0, 0, 0.8)';
  defeatBanner.style.zIndex = '30';
  defeatBanner.innerHTML = 'ELIMINATED<br><span style="font-size: 18px;">PLACED #' + totalAlivePlayers + ' - ELIMS: ' + playerEliminations + '</span><br><button onclick="location.reload()" style="margin-top:15px; padding:10px 20px; font-weight:800; cursor:pointer;">PLAY AGAIN</button>';

  document.body.appendChild(defeatBanner);
  document.exitPointerLock();
}

// Override Start Game Function from player.js to kick off match timers
window.startGame = function() {
  const menu = document.getElementById('menu-overlay');
  if (menu) menu.style.display = 'none';

  document.body.requestPointerLock();
  currentMatchState = MATCH_STATE.PLAYING;
  matchStartTime = Date.now();

  // Schedule Supply Drop Spawns
  setTimeout(spawnSupplyDrop, 20000);
  setTimeout(spawnSupplyDrop, 60000);

  addKillFeedEntry("🚌 Jumped from the Battle Bus! 25 Players remain.", "#ffffff");
};

// Initialize Storm System & Bots
StormSystem.init();
initializeAllBots();

// =============================================================================
// 8. MASTER ANIMATION & RENDER FRAME LOOP
// =============================================================================
function masterGameLoop(timestamp) {
  requestAnimationFrame(masterGameLoop);

  // Compute Delta Time in Seconds
  deltaTime = (timestamp - lastFrameTime) / 1000;
  if (isNaN(deltaTime) || deltaTime > 0.1) deltaTime = 0.016; // Clamp large spikes
  lastFrameTime = timestamp;

  // Run Subsystem Frame Updates
  if (typeof updatePlayer === 'function') updatePlayer();
  if (typeof updateWeapons === 'function') updateWeapons();

  updateBotAI(deltaTime);
  StormSystem.update(deltaTime);
  updateSupplyDrops(deltaTime);

  // Render 3D Three.js Scene
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// Launch Game Loop Engine
requestAnimationFrame(masterGameLoop);