/* ─────────────────────────────────────────────────────────────
   Hero "robotic eye" — Three.js scene.

   Loaded only on desktop, only after initial render, by
   js/hero-eye-loader.js (see that file for the gating rules).
   Adapted from a standalone reference demo: fullscreen -> scoped to
   the .hero-blobs container, debug UI stripped, HUD repositioned,
   and refactored into separated setup/update functions instead of
   one monolithic animate() loop, so a future AI-chat integration
   can drive `EyeScene.setState(...)` without touching the render
   internals.

   Structure:
     - CONFIG / palette constants
     - state object (time, pointer, glitch envelopes, public mode)
     - buildXxx()  — one-time scene-graph construction functions
     - updateXxx(dt) — per-frame update functions, called from animate()
     - lifecycle: init(), animate(), resize(), teardown-on-error
───────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  if (typeof THREE === 'undefined') return;

  var zone = document.querySelector('.hero-blobs');
  var blobCanvas = document.getElementById('blobs-canvas');
  if (!zone) return;

  /* ── Palette ───────────────────────────────────────────────
     Two options to compare: current neon cyan, and a variant
     pulled toward the brand's forest green. Flip PALETTE below
     (or set data-palette="forest" on .hero-blobs) to switch. */
  var PALETTES = {
    cyan:   { neon: 0x39ffc4, dim: 0x1a8f6e, glitch: 0xff2ec4, css: '' },
    forest: { neon: 0x6fae8c, dim: 0x385144, glitch: 0xc9a227, css: 'forest' }
  };
  var PALETTE = PALETTES.cyan;

  var CONFIG = {
    particleCount: 1200,
    tickCount: 28,
    ringRadius: 2.6,
    eqBars: 32,
    softGlitchEvery: [3, 6],   // seconds, randomized range
    hardGlitchEvery: [7, 14]
  };

  /* ── State ─────────────────────────────────────────────────
     `mode` is driven by js/hero-chat.js via window.AlcalEye.setState()
     (idle | listening | thinking | speaking). The update* functions
     below branch on it directly -- no separate animation path per
     mode, just small modifiers layered onto the existing motion. */
  var state = {
    mode: 'idle',
    running: false,
    visible: true,
    time: 0,
    lastTs: 0,
    pointer: { x: 0, y: 0, tx: 0, ty: 0 },
    soft: { phase: 0, env: 0, next: 3 },
    hard: { phase: 0, env: 0, next: 8 },
    speak: { energy: 0 }, // bumped by AlcalEye.pulse() on each streamed token, decays each frame
    bolts: []
  };

  var rand = Math.random;
  function randRange(a, b) { return a + rand() * (b - a); }

  /* ── DOM scaffold ──────────────────────────────────────────
     Everything the scene needs is created here and scoped inside
     .hero-blobs -- nothing is hardcoded into the page markup, so
     mobile ships zero extra DOM/CSS for this feature. */
  var root, canvasEl, eqBarEls = [], readoutEl;

  function buildDom() {
    root = document.createElement('div');
    root.className = 'hero-eye-root';
    if (PALETTE.css) root.setAttribute('data-palette', PALETTE.css);

    canvasEl = document.createElement('canvas');
    canvasEl.className = 'hero-eye-canvas';
    root.appendChild(canvasEl);

    var hud = document.createElement('div');
    hud.className = 'hero-eye-hud';

    ['tl', 'tr', 'bl', 'br'].forEach(function (pos) {
      var c = document.createElement('div');
      c.className = 'hero-eye-corner hero-eye-corner--' + pos;
      hud.appendChild(c);
    });

    readoutEl = document.createElement('div');
    readoutEl.className = 'hero-eye-readout';
    readoutEl.textContent = '0x0000';
    hud.appendChild(readoutEl);

    var eq = document.createElement('div');
    eq.className = 'hero-eye-eq';
    for (var i = 0; i < CONFIG.eqBars; i++) {
      var bar = document.createElement('div');
      bar.className = 'bar';
      eq.appendChild(bar);
      eqBarEls.push({ el: bar, seed: rand() * 100, speed: randRange(0.6, 1.6) });
    }
    hud.appendChild(eq);

    root.appendChild(hud);
    zone.appendChild(root);
  }

  /* ── Three.js core objects ────────────────────────────────── */
  var renderer, scene, camera, clock;
  var sceneTarget, postScene, postCamera, postMaterial;
  var core, eyeGroup, pupil, pupilRing, lids = {}, ringA, ringB;
  var ticks = [], pulses = [];
  var particles, particleMat;
  var gridMesh, gridMat, sweepMesh, sweepMat;
  var width = 0, height = 0;

  function buildRenderer() {
    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  }

  function buildScene() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070a, 0.06);
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.3, 5.8);
    camera.lookAt(0, 0, 0);
    clock = new THREE.Clock();
  }

  function buildFloor() {
    var geo = new THREE.PlaneGeometry(14, 14, 1, 1);
    gridMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(PALETTE.dim) }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = uv;',
        '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime;',
        'uniform vec3 uColor;',
        'varying vec2 vUv;',
        'float gridLine(vec2 p, float n) {',
        '  vec2 g = abs(fract(p * n - 0.5) - 0.5) / fwidth(p * n);',
        '  return 1.0 - min(min(g.x, g.y), 1.0);',
        '}',
        'void main() {',
        '  vec2 c = vUv - 0.5;',
        '  float d = length(c);',
        '  float line = gridLine(vUv, 22.0);',
        '  float pulse = 0.5 + 0.5 * sin(uTime * 0.6 - d * 6.0);',
        '  float fade = smoothstep(0.75, 0.05, d);',
        '  gl_FragColor = vec4(uColor, line * fade * (0.25 + 0.5 * pulse));',
        '}'
      ].join('\n')
    });
    gridMesh = new THREE.Mesh(geo, gridMat);
    gridMesh.rotation.x = -Math.PI / 2;
    gridMesh.position.y = -1.15;
    scene.add(gridMesh);

    sweepMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uAngle: { value: 0 },
        uColor: { value: new THREE.Color(PALETTE.neon) }
      },
      vertexShader: gridMat.vertexShader,
      fragmentShader: [
        'uniform float uAngle;',
        'uniform vec3 uColor;',
        'varying vec2 vUv;',
        'void main() {',
        '  vec2 c = vUv - 0.5;',
        '  float d = length(c);',
        '  float ang = atan(c.y, c.x);',
        '  float diff = mod(ang - uAngle + 3.14159265, 6.2831853) - 3.14159265;',
        '  float sweep = smoothstep(0.9, 0.0, abs(diff)) * smoothstep(0.7, 0.0, d);',
        '  gl_FragColor = vec4(uColor, sweep * 0.5);',
        '}'
      ].join('\n')
    });
    sweepMesh = new THREE.Mesh(geo.clone(), sweepMat);
    sweepMesh.rotation.x = -Math.PI / 2;
    sweepMesh.position.y = -1.14;
    scene.add(sweepMesh);
  }

  function buildTicks() {
    var geo = new THREE.BoxGeometry(0.04, 0.12, 0.04);
    for (var i = 0; i < CONFIG.tickCount; i++) {
      var angle = (i / CONFIG.tickCount) * Math.PI * 2;
      var mat = new THREE.MeshBasicMaterial({ color: PALETTE.dim, transparent: true, opacity: 0.5 });
      var m = new THREE.Mesh(geo, mat);
      m.position.set(Math.cos(angle) * CONFIG.ringRadius, -1.1, Math.sin(angle) * CONFIG.ringRadius);
      m.lookAt(0, -1.1, 0);
      m.userData.angle = angle;
      scene.add(m);
      ticks.push(m);
    }
  }

  function buildCore() {
    var icoGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.15, 1));
    core = new THREE.LineSegments(icoGeo, new THREE.LineBasicMaterial({ color: PALETTE.neon, transparent: true, opacity: 0.35 }));
    scene.add(core);
  }

  function makeRingLoop(radius, segments, color, opacity) {
    var pts = [];
    for (var i = 0; i <= segments; i++) {
      var a = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
    }
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity });
    return new THREE.LineLoop(geo, mat);
  }

  function buildEye() {
    eyeGroup = new THREE.Group();

    [0.5, 0.72, 0.95].forEach(function (r, i) {
      eyeGroup.add(makeRingLoop(r, 64, PALETTE.neon, 0.55 - i * 0.1));
    });

    var spokePts = [];
    var spokeCount = 16;
    for (var i = 0; i < spokeCount; i++) {
      var a = (i / spokeCount) * Math.PI * 2;
      spokePts.push(new THREE.Vector3(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0));
      spokePts.push(new THREE.Vector3(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0));
    }
    var spokeGeo = new THREE.BufferGeometry().setFromPoints(spokePts);
    eyeGroup.add(new THREE.LineSegments(spokeGeo, new THREE.LineBasicMaterial({ color: PALETTE.dim, transparent: true, opacity: 0.4 })));

    pupil = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 })
    );
    pupil.position.z = 0.02;
    eyeGroup.add(pupil);

    pupilRing = makeRingLoop(0.16, 32, PALETTE.neon, 0.8);
    pupilRing.position.z = 0.02;
    eyeGroup.add(pupilRing);

    lids.top = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), new THREE.MeshBasicMaterial({ color: 0x05070a }));
    lids.top.position.set(0, 1.9, 0.03);
    lids.bottom = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.3), new THREE.MeshBasicMaterial({ color: 0x05070a }));
    lids.bottom.position.set(0, -1.9, 0.03);
    eyeGroup.add(lids.top, lids.bottom);

    scene.add(eyeGroup);

    ringA = makeRingLoop(1.5, 48, PALETTE.dim, 0.3);
    ringA.rotation.x = Math.PI / 2.6;
    ringB = makeRingLoop(1.7, 48, PALETTE.dim, 0.22);
    ringB.rotation.x = -Math.PI / 3.1;
    scene.add(ringA, ringB);

    for (var p = 0; p < 4; p++) {
      var ring = makeRingLoop(1, 48, PALETTE.neon, 0);
      ring.userData.offset = p / 4;
      scene.add(ring);
      pulses.push(ring);
    }
  }

  function buildParticles() {
    var n = CONFIG.particleCount;
    var geo = new THREE.BufferGeometry();
    var seed = new Float32Array(n * 3); // radius, angle, height
    var speed = new Float32Array(n);
    var pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      seed[i * 3] = randRange(1.6, 3.4);
      seed[i * 3 + 1] = rand() * Math.PI * 2;
      seed[i * 3 + 2] = randRange(-1.4, 1.6);
      speed[i] = randRange(0.05, 0.25);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));

    particleMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uBurst: { value: 0 },
        uColor: { value: new THREE.Color(PALETTE.neon) }
      },
      vertexShader: [
        'attribute vec3 aSeed;',
        'attribute float aSpeed;',
        'uniform float uTime;',
        'uniform float uBurst;',
        'void main() {',
        '  float radius = aSeed.x + uBurst * 1.2;',
        '  float angle = aSeed.y + uTime * aSpeed;',
        '  float y = aSeed.z + sin(uTime * aSpeed + aSeed.y) * 0.15;',
        '  vec3 p = vec3(cos(angle) * radius, y, sin(angle) * radius);',
        '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '  gl_Position = projectionMatrix * mv;',
        '  gl_PointSize = 22.0 / -mv.z;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform vec3 uColor;',
        'void main() {',
        '  vec2 c = gl_PointCoord - 0.5;',
        '  float d = length(c);',
        '  float a = smoothstep(0.5, 0.0, d);',
        '  gl_FragColor = vec4(uColor, a * 0.5);',
        '}'
      ].join('\n')
    });
    particles = new THREE.Points(geo, particleMat);
    scene.add(particles);
  }

  /* ── Post-processing (bloom-ish / glitch / vignette) ─────────
     Render the scene to a target, then run one fullscreen pass
     that adds the stylised look on top. */
  function buildPost() {
    sceneTarget = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    postScene = new THREE.Scene();
    postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: sceneTarget.texture },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uSoft: { value: 0 },
        uHard: { value: 0 },
        uGlitchColor: { value: new THREE.Color(PALETTE.glitch) }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D tScene;',
        'uniform vec2 uResolution;',
        'uniform float uTime;',
        'uniform float uSoft;',
        'uniform float uHard;',
        'uniform vec3 uGlitchColor;',
        'varying vec2 vUv;',
        'float noise(vec2 p) { return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }',
        'void main() {',
        '  vec2 uv = vUv;',
        // soft glitch: banded horizontal jitter
        '  float band = floor(uv.y * 40.0);',
        '  float jitter = (noise(vec2(band, floor(uTime * 12.0))) - 0.5) * 0.02 * uSoft;',
        '  uv.x += jitter;',
        // hard glitch: chromatic split + block noise
        '  float split = 0.01 * uHard;',
        '  vec4 col;',
        '  col.r = texture2D(tScene, uv + vec2(split, 0.0)).r;',
        '  col.g = texture2D(tScene, uv).g;',
        '  col.b = texture2D(tScene, uv - vec2(split, 0.0)).b;',
        '  col.a = 1.0;',
        '  float blockN = step(0.985, noise(floor(uv * vec2(24.0, 14.0)) + floor(uTime * 20.0)));',
        '  col.rgb = mix(col.rgb, uGlitchColor, blockN * uHard * 0.6);',
        // crude bloom: a few offset taps added back additively
        '  vec2 texel = 1.0 / uResolution;',
        '  vec3 bloom = vec3(0.0);',
        '  bloom += texture2D(tScene, uv + texel * vec2(1.5, 0.0)).rgb;',
        '  bloom += texture2D(tScene, uv - texel * vec2(1.5, 0.0)).rgb;',
        '  bloom += texture2D(tScene, uv + texel * vec2(0.0, 1.5)).rgb;',
        '  bloom += texture2D(tScene, uv - texel * vec2(0.0, 1.5)).rgb;',
        '  col.rgb += bloom * 0.06;',
        // scanlines + vignette + grain
        '  float scan = 0.94 + 0.06 * sin(uv.y * uResolution.y * 1.5);',
        '  col.rgb *= scan;',
        '  float vig = smoothstep(0.9, 0.25, length(uv - 0.5));',
        '  col.rgb *= mix(0.55, 1.0, vig);',
        '  col.rgb += (noise(uv * uResolution + uTime) - 0.5) * 0.03;',
        // simple tonemap
        '  col.rgb = col.rgb / (col.rgb + vec3(1.0));',
        '  gl_FragColor = col;',
        '}'
      ].join('\n')
    });

    var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
    postScene.add(quad);
  }

  /* ── Lightning bolts ───────────────────────────────────────── */
  function spawnBolt() {
    if (!ticks.length) return;
    var target = ticks[Math.floor(rand() * ticks.length)].position;
    var start = new THREE.Vector3(0, 0, 0);
    var segments = 6;
    var pts = [];
    for (var i = 0; i <= segments; i++) {
      var t = i / segments;
      var p = start.clone().lerp(target, t);
      if (i > 0 && i < segments) {
        p.x += randRange(-0.15, 0.15);
        p.y += randRange(-0.15, 0.15);
        p.z += randRange(-0.15, 0.15);
      }
      pts.push(p);
    }
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var mat = new THREE.LineBasicMaterial({ color: PALETTE.glitch, transparent: true, opacity: 0.9 });
    var line = new THREE.Line(geo, mat);
    scene.add(line);
    state.bolts.push({ line: line, born: state.time, duration: 0.22 });
  }

  function updateBolts() {
    for (var i = state.bolts.length - 1; i >= 0; i--) {
      var b = state.bolts[i];
      var age = state.time - b.born;
      if (age >= b.duration) {
        scene.remove(b.line);
        b.line.geometry.dispose();
        b.line.material.dispose();
        state.bolts.splice(i, 1);
        continue;
      }
      b.line.material.opacity = 0.9 * (1 - age / b.duration);
    }
  }

  /* ── Pointer tracking (container-relative, not window) ───────── */
  function setPointerFromEvent(clientX, clientY) {
    var rect = zone.getBoundingClientRect();
    state.pointer.tx = ((clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.ty = -(((clientY - rect.top) / rect.height) * 2 - 1);
  }

  function onPointerMove(e) { setPointerFromEvent(e.clientX, e.clientY); }
  function onTouchMove(e) {
    if (!e.touches || !e.touches.length) return;
    setPointerFromEvent(e.touches[0].clientX, e.touches[0].clientY);
  }

  /* ── Per-frame update functions ───────────────────────────── */
  function updatePointer(dt) {
    var lerp = 1 - Math.pow(0.001, dt);
    state.pointer.x += (state.pointer.tx - state.pointer.x) * lerp;
    state.pointer.y += (state.pointer.ty - state.pointer.y) * lerp;
  }

  function updateGlitchEnvelopes(dt) {
    // "thinking" reuses the exact same soft/hard glitch cycle, just fed
    // a faster clock -- a nervous, accelerated version of the idle tic
    // rather than a separate effect.
    var glitchDt = state.mode === 'thinking' ? dt * 5 : dt;

    state.soft.phase += glitchDt;
    if (state.soft.phase > state.soft.next) {
      state.soft.phase = 0;
      state.soft.next = randRange(CONFIG.softGlitchEvery[0], CONFIG.softGlitchEvery[1]);
      state.soft.env = 1;
    }
    state.soft.env *= Math.pow(0.001, dt); // fast decay

    state.hard.phase += glitchDt;
    if (state.hard.phase > state.hard.next) {
      state.hard.phase = 0;
      state.hard.next = randRange(CONFIG.hardGlitchEvery[0], CONFIG.hardGlitchEvery[1]);
      state.hard.env = 1;
      spawnBolt();
    }
    state.hard.env *= Math.pow(0.0005, dt);

    state.speak.energy *= Math.pow(0.02, dt); // per-token kick, decays fast between tokens
  }

  function updateCore() {
    var spinBoost = state.mode === 'listening' ? 1.8 : state.mode === 'thinking' ? 1.4 : 1;
    core.rotation.y += 0.15 * (1 / 60) * spinBoost;
    core.rotation.x = Math.sin(state.time * 0.2) * 0.15;

    // Each streamed token kicks the core outward briefly -- a pulse
    // synced to token arrival instead of a plain idle loop.
    var kick = state.mode === 'speaking' ? state.speak.energy * 0.12 : 0;
    core.scale.setScalar(1 + kick);
  }

  function updateEye() {
    // Listening: the pupil tracks the cursor/typing focus more sharply,
    // as if paying closer attention.
    var trackLerp = state.mode === 'listening' ? 0.22 : 0.1;
    var maxOffset = 0.22;
    var targetX = state.pointer.x * maxOffset;
    var targetY = state.pointer.y * maxOffset;
    pupil.position.x += (targetX - pupil.position.x) * trackLerp;
    pupil.position.y += (targetY - pupil.position.y) * trackLerp;
    pupilRing.position.x = pupil.position.x;
    pupilRing.position.y = pupil.position.y;

    var speakScale = state.mode === 'speaking' ? 1 + state.speak.energy * 0.25 : 1;
    pupilRing.scale.setScalar(speakScale);

    eyeGroup.rotation.y = state.pointer.x * 0.12;
    eyeGroup.rotation.x = -state.pointer.y * 0.1;

    var blink = state.hard.env > 0.6 ? 1 : 0;
    var lidY = blink ? 0 : 1.9;
    lids.top.position.y += (lidY - lids.top.position.y) * 0.4;
    lids.bottom.position.y += (-lidY - lids.bottom.position.y) * 0.4;

    ringA.rotation.z += 0.003;
    ringB.rotation.z -= 0.0022;
    var glitchScale = 1 + state.hard.env * 0.08;
    ringA.scale.setScalar(glitchScale);
    ringB.scale.setScalar(glitchScale);
  }

  function updateRadar(dt) {
    sweepMat.uniforms.uAngle.value += dt * 0.8;
    gridMat.uniforms.uTime.value = state.time;

    ticks.forEach(function (tick) {
      var diff = Math.atan2(Math.sin(tick.userData.angle - sweepMat.uniforms.uAngle.value), Math.cos(tick.userData.angle - sweepMat.uniforms.uAngle.value));
      var hit = Math.max(0, 1 - Math.abs(diff) / 0.5);
      var base = 0.5 + hit * 0.5 + state.hard.env * 0.3;
      tick.material.opacity = Math.min(1, base);
      tick.material.color.set(state.hard.env > 0.5 ? PALETTE.glitch : PALETTE.neon);
    });
  }

  function updatePulses(dt) {
    pulses.forEach(function (ring, i) {
      var cycle = 2.4;
      var local = ((state.time / cycle) + ring.userData.offset) % 1;
      ring.scale.setScalar(0.4 + local * 1.6);
      ring.material.opacity = (1 - local) * 0.35;
      ring.lookAt(camera.position);
    });
  }

  function updateParticles() {
    particleMat.uniforms.uTime.value = state.time;
    particleMat.uniforms.uBurst.value += ((state.hard.env > 0.4 ? 1 : 0) - particleMat.uniforms.uBurst.value) * 0.1;
  }

  function updateHud() {
    var t = Math.floor(state.time * 1000) % 65536;
    readoutEl.textContent = '0x' + t.toString(16).toUpperCase().padStart(4, '0');

    eqBarEls.forEach(function (bar) {
      var v = 0.15 + Math.abs(Math.sin(state.time * bar.speed + bar.seed)) * 0.85;
      bar.el.style.height = Math.round(v * 100) + '%';
    });
  }

  function updatePost() {
    postMaterial.uniforms.uTime.value = state.time;
    postMaterial.uniforms.uSoft.value = state.soft.env;
    postMaterial.uniforms.uHard.value = state.hard.env;
  }

  function renderFrame() {
    renderer.setRenderTarget(sceneTarget);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
  }

  /* ── Sizing (container-relative, not window) ─────────────── */
  function resize() {
    width = Math.max(1, zone.clientWidth);
    height = Math.max(1, zone.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    sceneTarget.setSize(width, height);
    postMaterial.uniforms.uResolution.value.set(width, height);
  }

  /* ── Visibility / perf gating (mirrors js/blob-hero.js) ──── */
  var rafId = null;

  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    var dt = state.lastTs ? Math.min(0.1, (ts - state.lastTs) / 1000) : 0;
    state.lastTs = ts;
    state.time += dt;

    updatePointer(dt);
    updateGlitchEnvelopes(dt);
    updateCore(dt);
    updateEye(dt);
    updateRadar(dt);
    updatePulses(dt);
    updateBolts();
    updateParticles();
    updateHud();
    updatePost();
    renderFrame();
  }

  function playIfAllowed() {
    if (rafId !== null || !state.visible || document.hidden) return;
    state.lastTs = 0;
    rafId = requestAnimationFrame(loop);
  }

  function pauseRender() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function bindLifecycle() {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pauseRender(); else playIfAllowed();
    });

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          state.visible = entry.isIntersecting;
          if (state.visible) playIfAllowed(); else pauseRender();
        });
      }, { rootMargin: '80px' });
      io.observe(zone);
    }

    var ro;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(function () { resize(); });
      ro.observe(zone);
    } else {
      window.addEventListener('resize', resize);
    }

    zone.addEventListener('mousemove', onPointerMove);
    zone.addEventListener('touchmove', onTouchMove, { passive: true });
  }

  /* ── Public hook for js/hero-chat.js ──────────────────────
     States: idle | listening | thinking | speaking -- read by
     updateCore/updateEye/updateGlitchEnvelopes above. pulse() is
     called once per streamed token to drive the "speaking" core kick. */
  window.AlcalEye = {
    setState: function (mode) {
      if (['idle', 'listening', 'thinking', 'speaking'].indexOf(mode) !== -1) {
        state.mode = mode;
      }
    },
    getState: function () { return state.mode; },
    pulse: function () { state.speak.energy = 1; }
  };

  /* ── Init ──────────────────────────────────────────────────
     Everything is built inside one try/catch: if anything here
     throws (WebGL context loss, shader compile failure, etc.) we
     log to the console only, tear down whatever DOM we added, and
     leave the existing CSS blob canvas exactly as it was. */
  function init() {
    buildDom();
    buildRenderer();
    buildScene();
    buildFloor();
    buildTicks();
    buildCore();
    buildEye();
    buildParticles();
    buildPost();
    resize();
    renderFrame(); // one synchronous frame to catch shader errors before we commit to swapping the canvas

    if (blobCanvas) blobCanvas.style.display = 'none';

    bindLifecycle();
    state.running = true;
    playIfAllowed();
  }

  try {
    init();
  } catch (err) {
    console.error('[hero-eye] scene init failed, keeping blob fallback:', err);
    if (root && root.parentNode) root.parentNode.removeChild(root);
    if (blobCanvas) blobCanvas.style.display = '';
  }
})();
