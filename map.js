// map.js - Battle Royale Island, Cities, POIs, Chests, & Harvesting Props

let mapObjects = [];
let harvestableObjects = [];
let chests = [];
let llamas = [];

// Color Palette for Fortnite Style Aesthetics
const PALETTE = {
  grass: 0x47c43d,
  dirt: 0x8b6137,
  road: 0x2e3138,
  roadMarking: 0xf5d033,
  water: 0x22a6ee,
  wood: 0x7a4e29,
  stone: 0x80858e,
  metal: 0x4a525d,
  chestGold: 0xffb700,
  llamaPurple: 0x8e24aa,
  llamaCyan: 0x00bcd4,
  roofRed: 0xba3c32,
  roofBlue: 0x2d5bb9,
  wallBrick: 0x9e4b36,
  wallConcrete: 0x9da3a8
};

function createMap() {
  createTerrainAndWater();
  createRoadSystem();
  createTiltedTowersPOI();
  createPleasantParkPOI();
  createDustyDepotPOI();
  createForestsAndNature();
  createLlamasAndChests();
}

// -----------------------------------------------------------------------------
// 1. ISLE TERRAIN & WATER
// -----------------------------------------------------------------------------
function createTerrainAndWater() {
  // Main Grass Island Ground
  const islandGeo = new THREE.PlaneGeometry(1200, 1200, 64, 64);
  
  // Add subtle terrain elevation variation
  const pos = islandGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Subtle hills around edges, flat center
    const distFromCenter = Math.sqrt(x * x + y * y);
    if (distFromCenter > 200) {
      pos.setZ(i, Math.sin(x * 0.02) * Math.cos(y * 0.02) * 8 + (distFromCenter - 200) * 0.05);
    }
  }
  islandGeo.computeVertexNormals();

  const islandMat = new THREE.MeshStandardMaterial({
    color: PALETTE.grass,
    roughness: 0.85,
    metalness: 0.05
  });

  const island = new THREE.Mesh(islandGeo, islandMat);
  island.rotation.x = -Math.PI / 2;
  island.receiveShadow = true;
  scene.add(island);

  // Surrounding Ocean Plane
  const oceanGeo = new THREE.PlaneGeometry(3000, 3000);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.85
  });
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = -2;
  scene.add(ocean);
}

// -----------------------------------------------------------------------------
// 2. ROAD NETWORK & STREET INFRASTRUCTURE
// -----------------------------------------------------------------------------
function createRoadSystem() {
  const roadMat = new THREE.MeshStandardMaterial({ color: PALETTE.road, roughness: 0.9 });
  const lineMat = new THREE.MeshStandardMaterial({ color: PALETTE.roadMarking, roughness: 0.5 });

  // Main Cross Highway (North-South & East-West)
  const mainRoadGeo = new THREE.PlaneGeometry(32, 1000);
  
  const nsRoad = new THREE.Mesh(mainRoadGeo, roadMat);
  nsRoad.rotation.x = -Math.PI / 2;
  nsRoad.position.y = 0.08;
  nsRoad.receiveShadow = true;
  scene.add(nsRoad);

  const ewRoad = new THREE.Mesh(new THREE.PlaneGeometry(1000, 32), roadMat);
  ewRoad.rotation.x = -Math.PI / 2;
  ewRoad.position.y = 0.08;
  ewRoad.receiveShadow = true;
  scene.add(ewRoad);

  // Yellow Center Strip Lines
  for (let i = -480; i < 480; i += 30) {
    if (Math.abs(i) < 40) continue; // Skip intersection center

    // NS Line
    const line1 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 16), lineMat);
    line1.rotation.x = -Math.PI / 2;
    line1.position.set(0, 0.1, i);
    scene.add(line1);

    // EW Line
    const line2 = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.2), lineMat);
    line2.rotation.x = -Math.PI / 2;
    line2.position.set(i, 0.1, 0);
    scene.add(line2);
  }

  // Street Lights placed down main road
  for (let z = -350; z <= 350; z += 100) {
    if (Math.abs(z) < 50) continue;
    spawnStreetLight(18, z, Math.PI / 2);
    spawnStreetLight(-18, z, -Math.PI / 2);
  }
}

function spawnStreetLight(x, z, rotationY) {
  const group = new THREE.Group();

  // Metal Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.4, 12),
    new THREE.MeshStandardMaterial({ color: PALETTE.metal, metalness: 0.8 })
  );
  pole.position.y = 6;
  pole.castShadow = true;
  group.add(pole);

  // Light Fixture Head
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.5, 3),
    new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffea88, emissiveIntensity: 0.6 })
  );
  lamp.position.set(0, 11.5, 1);
  group.add(lamp);

  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  scene.add(group);

  tagHarvestable(group, 'metal', 60, 25);
}

// -----------------------------------------------------------------------------
// 3. POI 1: TILTED TOWERS (CITY DISTRICT - NORTH WEST)
// -----------------------------------------------------------------------------
function createTiltedTowersPOI() {
  const cityCenterX = -160;
  const cityCenterZ = -160;

  // Clock Tower (Iconic Building)
  createBuilding(cityCenterX, cityCenterZ, 24, 75, 24, PALETTE.wallBrick, "Clock Tower");
  spawnChest(cityCenterX, 76, cityCenterZ);

  // Trump / Main Highrise Building
  createBuilding(cityCenterX + 70, cityCenterZ - 50, 36, 90, 36, PALETTE.wallConcrete, "Main Skyscraper");
  spawnChest(cityCenterX + 70, 91, cityCenterZ - 50);

  // Apartments 1
  createBuilding(cityCenterX - 65, cityCenterZ + 50, 30, 50, 26, PALETTE.roofRed, "Red Apartments");
  spawnChest(cityCenterX - 65, 51, cityCenterZ + 50);

  // Apartments 2
  createBuilding(cityCenterX + 60, cityCenterZ + 60, 28, 42, 28, PALETTE.roofBlue, "Blue Apartments");

  // Taco Shop & Small Stores
  createBuilding(cityCenterX - 70, cityCenterZ - 60, 22, 18, 22, 0xe08b2b, "Taco Shop");
  spawnChest(cityCenterX - 70, 19, cityCenterZ - 60);

  // Dumpsters & Pallets around city
  for (let i = 0; i < 8; i++) {
    const offsetX = (Math.random() - 0.5) * 160;
    const offsetZ = (Math.random() - 0.5) * 160;
    spawnWoodenPallet(cityCenterX + offsetX, cityCenterZ + offsetZ);
  }
}

// -----------------------------------------------------------------------------
// 4. POI 2: PLEASANT PARK (SUBURBS - NORTH EAST)
// -----------------------------------------------------------------------------
function createPleasantParkPOI() {
  const parkX = 180;
  const parkZ = -180;

  // Central Gazebo Park Pavilion
  const gazeboGroup = new THREE.Group();
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(12, 6, 4),
    new THREE.MeshStandardMaterial({ color: PALETTE.roofRed, roughness: 0.4 })
  );
  roof.position.y = 8;
  roof.rotation.y = Math.PI / 4;
  gazeboGroup.add(roof);

  // Pillars
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    pillar.position.set(Math.cos(angle) * 7, 4, Math.sin(angle) * 7);
    gazeboGroup.add(pillar);
  }

  gazeboGroup.position.set(parkX, 0, parkZ);
  scene.add(gazeboGroup);
  spawnChest(parkX, 1, parkZ);

  // Suburban Houses Around Park
  const housePositions = [
    { x: parkX - 70, z: parkZ - 70, color: 0xdddddd },
    { x: parkX + 70, z: parkZ - 70, color: 0x85b5d1 },
    { x: parkX - 70, z: parkZ + 70, color: 0xd1a185 },
    { x: parkX + 70, z: parkZ + 70, color: 0x93c48f }
  ];

  housePositions.forEach(h => {
    createHouse(h.x, h.z, h.color);
    spawnChest(h.x, 16, h.z);
  });
}

function createHouse(x, z, wallColor) {
  const houseGroup = new THREE.Group();

  // Base Structure
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(24, 14, 24),
    new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.6 })
  );
  body.position.y = 7;
  body.castShadow = true;
  body.receiveShadow = true;
  houseGroup.add(body);

  // Roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(20, 8, 4),
    new THREE.MeshStandardMaterial({ color: PALETTE.roofRed, roughness: 0.5 })
  );
  roof.position.y = 18;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  houseGroup.add(roof);

  houseGroup.position.set(x, 0, z);
  scene.add(houseGroup);
  tagHarvestable(houseGroup, 'wood', 150, 45);
}

// -----------------------------------------------------------------------------
// 5. POI 3: DUSTY DEPOT (WAREHOUSES - SOUTH EAST)
// -----------------------------------------------------------------------------
function createDustyDepotPOI() {
  const depotX = 180;
  const depotZ = 180;

  const colors = [0xc9342b, 0x2b6fc9, 0xc9a42b]; // Red, Blue, Yellow Depots

  colors.forEach((color, idx) => {
    const offsetX = (idx - 1) * 35;
    const warehouse = new THREE.Group();

    // Steel Depot Box
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(26, 16, 45),
      new THREE.MeshStandardMaterial({ color: color, metalness: 0.6, roughness: 0.4 })
    );
    body.position.y = 8;
    body.castShadow = true;
    warehouse.add(body);

    warehouse.position.set(depotX + offsetX, 0, depotZ);
    scene.add(warehouse);

    spawnChest(depotX + offsetX, 17, depotZ);
    tagHarvestable(warehouse, 'metal', 200, 60);
  });
}

// -----------------------------------------------------------------------------
// 6. NATURE: DENSE FORESTS, ROCKS, & HARVESTABLES
// -----------------------------------------------------------------------------
function createForestsAndNature() {
  // Spawn Trees across island
  for (let i = 0; i < 180; i++) {
    const rx = (Math.random() - 0.5) * 950;
    const rz = (Math.random() - 0.5) * 950;

    // Keep clear of main center roads
    if (Math.abs(rx) < 40 && Math.abs(rz) < 40) continue;

    spawnPineTree(rx, rz);
  }

  // Spawn Boulders & Rocks
  for (let i = 0; i < 80; i++) {
    const rx = (Math.random() - 0.5) * 950;
    const rz = (Math.random() - 0.5) * 950;

    if (Math.abs(rx) < 35 || Math.abs(rz) < 35) continue;

    spawnRock(rx, rz);
  }
}

function spawnPineTree(x, z) {
  const treeGroup = new THREE.Group();

  // Trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 1.2, 7),
    new THREE.MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.9 })
  );
  trunk.position.y = 3.5;
  trunk.castShadow = true;
  treeGroup.add(trunk);

  // 3-Tier Foliage Cones
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x298a36, roughness: 0.7 });
  
  [10, 14, 17].forEach((heightY, tier) => {
    const radius = 6 - tier * 1.3;
    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(radius, 7, 7),
      leafMat
    );
    foliage.position.y = heightY;
    foliage.castShadow = true;
    treeGroup.add(foliage);
  });

  treeGroup.position.set(x, 0, z);
  scene.add(treeGroup);

  tagHarvestable(treeGroup, 'wood', 100, 30);
}

function spawnRock(x, z) {
  const scale = 1.5 + Math.random() * 2;
  const rockGeo = new THREE.DodecahedronGeometry(scale, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: PALETTE.stone, roughness: 0.8 });

  const rock = new THREE.Mesh(rockGeo, rockMat);
  rock.position.set(x, scale * 0.6, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);

  tagHarvestable(rock, 'stone', 120, 35);
}

function spawnWoodenPallet(x, z) {
  const palletGeo = new THREE.BoxGeometry(3.5, 1.2, 3.5);
  const palletMat = new THREE.MeshStandardMaterial({ color: 0xb5804a, roughness: 0.8 });
  const pallet = new THREE.Mesh(palletGeo, palletMat);
  pallet.position.set(x, 0.6, z);
  pallet.castShadow = true;
  scene.add(pallet);

  tagHarvestable(pallet, 'wood', 60, 45);
}

// Helper to register props for pickaxe harvesting
function tagHarvestable(obj, materialType, hp, yieldAmount) {
  obj.userData = {
    isHarvestable: true,
    materialType: materialType, // 'wood', 'stone', or 'metal'
    hp: hp,
    maxHp: hp,
    yieldAmount: yieldAmount
  };
  harvestableObjects.push(obj);
}

// -----------------------------------------------------------------------------
// 7. CHESTS & LLAMA LOOT SPAWNS
// -----------------------------------------------------------------------------
function spawnChest(x, y, z) {
  const chestGroup = new THREE.Group();

  // Golden Metallic Body
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.6, 1.6),
    new THREE.MeshStandardMaterial({ color: PALETTE.chestGold, metalness: 0.9, roughness: 0.2 })
  );
  box.position.y = 0.8;
  box.castShadow = true;
  chestGroup.add(box);

  // Chest Gold Glow PointLight
  const glowLight = new THREE.PointLight(0xffaa00, 2, 12);
  glowLight.position.set(0, 1.5, 0);
  chestGroup.add(glowLight);

  chestGroup.position.set(x, y, z);
  chestGroup.userData = { isChest: true, opened: false };

  scene.add(chestGroup);
  chests.push(chestGroup);
}

function createLlamasAndChests() {
  // Spawn 3 Loot Llamas on random points
  for (let i = 0; i < 3; i++) {
    const lx = (Math.random() - 0.5) * 600;
    const lz = (Math.random() - 0.5) * 600;

    const llamaGroup = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 3, 3),
      new THREE.MeshStandardMaterial({ color: PALETTE.llamaPurple, roughness: 0.5 })
    );
    body.position.y = 2.5;
    llamaGroup.add(body);

    const head = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.5, 1.8),
      new THREE.MeshStandardMaterial({ color: PALETTE.llamaCyan, roughness: 0.5 })
    );
    head.position.set(0, 4.5, 1);
    llamaGroup.add(head);

    llamaGroup.position.set(lx, 0, lz);
    scene.add(llamaGroup);
    llamas.push(llamaGroup);
  }
}

// Helper functions for building city highrises
function createBuilding(x, z, width, height, depth, colorHex, name) {
  const buildingGroup = new THREE.Group();

  const bMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 });
  const mainBox = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), bMat);
  mainBox.position.y = height / 2;
  mainBox.castShadow = true;
  mainBox.receiveShadow = true;
  buildingGroup.add(mainBox);

  buildingGroup.position.set(x, 0, z);
  scene.add(buildingGroup);

  tagHarvestable(buildingGroup, 'stone', 300, 80);
  mapObjects.push(buildingGroup);
}

// Build map automatically on load
createMap();