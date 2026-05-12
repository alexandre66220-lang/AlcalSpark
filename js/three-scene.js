/* ============================================================
   AlcalSpark — Three.js 3D Scenes
   Hero particles + rotating 3D objects
   ============================================================ */

(function () {
  'use strict';

  const GOLD    = 0xC9A84C;
  const GOLD_L  = 0xE8C97A;
  const WHITE   = 0xFAF8F5;
  const BROWN   = 0x7C5A3E;

  /* ── Hero Particle Field ─────────────────────────────────── */
  function initHeroScene() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.offsetWidth / canvas.offsetHeight, 0.1, 1000);
    camera.position.z = 5;

    // Particles
    const COUNT = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    const sizes     = new Float32Array(COUNT);

    const cGold  = new THREE.Color(GOLD);
    const cGoldL = new THREE.Color(GOLD_L);
    const cWhite = new THREE.Color(WHITE);

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const mix = Math.random();
      const col = mix < 0.5 ? cGold.clone().lerp(cGoldL, Math.random())
                             : cGold.clone().lerp(cWhite, Math.random() * 0.3);
      colors[i * 3]     = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = Math.random() * 2.5 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
    geometry.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime:    { value: 0 },
        uTexture: { value: createParticleTexture() },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uTime;
        void main() {
          vColor = color;
          vec3 pos = position;
          pos.y += sin(uTime * 0.4 + position.x * 0.5) * 0.08;
          pos.x += cos(uTime * 0.3 + position.z * 0.5) * 0.06;
          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform sampler2D uTexture;
        void main() {
          vec4 tex = texture2D(uTexture, gl_PointCoord);
          if (tex.a < 0.05) discard;
          gl_FragColor = vec4(vColor, tex.a * 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Central 3D object — icosahedron wireframe
    const icoGeo = new THREE.IcosahedronGeometry(1.2, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: GOLD,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const ico = new THREE.Mesh(icoGeo, icoMat);
    scene.add(ico);

    // Inner solid icosahedron
    const innerGeo = new THREE.IcosahedronGeometry(0.85, 0);
    const innerMat = new THREE.MeshPhongMaterial({
      color: GOLD,
      emissive: 0x3A2800,
      shininess: 80,
      transparent: true,
      opacity: 0.18,
      wireframe: false,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    scene.add(inner);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(GOLD, 1.5, 10);
    pointLight.position.set(2, 2, 2);
    scene.add(pointLight);

    // Mouse influence
    let mX = 0, mY = 0;
    document.addEventListener('mousemove', e => {
      mX = (e.clientX / window.innerWidth  - 0.5) * 2;
      mY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Resize
    const onResize = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animate
    let t = 0;
    function animate() {
      requestAnimationFrame(animate);
      t += 0.008;
      material.uniforms.uTime.value = t;

      particles.rotation.y  = t * 0.04 + mX * 0.15;
      particles.rotation.x  = mY * 0.1;
      ico.rotation.y        = t * 0.25 + mX * 0.3;
      ico.rotation.x        = t * 0.15 + mY * 0.2;
      inner.rotation.y      = -t * 0.35;
      inner.rotation.z      = t * 0.2;

      renderer.render(scene, camera);
    }
    animate();
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

    geos.forEach((geo, i) => {
      const mat = new THREE.MeshPhongMaterial({
        color: GOLD,
        emissive: 0x2A1800,
        shininess: 100,
        wireframe: i % 2 === 0,
        transparent: true,
        opacity: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const angle = (i / geos.length) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 2.5, Math.sin(angle) * 1.5, 0);
      mesh.userData = { baseX: mesh.position.x, baseY: mesh.position.y, speed: 0.3 + i * 0.1, phase: angle };
      scene.add(mesh);
      shapes.push(mesh);
    });

    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    const pLight   = new THREE.PointLight(GOLD, 2, 15);
    pLight.position.set(0, 0, 4);
    scene.add(ambLight, pLight);

    const onResize = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let t = 0;
    function animate() {
      requestAnimationFrame(animate);
      t += 0.01;
      shapes.forEach(m => {
        m.rotation.x += 0.008;
        m.rotation.y += 0.012;
        m.position.y = m.userData.baseY + Math.sin(t * m.userData.speed + m.userData.phase) * 0.2;
      });
      renderer.render(scene, camera);
    }
    animate();
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

    // Sphere with wireframe overlay
    const sphereGeo = new THREE.SphereGeometry(1.4, 32, 32);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x1a0e00,
      emissive: 0x1a0e00,
      shininess: 30,
      transparent: true,
      opacity: 0.7,
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
    ring2.material = ringMat.clone();
    ring2.material.opacity = 0.2;
    scene.add(ring2);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.3);
    const pLight   = new THREE.PointLight(GOLD, 3, 10);
    pLight.position.set(2, 1, 3);
    scene.add(ambLight, pLight);

    let mX = 0, mY = 0;
    document.addEventListener('mousemove', e => {
      mX = (e.clientX / window.innerWidth  - 0.5) * 2;
      mY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    const onResize = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let t = 0;
    function animate() {
      requestAnimationFrame(animate);
      t += 0.006;
      sphere.rotation.y = t * 0.3 + mX * 0.4;
      sphere.rotation.x = mY * 0.25;
      wire.rotation.y   = -t * 0.2;
      ring.rotation.y   = t * 0.5;
      ring2.rotation.y  = -t * 0.35;
      renderer.render(scene, camera);
    }
    animate();
  }

  /* ── Particle texture helper ─────────────────────────────── */
  function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0,   'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    grad.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
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
})();
