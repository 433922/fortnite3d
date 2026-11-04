// weapons.js - Comprehensive Fortnite Combat Engine, 3D Gun Models, & Sound System

// -----------------------------------------------------------------------------
// 1. WEAPON INVENTORY & STATS CONFIGURATION
// -----------------------------------------------------------------------------
let currentSlot = 1;
let isAimingDownSights = false;
let isReloading = false;
let reloadTimer = null;
let lastFiredTime = 0;
let isShootingHeld = false;

const WEAPONS_DB = {
  1: {
    name: 'Tactical Pickaxe',
    type: 'melee',
    damage: 20,
    harvestYield: 25,
    range: 5,
    fireRate: 350, // ms between swings
    recoil: 0,
    bloom: 0,
    color: 0x8b5a2b
  },
  2: {
    name: 'Assault Rifle (AR)',
    type: 'auto',
    damage: 33,
    headshotMult: 1.5,
    fireRate: 110, // ~5.5 rounds/sec
    magSize: 30,
    currentAmmo: 30,
    reserveAmmo: 210,
    reloadTime: 2200,
    range: 300,
    recoil: 0.015,
    bloom: 0.02,
    zoomFov: 50,
    color: 0x4a525d
  },
  3: {
    name: 'Pump Shotgun',
    type: 'semi',
    damage: 95,
    pellets: 8,
    headshotMult: 1.85,
    fireRate: 750,
    magSize: 5,
    currentAmmo: 5,
    reserveAmmo: 35,
    reloadTime: 3200,
    range: 40,
    recoil: 0.05,
    bloom: 0.08,
    zoomFov: 60,
    color: 0x222222
  },
  4: {
    name: 'Bolt Sniper',
    type: 'semi',
    damage: 116,
    headshotMult: 2.5,
    fireRate: 1400,
    magSize: 1,
    currentAmmo: 1,
    reserveAmmo: 15,
    reloadTime: 2500,
    range: 600,
    recoil: 0.08,
    bloom: 0.002,
    zoomFov: 25,
    color: 0x2e422b
  },
  5: {
    name: 'Mini Shield Potion',
    type: 'consumable',
    shieldAmount: 25,
    maxShieldCap: 50,
    useTime: 2000,
    quantity: 3,
    color: 0x00d2ff
  }
};

// 3D Weapon Mesh Container Group
let currentWeaponMeshGroup = null;
let muzzleFlashLight = null;
let swingAnimationAngle = 0;
let isSwingingPickaxe = false;

// -----------------------------------------------------------------------------
// 2. WEB AUDIO SFX SYNTHESIZER (No external audio files needed)
// -----------------------------------------------------------------------------
const AudioEngine = {
  ctx: null,

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  },

  playGunshot(type) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Noise buffer for blast
    const bufferSize = this.ctx.sampleRate * (type === 'Bolt Sniper' ? 0.4 : 0.2);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = type === 'Bolt Sniper' ? 'lowpass' : 'bandpass';
    filter.frequency.value = type === 'Bolt Sniper' ? 800 : 1200;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(type === 'Pump Shotgun' ? 0.8 : 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + (type === 'Bolt Sniper' ? 0.38 : 0.18));

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(now);
  },

  playPickaxeSwing() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  },

  playHitImpact(isWoodStone) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(isWoodStone ? 120 : 300, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  },

  playShieldChug() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }
};

// -----------------------------------------------------------------------------
// 3. 3D WEAPON MESH BUILDER & INITIALIZATION
// -----------------------------------------------------------------------------
function buildWeapon3DMesh(slot) {
  if (currentWeaponMeshGroup) {
    scene.remove(currentWeaponMeshGroup);
  }

  currentWeaponMeshGroup = new THREE.Group();
  const weapon = WEAPONS_DB[slot];

  if (slot === 1) {
    // PICKAXE MODEL
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 })
    );
    handle.position.set(0, 0, 0);

    const axeHead = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.3, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 })
    );
    axeHead.position.set(0, 1.4, 0);

    currentWeaponMeshGroup.add(handle);
    currentWeaponMeshGroup.add(axeHead);
    currentWeaponMeshGroup.position.set(0.8, 1.8, -1.2);

  } else if (slot === 2) {
    // ASSAULT RIFLE MODEL
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.4, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6 })
    );

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.1, -1.4);

    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.8, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xffee00 })
    );
    mag.position.set(0, -0.4, -0.2);
    mag.rotation.x = -0.3;

    currentWeaponMeshGroup.add(body, barrel, mag);
    currentWeaponMeshGroup.position.set(0.7, 1.8, -1.2);

  } else if (slot === 3) {
    // PUMP SHOTGUN MODEL
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.4, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7 })
    );

    const pumpGrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    pumpGrip.position.set(0, -0.15, -0.6);

    currentWeaponMeshGroup.add(body, pumpGrip);
    currentWeaponMeshGroup.position.set(0.7, 1.8, -1.2);

  } else if (slot === 4) {
    // BOLT SNIPER MODEL
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.35, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x2e3a23, roughness: 0.6 })
    );

    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 })
    );
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.35, -0.2);

    currentWeaponMeshGroup.add(body, scope);
    currentWeaponMeshGroup.position.set(0.7, 1.8, -1.2);

  } else if (slot === 5) {
    // SHIELD POTION MODEL
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12),
      new THREE.MeshStandardMaterial({ color: 0x00d2ff, transparent: true, opacity: 0.8, roughness: 0.1 })
    );
    currentWeaponMeshGroup.add(bottle);
    currentWeaponMeshGroup.position.set(0.6, 1.8, -1.0);
  }

  // Muzzle Flash PointLight
  muzzleFlashLight = new THREE.PointLight(0xffaa00, 0, 15);
  muzzleFlashLight.position.set(0, 0.2, -2.0);
  currentWeaponMeshGroup.add(muzzleFlashLight);

  scene.add(currentWeaponMeshGroup);
}

// -----------------------------------------------------------------------------
// 4. COMBAT INPUT HANDLERS (SHOOTING, AIMING, RELOADING, WEAPON SWAP)
// -----------------------------------------------------------------------------
function setupWeapons() {
  window.addEventListener('keydown', (e) => {
    AudioEngine.init(); // Initialize audio context on first keypress
    const slotNum = parseInt(e.key);

    if (slotNum >= 1 && slotNum <= 5) {
      equipSlot(slotNum);
    }

    // Manual Reload Key (R)
    if (e.key.toLowerCase() === 'r') {
      reloadWeapon();
    }
  });

  // Mouse Buttons (Left Click = Shoot/Swing, Right Click = ADS Zoom)
  window.addEventListener('mousedown', (e) => {
    AudioEngine.init();
    if (document.pointerLockElement !== document.body) return;

    if (e.button === 0) { // Left Click
      isShootingHeld = true;
      triggerWeaponAction();
    } else if (e.button === 2) { // Right Click (ADS Zoom)
      if (currentSlot >= 2 && currentSlot <= 4) {
        isAimingDownSights = true;
      }
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) isShootingHeld = false;
    if (e.button === 2) isAimingDownSights = false;
  });

  // Prevent right click menu in browser
  window.addEventListener('contextmenu', e => e.preventDefault());
}

function equipSlot(slot) {
  if (isReloading) return;
  currentSlot = slot;

  // Highlight active slot in HUD
  for (let i = 1; i <= 5; i++) {
    const slotEl = document.getElementById(`slot-${i}`);
    if (slotEl) {
      if (i === slot) slotEl.classList.add('active');
      else slotEl.classList.remove('active');
    }
  }

  buildWeapon3DMesh(slot);
  updateAmmoHUD();
}

// -----------------------------------------------------------------------------
// 5. WEAPON ACTION & RAYCASTING HIT DETECTION
// -----------------------------------------------------------------------------
function triggerWeaponAction() {
  const now = Date.now();
  const weapon = WEAPONS_DB[currentSlot];
  if (!weapon) return;

  // 1. CONSUMABLE ITEMS (Shield Potion)
  if (weapon.type === 'consumable') {
    consumeShieldPotion(weapon);
    return;
  }

  // 2. MELEE PICKAXE HARVESTING
  if (weapon.type === 'melee') {
    if (now - lastFiredTime < weapon.fireRate) return;
    lastFiredTime = now;
    isSwingingPickaxe = true;
    swingAnimationAngle = 0;
    AudioEngine.playPickaxeSwing();
    performPickaxeRaycast(weapon);
    return;
  }

  // 3. RANGED GUN FIRE
  if (isReloading) return;

  if (weapon.currentAmmo <= 0) {
    reloadWeapon();
    return;
  }

  if (now - lastFiredTime < weapon.fireRate) return;
  lastFiredTime = now;

  // Deduct Ammo
  weapon.currentAmmo--;
  updateAmmoHUD();

  // Play Gunshot SFX & Flash Muzzle
  AudioEngine.playGunshot(weapon.name);
  triggerMuzzleFlash();

  // Recoil Impulse (Camera Kick Up)
  pitch += weapon.recoil * (isAimingDownSights ? 0.4 : 1.0);

  // Perform Raycast Fire
  if (weapon.name === 'Pump Shotgun') {
    for (let p = 0; p < weapon.pellets; p++) {
      fireBulletRaycast(weapon, true);
    }
  } else {
    fireBulletRaycast(weapon, false);
  }
}

function fireBulletRaycast(weapon, isShotgunPellet) {
  const raycaster = new THREE.Raycaster();

  // Apply Spread / Bloom based on ADS state
  const spreadFactor = isAimingDownSights ? weapon.bloom * 0.3 : weapon.bloom;
  const spreadX = (Math.random() - 0.5) * spreadFactor;
  const spreadY = (Math.random() - 0.5) * spreadFactor;

  const reticleVector = new THREE.Vector2(spreadX, spreadY);
  raycaster.setFromCamera(reticleVector, camera);

  // Raycast intersect all objects in scene
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const hit = intersects[0];

    // Create bullet spark impact point
    createSparkImpact(hit.point, 0xffcc00);

    // Check hit target object
    let target = hit.object;
    while (target && !target.userData.isBot && !target.userData.isHarvestable && target.parent) {
      target = target.parent;
    }

    if (target && target.userData) {
      // HIT ENEMY BOT
      if (target.userData.isBot) {
        const isHeadshot = hit.point.y > target.position.y + 2.8;
        const damage = Math.round((isShotgunPellet ? weapon.damage / 8 : weapon.damage) * (isHeadshot ? weapon.headshotMult : 1.0));

        target.userData.takeDamage(damage);
        spawnFloatingDamageText(hit.point, damage, isHeadshot);
        AudioEngine.playHitImpact(false);
      }
      // HIT HARVESTABLE BUILDING / PROP
      else if (target.userData.isHarvestable) {
        const dmg = isShotgunPellet ? 10 : 25;
        harvestPropObject(target, dmg);
      }
    }
  }
}

function performPickaxeRaycast(weapon) {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0 && intersects[0].distance <= weapon.range) {
    const hit = intersects[0];

    let target = hit.object;
    while (target && !target.userData.isHarvestable && !target.userData.isBot && target.parent) {
      target = target.parent;
    }

    if (target && target.userData) {
      if (target.userData.isHarvestable) {
        harvestPropObject(target, weapon.damage);
        createSparkImpact(hit.point, 0x8b5a2b);
        AudioEngine.playHitImpact(true);
      } else if (target.userData.isBot) {
        target.userData.takeDamage(weapon.damage);
        spawnFloatingDamageText(hit.point, weapon.damage, false);
        AudioEngine.playHitImpact(false);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// 6. HARVESTING, RELOADING, & SHIELD CONSUMPTION
// -----------------------------------------------------------------------------
function harvestPropObject(target, damage) {
  const data = target.userData;
  if (!data || !data.isHarvestable) return;

  data.hp -= damage;

  // Add harvested materials to player inventory
  const yieldAmt = Math.round(data.yieldAmount * (damage / data.maxHp));
  if (data.materialType === 'wood') playerStats.wood += yieldAmt;
  if (data.materialType === 'stone') playerStats.stone += yieldAmt;
  if (data.materialType === 'metal') playerStats.metal += yieldAmt;

  // Update HUD Counters
  const wEl = document.getElementById('wood-cnt');
  const sEl = document.getElementById('stone-cnt');
  const mEl = document.getElementById('metal-cnt');

  if (wEl) wEl.innerText = playerStats.wood;
  if (sEl) sEl.innerText = playerStats.stone;
  if (mEl) mEl.innerText = playerStats.metal;

  // Destroy prop when HP hits 0
  if (data.hp <= 0) {
    scene.remove(target);
  }
}

function consumeShieldPotion(weapon) {
  if (weapon.quantity <= 0 || playerStats.shield >= 100) return;

  weapon.quantity--;
  playerStats.shield = Math.min(100, playerStats.shield + weapon.shieldAmount);
  AudioEngine.playShieldChug();

  // Update HUD Vitals
  const sVal = document.getElementById('shield-val');
  const sBar = document.getElementById('shield-bar');
  if (sVal) sVal.innerText = playerStats.shield;
  if (sBar) sBar.style.width = playerStats.shield + '%';
}

function reloadWeapon() {
  const weapon = WEAPONS_DB[currentSlot];
  if (!weapon || weapon.type === 'melee' || weapon.type === 'consumable') return;

  if (weapon.currentAmmo === weapon.magSize || weapon.reserveAmmo <= 0 || isReloading) return;

  isReloading = true;

  setTimeout(() => {
    const needed = weapon.magSize - weapon.currentAmmo;
    const added = Math.min(needed, weapon.reserveAmmo);

    weapon.currentAmmo += added;
    weapon.reserveAmmo -= added;

    isReloading = false;
    updateAmmoHUD();
  }, weapon.reloadTime);
}

// -----------------------------------------------------------------------------
// 7. VISUAL EFFECTS (SPARKS, FLOATING DAMAGE TEXT, MUZZLE FLASH)
// -----------------------------------------------------------------------------
function triggerMuzzleFlash() {
  if (muzzleFlashLight) {
    muzzleFlashLight.intensity = 4.0;
    setTimeout(() => { muzzleFlashLight.intensity = 0; }, 40);
  }
}

function createSparkImpact(point, colorHex) {
  const sparkGeo = new THREE.SphereGeometry(0.2, 6, 6);
  const sparkMat = new THREE.MeshBasicMaterial({ color: colorHex });
  const spark = new THREE.Mesh(sparkGeo, sparkMat);
  spark.position.copy(point);
  scene.add(spark);

  setTimeout(() => scene.remove(spark), 120);
}

function spawnFloatingDamageText(point, damage, isHeadshot) {
  const div = document.createElement('div');
  div.innerText = (isHeadshot ? 'CRIT! ' : '') + damage;
  div.style.position = 'absolute';
  div.style.color = isHeadshot ? '#ffee00' : '#ffffff';
  div.style.fontWeight = '900';
  div.style.fontSize = isHeadshot ? '24px' : '18px';
  div.style.textShadow = '0 0 6px #000';
  div.style.pointerEvents = 'none';
  div.style.zIndex = '30';

  document.body.appendChild(div);

  // Project 3D coordinate to 2D screen coordinate
  const screenPos = point.clone().project(camera);
  const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

  div.style.left = `${x}px`;
  div.style.top = `${y}px`;

  setTimeout(() => div.remove(), 700);
}

function updateAmmoHUD() {
  const weapon = WEAPONS_DB[currentSlot];
  const hintEl = document.getElementById('controls-hint');

  if (hintEl && weapon) {
    if (weapon.type === 'auto' || weapon.type === 'semi') {
      hintEl.innerHTML = `<strong>EQUIPPED: ${weapon.name}</strong><br>AMMO: ${weapon.currentAmmo} / ${weapon.reserveAmmo} ${isReloading ? '(RELOADING...)' : ''}`;
    } else if (weapon.type === 'consumable') {
      hintEl.innerHTML = `<strong>EQUIPPED: ${weapon.name}</strong><br>QTY: ${weapon.quantity}`;
    } else {
      hintEl.innerHTML = `<strong>EQUIPPED: ${weapon.name}</strong><br>Harvest Wood / Stone / Metal`;
    }
  }
}

// -----------------------------------------------------------------------------
// 8. WEAPONS UPDATE FRAME LOOP
// -----------------------------------------------------------------------------
function updateWeapons() {
  // Continuous firing for Automatic Rifles
  if (isShootingHeld && WEAPONS_DB[currentSlot].type === 'auto') {
    triggerWeaponAction();
  }

  // Smooth ADS Zoom FOV Transition
  if (camera) {
    const targetFov = isAimingDownSights ? WEAPONS_DB[currentSlot].zoomFov || 50 : 75;
    camera.fov += (targetFov - camera.fov) * 0.15;
    camera.updateProjectionMatrix();
  }

  // Pickaxe Swinging Animation Logic
  if (isSwingingPickaxe && currentWeaponMeshGroup) {
    swingAnimationAngle += 0.25;
    currentWeaponMeshGroup.rotation.x = Math.sin(swingAnimationAngle) * 1.2;
    if (swingAnimationAngle >= Math.PI) {
      isSwingingPickaxe = false;
      currentWeaponMeshGroup.rotation.x = 0;
    }
  }

  // Follow player camera position
  if (currentWeaponMeshGroup && player) {
    currentWeaponMeshGroup.position.copy(player.position).add(new THREE.Vector3(0, 1.8, 0));
    currentWeaponMeshGroup.rotation.y = yaw;
  }
}

// Initialize Weapons Controller
setupWeapons();