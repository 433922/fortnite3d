// graphics.js - 3D Graphics Engine & Fortnite-style Environmental Lighting

let scene, camera, renderer;
let ambientLight, directionalLight, hemiLight;

function initGraphics() {
const container = document.getElementById('game-container');

// 1. CREATE SCENE
scene = new THREE.Scene();

// Fortnite vibrant blue sky color and atmosphere fog
scene.background = new THREE.Color(0x4ca6ff);
scene.fog = new THREE.FogExp2(0x6eb5ff, 0.0035);

// 2. CREATE CAMERA
camera = new THREE.PerspectiveCamera(
75,
window.innerWidth / window.innerHeight,
0.1,
1000
);
camera.position.set(0, 5, 10);

// 3. CREATE RENDERER
renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

container.appendChild(renderer.domElement);

// 4. FORTNITE-STYLE STYLIZED LIGHTING
// Hemisphere Light for warm sky light and soft ground reflection
hemiLight = new THREE.HemisphereLight(0xffffff, 0x335533, 0.6);
scene.add(hemiLight);

// Ambient fill light so shadows stay visible and colorful
ambientLight = new THREE.AmbientLight(0x88bbff, 0.4);
scene.add(ambientLight);

// Main Sun (Directional Light with crisp shadows)
directionalLight = new THREE.DirectionalLight(0xfffaea, 1.2);
directionalLight.position.set(120, 180, 80);
directionalLight.castShadow = true;

// Shadow Map Resolution Settings
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;

const d = 160;
directionalLight.shadow.camera.left = -d;
directionalLight.shadow.camera.right = d;
directionalLight.shadow.camera.top = d;
directionalLight.shadow.camera.bottom = -d;
directionalLight.shadow.bias = -0.0005;

scene.add(directionalLight);

// 5. WINDOW RESIZE EVENT
window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize Graphics Engine
initGraphics();