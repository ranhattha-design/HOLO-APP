// 🔥 PRE-ALLOCATED reusable vectors — zero GC pressure per frame
const _rl_p1 = new THREE.Vector3(), _rl_p2 = new THREE.Vector3(), _rl_tp = new THREE.Vector3();
const _rl_q1 = new THREE.Quaternion(), _rl_q2 = new THREE.Quaternion();
const _rl_s1 = new THREE.Vector3(), _rl_s2 = new THREE.Vector3();
const _rl_parentQInv = new THREE.Quaternion();

function renderLoop() {
  requestAnimationFrame(renderLoop);

  nodes.forEach(n => { if (n.spinSpeed) n.mesh.rotation.y += n.spinSpeed * 0.005; });

  // 🔒 BULLETPROOF ATTACH ENFORCER — har frame mein chalta hai
  // Koi bhi action (drag select, group move, undo, import) hierarchy tod de,
  // agla frame mein apne aap theek ho jaayega. Delete hone tak kabhi nahi tutega.
  nodes.forEach(n => {
    if (n.attachedTo === undefined) return;
    // Cache stale ho sakta hai (undo/import ke baad nodes rebuild hote hain)
    if (!n._attachParentNode || !nodes.includes(n._attachParentNode)) {
      n._attachParentNode = nodes.find(x => x.id === n.attachedTo);
    }
    const par = n._attachParentNode;
    if (par && n.mesh.parent !== par.mesh) {
      par.mesh.attach(n.mesh); // world position preserve karta hai, sirf parent change hota hai
    }
  });

  if (curTab === 'preview') {

    // 🔥 TIMER CHECK (single, no duplicate if)
    if (isTimerActive) {
      updateTimerUI();
      if (currentTimerValue > 0) {
        orbit.update();
        renderer.render(scene, camera);
        return;
      }
    }

    // 🟢 TRACK 1
    if (keyframes.length > 1) {
      let currentFrameIdx = Math.floor(animTime) % keyframes.length;
      let frameSpeed = (keyframes[currentFrameIdx].__meta && keyframes[currentFrameIdx].__meta.speed) ? keyframes[currentFrameIdx].__meta.speed : 1.0;

      if (typeof isNoLoop !== 'undefined' && isNoLoop && animTime >= keyframes.length - 1) {
        animTime = keyframes.length - 1;
      } else {
        animTime += (animSpeed * frameSpeed * 0.02);
      }

      let ki = Math.floor(animTime) % keyframes.length;
      let ni = (ki + 1) % keyframes.length;
      let lf = animTime % 1.0;

      if (typeof isNoLoop !== 'undefined' && isNoLoop && animTime >= keyframes.length - 1) {
        ki = keyframes.length - 1; ni = keyframes.length - 1; lf = 0;
      }

      if (activeTrack === 1) {
        document.getElementById('kf-progress-fill').style.width = ((animTime % keyframes.length) / keyframes.length * 100) + '%';
        document.querySelectorAll('.kf-card').forEach((card, i) => card.classList.toggle('current', i === ki));
      }

      nodes.forEach(n => {
        if (n.isFixed) return;
        if (n.attachedTo !== undefined) return; // Parent ke saath khud chalta hai
        const k1 = keyframes[ki][n.id], k2 = keyframes[ni][n.id];
        if (k1 && k2) {
          // 🔥 REUSE pre-allocated vectors — no GC pressure
          _rl_tp.lerpVectors(_rl_p1.set(k1.x,k1.y,k1.z), _rl_p2.set(k2.x,k2.y,k2.z), lf);
          if (n.mesh.parent && n.mesh.parent !== scene) n.mesh.parent.worldToLocal(_rl_tp);
          n.mesh.position.copy(_rl_tp);
          if (k1.qw !== undefined) {
            _rl_q1.set(k1.qx,k1.qy,k1.qz,k1.qw);
            _rl_q2.set(k2.qx,k2.qy,k2.qz,k2.qw);
            _rl_q1.slerp(_rl_q2, lf);
            if (n.mesh.parent && n.mesh.parent !== scene) {
              _rl_parentQInv.copy(n.mesh.parent.quaternion).invert();
              _rl_q1.premultiply(_rl_parentQInv);
            }
            n.mesh.quaternion.copy(_rl_q1);
            n.mesh.scale.lerpVectors(_rl_s1.set(k1.sx,k1.sy,k1.sz), _rl_s2.set(k2.sx,k2.sy,k2.sz), lf);
          }
        }
      });
    }

    // ⚡ TRACK 2
    if (typeof keyframes2 !== 'undefined' && keyframes2.length > 1) {
      let currentFrameIdx2 = Math.floor(animTime2) % keyframes2.length;
      let frameSpeed2 = (keyframes2[currentFrameIdx2].__meta && keyframes2[currentFrameIdx2].__meta.speed) ? keyframes2[currentFrameIdx2].__meta.speed : 1.0;

      if (typeof isNoLoop !== 'undefined' && isNoLoop && animTime2 >= keyframes2.length - 1) {
        animTime2 = keyframes2.length - 1;
      } else {
        animTime2 += (animSpeed2 * frameSpeed2 * 0.02);
      }

      let ki2 = Math.floor(animTime2) % keyframes2.length;
      let ni2 = (ki2 + 1) % keyframes2.length;
      let lf2 = animTime2 % 1.0;

      if (typeof isNoLoop !== 'undefined' && isNoLoop && animTime2 >= keyframes2.length - 1) {
        ki2 = keyframes2.length - 1; ni2 = keyframes2.length - 1; lf2 = 0;
      }

      if (activeTrack === 2) {
        document.getElementById('kf-progress-fill').style.width = ((animTime2 % keyframes2.length) / keyframes2.length * 100) + '%';
        document.querySelectorAll('.kf-card').forEach((card, i) => card.classList.toggle('current', i === ki2));
      }

      nodes.forEach(n => {
        if (n.isFixed) return;
        if (n.attachedTo !== undefined) return; // Parent ke saath khud chalta hai
        const k1 = keyframes2[ki2][n.id], k2 = keyframes2[ni2][n.id];
        if (k1 && k2) {
          // 🔥 REUSE pre-allocated vectors
          _rl_tp.lerpVectors(_rl_p1.set(k1.x,k1.y,k1.z), _rl_p2.set(k2.x,k2.y,k2.z), lf2);
          if (n.mesh.parent && n.mesh.parent !== scene) n.mesh.parent.worldToLocal(_rl_tp);
          n.mesh.position.copy(_rl_tp);
          if (k1.qw !== undefined) {
            _rl_q1.set(k1.qx,k1.qy,k1.qz,k1.qw);
            _rl_q2.set(k2.qx,k2.qy,k2.qz,k2.qw);
            _rl_q1.slerp(_rl_q2, lf2);
            if (n.mesh.parent && n.mesh.parent !== scene) {
              _rl_parentQInv.copy(n.mesh.parent.quaternion).invert();
              _rl_q1.premultiply(_rl_parentQInv);
            }
            n.mesh.quaternion.copy(_rl_q1);
            n.mesh.scale.lerpVectors(_rl_s1.set(k1.sx,k1.sy,k1.sz), _rl_s2.set(k2.sx,k2.sy,k2.sz), lf2);
          }
        }
      });
    }

    if (typeof updateEdges === 'function') updateEdges();
  }

  if (typeof world !== 'undefined') {
    world.step(1/60);
    nodes.forEach(n => {
      if (n.physBody && !n.isFixed) {
        if (n.mesh.parent && n.mesh.parent !== scene) {
          _rl_tp.set(n.physBody.position.x, n.physBody.position.y, n.physBody.position.z);
          n.mesh.parent.worldToLocal(_rl_tp);
          n.mesh.position.copy(_rl_tp);
          _rl_parentQInv.copy(n.mesh.parent.quaternion).invert();
          _rl_q1.set(n.physBody.quaternion.x, n.physBody.quaternion.y, n.physBody.quaternion.z, n.physBody.quaternion.w);
          _rl_q1.premultiply(_rl_parentQInv);
          n.mesh.quaternion.copy(_rl_q1);
        } else {
          n.mesh.position.copy(n.physBody.position);
          n.mesh.quaternion.copy(n.physBody.quaternion);
        }
      }
    });
  }

  orbit.update();
  renderer.render(scene, camera);
}
renderLoop();