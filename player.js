// player.js - 3D Character Model, Third-Person Physics, & Building System

let player;
let playerMeshGroup;
let headMesh, torsoMesh, leftArm, rightArm, leftLeg, rightLeg;

// Player Attributes & Materials State
let playerStats = {
  hp: 100,
  maxHp: 100,
  shield: 100,
  maxShield: 100,
  wood: 500,
  stone: 300,
  metal: 100
};

// Movement Physics State
const keys = { w: false, a: false, s: false, d: false, shift: false, crouch: false, space: false };
let isGrounded = true;
let isSprinting = false;
let isCrouching = false;
let velocityY = 0;
const gravity = -0.016;
const jumpForce = 0.38;
let walkSpeed = 0.32;

// Camera Aiming Variables
let pitch = 0; // Vertical angle looking up/down
let yaw = 0;   // Horizontal rotation around player

// Fortnite Building Preview Hologram & State
let isBuildMode = false;
let currentBuildType = 'wall'; // 'wall', 'ramp', 'floor'
let buildPreviewMesh = null;
let playerBuiltStructures = [];

// -----------------------------------------------------------------------------
// 1. CHARACTER MODEL GENERATOR (Default Fortnite Skin Style)
// -----------------------------------------------------------------------------
function createPlayer() {
  playerMeshGroup = new THREE.Group();

  // Color Palette for Character
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffcc99, roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.5 }); // Jonesy Blonde Hair
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.6 }); // Tactical Green Shirt
  const vestMat = new THREE.MeshStandardMaterial({ color: 0x2e3138, metalness: 0.2, roughness: 0.8 }); // Black Armor Vest
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 0.8 }); // Tan Cargo Pants
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const backpackMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 }); // Brown Back Bling

  // TORSO & TACTICAL VEST
  torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.9), shirtMat);
  torsoMesh.position.y = 2.0;
  torsoMesh.castShadow = true;
  playerMeshGroup.add(torsoMesh);

  const armorVest = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.05), vestMat);
  armorVest.position.y = 2.0;
  armorVest.castShadow = true;
  playerMeshGroup.add(armorVest);

  // HEAD & HAIR
  headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), skinMat);
  headMesh.position.y = 3.4;
  headMesh.castShadow = true;
  playerMeshGroup.add(headMesh);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.9), hairMat);
  hair.position.set(0, 3.85, 0);
  playerMeshGroup.add(hair);

  // BACK BLING (BACKPACK)
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.6), backpackMat);
  backpack.position.set(0, 2.2, -0.7);
  backpack.castShadow = true;
  playerMeshGroup.add(backpack);

  // ARMS
  leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), skinMat);
  leftArm.position.set(-0.95, 2.0, 0);
  leftArm.castShadow = true;
  playerMeshGroup.add(leftArm);

  rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), skinMat);
  rightArm.position.set(0.95, 2.0, 0);
  rightArm.castShadow = true;
  playerMeshGroup.add(rightArm);

  // LEGS & BOOTS
  leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), pantsMat);
  leftLeg.position.set(-0.4, 0.75, 0);
  leftLeg.castShadow = true;
  playerMeshGroup.add(leftLeg);

  rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.5, 0.5), pantsMat);
  rightLeg.position.set(0.4, 0.75, 0);
  rightLeg.castShadow = true;
  playerMeshGroup.add(rightLeg);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.7), bootMat);
  leftBoot.position.set(-0.4, 0.2, 0.1);
  playerMeshGroup.add(leftBoot);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.7), bootMat);
  rightBoot.position.set(0.4, 0.2, 0.1);
  playerMeshGroup.add(rightBoot);

  // Set initial position
  playerMeshGroup.position.set(0, 0, 0);
  scene.add(playerMeshGroup);
  player = playerMeshGroup;

  setupPlayerInput();
  initBuildingPreview();
}

// -----------------------------------------------------------------------------
// 2. INPUT LISTENERS & MOVEMENT CONTROLS
// -----------------------------------------------------------------------------
function setupPlayerInput() {
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (key === 'w') keys.w = true;
    if (key === 'a') keys.a = true;
    if (key === 's') keys.s = true;
    if (key === 'd') keys.d = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = true;
    if (key === 'c') isCrouching = !isCrouching;

    if (e.code === 'Space' && isGrounded) {
      velocityY = jumpForce;
      isGrounded = false;
    }

    // Building Hotkeys: Q (Wall), E (Ramp), F (Floor), B (Toggle Build Mode)
    if (key === 'q') toggleBuildMode('wall');
    if (key === 'e') toggleBuildMode('ramp');
    if (key === 'f') toggleBuildMode('floor');
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = false;
    if (key === 'a') keys.a = false;
    if (key === 's') keys.s = false;
    if (key === 'd') keys.d = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.shift = false;
  });

  // Smooth First/Third Person Mouse Aiming
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === document.body) {
      const sensitivity = 0.0022;
      yaw -= e.movementX * sensitivity;
      pitch -= e.movementY * sensitivity;

      // Restrict camera pitch angles (cannot invert overhead)
      pitch = Math.max(-Math.PI / 2.8, Math.min(Math.PI / 2.8, pitch));
    }
  });

  // Left click to build structure if in build mode
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0 && isBuildMode && document.pointerLockElement === document.body) {
      placeStructure();
    }
  });
}

// -----------------------------------------------------------------------------
// 3. MOVEMENT & CAMERA PHYSICS LOOP
// -----------------------------------------------------------------------------
function updatePlayer() {
  if (!player) return;

  // Determine current speed modifier (Sprinting / Crouching)
  let speed = walkSpeed;
  if (keys.shift && keys.w && !isCrouching) {
    speed *= 1.6; // Tactical Sprint
    isSprinting = true;
  } else {
    isSprinting = false;
  }

  if (isCrouching) {
    speed *= 0.5;
    playerMeshGroup.scale.set(1, 0.7, 1);
  } else {
    playerMeshGroup.scale.set(1, 1, 1);
  }

  // Direction Vectors calculated from Yaw Angle
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  let moveX = 0;
  let moveZ = 0;

  if (keys.w) { moveX += forwardX; moveZ += forwardZ; }
  if (keys.s) { moveX -= forwardX; moveZ -= forwardZ; }
  if (keys.a) { moveX -= rightX; moveZ -= rightZ; }
  if (keys.d) { moveX += rightX; moveZ += rightZ; }

  // Apply Directional Vector
  player.position.x += moveX * speed;
  player.position.z += moveZ * speed;
  player.rotation.y = yaw;

  // Jump Gravity & Ground Collision
  player.position.y += velocityY;
  if (!isGrounded) {
    velocityY += gravity;
    if (player.position.y <= 0) {
      player.position.y = 0;
      velocityY = 0;
      isGrounded = true;
    }
  }

  // Third-Person Fortnite Shoulder Camera Offset Positioning
  const camDistance = isSprinting ? 9.5 : 8.0;
  const camHeight = isCrouching ? 2.5 : 3.8;
  const shoulderOffset = 1.8; // Over the right shoulder look

  const relativeCamOffset = new THREE.Vector3(shoulderOffset, camHeight, camDistance);
  
  // Rotate offset vector by pitch and yaw
  relativeCamOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
  relativeCamOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

  camera.position.copy(player.position).add(relativeCamOffset);
  
  // Camera looks directly ahead of player shoulder target
  const targetLookAt = new THREE.Vector3(
    player.position.x - Math.sin(yaw) * 20,
    player.position.y + 2.5 + Math.sin(pitch) * 20,
    player.position.z - Math.cos(yaw) * 20
  );
  camera.lookAt(targetLookAt);

  // Update building hologram location if active
  if (isBuildMode) {
    updateBuildingPreview();
  }
}

// -----------------------------------------------------------------------------
// 4. FORTNITE BUILDING SYSTEM (WALLS, RAMPS, FLOORS)
// -----------------------------------------------------------------------------
function initBuildingPreview() {
  const geo = new THREE.BoxGeometry(10, 8, 0.4);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x00d2ff,
    transparent: true,
    opacity: 0.5,
    wireframe: true
  });
  buildPreviewMesh = new THREE.Mesh(geo, mat);
  buildPreviewMesh.visible = false;
  scene.add(buildPreviewMesh);
}

function toggleBuildMode(type) {
  if (isBuildMode && currentBuildType === type) {
    isBuildMode = false;
    buildPreviewMesh.visible = false;
  } else {
    isBuildMode = true;
    currentBuildType = type;
    buildPreviewMesh.visible = true;
  }
}

function updateBuildingPreview() {
  if (!buildPreviewMesh || !player) return;

  // Grid snap placement 10 units in front of player
  const buildDist = 12;
  const targetX = Math.round((player.position.x - Math.sin(yaw) * buildDist) / 10) * 10;
  const targetZ = Math.round((player.position.z - Math.cos(yaw) * buildDist) / 10) * 10;

  if (currentBuildType === 'wall') {
    buildPreviewMesh.geometry = new THREE.BoxGeometry(10, 8, 0.4);
    buildPreviewMesh.position.set(targetX, 4, targetZ);
    buildPreviewMesh.rotation.set(0, yaw, 0);
  } else if (currentBuildType === 'ramp') {
    buildPreviewMesh.geometry = new THREE.BoxGeometry(10, 0.4, 12);
    buildPreviewMesh.position.set(targetX, 4, targetZ);
    buildPreviewMesh.rotation.set(-Math.PI / 6, yaw, 0);
  } else if (currentBuildType === 'floor') {
    buildPreviewMesh.geometry = new THREE.BoxGeometry(10, 0.4, 10);
    buildPreviewMesh.position.set(targetX, 0.2, targetZ);
    buildPreviewMesh.rotation.set(0, 0, 0);
  }
}

function placeStructure() {
  if (playerStats.wood < 10) return; // Costs 10 wood per build

  playerStats.wood -= 10;
  document.getElementById('wood-cnt').innerText = playerStats.wood;

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b,
    roughness: 0.8,
    metalness: 0.1
  });

  const structure = new THREE.Mesh(buildPreviewMesh.geometry.clone(), woodMat);
  structure.position.copy(buildPreviewMesh.position);
  structure.rotation.copy(buildPreviewMesh.rotation);
  structure.castShadow = true;
  structure.receiveShadow = true;

  scene.add(structure);
  playerBuiltStructures.push(structure);
}

// START GAME BUTTON TRIGGER
function startGame() {
  const menu = document.getElementById('menu-overlay');
  if (menu) menu.style.display = 'none';
  document.body.requestPointerLock();
}

// Instantiate player setup
createPlayer();