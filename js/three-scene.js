/* ============================================================
   AlcalSpark — Three.js 3D Scenes
   Hero : monogramme AS doré | Services : icônes | About : sphère
   ============================================================ */

(function () {
  'use strict';

  const GOLD   = 0xC9A84C;
  const GOLD_L = 0xE8C97A;
  const WHITE  = 0xF8F5F2;

  /* ── Hero — Monogramme AS ──────────────────────────────────── */
  function initHeroScene() {
    // Desktop uniquement
    if (window.innerWidth < 1024) return;

    const canvas = document.getElementById('hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;

    /* ── Scène & caméra ── */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100);
    camera.position.set(0, 0, 5.5);

    /* ── Éclairage ── */
    // Ambient
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // Directionnel frontal
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(0, 0, 5);
    scene.add(dirLight);

    // Point doré côté droit
    const goldPoint = new THREE.PointLight(0xC9A84C, 0.8, 20);
    goldPoint.position.set(3, 1, 2);
    scene.add(goldPoint);

    // Rimlight bleu derrière (séparation)
    const rimLight = new THREE.PointLight(0x4466ff, 0.4, 20);
    rimLight.position.set(-2, -1, -4);
    scene.add(rimLight);

    /* ── Matériau or commun ── */
    const goldMat = new THREE.MeshStandardMaterial({
      color:              0xC9A84C,
      metalness:          1.0,
      roughness:          0.18,
      emissive:           0x3D2800,
      emissiveIntensity:  0.25,
    });

    /* ── Groupe principal ── */
    const group = new THREE.Group();
    scene.add(group);

    /* ── Cercle torus ── */
    group.add(new THREE.Mesh(
      new THREE.TorusGeometry(1.72, 0.058, 20, 120),
      goldMat
    ));

    /* ── Lettres AS via THREE.Font + THREE.ExtrudeGeometry ──
       THREE.Font et THREE.ExtrudeGeometry sont dans le core r128.
       On charge le JSON de police depuis jsDelivr (CORS OK).
    ── */
    fetch('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_bold.typeface.json')
      .then(function (res) { return res.json(); })
      .then(function (fontData) {
        if (typeof THREE.Font === 'undefined') return;

        const font = new THREE.Font(fontData);

        const extrudeOpts = {
          depth:          0.22,
          bevelEnabled:   true,
          bevelThickness: 0.025,
          bevelSize:      0.012,
          bevelSegments:  6,
          curveSegments:  14,
        };

        /* Geometry "A" */
        const shapesA = font.generateShapes('A', 0.85);
        const geoA    = new THREE.ExtrudeGeometry(shapesA, extrudeOpts);
        geoA.computeBoundingBox();
        const bbA = geoA.boundingBox;
        const wA  = bbA.max.x - bbA.min.x;
        const hA  = bbA.max.y - bbA.min.y;
        const dA  = bbA.max.z - bbA.min.z;

        /* Geometry "S" */
        const shapesS = font.generateShapes('S', 0.85);
        const geoS    = new THREE.ExtrudeGeometry(shapesS, extrudeOpts);
        geoS.computeBoundingBox();
        const bbS = geoS.boundingBox;
        const wS  = bbS.max.x - bbS.min.x;
        const hS  = bbS.max.y - bbS.min.y;

        /* Centrage horizontal : "A" à gauche, "S" à droite */
        const gap    = 0.10;
        const totalW = wA + gap + wS;

        // A : bord gauche à -totalW/2
        geoA.translate(
          -bbA.min.x - totalW / 2,
          -(bbA.min.y + hA / 2),
          -(bbA.min.z + dA / 2)
        );

        // S : bord gauche à (-totalW/2 + wA + gap)
        geoS.translate(
          -bbS.min.x - totalW / 2 + wA + gap,
          -(bbS.min.y + hS / 2),
          -(bbS.min.z + dA / 2)
        );

        group.add(new THREE.Mesh(geoA, goldMat));
        group.add(new THREE.Mesh(geoS, goldMat));
      })
      .catch(function () { /* dégradé gracieux — le torus tourne quand même */ });

    /* ── Hover : accélération de rotation ── */
    let isHovering = false;
    let rotSpeed   = 0.006;
    const heroEl   = document.getElementById('hero') || canvas.parentElement;
    if (heroEl) {
      heroEl.addEventListener('mouseenter', function () { isHovering = true;  });
      heroEl.addEventListener('mouseleave', function () { isHovering = false; });
    }

    /* ── Resize ── */
    window.addEventListener('resize', function () {
      if (window.innerWidth < 1024) return;
      var w = canvas.offsetWidth, h = canvas.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    /* ── Boucle d'animation ── */
    var t = 0;
    (function animate() {
      requestAnimationFrame(animate);
      t += 0.01;

      // Interpolation douce de la vitesse (normal ↔ hover)
      var target = isHovering ? 0.022 : 0.006;
      rotSpeed  += (target - rotSpeed) * 0.06;

      group.rotation.y += rotSpeed;
      group.rotation.x  = Math.sin(t * 0.5) * 0.12;   // oscillation flottante

      renderer.render(scene, camera);
    }());
  }

  /* ── Services 3D floating icons ─────────────────────────── */
  function initServicesScene() {
    const canvas = document.getElementById('services-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100);
    camera.position.z = 6;

    const shapes = [];
    const geos   = [
      new THREE.TorusGeometry(0.5, 0.12, 12, 50),
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.TetrahedronGeometry(0.6, 0),
      new THREE.TorusKnotGeometry(0.35, 0.1, 80, 12),
      new THREE.DodecahedronGeometry(0.5, 0),
    ];

    geos.forEach(function (geo, i) {
      const mat = new THREE.MeshPhongMaterial({
        color:       GOLD,
        emissive:    0x0a1810,
        shininess:   100,
        wireframe:   i % 2 === 0,
        transparent: true,
        opacity:     0.6,
      });
      const mesh  = new THREE.Mesh(geo, mat);
      const angle = (i / geos.length) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 2.5, Math.sin(angle) * 1.5, 0);
      mesh.userData = { baseY: mesh.position.y, speed: 0.3 + i * 0.1, phase: angle };
      scene.add(mesh);
      shapes.push(mesh);
    });

    const ambLight = new THREE.AmbientLight(WHITE, 0.5);
    const pLight   = new THREE.PointLight(GOLD, 2, 15);
    pLight.position.set(0, 0, 4);
    scene.add(ambLight, pLight);

    window.addEventListener('resize', function () {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    var t = 0;
    (function animate() {
      requestAnimationFrame(animate);
      t += 0.01;
      shapes.forEach(function (m) {
        m.rotation.x += 0.008;
        m.rotation.y += 0.012;
        m.position.y  = m.userData.baseY + Math.sin(t * m.userData.speed + m.userData.phase) * 0.2;
      });
      renderer.render(scene, camera);
    }());
  }

  /* ── About 3D sphere ─────────────────────────────────────── */
  function initAboutScene() {
    const canvas = document.getElementById('about-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100);
    camera.position.z = 4;

    const sphereGeo = new THREE.SphereGeometry(1.4, 32, 32);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x0a1510, emissive: 0x0a1510,
      shininess: 30, transparent: true, opacity: 0.7,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    const wireGeo = new THREE.SphereGeometry(1.45, 18, 18);
    const wireMat = new THREE.MeshBasicMaterial({ color: GOLD, wireframe: true, transparent: true, opacity: 0.25 });
    const wire    = new THREE.Mesh(wireGeo, wireMat);
    scene.add(wire);

    const ringGeo = new THREE.TorusGeometry(1.8, 0.015, 8, 80);
    const ringMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.4 });
    const ring    = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2.5;
    scene.add(ring);

    const ring2 = ring.clone();
    ring2.rotation.x = Math.PI / 1.8;
    ring2.rotation.z = Math.PI / 4;
    ring2.material   = ringMat.clone();
    ring2.material.opacity = 0.2;
    scene.add(ring2);

    scene.add(new THREE.AmbientLight(WHITE, 0.3));
    const pLight = new THREE.PointLight(GOLD, 3, 10);
    pLight.position.set(2, 1, 3);
    scene.add(pLight);

    let mX = 0, mY = 0;
    document.addEventListener('mousemove', function (e) {
      mX = (e.clientX / window.innerWidth  - 0.5) * 2;
      mY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    window.addEventListener('resize', function () {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });

    var t = 0;
    (function animate() {
      requestAnimationFrame(animate);
      t += 0.006;
      sphere.rotation.y = t * 0.3 + mX * 0.4;
      sphere.rotation.x = mY * 0.25;
      wire.rotation.y   = -t * 0.2;
      ring.rotation.y   =  t * 0.5;
      ring2.rotation.y  = -t * 0.35;
      renderer.render(scene, camera);
    }());
  }

  /* ── Bootstrap ───────────────────────────────────────────── */
  function init() {
    initHeroScene();
    initServicesScene();
    initAboutScene();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
