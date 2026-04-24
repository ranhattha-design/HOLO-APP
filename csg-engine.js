window.CSG = (function(THREE) {
  // Slightly larger epsilon for post-cut geometry robustness
  var EPSILON = 1e-4, COPLANAR = 0, FRONT = 1, BACK = 2, SPANNING = 3;

  /* ── Vertex ── */
  function Vertex(pos, normal, uv) {
    this.pos    = pos.clone();
    this.normal = normal ? normal.clone() : new THREE.Vector3(0,1,0);
    this.uv     = uv    ? uv.clone()     : new THREE.Vector2();
  }
  Vertex.prototype.clone = function() { return new Vertex(this.pos, this.normal, this.uv); };
  Vertex.prototype.flip  = function() { this.normal.negate(); };
  Vertex.prototype.interpolate = function(o, t) {
    return new Vertex(
      this.pos.clone().lerp(o.pos, t),
      this.normal.clone().lerp(o.normal, t).normalize(),
      this.uv.clone().lerp(o.uv, t)
    );
  };

  /* ── Plane — null safe ── */
  function Plane(normal, w) { this.normal = normal.clone(); this.w = w; }
  Plane.fromPoints = function(a, b, c) {
    var ab = b.clone().sub(a);
    var ac = c.clone().sub(a);
    var n  = ab.cross(ac);
    var len = n.length();
    if (len < 1e-13) return null;            // degenerate triangle — skip
    n.divideScalar(len);
    return new Plane(n, n.dot(a));
  };
  Plane.prototype.clone = function() { return new Plane(this.normal, this.w); };
  Plane.prototype.flip  = function() { this.normal.negate(); this.w = -this.w; };
  Plane.prototype.splitPolygon = function(polygon, coplanarFront, coplanarBack, front, back) {
    var pType = 0, types = [];
    for (var i = 0; i < polygon.vertices.length; i++) {
      var t = this.normal.dot(polygon.vertices[i].pos) - this.w;
      var type = (t < -EPSILON) ? BACK : (t > EPSILON) ? FRONT : COPLANAR;
      pType |= type; types.push(type);
    }
    switch (pType) {
      case COPLANAR:
        (this.normal.dot(polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon);
        break;
      case FRONT: front.push(polygon); break;
      case BACK:  back.push(polygon);  break;
      default: {
        var f = [], b = [];
        // 🔥 FIX: 'ii' use karo 'i' nahi — outer loop variable corrupt hone se bachao
        for (var ii = 0; ii < polygon.vertices.length; ii++) {
          var j  = (ii + 1) % polygon.vertices.length;
          var ti = types[ii], tj = types[j];
          var vi = polygon.vertices[ii], vj = polygon.vertices[j];
          if (ti !== BACK)  f.push(vi);
          if (ti !== FRONT) b.push(vi);
          if ((ti | tj) === SPANNING) {
            var denom = this.normal.dot(vj.pos.clone().sub(vi.pos));
            if (Math.abs(denom) < 1e-10) continue;  // parallel — skip
            var tt = (this.w - this.normal.dot(vi.pos)) / denom;
            if (tt < 0 || tt > 1) continue;
            var v = vi.interpolate(vj, tt);
            f.push(v); b.push(v.clone());
          }
        }
        if (f.length >= 3) { var pf = new Polygon(f); if (pf.valid) front.push(pf); }
        if (b.length >= 3) { var pb = new Polygon(b); if (pb.valid) back.push(pb);  }
      }
    }
  };

  /* ── Polygon — degenerate-safe ── */
  function Polygon(vertices) {
    this.vertices = vertices;
    // 🔥 FIX: Guard against polygons with fewer than 3 vertices
    if (!vertices || vertices.length < 3) {
      this.plane = null;
      this.valid = false;
      return;
    }
    this.plane = Plane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
    this.valid = (this.plane !== null);
  }
  Polygon.prototype.clone = function() {
    var p = new Polygon(this.vertices.map(function(v){ return v.clone(); }));
    return p;
  };
  Polygon.prototype.flip = function() {
    this.vertices.reverse().forEach(function(v){ v.flip(); });
    if (this.plane) this.plane.flip();
  };

  /* ── BSP Node — filters invalid polygons ── */
  function Node(polys) {
    this.plane = null; this.front = null; this.back = null; this.polygons = [];
    if (polys) this.build(polys);
  }
  Node.prototype.invert = function() {
    this.polygons.forEach(function(p){ p.flip(); });
    if (this.plane) this.plane.flip();
    if (this.front) this.front.invert();
    if (this.back)  this.back.invert();
    var tmp = this.front; this.front = this.back; this.back = tmp;
  };
  Node.prototype.clipPolygons = function(polygons) {
    if (!this.plane) return polygons.slice();
    var f = [], b = [];
    polygons.forEach(function(p){ this.plane.splitPolygon(p, f, b, f, b); }, this);
    if (this.front) f = this.front.clipPolygons(f);
    if (this.back)  b = this.back.clipPolygons(b); else b = [];
    return f.concat(b);
  };
  Node.prototype.clipTo = function(bsp) {
    this.polygons = bsp.clipPolygons(this.polygons);
    if (this.front) this.front.clipTo(bsp);
    if (this.back)  this.back.clipTo(bsp);
  };
  Node.prototype.allPolygons = function() {
    var p = this.polygons.slice();
    if (this.front) p = p.concat(this.front.allPolygons());
    if (this.back)  p = p.concat(this.back.allPolygons());
    return p;
  };
  Node.prototype.build = function(polys) {
    // Filter degenerate polygons before building
    var valid = polys.filter(function(p){ return p.valid; });
    if (!valid.length) return;
    if (!this.plane) this.plane = valid[0].plane.clone();
    var f = [], b = [];
    valid.forEach(function(p){ this.plane.splitPolygon(p, this.polygons, this.polygons, f, b); }, this);
    if (f.length) { if (!this.front) this.front = new Node(); this.front.build(f); }
    if (b.length) { if (!this.back)  this.back  = new Node(); this.back.build(b);  }
  };

  /* ── CSG public API ── */
  function CSG(polygons) { this.polygons = (polygons || []).filter(function(p){ return p.valid; }); }

  CSG.fromMesh = function(mesh) {
    mesh.updateMatrixWorld(true);
    var polygons = [];

    // 🔥 SAFE: Works for both direct Mesh AND Group (imported) nodes
    var meshList = [];
    if (mesh.isMesh && mesh.geometry) {
      meshList.push(mesh);
    } else {
      mesh.traverse(function(c) {
        if (c.isMesh && c.geometry) meshList.push(c);
      });
    }

    if (meshList.length === 0) return new CSG(polygons); // nothing to cut

    meshList.forEach(function(targetMesh) {
      targetMesh.updateMatrixWorld(true);
      var geom = targetMesh.geometry;
      var pos  = geom.attributes.position;
      var nor  = geom.attributes.normal;
      var uvA  = geom.attributes.uv;
      var idx  = geom.index;
      if (!pos) return; // skip geometry with no position data
      var count = idx ? idx.count : pos.count;

      for (var i = 0; i < count; i += 3) {
        var verts = [];
        for (var j = 0; j < 3; j++) {
          var ii = idx ? idx.getX(i + j) : i + j;
          var p = new THREE.Vector3(pos.getX(ii), pos.getY(ii), pos.getZ(ii)).applyMatrix4(targetMesh.matrixWorld);
          var n = nor
            ? new THREE.Vector3(nor.getX(ii), nor.getY(ii), nor.getZ(ii)).transformDirection(targetMesh.matrixWorld)
            : new THREE.Vector3(0, 1, 0);
          if (n.lengthSq() > 0) n.normalize(); else n.set(0, 1, 0);
          var uv = uvA ? new THREE.Vector2(uvA.getX(ii), uvA.getY(ii)) : new THREE.Vector2();
          verts.push(new Vertex(p, n, uv));
        }
        // Reject degenerate triangles (duplicate verts or zero area)
        var ab = verts[1].pos.clone().sub(verts[0].pos);
        var ac = verts[2].pos.clone().sub(verts[0].pos);
        if (ab.cross(ac).lengthSq() > 1e-13) {
          var poly = new Polygon(verts);
          if (poly.valid) polygons.push(poly);
        }
      }
    });

    return new CSG(polygons);
  };

  // toMesh outputs geometry ALREADY in local space (relative to `matrix`)
  CSG.toMesh = function(csg, matrix, material) {
    // 🔥 FIX: Separate lines — safe for Three.js r128
    var inv = new THREE.Matrix4();
    inv.copy(matrix).invert();
    var positions = [], normals = [], uvs = [];
    csg.polygons.forEach(function(p) {
      var vv = p.vertices;
      for (var i = 2; i < vv.length; i++) {
        [vv[0], vv[i-1], vv[i]].forEach(function(v) {
          var lp = v.pos.clone().applyMatrix4(inv);
          positions.push(lp.x, lp.y, lp.z);
          var ln = v.normal.clone().transformDirection(inv);
          if (ln.lengthSq() > 0) ln.normalize();
          normals.push(ln.x, ln.y, ln.z);
          uvs.push(v.uv.x, v.uv.y);
        });
      }
    });
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('normal',   new THREE.Float32BufferAttribute(normals,   3));
    g.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs,       2));
    return new THREE.Mesh(g, material);
  };

  CSG.prototype.subtract = function(csg) {
    var a = new Node(this.polygons.map(function(p){ return p.clone(); }));
    var b = new Node(csg.polygons.map(function(p){ return p.clone(); }));
    a.invert(); a.clipTo(b); b.clipTo(a); b.invert(); b.clipTo(a); b.invert();
    a.build(b.allPolygons()); a.invert();
    return new CSG(a.allPolygons());
  };

  return CSG;
})(THREE);