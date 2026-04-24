function resizeRenderer() {
  const wrap = document.getElementById('canvas-wrap');
  const w = Math.max(wrap.clientWidth || (innerWidth - 300), 100);
  const h = Math.max(wrap.clientHeight || (innerHeight - 32), 100);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resizeRenderer);
resizeRenderer();
 
// ═══════════════════════════════════════════════════════════
//   TAB SWITCHING
// ═══════════════════════════════════════════════════════════
function switchTab(tab) {
  if ((tab === 'build' || tab === 'animate') && curTab === 'preview') {
    highlightSel();
  }
  if (tab === 'build') clearSelection();
 
  curTab = tab;
  ['build', 'animate', 'preview'].forEach(t => {
    document.getElementById('btn-' + t).classList.toggle('active', t === tab);
    const el = document.getElementById('ptab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });
 
  if (tab === 'preview') {
    if (selectedNode) deselectNode();
    TC.detach(); // 💉 YEH NAYI LINE ADD KAR: Preview mein ghuste hi control arrows hata dega
    if (curMode === 'select-area') setMode('none');
    nodes.forEach(n => n.mesh.material.color.set(n.color));
    guides.forEach(g => {
      if (g.material) g.material.visible = false;
      g.children.forEach(c => { if (c.type === 'LineSegments' && c.material) c.material.visible = false; });
    });
    gridHelper.visible = false;
    selectGuide(null);
    GTC.detach();
    setStatusMode('PREVIEW');
    document.getElementById('preview-kf-count').textContent = keyframes.length;
    flash(keyframes.length > 1 ? '▶ ANIMATION PLAYING' : '◉ VIEWING STATIC SCENE');
  } else {
    guides.forEach(g => {
      if (g.material) g.material.visible = true;
      g.children.forEach(c => { if (c.type === 'LineSegments' && c.material) c.material.visible = true; });
    });
    gridHelper.visible = true;
    if (tab === 'build') { setMode('guide-select'); setStatusMode('BUILD'); }
    else if (tab === 'animate') { setMode('none'); setStatusMode('ANIMATE'); }
  }
}
 
// ═══════════════════════════════════════════════════════════
//   GUIDES
// ═══════════════════════════════════════════════════════════
const guideMat = new THREE.MeshStandardMaterial({ color: 0x0088cc, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
const guideWire = new THREE.LineBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.35 });
 
function addGuide(type) {
  let geo;
  switch(type) {
    case 'sphere':     geo = new THREE.SphereGeometry(4, 32, 32); break;
    case 'box':        geo = new THREE.BoxGeometry(6, 6, 6); break;
    case 'cylinder':   geo = new THREE.CylinderGeometry(3, 3, 6, 32); break;
    case 'cone':       geo = new THREE.ConeGeometry(3, 6, 32); break;
    case 'torus':      geo = new THREE.TorusGeometry(3, 1, 16, 48); break;
    case 'torusknot':  geo = new THREE.TorusKnotGeometry(2.5, 0.8, 128, 16); break;
    case 'octahedron': geo = new THREE.OctahedronGeometry(4, 0); break;
    case 'tetra':      geo = new THREE.TetrahedronGeometry(4, 0); break;
    case 'icosa':      geo = new THREE.IcosahedronGeometry(4, 0); break;
    case 'dodeca':     geo = new THREE.DodecahedronGeometry(4, 0); break;
    case 'capsule':    geo = new THREE.CylinderGeometry(2.5, 2.5, 4, 32); break;
    case 'plane':      geo = new THREE.PlaneGeometry(8, 8, 1, 1); break;
    case 'ring':       geo = new THREE.RingGeometry(2, 4, 32); break;
    case 'tube': {
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3,0,0), new THREE.Vector3(-1,3,0),
        new THREE.Vector3(1,-3,0), new THREE.Vector3(3,0,0)
      ]);
      geo = new THREE.TubeGeometry(path, 20, 0.8, 12, false);
      break;
    }
    case 'lathe': {
      const pts = [];
      for(let i=0;i<10;i++) pts.push(new THREE.Vector2(Math.sin(i*0.4)*2+1, i*0.7-3));
      geo = new THREE.LatheGeometry(pts, 24);
      break;
    }
    case 'widesphere': geo = new THREE.SphereGeometry(5, 32, 16); break;
    case 'flatslab':   geo = new THREE.BoxGeometry(8, 1, 8); break;
    case 'tallpillar': geo = new THREE.CylinderGeometry(1.5, 1.5, 10, 24); break;
    case 'arch': {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, 4, 0, Math.PI, false);
      shape.lineTo(-4, -3); shape.lineTo(-2.5, -3);
      shape.absarc(0, 0, 2.5, Math.PI, 0, true);
      shape.lineTo(4, -3);
      geo = new THREE.ExtrudeGeometry(shape, {depth:2, bevelEnabled:false});
      geo.center();
      break;
    }
    case 'star': {
      const starShape = new THREE.Shape();
      for(let i=0;i<10;i++) {
        const r = i%2===0 ? 4 : 1.8;
        const a = (i/10)*Math.PI*2 - Math.PI/2;
        i===0 ? starShape.moveTo(Math.cos(a)*r, Math.sin(a)*r) : starShape.lineTo(Math.cos(a)*r, Math.sin(a)*r);
      }
      starShape.closePath();
      geo = new THREE.ExtrudeGeometry(starShape, {depth:1.5, bevelEnabled:true, bevelSize:0.2, bevelThickness:0.2, bevelSegments:2});
      geo.center();
      break;
    }
    case 'heart': {
      const heartShape = new THREE.Shape();
      heartShape.moveTo(0, -1.5);
      heartShape.bezierCurveTo(-4,-1.5,-4,2.5,0,2.5);
      heartShape.bezierCurveTo(4,2.5,4,-1.5,0,-1.5);
      geo = new THREE.ExtrudeGeometry(heartShape, {depth:1.5, bevelEnabled:true, bevelSize:0.3, bevelThickness:0.3, bevelSegments:3});
      geo.center();
      break;
    }
    case 'diamond': {
      geo = new THREE.OctahedronGeometry(4, 0);
      geo.scale(1, 1.5, 1);
      break;
    }
    case 'pyramid':    geo = new THREE.ConeGeometry(4, 6, 4); break;
    case 'halfball':   geo = new THREE.SphereGeometry(4, 32, 16, 0, Math.PI*2, 0, Math.PI/2); break;
    default:           geo = new THREE.BoxGeometry(6, 6, 6);
  }
 
  const mesh = new THREE.Mesh(geo, guideMat.clone());
  try { mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 15), guideWire.clone())); } catch(e) {}
  
  // ✅ NAYA ILAaj: Har naya box thoda sa khisak kar aayega taaki overlap na ho
  mesh.position.x = (Math.random() - 0.5) * 4; 
  mesh.position.y = 3 + (Math.random() * 2);
  mesh.position.z = (Math.random() - 0.5) * 4;
  
  scene.add(mesh);
  guides.push(mesh);
  setMode('guide-select');
  selectGuide(mesh);
  flash('✅ GUIDE: ' + type.toUpperCase());
}
 
// 🔥 NAYA FEATURE: Perfect Guide Wrapper
function detectGuideShape(vertices, center, sz) {
  if (vertices.length === 0) return 'box';
 
  const maxDim = Math.max(sz.x, sz.y, sz.z);
  const minDim = Math.min(sz.x, sz.y, sz.z);
  const flatness = minDim / (maxDim || 0.001);
 
  if (flatness < 0.06) return 'plane';
 
  const dists = vertices.map(v =>
    Math.sqrt((v.x-center.x)**2 + (v.y-center.y)**2 + (v.z-center.z)**2)
  );
  const avgD = dists.reduce((a,b) => a+b, 0) / dists.length;
  const variance = dists.reduce((a,b) => a + (b-avgD)**2, 0) / dists.length;
  const cv = Math.sqrt(variance) / (avgD || 1);
  if (cv < 0.08 && flatness > 0.82) return 'sphere';
 
  return 'box';
}
 
function fitGuideToNode() {
  if (!selectedNode) { flash('⚠ SELECT A NODE FIRST'); return; }
 
  const allPositions = [];
  const _v = new THREE.Vector3();
 
  selectedNode.mesh.traverse(c => {
    if (!c.isMesh) return;
    if (c === selectedNode.gMesh) return;
    if (c === selectedNode._selWire) return;
    if (!c.geometry || !c.geometry.attributes.position) return;
 
    const pos = c.geometry.attributes.position;
    const arr = [];
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i);
      _v.applyMatrix4(c.matrixWorld);
      arr.push(_v.x, _v.y, _v.z);
    }
 
    const idx = c.geometry.index;
    allPositions.push({ positions: arr, index: idx ? idx.array : null, count: pos.count });
  });
 
  if (allPositions.length === 0) { flash('⚠ GEOMETRY NOT FOUND'); return; }
 
  let totalVerts = allPositions.reduce((s, p) => s + p.count, 0);
  const mergedPos = new Float32Array(totalVerts * 3);
  let offset = 0;
  allPositions.forEach(p => {
    mergedPos.set(p.positions, offset * 3);
    offset += p.count;
  });
 
  const mergedGeo = new THREE.BufferGeometry();
  mergedGeo.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
 
  mergedGeo.computeBoundingBox();
  const center = new THREE.Vector3();
  mergedGeo.boundingBox.getCenter(center);
 
  const posAttr = mergedGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setXYZ(i, posAttr.getX(i) - center.x, posAttr.getY(i) - center.y, posAttr.getZ(i) - center.z);
  }
  posAttr.needsUpdate = true;
  mergedGeo.computeBoundingBox();
  mergedGeo.computeVertexNormals();
 
  const guideMesh = new THREE.Mesh(mergedGeo, guideMat.clone());
 
  try {
    const edges = new THREE.EdgesGeometry(mergedGeo, 20);
    guideMesh.add(new THREE.LineSegments(edges, guideWire.clone()));
  } catch(e) {}
 
  guideMesh.position.copy(center);
 
  scene.add(guideMesh);
  guides.push(guideMesh);
  setMode('guide-select');
  selectGuide(guideMesh);
  flash('✅ EXACT SHAPE GUIDE FITTED!');
}
 
function selectGuide(mesh) {
  if (selGuide && selGuide !== mesh && selGuide.material) selGuide.material.opacity = 0.2;
  selGuide = mesh;
  TC.detach(); // Always detach first to avoid ghosting
  if (mesh) { 
    if (mesh.material) mesh.material.opacity = 0.4; 
    mesh.updateMatrixWorld(true);
    TC.attach(mesh); 
  }
}
 
function setTransformMode(m) {
  if (curTab !== 'build') return;
  if (selectedNode) return;
  TC.setMode(m);
  setMode('guide-select');
}
 
function deleteSelectedGuide() {
  if (selGuide) {
    TC.detach();
    scene.remove(selGuide);
    selGuide.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    });
    guides = guides.filter(g => g !== selGuide);
    selGuide = null;
  }
}
 
// ═══════════════════════════════════════════════════════════
//   GEOMETRY HELPERS
// ═══════════════════════════════════════════════════════════
function updateFlatControls() {
  const flat = ['plane', 'roundbox', 'disc', 'ring', 'rod', 'blade', 'wrap'];
  document.getElementById('flat-controls').style.display = flat.includes(curShape) ? 'block' : 'none';
}
 
function makeFlatGeo(shape, w, h, t, s) {
  if (shape === 'plane') return new THREE.BoxGeometry(w * s * 3, h * s * 3, t * s * 0.5);
  if (shape === 'roundbox') {
    const rw = w * s * 3, rh = h * s * 3, rd = t * s * 0.5;
    const rad = (flatBevel > 0) ? flatBevel : Math.min(rw, rh, rd) * 0.22;
    flatBevel = 0;
    const shp = new THREE.Shape();
    shp.absarc(-rw/2+rad, -rh/2+rad, rad, Math.PI, Math.PI/2, true);
    shp.absarc(rw/2-rad, -rh/2+rad, rad, Math.PI/2, 0, true);
    shp.absarc(rw/2-rad, rh/2-rad, rad, 0, -Math.PI/2, true);
    shp.absarc(-rw/2+rad, rh/2-rad, rad, -Math.PI/2, -Math.PI, true);
    const geo = new THREE.ExtrudeGeometry(shp, { depth: rd, bevelEnabled: true, bevelThickness: rad*0.5, bevelSize: rad*0.5, bevelSegments: 3 });
    geo.center(); return geo;
  }
  if (shape === 'disc') return new THREE.CylinderGeometry(w * s * 2, w * s * 2, t * s * 0.5, 32);
  if (shape === 'ring') return new THREE.TorusGeometry(w * s * 2, t * s * 0.4, 8, 32);
  if (shape === 'rod') return new THREE.CylinderGeometry(t * s * 0.5, t * s * 0.5, h * s * 5, 8);
  if (shape === 'blade') return new THREE.BoxGeometry(w * s * 5, t * s * 0.3, h * s * 1.5);
  if (shape === 'wrap') return new THREE.BoxGeometry(w * s * 3, h * s * 3, t * s * 0.5);
  return new THREE.SphereGeometry(s, 16, 16);
}
 
// ═══════════════════════════════════════════════════════════
//   NODE CREATION
// ═══════════════════════════════════════════════════════════
function createNode(pos, exactJson = null) {
  const flat = ['plane', 'roundbox', 'disc', 'ring', 'rod', 'blade', 'wrap'];
  const isFlat = flat.includes(curShape);
  
  const mat = new THREE.MeshStandardMaterial({
  color: curColor, transparent: true, opacity: dotBright,
  blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  depthWrite: false, depthTest: false,
  roughness: 0.3, metalness: 0.2 // 🔥 Yahan se shadows aur depth aayegi!
});
 
  let mesh = null;
  if (curShape === 'exact_imported' && exactJson) {
    const loader = new THREE.ObjectLoader();
    try {
      mesh = loader.parse(exactJson);
      
      // 🔥 BUG KILLER 2: Duplicated nested models removal 
      const dupes = [];
      mesh.traverse(c => {
         if (c !== mesh && c.userData && c.userData.id !== undefined) dupes.push(c);
      });
      dupes.forEach(d => { if (d.parent) d.parent.remove(d); });

      if (mesh.isMesh) mesh.material = mat; 
      else mesh.traverse(c => { if(c.isMesh) c.material = mat; });
    } catch(e) {}
  }
 
  if (!mesh) {
    let geo;
    if (isFlat) geo = makeFlatGeo(curShape, flatW, flatH, flatT, curSize);
    else if (curShape === 'cube') geo = new THREE.BoxGeometry(curSize * 1.5, curSize * 1.5, curSize * 1.5);
    else if (curShape === 'diamond') geo = new THREE.OctahedronGeometry(curSize * 1.2, 0);
    else if (curShape === 'tetra') geo = new THREE.TetrahedronGeometry(curSize * 1.4, 0);
    else geo = new THREE.SphereGeometry(curSize, 16, 16);
    mesh = new THREE.Mesh(geo, mat);
  }
  
  mesh.position.copy(pos);
 
  const glowR = isFlat ? Math.max(flatW, flatH) * curSize * 1.5 : curSize * 2.5;
  const gMesh = new THREE.Mesh(
    new THREE.SphereGeometry(glowR, 16, 16),
    new THREE.MeshBasicMaterial({ color: curColor, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  
  gMesh.visible = false;
  gMesh.raycast = () => {}; // Glow sphere ko click detection se hatao — wrong selection ka main kaaran tha
  
  mesh.add(gMesh);
  scene.add(mesh);
 
  saveUndoState();    // ← Undo checkpoint: node add
  const node = {
    id: nodeId++, position: pos.clone(), color: curColor,
    size: curSize, shape: curShape, mesh, gMesh,
    flatW, flatH, flatT, flatBevel, meshJson: exactJson
  };
  mesh.userData.id = node.id;
  nodes.push(node);
  updateStats();
  return node;
}
 
function deleteNode(n) {
  saveUndoState();    // ← Undo checkpoint: node delete
  if (selectedNode === n) { selectedNode = null; TC.detach(); document.getElementById('node-edit-panel').style.display = 'none'; }
  edges.filter(e => e.from === n.id || e.to === n.id).forEach(e => { scene.remove(e.line); e.line.geometry.dispose(); e.line.material.dispose(); });
  edges = edges.filter(e => e.from !== n.id && e.to !== n.id);
  if (n.mesh.parent && n.mesh.parent !== scene) n.mesh.parent.remove(n.mesh);
  else scene.remove(n.mesh);
  if (n.mesh.isMesh) { if (n.mesh.geometry) n.mesh.geometry.dispose(); if (n.mesh.material) n.mesh.material.dispose(); }
  else n.mesh.traverse(c => { if (c.isMesh) { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); } });
  if (n.gMesh) { n.gMesh.geometry.dispose(); n.gMesh.material.dispose(); }
  if (n._selWire) { n._selWire.geometry.dispose(); n._selWire.material.dispose(); }
  nodes = nodes.filter(x => x.id !== n.id);
  selNodes.delete(n.id);
  updateStats();
}
 
function updateEdges() {
  edges.forEach(e => {
    const a = nodes.find(n => n.id === e.from), b = nodes.find(n => n.id === e.to);
    if (a && b) {
      const pA = new THREE.Vector3(), pB = new THREE.Vector3();
      a.mesh.getWorldPosition(pA); b.mesh.getWorldPosition(pB);
      e.line.geometry.setFromPoints([pA, pB]);
    }
  });
}
 
function updateNodeSize(v) { curSize = parseFloat(v); document.getElementById('v-size').textContent = curSize.toFixed(2); }
 
function updateBrightness(v) { 
  dotBright = parseFloat(v); 
  document.getElementById('v-bright').textContent = dotBright.toFixed(1); 
  nodes.forEach(n => {
    // 🔥 SAFE — works for Mesh AND Group nodes
    if (n.mesh.isMesh && n.mesh.material) {
      n.mesh.material.opacity = dotBright;
      n.mesh.material.needsUpdate = true;
    } else {
      n.mesh.traverse(ch => { if(ch.isMesh && ch.material) { ch.material.opacity = dotBright; ch.material.needsUpdate = true; } });
    }
  });
}

// 🔥 NAYA FUNCTION: Scene ki asali light control karne ke liye
function updateSceneLight(val) {
  const intensity = parseFloat(val);
  if (typeof ambientLight !== 'undefined') {
      ambientLight.intensity = intensity * 0.6; // Base ambient scale
  }
  if (typeof dirLight !== 'undefined') {
      dirLight.intensity = intensity * 0.8; // Base directional scale
  }
}
 
function updateOpacity(v) {
  const val = parseFloat(v);
  document.getElementById('v-opacity').textContent = val.toFixed(2);
  nodes.forEach(n => { n.mesh.material.opacity = val; n.mesh.material.transparent = val < 1.0; n.mesh.material.needsUpdate = true; });
  dotBright = val;
}
 
// ═══════════════════════════════════════════════════════════
//   SINGLE NODE SELECT / EDIT
// ═══════════════════════════════════════════════════════════
function selectSingleNode(node) {
  if (selectedNode === node) return; 
  if (node && node.isFixed) {
    flash('🔒 CANNOT EDIT FIXED NODE');
    return;
  }
 
  let hasFixedChild = false;
  if (node) {
    node.mesh.traverse(c => {
      if (c.userData && c.userData.id !== undefined && c.userData.id !== node.id) {
        const childNode = nodes.find(x => x.id === c.userData.id);
        if (childNode && childNode.isFixed) hasFixedChild = true;
      }
    });
    node.hasFixedChild = hasFixedChild; 
  }


 
  if (selGuide && selGuide.material) selGuide.material.opacity = 0.2;
  TC.detach(); 
 
  if (selectedNode && selectedNode !== node) {
    // 🔥 SAFE COLOR SET
    if (selectedNode.mesh.isMesh) selectedNode.mesh.material.color.set(selectedNode.color);
    else selectedNode.mesh.traverse(ch => { if(ch.isMesh && ch.material) ch.material.color.set(selectedNode.color); });
 
    if (selectedNode._selWire) {
      selectedNode.mesh.remove(selectedNode._selWire);
      selectedNode._selWire.geometry.dispose();
      selectedNode._selWire.material.dispose();
      selectedNode._selWire = null;
    }
  }
  selectedNode = node;
  if (!node) { document.getElementById('node-edit-panel').style.display = 'none'; return; }
 
  const _g = node.mesh.isMesh ? node.mesh.geometry : (() => { let g; node.mesh.traverse(c => { if (c.isMesh && !g) g = c.geometry; }); return g; })();
  if (_g) {
    _g.computeBoundingBox();
    const bb = _g.boundingBox;
    const sz = new THREE.Vector3(); bb.getSize(sz);
    const selGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(Math.max(sz.x, 0.05) + 0.1, Math.max(sz.y, 0.05) + 0.1, Math.max(sz.z, 0.05) + 0.1));
    const selWire = new THREE.LineSegments(selGeo, new THREE.LineBasicMaterial({ color: 0xffee00 }));
    node.mesh.add(selWire);
    node._selWire = selWire;
  }
 
  const panel = document.getElementById('node-edit-panel');
  panel.style.display = 'block';
  document.getElementById('sel-node-info').textContent = 'ID:' + node.id + ' | ' + node.shape + ' | ' + node.color;
 
  // 🔥 SAFE MATERIAL READ (NO CRASH)
  let op = 1.0, isSolid = true;
  if (node.mesh.isMesh && node.mesh.material) {
    op = node.mesh.material.opacity;
    isSolid = node.mesh.material.depthWrite === true && node.mesh.material.opacity >= 1.0;
  } else {
    node.mesh.traverse(ch => {
      if (ch.isMesh && ch.material) {
        op = ch.material.opacity;
        isSolid = ch.material.depthWrite === true && ch.material.opacity >= 1.0;
      }
    });
  }
 
  document.getElementById('sel-opacity').value = op;
  document.getElementById('sv-opacity').textContent = op.toFixed(2);
  document.getElementById('sel-size').value = node.size;
  document.getElementById('sv-size').textContent = node.size.toFixed(2);
  document.getElementById('sel-fw').value = node.flatW || 1.0;
  document.getElementById('sv-fw').textContent = (node.flatW || 1.0).toFixed(2);
  document.getElementById('sel-fh').value = node.flatH || 1.0;
  document.getElementById('sv-fh').textContent = (node.flatH || 1.0).toFixed(2);
  document.getElementById('sel-ft').value = node.flatT || 0.05;
  document.getElementById('sv-ft').textContent = (node.flatT || 0.05).toFixed(2);
  document.getElementById('sel-shape').value = node.shape;
  document.getElementById('sel-spin').value = node.spinSpeed || 0;
  document.getElementById('sv-spin').textContent = (node.spinSpeed || 0).toFixed(1);
  document.getElementById('sel-solid').checked = isSolid;
  node._isSolid = isSolid;
 
  TC.attach(node.mesh);
  if (node.hasFixedChild) {
    TC.setMode('rotate'); 
    flash('⚠ CHILD IS FIXED! PARENT CAN ONLY ROTATE.');
  } else {
    TC.setMode('translate');
  }
  ['translate', 'rotate', 'scale'].forEach(m => {
    const btn = document.getElementById('ntc-' + m);
    if (btn) btn.classList.toggle('active', m === 'translate');
  });
  flash('NODE ' + node.id + ' SELECTED');
}

// ═══════════════════════════════════════════════════════════
//   🔥 PERFECT NODE CLONE ENGINE (COPY NODE) 🔥
// ═══════════════════════════════════════════════════════════
function duplicateSelectedNode() {
  if (!selectedNode) { flash('⚠ PEHLE EK NODE SELECT KARO!'); return; }
  saveUndoState(); // Ctrl+Z support

  // Temporary hide glow & wireframe so they don't get duplicated inside the core mesh
  const gMeshTemp = selectedNode.gMesh;
  const wireTemp = selectedNode._selWire;
  if(gMeshTemp) selectedNode.mesh.remove(gMeshTemp);
  if(wireTemp) selectedNode.mesh.remove(wireTemp);

  // 🔥 FIX: Clone se pehle attached children hatao
  const _dupDetach = [];
  selectedNode.mesh.children.slice().forEach(c => {
    if (c.userData && c.userData.id !== undefined) {
      scene.attach(c); _dupDetach.push(c);
    }
  });

  // Deep Clone the Mesh (Perfectly copies CSG Cuts & Custom Shapes)
  let newMesh = selectedNode.mesh.clone();
  newMesh.traverse((c) => {
      if (c.isMesh) {
          if (c.material) c.material = c.material.clone();
          if (c.geometry) c.geometry = c.geometry.clone();
      }
  });

  _dupDetach.forEach(c => { selectedNode.mesh.attach(c); }); // wapas

  // Restore original node's glow & wireframe
  if(gMeshTemp) selectedNode.mesh.add(gMeshTemp);
  if(wireTemp) selectedNode.mesh.add(wireTemp);

  // Setup New Node's Position (Thoda side me khiska do taaki overlap na ho)
  const pos = new THREE.Vector3();
  selectedNode.mesh.getWorldPosition(pos);
  pos.x += 1.5; // X me thoda aage shift
  pos.y += 0.5; // Y me thoda upar shift

  // Agar parent group me hai, to local position me convert karo
  if(selectedNode.mesh.parent && selectedNode.mesh.parent !== scene) {
      selectedNode.mesh.parent.worldToLocal(pos);
  }
  newMesh.position.copy(pos);

  // Re-create Glow for the clone
  let glowR = selectedNode.size * 2.5;
  if (gMeshTemp && gMeshTemp.geometry && gMeshTemp.geometry.parameters) {
      glowR = gMeshTemp.geometry.parameters.radius || glowR;
  }
  const newGMesh = new THREE.Mesh(
      new THREE.SphereGeometry(glowR, 16, 16),
      gMeshTemp ? gMeshTemp.material.clone() : new THREE.MeshBasicMaterial()
  );
  if(gMeshTemp) newGMesh.visible = gMeshTemp.visible;
  newMesh.add(newGMesh);

  scene.add(newMesh);

  // Register new node in the system
  const newNode = {
    id: nodeId++, position: newMesh.position.clone(),
    color: selectedNode.color, size: selectedNode.size,
    shape: selectedNode.shape, mesh: newMesh, gMesh: newGMesh,
    flatW: selectedNode.flatW, flatH: selectedNode.flatH,
    flatT: selectedNode.flatT, flatBevel: selectedNode.flatBevel,
    spinSpeed: selectedNode.spinSpeed || 0,
    _isSolid: selectedNode._isSolid,
    meshJson: selectedNode.meshJson 
  };
  newMesh.userData.id = newNode.id;

  nodes.push(newNode);
  updateStats();

  // Naye wale ko automatic select kar lo taaki direct move kar sako
  selectSingleNode(newNode);
  flash('✨ PERFECT MODEL COPIED!');
}
 
function deselectNode() {
  if (selectedNode) {
    // 🔥 SAFE COLOR REVERT — works for Mesh AND Group (imported) nodes
    if (selectedNode.mesh.isMesh) selectedNode.mesh.material.color.set(selectedNode.color);
    else selectedNode.mesh.traverse(ch => { if(ch.isMesh && ch.material) ch.material.color.set(selectedNode.color); });

    if (selectedNode._selWire) {
      selectedNode.mesh.remove(selectedNode._selWire);
      selectedNode._selWire.geometry.dispose();
      selectedNode._selWire.material.dispose();
      selectedNode._selWire = null;
    }
  }
  selectedNode = null;
  TC.detach();
  document.getElementById('node-edit-panel').style.display = 'none';
}
 
function setNodeTransformMode(m) {
  if (!selectedNode) return;
  
  // 🔥 YEH RAHI ASLI ROK (BLOCK)
  if (selectedNode.hasFixedChild && m === 'translate') {
    flash('🚫 CANNOT MOVE! CHILD IS ANCHORED.');
    return; // Move button ko kaam hi nahi karne dega!
  }
  
  TC.setMode(m);
  ['translate', 'rotate', 'scale'].forEach(x => {
    const btn = document.getElementById('ntc-' + x);
    if (btn) btn.classList.toggle('active', x === m);
  });
}
 
function selNodeOpacity(v) {
  if (!selectedNode) return;
  const val = parseFloat(v);
  document.getElementById('sv-opacity').textContent = val.toFixed(2);
  
  // 🔥 SAFE OPACITY SET
  if (selectedNode.mesh.isMesh && selectedNode.mesh.material) {
      selectedNode.mesh.material.opacity = val;
      selectedNode.mesh.material.transparent = val < 1.0;
      selectedNode.mesh.material.needsUpdate = true;
  } else {
      selectedNode.mesh.traverse(ch => {
          if (ch.isMesh && ch.material) {
              ch.material.opacity = val;
              ch.material.transparent = val < 1.0;
              ch.material.needsUpdate = true;
          }
      });
  }
 
  if (val >= 0.99) {
    document.getElementById('sel-solid').checked = true;
    selNodeSolid(true); 
  } else {
    document.getElementById('sel-solid').checked = false;
    selNodeSolid(false);
  }
}
 
function selNodeSolid(checked) {
  if (!selectedNode) return;
  saveUndoState();
  
  const applySolid = (mat) => {
      if (checked) {
        mat.blending = THREE.NormalBlending;
        mat.depthWrite = true;
        mat.depthTest = true; 
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -1;
        mat.polygonOffsetUnits = -1;
      } else {
        mat.blending = THREE.AdditiveBlending;
        mat.depthWrite = false;
        mat.depthTest = false; 
        mat.transparent = true;
      }
      mat.needsUpdate = true;
  };
 
  // 🔥 SAFE SOLID SET
  if (selectedNode.mesh.isMesh && selectedNode.mesh.material) applySolid(selectedNode.mesh.material);
  else selectedNode.mesh.traverse(ch => { if (ch.isMesh && ch.material) applySolid(ch.material); });
 
  if (checked) {
    document.getElementById('sel-opacity').value = 1.0;
    document.getElementById('sv-opacity').textContent = '1.00';
  }
  selectedNode._isSolid = checked;
}

function selNodeSize(v) {
  if (!selectedNode) return;
  const val = parseFloat(v);
  document.getElementById('sv-size').textContent = val.toFixed(2);
  selectedNode.size = val;
  rebuildNodeGeo(selectedNode);
}
 
function selNodeFlatW(v) { if (!selectedNode) return; document.getElementById('sv-fw').textContent = parseFloat(v).toFixed(2); selectedNode.flatW = parseFloat(v); rebuildNodeGeo(selectedNode); }
function selNodeFlatH(v) { if (!selectedNode) return; document.getElementById('sv-fh').textContent = parseFloat(v).toFixed(2); selectedNode.flatH = parseFloat(v); rebuildNodeGeo(selectedNode); }
function selNodeFlatT(v) { if (!selectedNode) return; document.getElementById('sv-ft').textContent = parseFloat(v).toFixed(2); selectedNode.flatT = parseFloat(v); rebuildNodeGeo(selectedNode); }
function selNodeShape(s) { if (!selectedNode) return; saveUndoState(); selectedNode.shape = s; rebuildNodeGeo(selectedNode); flash('SHAPE → ' + s.toUpperCase()); }
function selNodeSpin(v) { if (!selectedNode) return; document.getElementById('sv-spin').textContent = parseFloat(v).toFixed(1); selectedNode.spinSpeed = parseFloat(v); }
 
function rebuildNodeGeo(node) {
  if (node.shape === 'exact_imported') return; 
  const flat = ['plane', 'roundbox', 'disc', 'ring', 'rod', 'blade', 'wrap'];
  const isFlat = flat.includes(node.shape);
  const nW = node.flatW || 1.0, nH = node.flatH || 1.0, nT = node.flatT || 0.05;
  let newGeo;
  if (isFlat) newGeo = makeFlatGeo(node.shape, nW, nH, nT, node.size);
  else if (node.shape === 'cube') newGeo = new THREE.BoxGeometry(node.size * 1.5, node.size * 1.5, node.size * 1.5);
  else if (node.shape === 'diamond') newGeo = new THREE.OctahedronGeometry(node.size * 1.2, 0);
  else if (node.shape === 'tetra') newGeo = new THREE.TetrahedronGeometry(node.size * 1.4, 0);
  else newGeo = new THREE.SphereGeometry(node.size, 16, 16);
  node.mesh.geometry.dispose();
  node.mesh.geometry = newGeo;
  const glowR = isFlat ? Math.max(nW, nH) * node.size * 1.5 : node.size * 2.5;
  node.gMesh.geometry.dispose();
  node.gMesh.geometry = new THREE.SphereGeometry(glowR, 16, 16);
  if (node._selWire) {
    node.mesh.remove(node._selWire);
    node._selWire.geometry.dispose();
    node._selWire.material.dispose();
    node.mesh.geometry.computeBoundingBox();
    const bb = node.mesh.geometry.boundingBox;
    const sz2 = new THREE.Vector3(); bb.getSize(sz2);
    const selGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(sz2.x + 0.1, sz2.y + 0.1, sz2.z + 0.1));
    node._selWire = new THREE.LineSegments(selGeo, new THREE.LineBasicMaterial({ color: 0xffee00 }));
    node.mesh.add(node._selWire);
  }
}
 
// ═══════════════════════════════════════════════════════════
//   MULTI-TRACK KEYFRAME SYSTEM
// ═══════════════════════════════════════════════════════════
function switchTrack(t) {
  activeTrack = t;
  document.getElementById('btn-track1').classList.toggle('active', t === 1);
  document.getElementById('btn-track2').classList.toggle('active', t === 2);
  
  const label = document.getElementById('lbl-speed');
  const slider = document.getElementById('anim-speed-sl');
  const valDisplay = document.getElementById('v-track-speed');

  if (t === 1) {
    label.textContent = "T1 Speed";
    label.style.color = "#cc44ff";
    slider.value = animSpeed;
    valDisplay.textContent = animSpeed.toFixed(1);
    valDisplay.style.color = "#cc44ff";
  } else {
    label.textContent = "T2 Speed";
    label.style.color = "#00ff88";
    slider.value = animSpeed2;
    valDisplay.textContent = animSpeed2.toFixed(1);
    valDisplay.style.color = "#00ff88";
  }
  renderKeyframeTimeline();
}

// ═══════════════════════════════════════════════════════════
//   🔥 SMART COPY - PASTE ANIMATION SYSTEM
// ═══════════════════════════════════════════════════════════
let clipboardAnim = null;

function copyAnimation() {
  let srcIds = [];
  if (selNodes.size > 0) srcIds = Array.from(selNodes);
  else if (selectedNode) srcIds = [selectedNode.id];

  if (srcIds.length === 0) { flash('⚠ SELECT A CHARACTER FIRST TO COPY'); return; }

  // 🔥 FIX: Saare selected nodes ka data store karo, sirf pehle ka nahi
  clipboardAnim = { t1: [], t2: [], srcIds: srcIds };

  // Track 1 copy — har keyframe mein saare nodes ka data (id → data)
  keyframes.forEach(kf => {
    const frameData = {};
    srcIds.forEach(id => { if (kf[id]) frameData[id] = JSON.parse(JSON.stringify(kf[id])); });
    clipboardAnim.t1.push(frameData);
  });

  // Track 2 copy
  if (typeof keyframes2 !== 'undefined') {
    keyframes2.forEach(kf => {
      const frameData = {};
      srcIds.forEach(id => { if (kf[id]) frameData[id] = JSON.parse(JSON.stringify(kf[id])); });
      clipboardAnim.t2.push(frameData);
    });
  }

  flash('📋 ANIMATION COPIED (' + srcIds.length + ' NODES)!');
}

function pasteAnimation() {
  if (!clipboardAnim) { flash('⚠ NOTHING COPIED YET'); return; }

  let targets = [];
  if (selNodes.size > 0) targets = Array.from(selNodes);
  else if (selectedNode) targets = [selectedNode.id];

  if (targets.length === 0) { flash('⚠ SELECT TARGET CHARACTER FIRST'); return; }

  const srcIds = clipboardAnim.srcIds || [];

  // ══════════════════════════════════════════════════════
  // 🔥 PROXIMITY-BASED PAIRING FIX
  // Index-based pairing fails when node creation order differs
  // between the two models. Proximity matching using relative
  // positions from centroid is order-independent and always correct.
  // ══════════════════════════════════════════════════════

  // Step 1: Get frame-0 world positions for all SOURCE nodes
  const srcInfo = [];
  for (const srcId of srcIds) {
    let pos = null;
    for (let i = 0; i < clipboardAnim.t1.length; i++) {
      const d = clipboardAnim.t1[i][srcId];
      if (d) { pos = new THREE.Vector3(d.x, d.y, d.z); break; }
    }
    if (pos) srcInfo.push({ id: srcId, pos });
  }

  // Step 2: Get current world positions for all TARGET nodes
  const tgtInfo = [];
  for (const tgtId of targets) {
    const n = nodes.find(x => x.id === tgtId);
    if (!n) continue;
    const pos = new THREE.Vector3();
    n.mesh.getWorldPosition(pos);
    tgtInfo.push({ id: tgtId, pos, node: n });
  }

  if (srcInfo.length === 0 || tgtInfo.length === 0) {
    flash('⚠ NO VALID NODE DATA TO PASTE'); return;
  }

  // Step 3: Compute centroids of source (frame-0) and target (current)
  const srcCentroid = new THREE.Vector3();
  srcInfo.forEach(s => srcCentroid.add(s.pos));
  srcCentroid.divideScalar(srcInfo.length);

  const tgtCentroid = new THREE.Vector3();
  tgtInfo.forEach(t => tgtCentroid.add(t.pos));
  tgtCentroid.divideScalar(tgtInfo.length);

  // Step 4: Greedy proximity match — each src node → closest target node
  // by RELATIVE position (after subtracting each model's centroid).
  // This makes matching rotation/scale/position-independent.
  const pairs = [];
  const usedTargets = new Set();
  for (const src of srcInfo) {
    const relSrc = src.pos.clone().sub(srcCentroid);
    let bestTarget = null, bestDist = Infinity;
    for (const tgt of tgtInfo) {
      if (usedTargets.has(tgt.id)) continue;
      const relTgt = tgt.pos.clone().sub(tgtCentroid);
      const dist = relSrc.distanceTo(relTgt);
      if (dist < bestDist) { bestDist = dist; bestTarget = tgt; }
    }
    if (bestTarget) {
      pairs.push({ srcId: src.id, targetId: bestTarget.id, targetNode: bestTarget.node });
      usedTargets.add(bestTarget.id);
    }
  }

  // Step 5: Apply animation data for each matched pair
  for (const { srcId, targetId, targetNode } of pairs) {

    // Src frame-0 world position (anchor for offset calculation)
    let srcBasePos = null;
    for (let i = 0; i < clipboardAnim.t1.length; i++) {
      const d = clipboardAnim.t1[i][srcId];
      if (d) { srcBasePos = new THREE.Vector3(d.x, d.y, d.z); break; }
    }

    // Target's current world position (where it lives in the scene now)
    const targetCurrentPos = new THREE.Vector3();
    targetNode.mesh.getWorldPosition(targetCurrentPos);

    // offset = how far the target is from the source's frame-0 position
    const offset = srcBasePos
      ? new THREE.Vector3().subVectors(targetCurrentPos, srcBasePos)
      : new THREE.Vector3();

    // Src frame-0 rotation (for relative rotation delta calculation)
    let srcBaseQuat = null;
    for (let i = 0; i < clipboardAnim.t1.length; i++) {
      const d = clipboardAnim.t1[i][srcId];
      if (d && d.qw !== undefined) { srcBaseQuat = new THREE.Quaternion(d.qx, d.qy, d.qz, d.qw); break; }
    }

    // Preserve target's current scale and rotation as the new base
    const targetWS = new THREE.Vector3();
    targetNode.mesh.getWorldScale(targetWS);
    const targetBaseQuat = new THREE.Quaternion();
    targetNode.mesh.getWorldQuaternion(targetBaseQuat);

    // ── Track 1 paste ──
    clipboardAnim.t1.forEach((frameData, i) => {
      const data = frameData[srcId];
      if (data && keyframes[i]) {
        const newData = JSON.parse(JSON.stringify(data));
        newData.x += offset.x; newData.y += offset.y; newData.z += offset.z;
        newData.sx = targetWS.x; newData.sy = targetWS.y; newData.sz = targetWS.z;
        if (srcBaseQuat && newData.qw !== undefined) {
            const frameQuat = new THREE.Quaternion(newData.qx, newData.qy, newData.qz, newData.qw).normalize();
            const deltaQuat = srcBaseQuat.clone().normalize().invert().multiply(frameQuat);
            const resultQuat = targetBaseQuat.clone().normalize().multiply(deltaQuat).normalize();
            newData.qx = resultQuat.x; newData.qy = resultQuat.y;
            newData.qz = resultQuat.z; newData.qw = resultQuat.w;
          } else if (newData.qw !== undefined) {
            newData.qx = targetBaseQuat.x; newData.qy = targetBaseQuat.y;
            newData.qz = targetBaseQuat.z; newData.qw = targetBaseQuat.w;
          }
          keyframes[i][targetId] = newData;
      }
    });

    // ── Track 2 paste ──
    if (typeof keyframes2 !== 'undefined') {
      let srcBaseQuat2 = null;
      for (let i = 0; i < clipboardAnim.t2.length; i++) {
        const d = clipboardAnim.t2[i][srcId];
        if (d && d.qw !== undefined) { srcBaseQuat2 = new THREE.Quaternion(d.qx, d.qy, d.qz, d.qw); break; }
      }
      clipboardAnim.t2.forEach((frameData, i) => {
        const data = frameData[srcId];
        if (data && keyframes2[i]) {
          const newData = JSON.parse(JSON.stringify(data));
          newData.x += offset.x; newData.y += offset.y; newData.z += offset.z;
          newData.sx = targetWS.x; newData.sy = targetWS.y; newData.sz = targetWS.z;
          if (srcBaseQuat2 && newData.qw !== undefined) {
            const frameQuat = new THREE.Quaternion(newData.qx, newData.qy, newData.qz, newData.qw).normalize();
            const deltaQuat = srcBaseQuat2.clone().normalize().invert().multiply(frameQuat);
            const resultQuat = targetBaseQuat.clone().normalize().multiply(deltaQuat).normalize();
            newData.qx = resultQuat.x; newData.qy = resultQuat.y;
            newData.qz = resultQuat.z; newData.qw = resultQuat.w;
          } else if (newData.qw !== undefined) {
            newData.qx = targetBaseQuat.x; newData.qy = targetBaseQuat.y;
            newData.qz = targetBaseQuat.z; newData.qw = targetBaseQuat.w;
          }
          keyframes2[i][targetId] = newData;
        }
      });
    }
  }

  flash('✨ ANIM PASTED TO ' + pairs.length + ' NODES!');
  renderKeyframeTimeline();
}

function updateTrackSpeed(val) {
  let v = parseFloat(val);
  const valDisplay = document.getElementById('v-track-speed');
  
  if (activeTrack === 1) {
    animSpeed = v;
    valDisplay.style.color = '#cc44ff';
  } else {
    animSpeed2 = v;
    valDisplay.style.color = '#00ff88';
  }
  valDisplay.textContent = v.toFixed(1);
}

function saveKeyframe() {
  saveUndoState(); // Keyframe save se pehle snapshot
  const s = { __meta: { speed: 1.0 } };
  let targetNodes = nodes;

  if (activeTrack === 2) {
    // ⚡ TRACK 2: Sirf select ki hui cheezein save karega (Strict)
    if (selNodes.size === 0) { 
      flash('⚠ ERROR: SELECT NODES FOR TRACK 2!'); 
      return; 
    }
    targetNodes = nodes.filter(n => selNodes.has(n.id));
  } else {
    // 🟢 TRACK 1: Hamesha poori duniya (All Nodes) save karega! (Jhatka fix)
    targetNodes = nodes;
  }

  targetNodes.forEach(n => {
    if (n.attachedTo !== undefined) return; // Attached node parent ke saath khud chalta hai
    const wp = new THREE.Vector3(); n.mesh.getWorldPosition(wp);
    const wq = new THREE.Quaternion(); n.mesh.getWorldQuaternion(wq);
    const ws = new THREE.Vector3(); n.mesh.getWorldScale(ws);
    s[n.id] = { x: wp.x, y: wp.y, z: wp.z, qx: wq.x, qy: wq.y, qz: wq.z, qw: wq.w, sx: ws.x, sy: ws.y, sz: ws.z };
  });

  if (activeTrack === 1) {
    s.__meta.serialNum = ++kf1Serial;
    keyframes.push(s);
    flash(`✦ T1: FULL SCENE SAVED`);
  } else {
    s.__meta.serialNum = ++kf2Serial;
    keyframes2.push(s);
    flash(`✦ T2: ${targetNodes.length} NODES SAVED`);
  }
  
  renderKeyframeTimeline();
}

function deleteKeyframe(idx, track) {
  saveUndoState(); // Delete se pehle snapshot
  if (track === 1) keyframes.splice(idx, 1); else keyframes2.splice(idx, 1);
  renderKeyframeTimeline();
}

let kfDragSrcIdx = null;
let kf1Serial = 0;
let kf2Serial = 0;
let kfCopySerial = 0;

function copyKeyframe(idx, track) {
  const targetKF = track === 1 ? keyframes : keyframes2;
  const copy = JSON.parse(JSON.stringify(targetKF[idx]));
  if (!copy.__meta) copy.__meta = {};
  copy.__meta.isCopy = true;
  copy.__meta.copySerial = ++kfCopySerial;
  copy.__meta.speed = copy.__meta.speed || 1.0;  // ← YEH FIX HAI
  targetKF.splice(idx + 1, 0, copy);
  renderKeyframeTimeline();
  flash('⧉ KEYFRAME ' + (idx + 1) + ' COPIED');
}

function clearKeyframes() {
  saveUndoState(); // Clear se pehle snapshot
  if (activeTrack === 1) keyframes = []; else keyframes2 = [];
  renderKeyframeTimeline();
  flash('TRACK ' + activeTrack + ' CLEARED');
}

function renderKeyframeTimeline() {
  const tl = document.getElementById('kf-timeline');
  const targetKF = activeTrack === 1 ? keyframes : keyframes2;
  document.getElementById('preview-kf-count').textContent = keyframes.length + (typeof keyframes2 !== 'undefined' ? keyframes2.length : 0);

  if (targetKF.length === 0) {
    tl.innerHTML = `<div class="kf-empty">No keyframes in Track ${activeTrack}.<br>Select nodes, position & save.</div>`; return;
  }

  tl.innerHTML = '';
  targetKF.forEach((kf, i) => {
    
    // 🔥 MASTER FIX: Permanent Stamp Logic
    // Agar card ke paas apna pakka number (serialNum) nahi hai ya '0' hai, 
    // toh usko permanently ek number de do taaki drag karne pe wo change na ho!
    if (!kf.__meta) kf.__meta = { speed: 1.0 };
    if (!kf.__meta.serialNum && !kf.__meta.isCopy) {
        kf.__meta.serialNum = activeTrack === 1 ? ++kf1Serial : ++kf2Serial;
    }

    const card = document.createElement('div');
    card.className = 'kf-card';
    card.draggable = true;
    card.dataset.idx = i;

    const isCopy = kf.__meta && kf.__meta.isCopy;
    const tColor = isCopy ? '#00e5ff' : (activeTrack === 1 ? '#cc44ff' : '#00ff88');

    card.onclick = function(e) {
      if (e.target.tagName === 'INPUT' || e.target.classList.contains('kf-del') || e.target.classList.contains('kf-copy-btn')) return;
      jumpToKeyframe(i, activeTrack);
    };

    // ── Drag to Reorder ──
    card.addEventListener('dragstart', function(e) {
      kfDragSrcIdx = i;
      setTimeout(() => card.style.opacity = '0.4', 0);
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', function() {
      card.style.opacity = '';
      tl.querySelectorAll('.kf-card').forEach(c => c.classList.remove('kf-drag-over'));
      kfDragSrcIdx = null;
    });
    card.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      tl.querySelectorAll('.kf-card').forEach(c => c.classList.remove('kf-drag-over'));
      card.classList.add('kf-drag-over');
    });
    card.addEventListener('dragleave', function() {
      card.classList.remove('kf-drag-over');
    });
    card.addEventListener('drop', function(e) {
      e.preventDefault();
      card.classList.remove('kf-drag-over');
      if (kfDragSrcIdx === null || kfDragSrcIdx === i) return;
      const moved = targetKF.splice(kfDragSrcIdx, 1)[0];
      targetKF.splice(i, 0, moved);
      kfDragSrcIdx = null;
      renderKeyframeTimeline();
      flash('↕ KEYFRAME REORDERED');
    });

    const nodeCount = Object.keys(kf).filter(k => k !== '__meta').length;
    const curSpeed = (kf.__meta && kf.__meta.speed != null) ? kf.__meta.speed : 1.0;

    card.innerHTML = `
      <div class="kf-num" style="cursor:grab;user-select:none;" title="Drag to reorder">⠿ ${isCopy ? kf.__meta.copySerial : (kf.__meta.serialNum || i + 1)}</div>
      <div class="kf-info" style="width:100%;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="kf-info-title" style="color:${tColor}">T${activeTrack} - KEYFRAME ${isCopy ? kf.__meta.copySerial : (kf.__meta.serialNum || i + 1)}${isCopy ? ' ⧉' : ''}</div>
          <div style="display:flex;gap:5px;align-items:center;">
            <div class="kf-copy-btn" onclick="event.stopPropagation();copyKeyframe(${i}, ${activeTrack})" title="Copy this keyframe">⧉</div>
            <div class="kf-del" onclick="event.stopPropagation();deleteKeyframe(${i}, ${activeTrack})" title="Delete">✕</div>
          </div>
        </div>
        <div class="kf-info-nodes">${nodeCount} nodes</div>
        <div class="kf-speed-ctrl" style="color:${tColor};">
          <span>SPD: <span id="v-kfs-${activeTrack}-${i}">${curSpeed.toFixed(1)}x</span></span>
          <input type="range" min="0.1" max="5.0" step="0.1" value="${curSpeed}" 
                 oninput="updateKFSpeed(${i}, ${activeTrack}, this.value)">
        </div>
      </div>
    `;
    tl.appendChild(card);
  });
}
 
// ═══════════════════════════════════════════════════════════
//   SELECTION SYSTEM
// ═══════════════════════════════════════════════════════════
function highlightSel() { 
  nodes.forEach(n => {
    const c = selNodes.has(n.id) ? 0xffffff : n.color;
    // 🔥 SAFE HIGHLIGHT FOR ALL NODES
    if (n.mesh.isMesh) { n.mesh.material.color.set(c); }
    else { n.mesh.traverse(ch => { if(ch.isMesh && ch.material) ch.material.color.set(c); }); }
  }); 
}
 
function clearSelection() {
  selGroup.updateMatrixWorld(true); // stale matrix se bachao
  while (selGroup.children.length > 0) {
    scene.attach(selGroup.children[0]); // scene.attach apne aap world pos preserve karta hai
  }
  GTC.detach(); selNodes.clear(); highlightSel();
}
 
function selectInBox(s, e2) {
  const rect = renderer.domElement.getBoundingClientRect();
  const minX = Math.min(s.x, e2.x), maxX = Math.max(s.x, e2.x);
  const minY = Math.min(s.y, e2.y), maxY = Math.max(s.y, e2.y);
  nodes.forEach(n => {
    const v = new THREE.Vector3(); n.mesh.getWorldPosition(v); v.project(camera);
    const px = (v.x * 0.5 + 0.5) * rect.width + rect.left;
    const py = (-v.y * 0.5 + 0.5) * rect.height + rect.top;
    if (px >= minX && px <= maxX && py >= minY && py <= maxY && v.z < 1 && !n.isFixed) selNodes.add(n.id);
  });
  highlightSel();
  flash('SELECTED ' + selNodes.size + ' NODES');
}
 
function attachToGroup() {
  if (selNodes.size === 0) return;
  // ✅ FIX: Pehle selGroup ke SARE children scene pe bhejo — stray nodes ka trap band karo
  selGroup.updateMatrixWorld(true);
  while (selGroup.children.length > 0) {
    scene.attach(selGroup.children[0]);
  }
  // Ab center calculate karo (sab scene ke direct children hain, correct world pos)
  const center = new THREE.Vector3(); let count = 0;
  nodes.forEach(n => { if (selNodes.has(n.id)) { const wp = new THREE.Vector3(); n.mesh.getWorldPosition(wp); center.add(wp); count++; } });
  if (count === 0) return;
  center.divideScalar(count);
  // selGroup reset karo
  selGroup.position.copy(center); selGroup.rotation.set(0, 0, 0); selGroup.scale.set(1, 1, 1);
  selGroup.updateMatrixWorld(true);
  // Sirf selected nodes ko selGroup mein dalo
  nodes.forEach(n => { if (selNodes.has(n.id) && n.attachedTo === undefined) { selGroup.attach(n.mesh); } });
}
 
// ═══════════════════════════════════════════════════════════
//   MODE MANAGEMENT
// ═══════════════════════════════════════════════════════════
function setMode(m) {
  if (curTab === 'preview') return;
  if (connectFirst) {
    if (connectFirst.mesh.isMesh && connectFirst.mesh.material) connectFirst.mesh.material.color.set(connectFirst.color);
    else connectFirst.mesh.traverse(ch => { if(ch.isMesh && ch.material) ch.material.color.set(connectFirst.color); });
    connectFirst = null;
  }
  if (curMode === 'node-select' && m !== 'node-select' && selectedNode) deselectNode();
  curMode = m;
 
  // ✅ node-select mode mein guide ko bhi detach karo
  if (m !== 'guide-select') {
    selectGuide(null); // TC guide se hatao
  }
 
  if (m === 'move-group' || m === 'rotate-group' || m === 'scale-group') {
    if (selNodes.size > 0) { attachToGroup(); GTC.attach(selGroup); GTC.setMode(m === 'rotate-group' ? 'rotate' : m === 'scale-group' ? 'scale' : 'translate'); }
    else flash('SELECT NODES FIRST');
  } else GTC.detach();
 
  document.querySelectorAll('.btn').forEach(b => {
    b.classList.remove('active');
    if (b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + m + "'")) b.classList.add('active');
  });
}
 
// ═══════════════════════════════════════════════════════════
//   POINTER EVENTS
// ═══════════════════════════════════════════════════════════
let pDown = new THREE.Vector2();
let dragDelActive = false;
renderer.domElement.addEventListener('pointerdown', e => {
  pDown.set(e.clientX, e.clientY);
  if (curMode === 'select-area' && e.button === 0) {
    boxSel = true; orbit.enabled = false; boxStart = { x: e.clientX, y: e.clientY };
    boxEl.style.display = 'block';
    boxEl.style.left = e.clientX + 'px'; boxEl.style.top = e.clientY + 'px';
    boxEl.style.width = '0'; boxEl.style.height = '0';
  }
  if (curMode === 'drag-delete' && e.button === 0) {
    dragDelActive = true;
    orbit.enabled = false;
    saveUndoState();
    flash('🔥 DRAG DELETE ACTIVE — RELEASE TO STOP');
  }
});
renderer.domElement.addEventListener('pointermove', e => {
  if (boxSel) {
    const minX = Math.min(boxStart.x, e.clientX), maxX = Math.max(boxStart.x, e.clientX);
    const minY = Math.min(boxStart.y, e.clientY), maxY = Math.max(boxStart.y, e.clientY);
    boxEl.style.left = minX + 'px'; boxEl.style.top = minY + 'px';
    boxEl.style.width = (maxX - minX) + 'px'; boxEl.style.height = (maxY - minY) + 'px';
  }
  if (curMode === 'drag-delete' && dragDelActive) {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(nodes.map(n => n.mesh), true)
      .filter(h => h.object.visible && h.object.type !== 'LineSegments');
    if (hits.length > 0) {
      let hitObj = hits[0].object;
      while (hitObj && hitObj.userData.id === undefined && hitObj.parent) hitObj = hitObj.parent;
      if (hitObj && hitObj.userData.id !== undefined) {
        const n = nodes.find(x => x.id === hitObj.userData.id);
        if (n) { deleteNode(n); flash('🗑 NODE DELETED'); }
      }
    }
  }
});
renderer.domElement.addEventListener('pointerup', e => {
  if (dragDelActive) {
    dragDelActive = false;
    orbit.enabled = true;
    flash('✅ DRAG DELETE DONE — ' + nodes.length + ' NODES REMAINING');
  }
  if (boxSel) {
    boxSel = false; orbit.enabled = true; boxEl.style.display = 'none';
    if (Math.abs(e.clientX - boxStart.x) > 5 || Math.abs(e.clientY - boxStart.y) > 5) {
      selectInBox(boxStart, { x: e.clientX, y: e.clientY });
      if (curMode === 'move-group' || curMode === 'rotate-group' || curMode === 'scale-group') { attachToGroup(); GTC.attach(selGroup); if (curMode === 'scale-group') GTC.setMode('scale'); else if (curMode === 'rotate-group') GTC.setMode('rotate'); else GTC.setMode('translate'); }
      return;
    }
  }
  if (pDown.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) < 5 && e.button === 0) {
    if (curTab === 'preview') return;
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
 
    if (curTab === 'animate' && !GTCDragging) {
      const hits = raycaster.intersectObjects(nodes.map(n => n.mesh), true);
      let clickedNode = null;
      for (const hit of hits) {
        let obj = hit.object;
        // userData walk-up nahi — seedha node.mesh se compare karo (reliable)
        while (obj && obj !== scene) {
          const found = nodes.find(n => n.mesh === obj);
          if (found) { clickedNode = found; break; }
          obj = obj.parent;
        }
        if (clickedNode) break;
      }

      if (clickedNode) {
        if (clickedNode.isFixed) { flash('🔒 CANNOT SELECT FIXED NODE'); return; }
        const nid = clickedNode.id;
        if (e.shiftKey) {
          if (selNodes.has(nid)) {
            selNodes.delete(nid);
            // Deselected node ko selGroup se turant scene mein wapas bhejo
            const deselN = nodes.find(n => n.id === nid);
            if (deselN && deselN.mesh.parent !== scene) scene.attach(deselN.mesh);
          } else {
            selNodes.add(nid);
          }
        } else { clearSelection(); selNodes.add(nid); }
        highlightSel();
        if (curMode === 'move-group' || curMode === 'rotate-group') { attachToGroup(); GTC.attach(selGroup); }
        flash('NODE ' + nid + ' SELECTED');
      } else if (!e.shiftKey) clearSelection();
      return;
    }
 
    if (curMode === 'guide-select') {
      const hits = raycaster.intersectObjects(guides, true).filter(h => h.object.type !== 'LineSegments');
      selectGuide(hits.length > 0 ? hits[0].object : null);
    } else if (curMode === 'add' || curMode === 'fill') {
      const _nodeSet = new Set();
      nodes.forEach(n => {
        n.mesh.traverse(c => _nodeSet.add(c));
      });
      const hits = raycaster.intersectObjects(guides, true).filter(h => {
        if (h.object.type === 'LineSegments') return false;
        if (_nodeSet.has(h.object)) return false;
        return true;
      });
      const fh = hits.find(h => h.face);
      const fix = document.getElementById('chk-fix').checked;
      if (fh) {
        let tg = fh.object;
        while (tg && !guides.includes(tg)) tg = tg.parent; 
        if (!tg) tg = fh.object;
        if (curMode === 'fill') {
          let n = fh.face.normal.clone().transformDirection(tg.matrixWorld).normalize();
          let up = new THREE.Vector3(0, 1, 0); if (Math.abs(n.y) > 0.99) up.set(1, 0, 0);
          let right = new THREE.Vector3().crossVectors(up, n).normalize();
          let top2 = new THREE.Vector3().crossVectors(n, right).normalize();
          let den = parseInt(document.getElementById('density-sl').value) || 5;
          let spr = parseFloat(document.getElementById('spread-sl').value) || 4;
          let step = spr / Math.max(1, den - 1), added = 0;
          for (let i = 0; i < den; i++) for (let j = 0; j < den; j++) {
            const p = fh.point.clone().add(right.clone().multiplyScalar((i - (den - 1) / 2) * step)).add(top2.clone().multiplyScalar((j - (den - 1) / 2) * step));
            const nd = createNode(p);
            if (fix && tg && guides.includes(tg)) tg.attach(nd.mesh);
            added++;
          }
          flash('GRID: ' + added + ' NODES');
        } else {
          const nd = createNode(fh.point);
          const expand = document.getElementById('chk-expand') && document.getElementById('chk-expand').checked;
          
          if (expand) {
             let sz = new THREE.Vector3(2, 2, 2);
             let ws = new THREE.Vector3(1, 1, 1);
             try {
               const gg = tg.geometry || (tg.children[0] && tg.children[0].geometry);
               if (gg) {
                 if (!gg.boundingBox) gg.computeBoundingBox();
                 gg.boundingBox.getSize(sz);
               }
               tg.getWorldScale(ws);
             } catch(e) {}
 
             fh.object.updateWorldMatrix(true, false);
             const hitMW = fh.object.matrixWorld;
             let worldN = new THREE.Vector3(0, 1, 0);
             try {
               if (fh.face) {
                 const geo = fh.object.geometry;
                 let localN = fh.face.normal.clone();
                 if (geo && geo.attributes.normal && geo.attributes.position) {
                   const nA = new THREE.Vector3().fromBufferAttribute(geo.attributes.normal, fh.face.a);
                   const nB = new THREE.Vector3().fromBufferAttribute(geo.attributes.normal, fh.face.b);
                   const nC = new THREE.Vector3().fromBufferAttribute(geo.attributes.normal, fh.face.c);
                   const pA = new THREE.Vector3().fromBufferAttribute(geo.attributes.position, fh.face.a).applyMatrix4(hitMW);
                   const pB = new THREE.Vector3().fromBufferAttribute(geo.attributes.position, fh.face.b).applyMatrix4(hitMW);
                   const pC = new THREE.Vector3().fromBufferAttribute(geo.attributes.position, fh.face.c).applyMatrix4(hitMW);
                   const bc = fh.barycoord || (() => {
                     const v = new THREE.Vector3();
                     THREE.Triangle.getBarycoord(fh.point, pA, pB, pC, v);
                     return (v.x >= -0.01 && v.y >= -0.01 && v.z >= -0.01) ? v : null;
                   })();
                   if (bc) {
                     localN.set(0,0,0).addScaledVector(nA,bc.x).addScaledVector(nB,bc.y).addScaledVector(nC,bc.z).normalize();
                   }
                 }
                 const candidate = localN.transformDirection(hitMW).normalize();
                 if (isFinite(candidate.x) && candidate.lengthSq() > 0.1) worldN = candidate;
               }
             } catch(e) {}
 
             const finalQ = new THREE.Quaternion().setFromUnitVectors(
               new THREE.Vector3(0, 0, 1), worldN
             );
 
             const isWrap = nd.shape === 'wrap';
             let fw, fh2;
             let posCenter;
 
             if (isWrap) {
               const targetGeo = fh.object.geometry.clone();
               targetGeo.computeVertexNormals();
               
               if (targetGeo.attributes.position && targetGeo.attributes.normal) {
                 const posAttr = targetGeo.attributes.position;
                 const normAttr = targetGeo.attributes.normal;
                 const offset = 0.02; 
                 for (let i = 0; i < posAttr.count; i++) {
                   posAttr.setXYZ(i, 
                     posAttr.getX(i) + normAttr.getX(i) * offset,
                     posAttr.getY(i) + normAttr.getY(i) * offset,
                     posAttr.getZ(i) + normAttr.getZ(i) * offset
                   );
                 }
               }
               
               nd.mesh.geometry.dispose();
               nd.mesh.geometry = targetGeo;
               nd.shape = 'exact_imported';
 
               const tPos = new THREE.Vector3(); fh.object.getWorldPosition(tPos);
               const tQuat = new THREE.Quaternion(); fh.object.getWorldQuaternion(tQuat);
               const tScale = new THREE.Vector3(); fh.object.getWorldScale(tScale);
 
               nd.size = 1;
               nd.mesh.quaternion.copy(tQuat);
               nd.mesh.scale.copy(tScale);
               nd.position.copy(tPos);
               nd.mesh.position.copy(tPos);
               
               targetGeo.computeBoundingSphere();
               if(targetGeo.boundingSphere) {
                 nd.gMesh.geometry.dispose();
                 nd.gMesh.geometry = new THREE.SphereGeometry(targetGeo.boundingSphere.radius * 1.1, 16, 16);
               }
             } else {
               const ln = fh.face ? fh.face.normal.clone() : new THREE.Vector3(0,1,0);
               const absX = Math.abs(ln.x), absY = Math.abs(ln.y), absZ = Math.abs(ln.z);
               const isFlatFace = Math.max(absX, absY, absZ) > 0.99;
               if (isFlatFace) {
                 let nx = absX > 0.5 ? Math.sign(ln.x) : 0;
                 let ny = absY > 0.5 ? Math.sign(ln.y) : 0;
                 let nz = absZ > 0.5 ? Math.sign(ln.z) : 0;
                 let w = 1, h = 1;
                 if (nx !== 0) { w = sz.z * ws.z; h = sz.y * ws.y; }
                 else if (ny !== 0) { w = sz.x * ws.x; h = sz.z * ws.z; }
                 else { w = sz.x * ws.x; h = sz.y * ws.y; }
                 fw = w / 3; fh2 = h / 3;
                 const wp = new THREE.Vector3();
                 tg.getWorldPosition(wp);
                 const off = new THREE.Vector3(nx*(sz.x*ws.x/2), ny*(sz.y*ws.y/2), nz*(sz.z*ws.z/2));
                 off.applyQuaternion(tg.quaternion);
                 posCenter = wp.add(off).add(worldN.clone().multiplyScalar(0.015));
               } else {
                 const avgSz = (sz.x * ws.x + sz.y * ws.y + sz.z * ws.z) / 3;
                 const tileSize = Math.max(avgSz * 0.32, 0.3);
                 fw = tileSize / 3; fh2 = tileSize / 3;
                 posCenter = fh.point.clone().add(worldN.clone().multiplyScalar(0.015));
               }
               
               nd.size = 1;
               nd.mesh.quaternion.copy(finalQ);
               nd.mesh.scale.set(1, 1, 1);
               nd.flatW = fw;
               nd.flatH = fh2;
               nd.flatT = 0.05;
               nd.position.copy(posCenter);
               nd.mesh.position.copy(posCenter);
               rebuildNodeGeo(nd);
             }
          }
 
          if (fix && tg && guides.includes(tg)) { 
            tg.attach(nd.mesh); 
            flash(expand ? '✅ PERFECT FIT!' : '📌 NODE FIXED'); 
          } else {
            flash(expand ? '🔲 COVERED FACE!' : '⊕ NODE PLACED');
          }
        }
      } else {
        const gt = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), gt) && curMode === 'add') { createNode(gt); flash('NODE ON GROUND'); }
      }
    } else if (curMode === 'connect') {
      const hits = raycaster.intersectObjects(nodes.map(n => n.mesh), true)
        .filter(h => h.object.visible && h.object.type !== 'LineSegments');
      if (hits.length > 0) {
        let hitObj = hits[0].object;
        while (hitObj && hitObj.userData.id === undefined && hitObj.parent) hitObj = hitObj.parent;
        if (!hitObj || hitObj.userData.id === undefined) return;
        const n = nodes.find(x => x.id === hitObj.userData.id);
        if (!n) return;
        if (!connectFirst) { 
          connectFirst = n; 
          if (n.mesh.isMesh && n.mesh.material) n.mesh.material.color.setHex(0xffffff);
          else n.mesh.traverse(ch => { if(ch.isMesh && ch.material) ch.material.color.setHex(0xffffff); });
          flash('SELECT 2ND NODE'); 
        } else { 
          if (connectFirst.id !== n.id) createEdge(connectFirst, n); 
          if (connectFirst.mesh.isMesh && connectFirst.mesh.material) connectFirst.mesh.material.color.set(connectFirst.color);
          else connectFirst.mesh.traverse(ch => { if(ch.isMesh && ch.material) ch.material.color.set(connectFirst.color); });
          connectFirst = null; flash('CONNECTED'); 
        }
      }
    } else if (curMode === 'delete') {
      const hits = raycaster.intersectObjects(nodes.map(n => n.mesh), true)
        .filter(h => h.object.visible && h.object.type !== 'LineSegments');
      if (hits.length > 0) {
        let hitObj = hits[0].object;
        while (hitObj && hitObj.userData.id === undefined && hitObj.parent) hitObj = hitObj.parent;
        if (hitObj && hitObj.userData.id !== undefined) {
          const n = nodes.find(x => x.id === hitObj.userData.id);
          if (n) deleteNode(n);
        }
      }
     
    } else if (curMode === 'fix-node') {
      const hits = raycaster.intersectObjects(nodes.map(n => n.mesh), true)
        .filter(h => h.object.visible && h.object.type !== 'LineSegments');
      if (hits.length > 0) {
        let _fixHit = hits[0].object;
        while (_fixHit && _fixHit.userData.id === undefined && _fixHit.parent) _fixHit = _fixHit.parent;
        if (!_fixHit || _fixHit.userData.id === undefined) return;
        const n = nodes.find(x => x.id === _fixHit.userData.id);
        if (!n) return;
        
        if (!n.physBody && typeof CANNON !== 'undefined') {
          // 🔥 MAGIC FIX 1: Collisions OFF aur Damping ON
          n.physBody = new CANNON.Body({ 
            mass: 1, 
            shape: new CANNON.Sphere(n.size),
            linearDamping: 0.99, // Hawa mein udna band
            angularDamping: 0.99, 
            collisionFilterGroup: 1, 
            collisionFilterMask: 0 // Kisi se nahi takrayega!
          });
          n.physBody.position.copy(n.mesh.position);
          world.addBody(n.physBody);
        }
 
        n.isFixed = !n.isFixed;
        if (n.isFixed) {
          if (n.mesh.isMesh && n.mesh.material) n.mesh.material.color.setHex(0x00ffff);
          else n.mesh.traverse(ch => { if(ch.isMesh && ch.material) ch.material.color.setHex(0x00ffff); });
          if(n.physBody) {
             n.physBody.mass = 0;
             n.physBody.type = CANNON.Body.STATIC;
             n.physBody.updateMassProperties();
             n.physBody.velocity.set(0,0,0);
          }
          if (selectedNode === n) deselectNode(); 
          if (selNodes.has(n.id)) { selNodes.delete(n.id); highlightSel(); }
          flash('❄️ NODE FROZEN (NO EXPLOSIONS)');
        } else {
          if (n.mesh.isMesh && n.mesh.material) n.mesh.material.color.set(n.color);
          else n.mesh.traverse(ch => { if(ch.isMesh && ch.material) ch.material.color.set(n.color); });
          if(n.physBody) {
             n.physBody.mass = 1;
             n.physBody.type = CANNON.Body.DYNAMIC;
             n.physBody.updateMassProperties();
          }
          flash('🔥 NODE UNFROZEN');
        }
      }
    } else if (curMode === 'merge-nodes') {
      // 🔥 SURFACE SNAP LOGIC (Ab andar nahi ghusega!)
      const hits = raycaster.intersectObjects(nodes.map(n => n.mesh), true).filter(h => h.object.visible && h.object.type !== 'LineSegments');
      if (hits.length > 0) {
        let hitObj = hits[0].object;
        while(hitObj && hitObj.userData.id === undefined && hitObj.parent) hitObj = hitObj.parent;
 
        if (hitObj && hitObj.userData.id !== undefined) {
          const n = nodes.find(x => x.id === hitObj.userData.id);
 
          if (!mergeFirst) {
            mergeFirst = n;
            // 🔥 ASLI JADOO: Jahan mouse click hua hai, wo exact point save kar lo!
            mergeFirst._snapPoint = hits[0].point.clone(); 
            n.mesh.material.color.setHex(0xffffff); 
            flash('🎯 SURFACE POINT SAVED! CLICK 2ND NODE TO SNAP');
          } else {
            if (mergeFirst.id !== n.id) {
              saveUndoState();
              // Center ki jagah ab us saved point par bhejo!
              const targetPos = mergeFirst._snapPoint;
 
              if (n.mesh.parent && n.mesh.parent !== scene) {
                  const localPos = targetPos.clone();
                  n.mesh.parent.worldToLocal(localPos);
                  n.mesh.position.copy(localPos);
              } else {
                  n.mesh.position.copy(targetPos);
              }
 
              if (n.physBody && typeof CANNON !== 'undefined') {
                  n.physBody.position.copy(targetPos);
                  n.physBody.velocity.set(0,0,0);
                  n.physBody.angularVelocity.set(0,0,0);
              }
 
              if(typeof updateEdges === 'function') updateEdges();
              flash('✨ NODE SNAPPED TO SURFACE!');
            }
            // Reset kardo
            if (mergeFirst.mesh.isMesh && mergeFirst.mesh.material) mergeFirst.mesh.material.color.set(mergeFirst.color);
            else mergeFirst.mesh.traverse(ch => { if(ch.isMesh && ch.material) ch.material.color.set(mergeFirst.color); });
            mergeFirst = null;
          }
        }
      }
    } else if (curMode === 'make-joint') {
      const hits = raycaster.intersectObjects(nodes.map(n => n.mesh), true).filter(h => h.object.visible && h.object.type !== 'LineSegments'); 
      if (hits.length > 0) {
        let hitObj = hits[0].object;
        while(hitObj && hitObj.userData.id === undefined && hitObj.parent) hitObj = hitObj.parent;
        
        if (hitObj && hitObj.userData.id !== undefined) {
          const clickedNode = nodes.find(x => x.id === hitObj.userData.id);
 
          if (!jointFirst) {
            jointFirst = clickedNode;
            if (jointFirst.mesh.isMesh && jointFirst.mesh.material) jointFirst.mesh.material.color.setHex(0xff00ff);
            else jointFirst.mesh.traverse(ch => { if(ch.isMesh && ch.material) ch.material.color.setHex(0xff00ff); });
            flash('📌 PARENT SELECTED! NOW CLICK CHILD NODE');
          } else {
            if (jointFirst.id !== clickedNode.id) {
              saveUndoState();
              [jointFirst, clickedNode].forEach(node => {
                const wp = new THREE.Vector3();
                const wq = new THREE.Quaternion(); // 🔥 YEH NAYA HAI (Rotation nikal rahe hain)
                node.mesh.getWorldPosition(wp);
                node.mesh.getWorldQuaternion(wq);
 
                if (!node.physBody && typeof CANNON !== 'undefined') {
                  node.physBody = new CANNON.Body({ 
                    mass: node.isFixed ? 0 : 1, shape: new CANNON.Sphere(node.size),
                    linearDamping: 0.99, angularDamping: 0.99, collisionFilterGroup: 1, collisionFilterMask: 0 
                  });
                  world.addBody(node.physBody);
                }
                
                // 🔥 THE BUG KILLER: Joint banane se theek pehle position aur rotation dono Physics ko batao!
                node.physBody.position.copy(wp);
                node.physBody.quaternion.copy(wq);
              });
 
              // PERFECT PIVOT MATH (Shoulder Joint)
              const pivotA = new CANNON.Vec3(0, 0, 0); 
              const pivotB = new CANNON.Vec3(); 
              clickedNode.physBody.pointToLocalFrame(jointFirst.physBody.position, pivotB);
 
              const constraint = new CANNON.PointToPointConstraint(jointFirst.physBody, pivotA, clickedNode.physBody, pivotB);
              world.addConstraint(constraint);
              
              clickedNode.isBone = true;
              clickedNode.hubParent = jointFirst;
              
              clickedNode.localPivot = new THREE.Vector3(pivotB.x, pivotB.y, pivotB.z);
              
              const wA = new THREE.Vector3(); jointFirst.mesh.getWorldPosition(wA);
              const wB = new THREE.Vector3(); clickedNode.mesh.getWorldPosition(wB);
              clickedNode.boneDist = wA.distanceTo(wB);
              
              try { createEdge(jointFirst, clickedNode); } catch(e){}
              flash('🦴 SOLID BONE JOINT CREATED!');
            }
            if (jointFirst.mesh.isMesh && jointFirst.mesh.material) jointFirst.mesh.material.color.set(jointFirst.color);
            else jointFirst.mesh.traverse(ch => { if(ch.isMesh && ch.material) ch.material.color.set(jointFirst.color); });
            jointFirst = null;
          }
        }
      }
      
    } else if (curMode === 'attach-node') {
      const hits = raycaster.intersectObjects(nodes.map(n => n.mesh), true)
        .filter(h => h.object.visible && h.object.type !== 'LineSegments');
      if (hits.length > 0) {
        let hitObj = hits[0].object;
        while (hitObj && hitObj.userData.id === undefined && hitObj.parent) hitObj = hitObj.parent;
        if (hitObj && hitObj.userData.id !== undefined) {
          const clicked = nodes.find(x => x.id === hitObj.userData.id);
          if (!attachFirst) {
            // Step 1: Pehla node — jo attach hoga (child)
            attachFirst = clicked;
            if (clicked.mesh.isMesh) clicked.mesh.material.color.set(0x00ccff);
            else clicked.mesh.traverse(ch => { if (ch.isMesh && ch.material) ch.material.color.set(0x00ccff); });
            flash('🧲 CHILD SELECTED · AB PARENT NODE CLICK KARO');
          } else {
            if (attachFirst.id !== clicked.id) {
              // Step 2: Dusra node — parent (model ka node)
              saveUndoState();
              // .attach() world position preserve karta hai aur child banata hai
              clicked.mesh.attach(attachFirst.mesh);
              attachFirst.attachedTo = clicked.id;
              if (attachFirst.mesh.isMesh) attachFirst.mesh.material.color.set(attachFirst.color);
              else attachFirst.mesh.traverse(ch => { if (ch.isMesh && ch.material) ch.material.color.set(attachFirst.color); });
              flash('✅ ATTACHED! YE NODE AB MODEL KE SAATH MOVE KAREGA');
            } else {
              flash('⚠ ALAG NODE SELECT KARO');
            }
            attachFirst = null;
          }
        }
      }

    // 🔥 YEH WALA HISSA DELETE HO GAYA THA, ISEY WAPAS JOD DIYA 🔥
    } else if (curMode === 'node-select') {
      // 🔥 FIX: Invisible glow shields ko ignore karna!
      const hits = raycaster.intersectObjects(nodes.map(n => n.mesh), true).filter(h => h.object.visible && h.object.type !== 'LineSegments');
      if (hits.length > 0) {
        let hitObj = hits[0].object;
        // Agar click andar wale part (jaise ungli) pe laga hai, toh uska main parent dhundho
        while(hitObj && hitObj.userData.id === undefined && hitObj.parent) hitObj = hitObj.parent;
        
        if (hitObj && hitObj.userData.id !== undefined) {
          selectSingleNode(nodes.find(x => x.id === hitObj.userData.id));
        } else {
          deselectNode();
        }
      } else {
        deselectNode();
      }
    }
  }
});
 
// ═══════════════════════════════════════════════════════════
//   CLEAR ALL
// ═══════════════════════════════════════════════════════════
function clearAll() {
  if (!confirm('Clear entire scene? This cannot be undone.')) return;
  TC.detach(); GTC.detach();
  selectedNode = null;
  document.getElementById('node-edit-panel').style.display = 'none';
  nodes.forEach(n => {
    if (n.mesh.parent) n.mesh.parent.remove(n.mesh); else scene.remove(n.mesh);
    // 🔥 SAFE DISPOSE — works for both Mesh and Group (imported) nodes
    n.mesh.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    });
    if (n.gMesh) { n.gMesh.geometry.dispose(); n.gMesh.material.dispose(); }
  }); nodes = [];
  edges.forEach(e => { scene.remove(e.line); e.line.geometry.dispose(); e.line.material.dispose(); }); edges = [];
  
  guides.forEach(g => {
    scene.remove(g);
    g.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    });
  });
  guides = [];
  
  connectFirst = null; selGuide = null; selNodes.clear(); attachFirst = null;
   keyframes = []; keyframes2 = [];
   animTime = 0; animTime2 = 0;
  renderKeyframeTimeline();
  updateStats(); flash('SCENE CLEARED');
}
 
// ═══════════════════════════════════════════════════════════
//   EXPORT VIEWER (UPGRADED FOR EXACT 3D MESHES)
// ═══════════════════════════════════════════════════════════
function exportViewer() {
  if (nodes.length === 0) { flash('⚠ NOTHING TO EXPORT'); return; }
  
  nodes.forEach(n => {
    const wp = new THREE.Vector3(); n.mesh.getWorldPosition(wp); n.position.copy(wp);
    const wq = new THREE.Quaternion(); n.mesh.getWorldQuaternion(wq);
    const we = new THREE.Euler().setFromQuaternion(wq);
    n._exportRX = we.x; n._exportRY = we.y; n._exportRZ = we.z;
    const ws = new THREE.Vector3(); n.mesh.getWorldScale(ws);
    n._exportSX = ws.x; n._exportSY = ws.y; n._exportSZ = ws.z;
  });

  const data = {
    nodes: nodes.map(n => {
      let cleanJson = null;
      if (n.shape === 'exact_imported') {
        // 🔥 BUG FIX: Attached child nodes ko temporarily detach karo before cloning
        // Warna child ka geometry parent ke meshJson mein bhi bake ho jaata hai
        // aur export viewer mein DOUBLE node dikhta hai (ghost joint problem)
        const tempDetached = [];
        n.mesh.children.slice().forEach(c => {
          if (c.userData && c.userData.id !== undefined) {
            scene.attach(c); // world position preserve karte hue scene root pe shift karo
            tempDetached.push(c);
          }
        });

        const clone = n.mesh.clone();
        const toRemove = [];
        clone.traverse(c => {
           if (c.type === 'LineSegments' || c.type === 'Line') toRemove.push(c);
           if (c.material && c.material.transparent && c.material.depthWrite === false) toRemove.push(c);
        });
        toRemove.forEach(c => { if(c.parent) c.parent.remove(c); });
        cleanJson = clone.toJSON();

        // 🔥 Re-attach children wapas parent ke paas (world position preserve hoti hai)
        tempDetached.forEach(c => { n.mesh.attach(c); });
      }
      
      let op = 1.0, isSolid = true;
      if (n.mesh.isMesh && n.mesh.material) {
        op = n.mesh.material.opacity;
        isSolid = n.mesh.material.depthWrite;
      } else {
        n.mesh.traverse(ch => { if(ch.isMesh && ch.material) { op = ch.material.opacity; isSolid = ch.material.depthWrite; } });
      }

      return {
        id: n.id, x: n.position.x, y: n.position.y, z: n.position.z,
        rx: n._exportRX || 0, ry: n._exportRY || 0, rz: n._exportRZ || 0,
        sx: n._exportSX || 1, sy: n._exportSY || 1, sz: n._exportSZ || 1,
        color: n.color, size: n.size, shape: n.shape,
        flatW: n.flatW || 1, flatH: n.flatH || 1, flatT: n.flatT || 0.05,
        opacity: op, solid: isSolid,
        spinSpeed: n.spinSpeed || 0,
        meshJson: cleanJson,
        attachedTo: n.attachedTo !== undefined ? n.attachedTo : null
      };
    }),
    edges: edges.map(e => ({ from: e.from, to: e.to, color: e.color })),
    dotBright, keyframes, 
    keyframes2: typeof keyframes2 !== 'undefined' ? keyframes2 : [], 
    animSpeed, 
    animSpeed2: typeof animSpeed2 !== 'undefined' ? animSpeed2 : 1.0,
    loop: (typeof isNoLoop !== 'undefined') ? !isNoLoop : true, // 🔥 YE NAYA ADD HUA
    startDelay: (typeof startDelayTime !== 'undefined') ? startDelayTime : 0,
    memorySelections: (typeof memorySelections !== 'undefined') ? memorySelections : []
  };

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Hologram Pro Viewer</title><style>body{margin:0;overflow:hidden;background:#020810;}</style></head><body>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"><\/script>
<script>
const d=${JSON.stringify(data)};
const s=new THREE.Scene();s.background=new THREE.Color(0x020810);
const c=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,1000);c.position.set(0,10,22);
const r=new THREE.WebGLRenderer({antialias:true});
r.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
r.setSize(innerWidth,innerHeight);

// Shadow only when imported 3D models exist (BasicMaterial nodes don't need it)
const _hasImported = d.nodes.some(n => n.shape === 'exact_imported');
r.shadowMap.enabled = _hasImported;
document.body.appendChild(r.domElement);

const o=new THREE.OrbitControls(c,r.domElement);
o.enableDamping=true; o.dampingFactor=0.06;

s.add(new THREE.AmbientLight(0xffffff,0.6));
const dl=new THREE.DirectionalLight(0xffffff,1);dl.position.set(5,10,7);
if(_hasImported){dl.castShadow=true;dl.shadow.bias=-0.002;dl.shadow.normalBias=0.05;dl.shadow.mapSize.width=1024;dl.shadow.mapSize.height=1024;}
s.add(dl);

function mkGeo(sh, sz, w, h, t) {
  if(sh==='cube') return new THREE.BoxGeometry(sz*1.5, sz*1.5, sz*1.5);
  if(sh==='diamond') return new THREE.OctahedronGeometry(sz*1.2, 0);
  if(sh==='tetra') return new THREE.TetrahedronGeometry(sz*1.4, 0);
  if(sh==='plane'||sh==='wrap') return new THREE.BoxGeometry(w*sz*3, h*sz*3, t*sz*0.5);
  if(sh==='disc') return new THREE.CylinderGeometry(w*sz*2, w*sz*2, t*sz*0.5, 32);
  if(sh==='ring') return new THREE.TorusGeometry(w*sz*2, t*sz*0.4, 8, 32);
  if(sh==='rod') return new THREE.CylinderGeometry(t*sz*0.5, t*sz*0.5, h*sz*5, 8);
  if(sh==='blade') return new THREE.BoxGeometry(w*sz*5, t*sz*0.3, h*sz*1.5);
  return new THREE.SphereGeometry(sz, 16, 16);
}

const ms={}; const loader=new THREE.ObjectLoader();
d.nodes.forEach(n=>{
  let m;
  if(n.shape==='exact_imported' && n.meshJson) {
    m=loader.parse(n.meshJson);
    const applyMat = (ch) => {
      if(ch.isMesh){
        ch.material = new THREE.MeshPhongMaterial({
          color: n.color, transparent: !n.solid, opacity: n.opacity !== undefined ? n.opacity : d.dotBright,
          blending: n.solid ? THREE.NormalBlending : THREE.AdditiveBlending, side: THREE.DoubleSide,
          depthWrite: n.solid, depthTest: n.solid, shininess: 40
        });
        ch.castShadow=true; ch.receiveShadow=true;
      }
    };
    if(m.isMesh) applyMat(m); else m.traverse(applyMat);
  } else {
    // 🔥 BasicMaterial for fast rendering on native shapes!
    m = new THREE.Mesh(mkGeo(n.shape, n.size, n.flatW, n.flatH, n.flatT), new THREE.MeshBasicMaterial({
      color: n.color, transparent: !n.solid, opacity: n.opacity !== undefined ? n.opacity : d.dotBright,
      blending: n.solid ? THREE.NormalBlending : THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: n.solid
    }));
    // No shadows for native shapes = Makhan Performance!
  }
  m.position.set(n.x,n.y,n.z); 
  if(n.sx !== undefined) m.scale.set(n.sx, n.sy, n.sz);
  if(n.rx !== undefined) m.rotation.set(n.rx, n.ry, n.rz);
  s.add(m); ms[n.id]=m;
});

// 🔥 FIX: Attach hierarchy — attached nodes parent ke saath chalein
d.nodes.forEach(n=>{
  if(n.attachedTo !== null && n.attachedTo !== undefined && ms[n.attachedTo]){
    ms[n.attachedTo].attach(ms[n.id]);
  }
});

const el=[]; d.edges.forEach(e=>{
  const a=d.nodes.find(x=>x.id===e.from), b=d.nodes.find(x=>x.id===e.to);
  if(a&&b){ const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x,a.y,a.z),new THREE.Vector3(b.x,b.y,b.z)]),new THREE.LineBasicMaterial({color:e.color,opacity:0.5,transparent:true,blending:THREE.AdditiveBlending})); s.add(l); el.push({line:l,f:e.from,t:e.to}); }
});

let aT=0, aT2=0;
let _timerVal=(d.startDelay||0), _timerActive=_timerVal>0;
const _clock = new THREE.Clock();
// Pre-allocated reusable objects — no GC pressure per frame
const _p1=new THREE.Vector3(),_p2=new THREE.Vector3();
const _q1=new THREE.Quaternion(),_q2=new THREE.Quaternion();
const _s1=new THREE.Vector3(),_s2=new THREE.Vector3();

function animate(){
  requestAnimationFrame(animate);
  const _dt = Math.min(_clock.getDelta(), 0.05); // Max 50ms cap — lag spike se bachao
  
  if(_timerActive){
    if(_timerVal>0){_timerVal-=_dt;o.update();r.render(s,c);return;}
    else{_timerActive=false;}
  }
  
  if(d.keyframes && d.keyframes.length > 1){
    if (d.loop === false && aT >= d.keyframes.length - 1) aT = d.keyframes.length - 1;
    else { let _cfi=Math.floor(aT)%d.keyframes.length; let _fs=(d.keyframes[_cfi].__meta&&d.keyframes[_cfi].__meta.speed)?d.keyframes[_cfi].__meta.speed:1.0; aT += (d.animSpeed || 1) * _fs * _dt * 60 * 0.02; }
    let ki=Math.floor(aT)%d.keyframes.length, ni=(ki+1)%d.keyframes.length, lf=aT%1;
    if (d.loop === false && aT >= d.keyframes.length - 1) { ki = d.keyframes.length - 1; ni = d.keyframes.length - 1; lf = 0; }
    d.nodes.forEach(n=>{
      const k1=d.keyframes[ki][n.id], k2=d.keyframes[ni][n.id];
      if(k1&&k2&&ms[n.id]){
        ms[n.id].position.copy(_p1.set(k1.x,k1.y,k1.z).lerp(_p2.set(k2.x,k2.y,k2.z),lf));
        if(k1.qw!==undefined){
          ms[n.id].quaternion.copy(_q1.set(k1.qx,k1.qy,k1.qz,k1.qw).slerp(_q2.set(k2.qx,k2.qy,k2.qz,k2.qw),lf));
          ms[n.id].scale.lerpVectors(_s1.set(k1.sx,k1.sy,k1.sz),_s2.set(k2.sx,k2.sy,k2.sz),lf);
        }
      }
    });
  }

  if(d.keyframes2 && d.keyframes2.length > 1){
    if (d.loop === false && aT2 >= d.keyframes2.length - 1) aT2 = d.keyframes2.length - 1;
    else { let _cfi2=Math.floor(aT2)%d.keyframes2.length; let _fs2=(d.keyframes2[_cfi2].__meta&&d.keyframes2[_cfi2].__meta.speed)?d.keyframes2[_cfi2].__meta.speed:1.0; aT2 += (d.animSpeed2 || 1) * _fs2 * _dt * 60 * 0.02; }
    let ki2=Math.floor(aT2)%d.keyframes2.length, ni2=(ki2+1)%d.keyframes2.length, lf2=aT2%1;
    if (d.loop === false && aT2 >= d.keyframes2.length - 1) { ki2 = d.keyframes2.length - 1; ni2 = d.keyframes2.length - 1; lf2 = 0; }
    d.nodes.forEach(n=>{
      const k1=d.keyframes2[ki2][n.id], k2=d.keyframes2[ni2][n.id];
      if(k1&&k2&&ms[n.id]){
        ms[n.id].position.copy(_p1.set(k1.x,k1.y,k1.z).lerp(_p2.set(k2.x,k2.y,k2.z),lf2));
        if(k1.qw!==undefined){
          ms[n.id].quaternion.copy(_q1.set(k1.qx,k1.qy,k1.qz,k1.qw).slerp(_q2.set(k2.qx,k2.qy,k2.qz,k2.qw),lf2));
          ms[n.id].scale.lerpVectors(_s1.set(k1.sx,k1.sy,k1.sz),_s2.set(k2.sx,k2.sy,k2.sz),lf2);
        }
      }
    });
  }

  d.nodes.forEach(n=>{ if(n.spinSpeed && ms[n.id]) ms[n.id].rotation.y += n.spinSpeed * 0.005; });
  el.forEach(e=>{ const mA=ms[e.f], mB=ms[e.t]; if(mA&&mB) e.line.geometry.setFromPoints([mA.position, mB.position]); });
  o.update(); r.render(s,c);
} animate();
window.addEventListener('resize',()=>{c.aspect=innerWidth/innerHeight;c.updateProjectionMatrix();r.setSize(innerWidth,innerHeight);});
<\/script></body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'smooth_pro_viewer.html'; a.click();
  flash('✦ PERFECT SMOOTH VIEWER EXPORTED!');
}
 
// ═══════════════════════════════════════════════════════════
//   HTML IMPORT SYSTEM
// ═══════════════════════════════════════════════════════════
let importedElements = [], importedDoc = null;
 
const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith('.html')) processHTMLFile(file);
  else flash('⚠ PLEASE DROP AN .HTML FILE');
});
 
function importHTMLFile(input) {
  const file = input.files[0];
  if (!file) return;
  processHTMLFile(file);
  input.value = '';
}
 
function processHTMLFile(file) {
  document.getElementById('import-status').textContent = '⏳ Loading ' + file.name + '...';
  const reader = new FileReader();
  reader.onload = function(e) {
    const raw = e.target.result;
    try {
      // 🔥 BUG KILLER 1: Flawless JSON Extraction (Prevents Keyframes from dying)
      const dMatch = raw.match(/const\s+d\s*=\s*(\{[\s\S]*?\});\s*const\s+s\s*=\s*new\s+THREE\.Scene/);
      if (dMatch && dMatch[1]) {
        try {
          const holoData = JSON.parse(dMatch[1]);
          if (holoData && holoData.nodes && holoData.nodes.length > 0) {
            loadHologramData(holoData, file.name);
            return;
          }
        } catch (je) {
          console.error('HoloData Parse Error:', je);
        }
      }
      
      if (raw.includes('THREE.Scene') && !raw.includes('id="mode-bar"')) {
        document.getElementById('import-status').textContent = '🔄 Extracting EXACT 3D Model...';
        
        const hook = `<script>
          if(typeof THREE === 'undefined' && window.parent && window.parent.THREE){ window.THREE = window.parent.THREE; }
          window.__oooScenes = [];
          const _origAdd = THREE.Scene.prototype.add;
          THREE.Scene.prototype.add = function(...args) {
            if(!window.__oooScenes.includes(this)) window.__oooScenes.push(this);
            return _origAdd.apply(this, args);
          };
          setTimeout(() => {
            THREE.Scene.prototype.add = _origAdd;
            let extracted = [];
            if(window.__oooScenes) {
              window.__oooScenes.forEach(sc => {
                sc.updateMatrixWorld(true);
                sc.traverse(child => {
                  if(child.isMesh && child.geometry) {
                    
                    // 🔥 AI SMART FIX: Ab hum wireframe models ko reject nahi karenge!
                    // Purana code: if(child.material && child.material.wireframe) return; (ISKO HATA DIYA)
                    
                    if(child.material && (child.material.isShadowMaterial || child.material.type==='ShadowMaterial')) return;
                    if(child.material && child.material.opacity !== undefined && child.material.opacity < 0.05) return;
                    
                    // 🔥 JADOO: 2D base shadow aur faltu glow circles ko ignore karo (sirf solid body aayegi)
                    if(child.geometry.type === 'RingGeometry' || child.geometry.type === 'PlaneGeometry' || child.geometry.type === 'CircleGeometry') return;
                    
                    try {
                      // Global coordinates (world transform) calculate karo
                      child.updateMatrixWorld(true);
                      let wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
                      child.matrixWorld.decompose(wp, wq, ws);
 
                      // Geometry aur material clone karo bina purane group relations ke
                      let cloneMesh = new THREE.Mesh(child.geometry.clone(), child.material.clone());
 
                      extracted.push({ 
                        type: 'EXACT_MESH', 
                        meshJson: cloneMesh.toJSON(),
                        wp: wp.toArray(), // World Position
                        wq: wq.toArray(), // World Rotation (Quaternion)
                        ws: ws.toArray()  // World Scale
                      });
                    } catch(e) {}
                  }
                });
              });
            }
            try{ window.parent.postMessage({ type: 'HOLO_EXTRACT_EXACT', data: extracted }, '*'); }catch(e){}
          }, 2000);
        <\/script>`;
        
        const modifiedRaw = raw.replace(/(<script[^>]*three(\.min)?\.js["'][^>]*><\/script>)/i, `${hook}`);
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;top:0;left:0;pointer-events:none;';
        document.body.appendChild(iframe);
        try {
          iframe.contentDocument.open();
          iframe.contentDocument.write(modifiedRaw);
          iframe.contentDocument.close();
        } catch(ifrErr) {
          document.body.removeChild(iframe);
          const parser = new DOMParser();
          importedDoc = parser.parseFromString(raw, 'text/html');
          parseHTMLElements(file.name);
          return;
        }
        
        const fallbackTimer = setTimeout(() => {
          if(document.body.contains(iframe)) {
            document.body.removeChild(iframe);
            const parser = new DOMParser();
            importedDoc = parser.parseFromString(raw, 'text/html');
            parseHTMLElements(file.name);
          }
        }, 5000);
 
        const messageHandler = (event) => {
          if (event.data && event.data.type === 'HOLO_EXTRACT_EXACT') {
            window.removeEventListener('message', messageHandler);
            clearTimeout(fallbackTimer);
            if(document.body.contains(iframe)) document.body.removeChild(iframe);
            
            const extracted = event.data.data;
            if(extracted && extracted.length > 0) {
              let added = 0;
              clearSelection();
              
              const loader = new THREE.ObjectLoader();
              
              extracted.forEach(meshData => {
                let mesh;
                try {
                  mesh = loader.parse(meshData.meshJson);
                } catch(e) { return; }
                
                if (!mesh) return;
 
                if (meshData.wp) mesh.position.fromArray(meshData.wp);
                if (meshData.wq) mesh.quaternion.fromArray(meshData.wq);
                if (meshData.ws) mesh.scale.fromArray(meshData.ws);
 
                // ✅ FIX: Node ka color pehle read karo meshJson se, fallback curColor
                let importedColor = curColor || '#00ccee';
                try {
                  // meshJson material ka color try karo, but agar white hai toh curColor lo
                  const firstMat = meshData.meshJson && meshData.meshJson.materials && meshData.meshJson.materials[0];
                  if (firstMat && firstMat.color && firstMat.color !== 16777215) {
                    importedColor = '#' + firstMat.color.toString(16).padStart(6,'0');
                  }
                } catch(e) {}
                
                const applyMat = (child) => {
                    if (child.isMesh) {
                        const matColor = new THREE.Color(importedColor);
                        
                        child.material = new THREE.MeshPhongMaterial({
                            color: matColor,
                            emissive: matColor.clone().multiplyScalar(0.15),
                            transparent: false,
                            opacity: 1.0,
                            depthWrite: true,
                            depthTest: true,
                            blending: THREE.NormalBlending,
                            side: THREE.DoubleSide,
                            shininess: 60
                        });
                        
                        if (child.geometry) {
                            child.geometry.computeVertexNormals();
                        }
                    }
                };
                
                // Pure hand model par yeh naya material laga do
                if (mesh.isMesh) applyMat(mesh); 
                else mesh.traverse(child => applyMat(child));
 
                // Glow shield aur mesh ko scene mein add karo
                const gMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), new THREE.MeshBasicMaterial({transparent: true, opacity: 0, depthWrite: false}));
                mesh.add(gMesh);
                scene.add(mesh);
 
                let hexColor = importedColor;
 
                const node = {
                  id: nodeId++, position: mesh.position.clone(), color: hexColor,
                  size: 1, shape: 'exact_imported', mesh: mesh, gMesh: gMesh,
                  _isSolid: true
                };
                mesh.userData.id = node.id;
                nodes.push(node);
                updateStats();
                
                selNodes.add(node.id);
                added++;
              });
              
              attachToGroup(); GTC.attach(selGroup); highlightSel();
              setMode('move-group');
              flash(`✅ PERFECT IMPORT: ${added} REAL 3D PARTS!`);
              document.getElementById('import-status').textContent = `✅ Success: ${added} exact original parts loaded`;
              document.getElementById('import-preview').style.display = 'none';
            } else {
              const parser = new DOMParser();
              importedDoc = parser.parseFromString(raw, 'text/html');
              parseHTMLElements(file.name);
            }
          }
        };
        
        window.addEventListener('message', messageHandler);
        return;
      }
      
      const parser = new DOMParser();
      importedDoc = parser.parseFromString(raw, 'text/html');
      parseHTMLElements(file.name);
 
    } catch (err) {
      flash('⚠ PARSE ERROR: ' + err.message.substring(0, 30));
      document.getElementById('import-status').textContent = '⚠ Error loading file';
    }
  };
  reader.readAsText(file);
}
 
function loadHologramData(holoData, fname) {
  const dotBright2 = holoData.dotBright !== undefined ? holoData.dotBright : 0.8;
  const importedNodeMap = {};
  holoData.nodes.forEach(n => {
    const pos = new THREE.Vector3(n.x, n.y, n.z);
    const savedColor = curColor, savedSize2 = curSize, savedShape = curShape;
    const savedW = flatW, savedH = flatH, savedT = flatT;
    curColor = n.color || '#00e5ff'; curSize = n.size || 0.15; curShape = n.shape || 'sphere';
    flatW = n.flatW !== undefined ? n.flatW : 1.0;
    flatH = n.flatH !== undefined ? n.flatH : 1.0;
    flatT = n.flatT !== undefined ? n.flatT : 0.05;
    flatBevel = n.flatBevel !== undefined ? n.flatBevel : 0;
    
    const node = createNode(pos, n.meshJson);
    
    if (node.mesh.isMesh && node.mesh.material) {
      node.mesh.material.opacity = n.opacity !== undefined ? n.opacity : dotBright2;
    } else {
      node.mesh.traverse(ch => { if (ch.isMesh && ch.material) ch.material.opacity = n.opacity !== undefined ? n.opacity : dotBright2; });
    }
    node.mesh.rotation.set(n.rx || 0, n.ry || 0, n.rz || 0);
    node.mesh.scale.set(n.sx || 1, n.sy || 1, n.sz || 1);
    node.gMesh.material.opacity = n.haloOpacity !== undefined ? n.haloOpacity : 0;
    
    node.gMesh.visible = node.gMesh.material.opacity > 0;
    
    node.gMesh.material.needsUpdate = true;
    node.spinSpeed = n.spinSpeed || 0;
    
    // 🔥 SOLID FIX: Har material pe properly apply hoga
    if (n.solid) {
      const applySolid = (mat) => {
        mat.blending = THREE.NormalBlending;
        mat.depthWrite = true;
        mat.depthTest = true;
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -1;
        mat.polygonOffsetUnits = -1;
        mat.needsUpdate = true;
      };

      if (node.mesh.isMesh && node.mesh.material) {
        applySolid(node.mesh.material);
      } else {
        node.mesh.traverse(ch => { 
          if (ch.isMesh && ch.material) applySolid(ch.material); 
        });
      }
      node._isSolid = true;
    }
    curColor = savedColor; curSize = savedSize2; curShape = savedShape;
    flatW = savedW; flatH = savedH; flatT = savedT;
    importedNodeMap[n.id] = node;
  });
 
  if (holoData.edges) {
    holoData.edges.forEach(e => {
      const na = importedNodeMap[e.from], nb = importedNodeMap[e.to];
      if (na && nb) { const sc = curColor; curColor = e.color || na.color; createEdge(na, nb); curColor = sc; }
    });
  }
 
  // 🧲 Attach relationships restore karo
  holoData.nodes.forEach(n => {
    if (n.attachedTo !== null && n.attachedTo !== undefined) {
      const childNode = importedNodeMap[n.id];
      const parentNode = importedNodeMap[n.attachedTo];
      if (childNode && parentNode) {
        parentNode.mesh.attach(childNode.mesh);
        childNode.attachedTo = parentNode.id;
      }
    }
  });

  if (holoData.keyframes && holoData.keyframes.length > 0) {
      keyframes = holoData.keyframes.map(kf => {
        const newKf = {};
        // 🔥 MASTER FIX: Agar __meta na ho, toh default daal do warna 'serialNum' crash hoga
        if (kf.__meta) {
           newKf.__meta = JSON.parse(JSON.stringify(kf.__meta));
        } else {
           newKf.__meta = { speed: 1.0, serialNum: 0 }; 
        }
        
        Object.keys(kf).forEach(oldId => {
        if (oldId === '__meta') return;
        const newNode = importedNodeMap[parseInt(oldId)];
        if (newNode && kf[oldId]) {
          const d = kf[oldId];
          newKf[newNode.id] = { x: d.x, y: d.y, z: d.z, qx: d.qx !== undefined ? d.qx : newNode.mesh.quaternion.x, qy: d.qy !== undefined ? d.qy : newNode.mesh.quaternion.y, qz: d.qz !== undefined ? d.qz : newNode.mesh.quaternion.z, qw: d.qw !== undefined ? d.qw : newNode.mesh.quaternion.w, sx: d.sx !== undefined ? d.sx : newNode.mesh.scale.x, sy: d.sy !== undefined ? d.sy : newNode.mesh.scale.y, sz: d.sz !== undefined ? d.sz : newNode.mesh.scale.z };
        }
      });
      return newKf;
    });
     animSpeed = holoData.animSpeed || 1.0;
    animTime = 0;   // ← animation time reset
    animTime2 = 0;
    switchTrack(1); // ← Track 1 force-activate karo taki Clear sahi track pe kaam kare
  }

  if (holoData.keyframes2 && holoData.keyframes2.length > 0) {
      keyframes2 = holoData.keyframes2.map(kf => {
        const newKf = {};
        // 🔥 MASTER FIX: Guarantee __meta for Track 2
        if (kf.__meta) {
           newKf.__meta = JSON.parse(JSON.stringify(kf.__meta));
        } else {
           newKf.__meta = { speed: 1.0, serialNum: 0 }; 
        }
        
        Object.keys(kf).forEach(oldId => {
        if (oldId === '__meta') return;
        const newNode = importedNodeMap[parseInt(oldId)];
        if (newNode && kf[oldId]) {
          const d = kf[oldId];
          newKf[newNode.id] = { x: d.x, y: d.y, z: d.z, qx: d.qx !== undefined ? d.qx : newNode.mesh.quaternion.x, qy: d.qy !== undefined ? d.qy : newNode.mesh.quaternion.y, qz: d.qz !== undefined ? d.qz : newNode.mesh.quaternion.z, qw: d.qw !== undefined ? d.qw : newNode.mesh.quaternion.w, sx: d.sx !== undefined ? d.sx : newNode.mesh.scale.x, sy: d.sy !== undefined ? d.sy : newNode.mesh.scale.y, sz: d.sz !== undefined ? d.sz : newNode.mesh.scale.z };
        }
      });
      return newKf;
    });
      animSpeed2 = holoData.animSpeed2 || 1.0;
  } else {
    keyframes2 = []; // ← Purani Track 2 data bhi clear karo
  }

  // 💾 Memory Selections restore karo — keyframes jaise ID remap
  if (holoData.memorySelections && holoData.memorySelections.length > 0) {
    const remapped = holoData.memorySelections.map(mem => {
      const newIds = mem.ids
        .map(oldId => importedNodeMap[oldId])   // old ID → new node object
        .filter(n => n !== undefined)            // delete ho gaye nodes ignore karo
        .map(n => n.id);                         // new node ka ID lo
      return { name: mem.name, ids: newIds };
    }).filter(mem => mem.ids.length > 0);        // khali memories discard karo
    memorySelections = remapped;
    renderMemoryList();
    flash('💾 ' + remapped.length + ' MEMORY SELECTIONS RESTORED');
  }

  if (holoData.loop !== undefined) {
    isNoLoop = !holoData.loop;
  }

  if (holoData.startDelay !== undefined && holoData.startDelay > 0) {
    startDelayTime = holoData.startDelay;
    currentTimerValue = holoData.startDelay;
    isTimerActive = true;
    const delayInput = document.getElementById('start-delay-input');
    if (delayInput) delayInput.value = holoData.startDelay;
    const timerDisplay = document.getElementById('timer-display');
    if (timerDisplay) timerDisplay.textContent = 'STARTING IN: ' + holoData.startDelay.toFixed(1) + 's';
  } else {
    startDelayTime = 0;
    currentTimerValue = 0;
    isTimerActive = false;
  }
 
  const firstNode = holoData.nodes[0];
  if (firstNode) { camera.position.set(firstNode.x, firstNode.y + 5, firstNode.z + 15); orbit.target.set(firstNode.x, firstNode.y + 3, firstNode.z); orbit.update(); }
 
  document.getElementById('import-status').textContent = '✅ ' + holoData.nodes.length + ' nodes loaded from ' + fname;
  document.getElementById('import-preview').style.display = 'none';
  setMode('guide-select');
  flash('✅ HOLOGRAM LOADED — ' + holoData.nodes.length + ' NODES');
}
 
function parseHTMLElements(fname) {
  if (!importedDoc) return;
  const tags = ['div','section','header','footer','nav','main','article','aside','h1','h2','h3','h4','p','button','a','ul','ol','li','table','form','input','img','span','figure','canvas','svg'];
  const found = [];
  tags.forEach(tag => {
    const els = importedDoc.querySelectorAll(tag);
    els.forEach(el => {
      const text = (el.textContent || el.getAttribute('id') || el.getAttribute('class') || tag).trim().substring(0, 40);
      const id = el.getAttribute('id') ? '#' + el.getAttribute('id') : '';
      const cls = el.getAttribute('class') ? '.' + el.getAttribute('class').split(' ')[0] : '';
      found.push({ tag, el, label: `<${tag}${id || cls}> ${text.substring(0, 25)}`, id: found.length });
    });
  });
  found.unshift({ tag: 'body', el: importedDoc.body, label: '<body> — Full Page Layout', id: 0 });
  importedElements = found;
  importedElements.forEach((f, i) => { f.id = i; });
 
  const sel = document.getElementById('import-element-sel');
  sel.innerHTML = '';
  found.forEach((f, i) => {
    const opt = document.createElement('option');
    opt.value = i; opt.textContent = f.label; sel.appendChild(opt);
  });
 
  document.getElementById('import-status').textContent = '✅ ' + found.length + ' elements in ' + fname;
  document.getElementById('import-preview').style.display = 'block';
  flash('✅ HTML LOADED — ' + found.length + ' ELEMENTS');
}
 
function getElementColor(el, fallback) {
  if (!el) return fallback;
  const style = el.getAttribute('style') || '';
  const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
  const bgMatch = style.match(/(?:^|;)\s*background(?:-color)?\s*:\s*([^;]+)/i);
  if (colorMatch) { const c2 = colorMatch[1].trim(); if (c2.startsWith('#') && (c2.length === 4 || c2.length === 7)) return c2; }
  if (bgMatch) { const c2 = bgMatch[1].trim(); if (c2.startsWith('#') && (c2.length === 4 || c2.length === 7)) return c2; }
  return fallback;
}
 
function placeImportedElement() {
  const selIdx = parseInt(document.getElementById('import-element-sel').value);
  const item = importedElements[selIdx];
  if (!item) { flash('⚠ SELECT AN ELEMENT FIRST'); return; }
  const density = parseInt(document.getElementById('import-density').value);
  const scale = parseFloat(document.getElementById('import-scale').value);
  const nodeSize = parseFloat(document.getElementById('import-nodesize').value);
  const doEdges = document.getElementById('import-edges').checked;
  const do3D = document.getElementById('import-3d').checked;
  const colorMode = document.getElementById('import-color-mode').value;
  const structure = analyzeHTMLStructure(item.el, density, do3D);
  if (structure.points.length === 0) { flash('⚠ NO STRUCTURE FOUND'); return; }
  const cx = structure.points.reduce((s, p) => s + p.x, 0) / structure.points.length;
  const cy = structure.points.reduce((s, p) => s + p.y, 0) / structure.points.length;
  const gradColors = ['#ff0088','#ff4400','#ff9900','#88ff00','#00e5ff','#0066ff','#8800ff','#ff00ff'];
  const placedNodes = [];
  structure.points.forEach((pt, i) => {
    const nx = (pt.x - cx) * scale * 0.05;
    const ny = -(pt.y - cy) * scale * 0.05;
    const nz = do3D ? (pt.depth || 0) * scale * 0.3 : 0;
    const pos = new THREE.Vector3(nx, ny + 5, nz);
    let color;
    if (colorMode === 'original') color = getElementColor(pt.sourceEl || item.el, curColor);
    else if (colorMode === 'gradient') color = gradColors[Math.floor((i / structure.points.length) * gradColors.length)];
    else color = curColor;
    const savedColor = curColor, savedSz = curSize;
    curColor = color; curSize = nodeSize * (pt.weight || 1.0);
    const node = createNode(pos);
    curColor = savedColor; curSize = savedSz;
    placedNodes.push({ node, pt });
  });
  if (doEdges && structure.edges.length > 0) {
    structure.edges.forEach(edge => {
      const na = placedNodes[edge.from], nb = placedNodes[edge.to];
      if (na && nb) { const sc = curColor; curColor = na.node.color; createEdge(na.node, nb.node); curColor = sc; }
    });
  }
  flash('✦ ' + placedNodes.length + ' NODES PLACED!');
  document.getElementById('import-status').textContent = 'Placed: ' + placedNodes.length + ' nodes';
}
 
function analyzeHTMLStructure(rootEl, density, do3D) {
  const points = [], edgesArr = [];
  function traverse(el, depth, parentIdx, x, y, width, height) {
    if (!el || el.nodeType !== 1) return;
    const tag = el.tagName ? el.tagName.toLowerCase() : '';
    if (['script','style','meta','link','head'].includes(tag)) return;
    const isBlock = ['div','section','header','footer','nav','main','article','aside','h1','h2','h3','h4','p','ul','ol','table','form','figure'].includes(tag);
    const isHeading = ['h1','h2','h3','h4'].includes(tag);
    const weight = isHeading ? 1.5 : (isBlock ? 1.2 : 0.9);
    const myIdx = points.length;
    const ptsToAdd = [];
    if (isBlock || isHeading) {
      ptsToAdd.push({x,y},{x:x+width,y},{x,y:y+height},{x:x+width,y:y+height},{x:x+width/2,y:y+height/2},{x:x+width/2,y},{x:x+width/2,y:y+height},{x,y:y+height/2},{x:x+width,y:y+height/2});
    } else {
      ptsToAdd.push({x:x+width/2,y:y+height/2});
    }
    const addedIndices = [];
    ptsToAdd.forEach(pt => {
      const idx = points.length;
      points.push({ x: pt.x + (Math.random()-0.5)*8, y: pt.y + (Math.random()-0.5)*8, depth: do3D ? depth * 1.5 + (Math.random()-0.5)*0.5 : 0, weight, sourceEl: el });
      addedIndices.push(idx);
    });
    if (parentIdx >= 0 && addedIndices.length > 0) edgesArr.push({ from: parentIdx, to: addedIndices[0] });
    for (let i = 0; i < addedIndices.length - 1; i++) edgesArr.push({ from: addedIndices[i], to: addedIndices[i+1] });
    const childCount = el.children.length;
    if (childCount > 0) {
      const childW = width / Math.max(1, childCount);
      Array.from(el.children).forEach((child, ci) => {
        traverse(child, depth+1, addedIndices[0] || myIdx, x + ci*childW, y + height*0.15, childW, height * 0.85 / Math.max(1, Math.ceil(childCount/3)));
      });
    }
  }
  const rootTag = rootEl.tagName ? rootEl.tagName.toLowerCase() : 'div';
  const isBody = rootTag === 'body';
  traverse(rootEl, 0, -1, isBody ? 0 : 50, isBody ? 0 : 50, isBody ? 1000 : 400, isBody ? 800 : 300);
  return { points, edges: edgesArr };
}
 
// ═══════════════════════════════════════════════════════════
//   UTILS
// ═══════════════════════════════════════════════════════════
function updateStats() {
  document.getElementById('st-nodes').textContent = nodes.length;
  document.getElementById('st-edges').textContent = edges.length;
}
function setStatusMode(m) {
  document.getElementById('st-mode').innerHTML = 'MODE: <span>' + m + '</span>';
}
let _flashTimer;
function flash(msg) {
  const el = document.getElementById('flash-msg');
  el.textContent = '▸ ' + msg;
  el.classList.add('show');
  clearTimeout(_flashTimer);
  _flashTimer = setTimeout(() => el.classList.remove('show'), 2200);
}
 
// ═══════════════════════════════════════════════════════════
//   ↩ UNDO / ↪ REDO SYSTEM  (Ctrl+Z / Ctrl+Y)
// ═══════════════════════════════════════════════════════════
const _undoStack = [], _redoStack = [];
const MAX_UNDO_STEPS = 30;

function _captureState() {
  return {
    nid: nodeId,
    eid: edgeId,
    nodeList: nodes.map(n => {
      // Temporarily remove helpers so toJSON() captures only real geometry
      const gMeshTemp = n.gMesh;
      const wireTemp  = n._selWire;
      if (gMeshTemp && gMeshTemp.parent === n.mesh) n.mesh.remove(gMeshTemp);
      if (wireTemp  && wireTemp.parent  === n.mesh) n.mesh.remove(wireTemp);

      // 🔥 FIX: Attached children temporarily scene pe bhejo — toJSON() mein ghost nahi aayega
      const _undoDetach = [];
      n.mesh.children.slice().forEach(c => {
        if (c.userData && c.userData.id !== undefined) {
          scene.attach(c); _undoDetach.push(c);
        }
      });
      let meshJson = null;
      try { meshJson = n.mesh.toJSON(); } catch(e) { console.warn('undo capture error:', e); }
      _undoDetach.forEach(c => { n.mesh.attach(c); }); // wapas rakho

      if (gMeshTemp) n.mesh.add(gMeshTemp);
      if (wireTemp)  n.mesh.add(wireTemp);

      // Always capture WORLD transform — works even if node is inside selGroup or attached
      const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), ws = new THREE.Vector3();
      n.mesh.getWorldPosition(wp);
      n.mesh.getWorldQuaternion(wq);
      n.mesh.getWorldScale(ws);

      // Safe material read
      let opacity = 0.8, isSolid = false;
      if (n.mesh.isMesh && n.mesh.material) {
        opacity = n.mesh.material.opacity;
        isSolid = n.mesh.material.depthWrite === true;
      } else {
        n.mesh.traverse(c => { if (c.isMesh && c.material) { opacity = c.material.opacity; isSolid = c.material.depthWrite === true; } });
      }

      return {
        id:          n.id,
        color:       n.color,
        shape:       n.shape,
        size:        n.size,
        flatW:       n.flatW     || 1,
        flatH:       n.flatH     || 1,
        flatT:       n.flatT     || 0.05,
        spinSpeed:   n.spinSpeed || 0,
        isFixed:     n.isFixed   || false,
        _isSolid:    n._isSolid  || isSolid,
        meshJson:    meshJson,
        pos:         [wp.x, wp.y, wp.z],
        quat:        [wq.x, wq.y, wq.z, wq.w],
        scale:       [ws.x, ws.y, ws.z],
        opacity:     opacity,
        // ── NEW: attachment & bone state ──
        attachedTo:  n.attachedTo !== undefined ? n.attachedTo : undefined,
        isBone:      n.isBone      || false,
        boneDist:    n.boneDist    || 0,
        hubParentId: n.hubParent   ? n.hubParent.id : undefined,
        localPivot:  n.localPivot  ? [n.localPivot.x, n.localPivot.y, n.localPivot.z] : null,
      };
    }),
    edgeList: edges.map(e => ({ from: e.from, to: e.to, color: e.color })),
    // ── NEW: save keyframe & animation state ──
    keyframes:        JSON.parse(JSON.stringify(keyframes)),
    keyframes2:       JSON.parse(JSON.stringify(keyframes2)),
    animSpeed:        animSpeed,
    animSpeed2:       animSpeed2,
    memorySelections: JSON.parse(JSON.stringify(memorySelections)),
  };
}

function _restoreState(state) {
  deselectNode();

  // Release selGroup — meshes inside group have wrong world coords otherwise
  selGroup.updateMatrixWorld(true);
  while (selGroup.children.length > 0) scene.attach(selGroup.children[0]);
  GTC.detach();
  selNodes.clear();

  // Destroy all current nodes safely (handles Mesh AND Group nodes)
  nodes.forEach(n => {
    if (n._selWire) {
      try { n.mesh.remove(n._selWire); } catch(e) {}
      n._selWire.geometry.dispose();
      n._selWire.material.dispose();
    }
    // Detach from any parent before removing (handles attached children)
    const parent = n.mesh.parent || scene;
    parent.remove(n.mesh);
    n.mesh.traverse(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
        else c.material.dispose();
      }
    });
  });
  edges.forEach(e => { scene.remove(e.line); e.line.geometry.dispose(); e.line.material.dispose(); });
  nodes = []; edges = [];

  const loader = new THREE.ObjectLoader();

  // ── PASS 1: Rebuild all meshes at their WORLD positions in scene root ──
  state.nodeList.forEach(nd => {
    let mesh = null;
    if (nd.meshJson) {
      try { mesh = loader.parse(nd.meshJson); } catch(e) { console.warn('undo restore mesh error:', e); }
    }

    if (!mesh) {
      const flat = ['plane','roundbox','disc','ring','rod','blade','wrap'];
      let geo;
      if (flat.includes(nd.shape))     geo = makeFlatGeo(nd.shape, nd.flatW, nd.flatH, nd.flatT, nd.size);
      else if (nd.shape === 'cube')    geo = new THREE.BoxGeometry(nd.size*1.5, nd.size*1.5, nd.size*1.5);
      else if (nd.shape === 'diamond') geo = new THREE.OctahedronGeometry(nd.size*1.2, 0);
      else if (nd.shape === 'tetra')   geo = new THREE.TetrahedronGeometry(nd.size*1.4, 0);
      else                              geo = new THREE.SphereGeometry(nd.size, 16, 16);
      mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: nd.color }));
    }

    const applyMat = (m) => {
      if (!m.isMesh) return;
      m.material = new THREE.MeshStandardMaterial({
        color:      nd.color,
        transparent: !nd._isSolid,
        opacity:     nd.opacity,
        blending:    nd._isSolid ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite:  nd._isSolid,
        depthTest:   nd._isSolid,
        side:        THREE.DoubleSide,
        roughness:   0.3,
        metalness:   0.2,
      });
      if (nd._isSolid) {
        m.material.polygonOffset       = true;
        m.material.polygonOffsetFactor = -1;
        m.material.polygonOffsetUnits  = -1;
      }
      m.material.needsUpdate = true;
    };
    if (mesh.isMesh) applyMat(mesh);
    else mesh.traverse(c => { if (c.isMesh) applyMat(c); });

    // Place at saved WORLD position in scene root (attachment reparenting happens in Pass 2)
    mesh.position.set(nd.pos[0], nd.pos[1], nd.pos[2]);
    mesh.quaternion.set(nd.quat[0], nd.quat[1], nd.quat[2], nd.quat[3]);
    mesh.scale.set(nd.scale[0], nd.scale[1], nd.scale[2]);
    scene.add(mesh);
    mesh.userData.id = nd.id;

    const gMat = new THREE.MeshBasicMaterial({
      color: nd.color, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const gMesh = new THREE.Mesh(new THREE.SphereGeometry(nd.size * 2.5, 8, 8), gMat);
    gMesh.visible = false;
    gMesh.raycast  = () => {};
    mesh.add(gMesh);

    const node = {
      id:        nd.id,
      color:     nd.color,
      shape:     nd.shape,
      size:      nd.size,
      flatW:     nd.flatW,
      flatH:     nd.flatH,
      flatT:     nd.flatT,
      spinSpeed: nd.spinSpeed || 0,
      isFixed:   nd.isFixed   || false,
      _isSolid:  nd._isSolid  || false,
      mesh, gMesh,
      position:  mesh.position.clone(),
    };
    nodes.push(node);

    if (nd.isFixed) {
      if (mesh.isMesh && mesh.material) mesh.material.color.setHex(0x00ffff);
      else mesh.traverse(c => { if (c.isMesh && c.material) c.material.color.setHex(0x00ffff); });
    }
  });

  // ── PASS 2: Restore attachedTo hierarchy (THREE.js parent-child) ──
  state.nodeList.forEach(nd => {
    if (nd.attachedTo === undefined || nd.attachedTo === null) return;
    const childNode  = nodes.find(n => n.id === nd.id);
    const parentNode = nodes.find(n => n.id === nd.attachedTo);
    if (childNode && parentNode) {
      // .attach() preserves world position while reparenting
      parentNode.mesh.attach(childNode.mesh);
      childNode.attachedTo = parentNode.id;
    }
  });

  // ── PASS 3: Restore bone/joint data ──
  state.nodeList.forEach(nd => {
    if (!nd.isBone) return;
    const boneNode = nodes.find(n => n.id === nd.id);
    const hubNode  = nodes.find(n => n.id === nd.hubParentId);
    if (boneNode && hubNode) {
      boneNode.isBone    = true;
      boneNode.hubParent = hubNode;
      boneNode.boneDist  = nd.boneDist || 0;
      if (nd.localPivot) {
        boneNode.localPivot = new THREE.Vector3(nd.localPivot[0], nd.localPivot[1], nd.localPivot[2]);
      }
    }
  });

  // ── PASS 4: Restore edges ──
  state.edgeList.forEach(ed => {
    const na = nodes.find(n => n.id === ed.from);
    const nb = nodes.find(n => n.id === ed.to);
    if (!na || !nb) return;
    const pA = new THREE.Vector3(), pB = new THREE.Vector3();
    na.mesh.getWorldPosition(pA); nb.mesh.getWorldPosition(pB);
    const lineMat = new THREE.LineBasicMaterial({
      color: ed.color || na.color, transparent: true,
      opacity: 0.6, blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pA, pB]), lineMat);
    scene.add(line);
    edges.push({ id: edgeId++, from: ed.from, to: ed.to, color: ed.color || na.color, line });
  });

  // ── PASS 5: Restore keyframes, animation speed, memory selections ──
  keyframes  = state.keyframes  ? JSON.parse(JSON.stringify(state.keyframes))  : [];
  keyframes2 = state.keyframes2 ? JSON.parse(JSON.stringify(state.keyframes2)) : [];
  animSpeed  = state.animSpeed  !== undefined ? state.animSpeed  : 1.0;
  animSpeed2 = state.animSpeed2 !== undefined ? state.animSpeed2 : 1.0;
  memorySelections = state.memorySelections ? JSON.parse(JSON.stringify(state.memorySelections)) : [];

  nodeId = state.nid;
  edgeId = state.eid;
  updateStats();
  if (typeof updateEdges    === 'function') updateEdges();
  if (typeof renderKeyframeTimeline === 'function') renderKeyframeTimeline();
  if (typeof renderMemoryList       === 'function') renderMemoryList();
}

function saveUndoState() {
  _undoStack.push(_captureState());
  if (_undoStack.length > MAX_UNDO_STEPS) _undoStack.shift();
  _redoStack.length = 0;
}

function undoAction() {
  if (_undoStack.length === 0) { flash('⚠ NOTHING TO UNDO'); return; }
  _redoStack.push(_captureState());
  _restoreState(_undoStack.pop());
  flash('↩ UNDO  (' + _undoStack.length + ' left)');
}

function redoAction() {
  if (_redoStack.length === 0) { flash('⚠ NOTHING TO REDO'); return; }
  _undoStack.push(_captureState());
  _restoreState(_redoStack.pop());
  flash('↪ REDO  (' + _redoStack.length + ' left)');
}

document.addEventListener('keydown', e => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;
  if (e.key === 'z' || e.key === 'Z') {
    if (e.shiftKey) { e.preventDefault(); redoAction(); }
    else            { e.preventDefault(); undoAction(); }
  }
  if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); redoAction(); }
});
 
// ═══════════════════════════════════════════════════════════
//   🔥 BOOLEAN CSG CUTTER ENGINE (THE FLAWLESS "DO NOT QUIT" FIX)
// ═══════════════════════════════════════════════════════════
function cutHoleInNode() {
  if (!window.CSG) { flash('⚠ CSG LIBRARY MISSING!'); return; }
  if (!selectedNode) { flash('⚠ PEHLE NODE SELECT KARO!'); return; }
  saveUndoState();    
 
  let cutter = selGuide;
  if (!cutter) {
    if (!guides || guides.length === 0) { flash('⚠ PEHLE GUIDE BOX ADD KARO!'); return; }
    const nodePos = new THREE.Vector3();
    selectedNode.mesh.getWorldPosition(nodePos);
    let minDist = Infinity;
    guides.forEach(g => {
      const gPos = new THREE.Vector3();
      g.getWorldPosition(gPos);
      const d = nodePos.distanceTo(gPos);
      if (d < minDist) { minDist = d; cutter = g; }
    });
  }
  if (!cutter) { flash('⚠ KOI GUIDE NAHI MILA!'); return; }
 
  let cutterMesh = cutter;
  if (!cutterMesh.isMesh) {
    cutter.traverse(c => { if (c.isMesh && !cutterMesh.isMesh) cutterMesh = c; });
  }
 
  // 🔥 THE MASTER FIX: NATIVE SCALE INFLATION (No Vertex Tearing!) 🔥
  const guideCopy = new THREE.Mesh(cutterMesh.geometry.clone(), new THREE.MeshBasicMaterial());
  
  cutterMesh.updateMatrixWorld(true);
  cutterMesh.matrixWorld.decompose(guideCopy.position, guideCopy.quaternion, guideCopy.scale);
 
  // Calculate absolute expansion to destroy "chap" safely
  guideCopy.geometry.computeBoundingBox();
  const sz = new THREE.Vector3();
  guideCopy.geometry.boundingBox.getSize(sz);
 
  // Add exactly 0.2 world units (0.1 on each side) to guarantee aar-paar cut!
  const extra = 0.2; 
  const safeX = sz.x > 0.001 ? (extra / sz.x) : 0;
  const safeY = sz.y > 0.001 ? (extra / sz.y) : 0;
  const safeZ = sz.z > 0.001 ? (extra / sz.z) : 0;
 
  guideCopy.scale.x += (guideCopy.scale.x >= 0 ? 1 : -1) * safeX;
  guideCopy.scale.y += (guideCopy.scale.y >= 0 ? 1 : -1) * safeY;
  guideCopy.scale.z += (guideCopy.scale.z >= 0 ? 1 : -1) * safeZ;
 
  // Micro-shift to prevent perfect zero-axis collision (Z-fighting)
  guideCopy.position.addScalar(0.001);
 
  guideCopy.updateMatrixWorld(true);
 
  try {
    selectedNode.mesh.updateMatrixWorld(true);
    const bspWall = CSG.fromMesh(selectedNode.mesh);
    const bspDoor = CSG.fromMesh(guideCopy);
    const bspResult = bspWall.subtract(bspDoor);
    
    const resultMesh = CSG.toMesh(bspResult, selectedNode.mesh.matrixWorld, selectedNode.mesh.material);
 
    selectedNode.mesh.geometry.dispose();
    selectedNode.mesh.geometry = resultMesh.geometry;
    selectedNode.mesh.geometry.computeVertexNormals();
    selectedNode.mesh.geometry.computeBoundingBox();
    selectedNode.mesh.geometry.computeBoundingSphere();
    selectedNode.shape = 'exact_imported';
 
    if (selectedNode._selWire) {
      selectedNode.mesh.remove(selectedNode._selWire);
      selectedNode._selWire.geometry.dispose();
      selectedNode._selWire.material.dispose();
      selectedNode._selWire = null;
    }
    
    selectedNode.mesh.geometry.computeBoundingBox();
    const bb2 = selectedNode.mesh.geometry.boundingBox;
    const sz2 = new THREE.Vector3(); bb2.getSize(sz2);
    const selGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(sz2.x+0.1, sz2.y+0.1, sz2.z+0.1));
    selectedNode._selWire = new THREE.LineSegments(selGeo, new THREE.LineBasicMaterial({ color: 0xffee00 }));
    selectedNode.mesh.add(selectedNode._selWire);
 
    // FORCE SOLID MODE FOR PERFECT DOOR RENDERING
    document.getElementById('sel-solid').checked = true;
    selNodeSolid(true);
    selectedNode.mesh.material.side = THREE.DoubleSide; 
    selectedNode.mesh.material.needsUpdate = true;
 
    flash('✅ MASTERPIECE DOOR CREATED!');
  } catch (e) {
    console.error('CSG CUT ERROR:', e);
    flash('⚠ CUT ERROR: ' + e.message);
  } finally {
    guideCopy.geometry.dispose();
    guideCopy.material.dispose();
  }
}
// Naya function jo slider ghumaane par memory me speed save karega
function updateKFSpeed(idx, track, val) {
  const v = parseFloat(val);
  document.getElementById(`v-kfs-${track}-${idx}`).textContent = v.toFixed(1) + 'x';
  if (track === 1 && keyframes[idx].__meta) keyframes[idx].__meta.speed = v;
  if (track === 2 && keyframes2[idx].__meta) keyframes2[idx].__meta.speed = v;
}
// 🔥 NAYA: Manual Reset Function
function resetAnimation() {
  animTime = 0;
  animTime2 = 0;

  // ✅ Nodes ko physically keyframe 1 ki position par bhejo
  if (keyframes.length > 0) {
    const kf = keyframes[0];
    nodes.forEach(n => {
      const k = kf[n.id];
      if (!k) return;
      const targetPos = new THREE.Vector3(k.x, k.y, k.z);
      if (n.mesh.parent && n.mesh.parent !== scene) n.mesh.parent.worldToLocal(targetPos);
      n.mesh.position.copy(targetPos);
      if (k.qw !== undefined) {
        const targetQuat = new THREE.Quaternion(k.qx, k.qy, k.qz, k.qw);
        if (n.mesh.parent && n.mesh.parent !== scene) targetQuat.premultiply(new THREE.Quaternion().copy(n.mesh.parent.quaternion).invert());
        n.mesh.quaternion.copy(targetQuat);
        n.mesh.scale.set(k.sx, k.sy, k.sz);
      }
      if (n.physBody) {
        const wp = new THREE.Vector3();
        n.mesh.getWorldPosition(wp);
        n.physBody.position.copy(wp);
        n.physBody.velocity.set(0,0,0);
        n.physBody.angularVelocity.set(0,0,0);
      }
    });
  }

  // Timer bhi sahi se reset karo
  if (typeof startDelayTime !== 'undefined' && startDelayTime > 0) {
    currentTimerValue = startDelayTime;
    isTimerActive = true;
    document.getElementById('timer-display').textContent = `STARTING IN: ${startDelayTime.toFixed(1)}s`;
  } else {
    isTimerActive = false;
    currentTimerValue = 0;
    document.getElementById('timer-display').textContent = 'TIMER: OFF';
  }

  if(typeof updateEdges === 'function') updateEdges();
  flash('↺ ANIMATION RESET TO START');
}
// 🔥 NAYA: Frame Jump Engine 🔥
function jumpToKeyframe(idx, track) {
  const targetKF = track === 1 ? keyframes[idx] : keyframes2[idx];
  if (!targetKF) return;

  // Saare nodes check karo aur unhe us frame ki jagah bhej do
  nodes.forEach(n => {
    const kData = targetKF[n.id];
    if (kData) {
      // Position Set Karo
      const targetPos = new THREE.Vector3(kData.x, kData.y, kData.z);
      if (n.mesh.parent && n.mesh.parent !== scene) n.mesh.parent.worldToLocal(targetPos);
      n.mesh.position.copy(targetPos);

      // Rotation Set Karo
      if (kData.qw !== undefined) {
        const targetQuat = new THREE.Quaternion(kData.qx, kData.qy, kData.qz, kData.qw);
        if (n.mesh.parent && n.mesh.parent !== scene) targetQuat.premultiply(new THREE.Quaternion().copy(n.mesh.parent.quaternion).invert());
        n.mesh.quaternion.copy(targetQuat);
        n.mesh.scale.set(kData.sx, kData.sy, kData.sz);
      }

      // 🛑 Physics update karna zaroori hai warna object purani jagah gir jayega
      if (n.physBody && typeof CANNON !== 'undefined') {
        const wp = new THREE.Vector3();
        n.mesh.getWorldPosition(wp);
        n.physBody.position.copy(wp);
        
        const wq = new THREE.Quaternion();
        n.mesh.getWorldQuaternion(wq);
        n.physBody.quaternion.copy(wq);
        
        n.physBody.velocity.set(0,0,0);
        n.physBody.angularVelocity.set(0,0,0);
      }
    }
  });

  // Animation timeline ko bhi us frame ke aas-paas le aao
  if (track === 1) animTime = idx;
  if (track === 2) animTime2 = idx;

  if (typeof updateEdges === 'function') updateEdges();
  flash(`⬡ SNAP TO T${track} - FRAME ${idx + 1}`);
}

function setStartTimer() {
    const val = parseInt(document.getElementById('start-delay-input').value);
    
    // 🔥 FIXED BUG: Yahan startDelayTime ko 0 karna zaroori hai!
    if (isNaN(val) || val <= 0) {
        startDelayTime = 0; // <-- YE LINE MISSING THI
        currentTimerValue = 0;
        isTimerActive = false;
        document.getElementById('timer-display').textContent = "TIMER: OFF";
        flash("⏲ TIMER CANCELLED");
        return;
    }
    
    startDelayTime = val;
    currentTimerValue = val;
    isTimerActive = true;
    
    // Animation ko reset kar do taaki timer ke baad shuru ho
    animTime = 0;
    animTime2 = 0;
    
    flash(`⏲ START DELAY SET: ${val}s`);
    updateTimerUI();
}

function updateTimerUI() {
    const display = document.getElementById('timer-display');
    if (isTimerActive && currentTimerValue > 0) {
        display.textContent = `STARTING IN: ${currentTimerValue.toFixed(1)}s`;
        currentTimerValue -= 0.016; // 60fps ke hisaab se minus (approx)
    } else if (isTimerActive && currentTimerValue <= 0) {
        display.textContent = "▶ EXECUTING!";
        setTimeout(() => { display.textContent = "TIMER: DONE"; isTimerActive = false; }, 2000);
    }
}

function createEdge(nodeA, nodeB) {
  saveUndoState();
  const pA = new THREE.Vector3(), pB = new THREE.Vector3();
  nodeA.mesh.getWorldPosition(pA);
  nodeB.mesh.getWorldPosition(pB);
  const lineMat = new THREE.LineBasicMaterial({
    color: curColor, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const lineGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
  const line = new THREE.Line(lineGeo, lineMat);
  scene.add(line);
  edges.push({ id: edgeId++, from: nodeA.id, to: nodeB.id, color: curColor, line });
  updateStats();
  flash('⟿ EDGE CONNECTED');
}

// ══════════════════════════════════════════════════════════
//   ⧉ COPY SELECTED NODES
// ══════════════════════════════════════════════════════════
function copySelectedNodes() {
  if (selNodes.size === 0) { flash('⚠ PEHLE NODES SELECT KARO'); return; }
  saveUndoState();

  const toCopy = [...selNodes];

  // Original nodes ka highlight hata do — unhe touch nahi karna
  toCopy.forEach(id => {
    const n = nodes.find(x => x.id === id);
    if (!n) return;
    if (n.mesh.isMesh) n.mesh.material.color.set(n.color);
    else n.mesh.traverse(ch => { if (ch.isMesh && ch.material) ch.material.color.set(n.color); });
  });
  selNodes.clear();
  GTC.detach();

  let copiedCount = 0;

  toCopy.forEach(id => {
    const orig = nodes.find(x => x.id === id);
    // Sirf proper Mesh nodes copy karo (Group/imported skip)
    if (!orig || !orig.mesh || !orig.mesh.isMesh || !orig.mesh.geometry) return;

    // ── Geometry + Material clone ──
    const newGeo = orig.mesh.geometry.clone();
    const newMat = orig.mesh.material.clone();
    newMat.color.set(0xffffff); // Selected highlight (white)

    const newMesh = new THREE.Mesh(newGeo, newMat);

    // ── World transform lena (parent ke andar ho toh bhi sahi position mile) ──
    const wPos  = new THREE.Vector3();
    const wQuat = new THREE.Quaternion();
    const wScale = new THREE.Vector3();
    orig.mesh.getWorldPosition(wPos);
    orig.mesh.getWorldQuaternion(wQuat);
    orig.mesh.getWorldScale(wScale);

    newMesh.position.copy(wPos);
    newMesh.quaternion.copy(wQuat);
    newMesh.scale.copy(wScale);

    // ── Glow mesh recreate karo (original ka child copy nahi hota) ──
    const glowR = (orig.size || 0.15) * 2.5;
    const gMesh = new THREE.Mesh(
      new THREE.SphereGeometry(glowR, 16, 16),
      new THREE.MeshBasicMaterial({
        color: orig.color, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    gMesh.visible = false;
    gMesh.raycast = () => {};  // Click detection se bahar rakho
    newMesh.add(gMesh);

    scene.add(newMesh);  // Seedha scene mein daalo (world position already set hai)

    const newNode = {
      id:       nodeId++,
      position: wPos.clone(),
      color:    orig.color,
      size:     orig.size    || 0.15,
      shape:    orig.shape   || 'sphere',
      flatW:    orig.flatW   || 1.0,
      flatH:    orig.flatH   || 1.0,
      flatT:    orig.flatT   || 0.05,
      flatBevel: orig.flatBevel || 0,
      meshJson: null,
      mesh:     newMesh,
      gMesh:    gMesh,
      isFixed:  false,
      spinSpeed: 0
    };

    newMesh.userData.id = newNode.id;
    nodes.push(newNode);
    selNodes.add(newNode.id);
    copiedCount++;
  });

  if (copiedCount > 0) {
    // ⬡ Arrow controls seedha copied nodes par aa jaayenge
    setMode('move-group');
    updateStats();
    flash('⧉ ' + copiedCount + ' NODES COPIED · DRAG ARROWS TO MOVE');
  }
}

// ══════════════════════════════════════════════════════════
//   💾 MEMORY SELECT SYSTEM
// ══════════════════════════════════════════════════════════
let memorySelections = [];

function saveMemorySelection() {
  if (selNodes.size === 0) { flash('⚠ SELECT NODES FIRST'); return; }
  const modal = document.getElementById('mem-name-modal');
  modal.style.display = 'flex';
  const inp = document.getElementById('mem-name-input');
  inp.value = '';
  setTimeout(() => inp.focus(), 50);
}

function confirmSaveMemory() {
  const inp = document.getElementById('mem-name-input');
  const name = inp.value.trim() || ('Memory ' + (memorySelections.length + 1));
  const ids = [...selNodes];
  memorySelections.push({ name, ids });
  document.getElementById('mem-name-modal').style.display = 'none';
  renderMemoryList();
  flash('💾 SAVED: ' + name + ' · ' + ids.length + ' nodes');
}

function cancelSaveMemory() {
  document.getElementById('mem-name-modal').style.display = 'none';
}

function loadMemorySelection(idx, isShift) {
  const mem = memorySelections[idx];
  if (!mem) return;

  // Shift nahi hai toh pehle purani selection clear karo
  if (!isShift) {
    selNodes.forEach(id => {
      const n = nodes.find(x => x.id === id);
      if (n) n.mesh.material.color.set(n.color);
    });
    selNodes.clear();
    GTC.detach();
  }

  // Is memory ke nodes add karo (already selected hain toh skip)
  let added = 0;
  mem.ids.forEach(id => {
    const n = nodes.find(x => x.id === id);
    if (n && !selNodes.has(id)) {
      selNodes.add(id);
      n.mesh.material.color.set(0xffffff);
      added++;
    }
  });

  const action = isShift ? '➕ ADDED' : '✅ LOADED';
  flash(action + ': ' + mem.name + ' · ' + selNodes.size + ' total nodes selected');
}

function deleteMemorySelection(idx) {
  const name = memorySelections[idx].name;
  memorySelections.splice(idx, 1);
  renderMemoryList();
  flash('🗑 DELETED: ' + name);
}

function renderMemoryList() {
  const list = document.getElementById('memory-list');
  if (!list) return;
  if (memorySelections.length === 0) {
    list.innerHTML = '<div style="font-size:9px;color:var(--c-dim);text-align:center;padding:8px;font-family:var(--font-ui);letter-spacing:1px;">No memories saved yet.</div>';
    return;
  }
  list.innerHTML = '';

  // Shift hint — sirf tab dikhao jab 2+ memories hain
  if (memorySelections.length > 1) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:8px;color:rgba(255,170,0,0.45);text-align:center;padding:3px 0 6px;font-family:var(--font-ui);letter-spacing:1px;';
    hint.textContent = '⇧ SHIFT + CLICK = ADD TO SELECTION';
    list.appendChild(hint);
  }

  memorySelections.forEach((mem, i) => {
    const item = document.createElement('div');
    item.className = 'mem-item';
    item.innerHTML = `
      <button class="btn mem-load-btn" onclick="loadMemorySelection(${i}, event.shiftKey)">
        <span style="color:var(--c-orange);font-size:10px;flex-shrink:0;">◈</span>
        <span class="mem-name">${mem.name}</span>
        <span class="mem-count">${mem.ids.length}N</span>
      </button>
      <button class="btn danger mem-del-btn" onclick="event.stopPropagation();deleteMemorySelection(${i})" title="Delete">✕</button>
    `;
    list.appendChild(item);
  });
}