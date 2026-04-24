// THREE.js scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020810);
scene.fog = new THREE.FogExp2(0x020810, 0.012);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(0, 10, 22);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
document.getElementById('canvas-wrap').appendChild(renderer.domElement);

const orbit = new THREE.OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.06;
orbit.maxDistance = 120;

const TC = new THREE.TransformControls(camera, renderer.domElement);
TC.addEventListener('dragging-changed', e => {
    orbit.enabled = !e.value;
    if (e.value && typeof selectedNode !== 'undefined' && selectedNode) {
        // Drag shuru hone se PEHLE snapshot lo — Ctrl+Z undo karega
        if (typeof saveUndoState === 'function') saveUndoState();
        selectedNode._lastPos = selectedNode.mesh.position.clone();
    }
});

TC.addEventListener('change', () => { 
  if(typeof updateEdges === 'function') updateEdges(); 
  
  if (typeof selectedNode !== 'undefined' && selectedNode && selectedNode.physBody) {
      const mode = TC.getMode(); 
      const myWP = new THREE.Vector3();
      selectedNode.mesh.getWorldPosition(myWP);

      if (mode === 'translate') {
          if (selectedNode.isBone && selectedNode.hubParent) {
              const centerWP = new THREE.Vector3();
              selectedNode.hubParent.mesh.getWorldPosition(centerWP);
              
              const dir = new THREE.Vector3().subVectors(myWP, centerWP);
              if (dir.lengthSq() < 1e-10) dir.set(0, 1, 0);
              else dir.normalize();
              
              const lockedWorldPos = centerWP.clone().add(dir.multiplyScalar(selectedNode.boneDist));
              
              if(selectedNode.mesh.parent && selectedNode.mesh.parent !== scene) {
                  const localPos = lockedWorldPos.clone();
                  selectedNode.mesh.parent.worldToLocal(localPos);
                  selectedNode.mesh.position.copy(localPos);
              } else {
                  selectedNode.mesh.position.copy(lockedWorldPos);
              }
              selectedNode.physBody.position.copy(lockedWorldPos);
          } 
          else {
              if (selectedNode._lastPos) {
                  const delta = new THREE.Vector3().subVectors(selectedNode.mesh.position, selectedNode._lastPos);
                  if (typeof nodes !== 'undefined') {
                      nodes.forEach(child => {
                          if (child.isBone && child.hubParent === selectedNode) {
                              child.mesh.position.add(delta); 
                              if (child.physBody) {
                                  const childWP = new THREE.Vector3();
                                  child.mesh.getWorldPosition(childWP);
                                  child.physBody.position.copy(childWP);
                                  child.physBody.velocity.set(0,0,0);
                                  child.physBody.angularVelocity.set(0,0,0);
                              }
                          }
                      });
                  }
                  selectedNode._lastPos.copy(selectedNode.mesh.position);
              }
              selectedNode.physBody.position.copy(myWP);
          }
      }
      else if (mode === 'rotate') {
          const wq = new THREE.Quaternion();
          selectedNode.mesh.getWorldQuaternion(wq);
          
          // 🔥 ASLI JADOO: (Pivot Rotation Lock) Baccha ab Baap ke center se ghoomega!
          if (selectedNode.isBone && selectedNode.hubParent && selectedNode.localPivot) {
              const parentWP = new THREE.Vector3();
              selectedNode.hubParent.mesh.getWorldPosition(parentWP);
              
              const pivotOffset = selectedNode.localPivot.clone();
              pivotOffset.applyQuaternion(wq); // Naye angle ke hisaab se pivot kahan gaya?
              
              // Mesh ko wahan khiskao jahan pivot parent ke center se perfectly match kare
              const correctPos = parentWP.clone().sub(pivotOffset);
              
              if(selectedNode.mesh.parent && selectedNode.mesh.parent !== scene) {
                  const localPos = correctPos.clone();
                  selectedNode.mesh.parent.worldToLocal(localPos);
                  selectedNode.mesh.position.copy(localPos);
              } else {
                  selectedNode.mesh.position.copy(correctPos);
              }
              selectedNode.physBody.position.copy(correctPos);
          }
          
          selectedNode.physBody.quaternion.copy(wq);
      }
      
      selectedNode.physBody.velocity.set(0,0,0);
      selectedNode.physBody.angularVelocity.set(0,0,0);
  }
});

scene.add(TC); // Arrows gayab na ho isliye ye line zaroori hai!

let GTCDragging = false;
const GTC = new THREE.TransformControls(camera, renderer.domElement);
GTC.addEventListener('dragging-changed', e => {
    orbit.enabled = !e.value;
    GTCDragging = e.value;
    // Group drag shuru hone se PEHLE snapshot lo
    if (e.value && typeof saveUndoState === 'function') saveUndoState();
});
GTC.addEventListener('change', () => { 
  if(typeof updateEdges === 'function') updateEdges(); 
  
  // Group mein nodes ko move karne par unki physics update karna
  if (typeof selNodes !== 'undefined') selNodes.forEach(id => {
      const n = (typeof nodes !== 'undefined') ? nodes.find(x => x.id === id) : null;
      if (n && n.physBody) {
          const wp = new THREE.Vector3();
          n.mesh.getWorldPosition(wp);
          n.physBody.position.copy(wp);
          n.physBody.velocity.set(0,0,0);
      }
  });
});
scene.add(GTC);

const raycaster = new THREE.Raycaster();
const gridHelper = new THREE.GridHelper(60, 60, 0x001a3a, 0x000d1f);
scene.add(gridHelper);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); 
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// Global Variables (Shared across all files)
let mergeFirst = null;
let jointFirst = null;
let attachFirst = null;
let curTab = 'build', curMode = 'guide-select';
let curColor = '#00e5ff', curSize = 0.15;
let dotBright = 0.8;
let curShape = 'sphere';
let flatW = 1.0, flatH = 1.0, flatT = 0.05, flatBevel = 0;
let nodes = [], edges = [], guides = [];
let connectFirst = null, selGuide = null;
let nodeId = 0, edgeId = 0;
let keyframes = [], animTime = 0, animSpeed = 1.0;
let activeTrack = 1;
let keyframes2 = [], animTime2 = 0, animSpeed2 = 1.0;
let isNoLoop = false;
let selNodes = new Set(), selGroup = new THREE.Group();
scene.add(selGroup);
let boxSel = false, boxStart = { x: 0, y: 0 };
let selectedNode = null;
const boxEl = document.getElementById('sel-box');

// Color palette
const PALETTE = ['#00e5ff','#0066ff','#8800ff','#ff0088','#ff4400','#ff9900','#88ff00','#00ff88','#ffffff','#ff44ff'];
const cgEl = document.getElementById('color-grid');
if(cgEl) {
  PALETTE.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'cswatch' + (c === curColor ? ' active' : '');
    sw.style.cssText = `background:${c};box-shadow:0 0 6px ${c}80;`;
    sw.onclick = () => {
      document.querySelectorAll('.cswatch').forEach(x => x.classList.remove('active'));
      sw.classList.add('active');
      curColor = c;
    };
    cgEl.appendChild(sw);
  });
}
// ═══════════════════════════════════════════════════════════
//   PHYSICS ENGINE (CANNON.JS) SETUP
// ═══════════════════════════════════════════════════════════
let world;
if (typeof CANNON !== 'undefined') {
    world = new CANNON.World();
    world.gravity.set(0, 0, 0); // Zero gravity taki nodes gire nahi
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 40; // Joints ko strong banata hai
    console.log("🔥 PHYSICS ENGINE LOADED SUCCESSFULLY!");
} else {
    console.error("⚠ CANNON.JS MISSING!");
}

// Joints track karne ke liye array
let startDelayTime = 0;       // Kitna delay chahiye
let currentTimerValue = 0;    // Countdown ki current value
let isTimerActive = false;    // Timer chal raha hai ya nahi