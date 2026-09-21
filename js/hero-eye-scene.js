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
     - state object (time, pointer, breathing/blink envelopes, public mode)
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
     Brand-aligned default: the muted forest-green variant (matches
     the site's #385144 / #0A0D0B chart), kept alongside the original
     brighter cyan in case that's ever wanted again. Flip PALETTE
     below (or set data-palette="cyan" on .hero-blobs) to switch --
     css/hero-eye.css already themes the DOM HUD to match either. */
  var PALETTES = {
    cyan:   { neon: 0x39ffc4, dim: 0x1a8f6e, css: '' },
    forest: { neon: 0x6fae8c, dim: 0x385144, css: 'forest' }
  };
  var PALETTE = PALETTES.forest;

  var CONFIG = {
    particleCount: 600, // ~50% of the previous 1200, for a more épuré scene
    tickCount: 28,
    ringRadius: 2.6,
    shortReplyChars: 150,      // below this, endReply() fires a single crisp ring pulse
    sustainRampChars: 300,     // totalChars needed for the "long reply" sustained pulse to reach full strength
    fastStreamCharsPerSec: 60, // chars/sec treated as "fast burst" when normalizing speak.rate
    // Regular, non-random "breathing" tempo per mode -- replaces the old
    // glitch-frequency differential as the readable signal that the
    // state changed (see updateBreath()). Frequency in Hz, amplitude as
    // a fraction of scale/opacity.
    breathFreq: { idle: 0.35, listening: 0.55, thinking: 0.85, speaking: 0.6 },
    breathAmp:  { idle: 0.035, listening: 0.05, thinking: 0.07, speaking: 0.045 }
  };

  /* ── Boot sequence timing ──────────────────────────────────
     Plays once, ever, on first load (state.boot.done gates a
     replay). [start, end] in seconds since the scene started
     rendering -- each stage fades in with ease-out via bootFade().
     Iris rings are staggered largest -> smallest radius for an
     "opening" feel. Total run ~2.3s, within the requested 1.5-2.5s. */
  var BOOT = {
    particles: [0.0, 0.7],
    core: [0.25, 1.05],
    // Indexed to match the r=[0.5, 0.72, 0.95] build order below (index 0
    // = smallest ring); windows are assigned so the largest ring (index 2)
    // fades in first and the smallest last, per stage 3's "largest to
    // smallest" opening order.
    irisRings: [[1.1, 1.6], [0.9, 1.3], [0.7, 1.1]],
    spokes: [1.0, 1.5],
    pupil: [1.4, 1.8],
    radar: [1.5, 2.3]
  };
  var BOOT_END = 2.3;

  // Below this fraction of the container visible, scroll-driven activity
  // starts ramping down (see bindLifecycle()'s IntersectionObserver).
  var ACTIVITY_VISIBLE_THRESHOLD = 0.1;

  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

  /* ── State ─────────────────────────────────────────────────
     `mode` is driven by js/hero-chat.js via window.AlcalEye.setState()
     (idle | listening | thinking | speaking). The update* functions
     below branch on it directly -- no separate animation path per
     mode, just small modifiers layered onto the existing motion.

     `speak` carries the streaming-intensity signals AlcalEye.pulse()
     computes from real token arrival, not a plain speaking:true/false:
       - energy: per-token kick (decays fast, drives the core scale bump)
       - rate: smoothed chars/sec, derived from time between pulse() calls
               (drives radar sweep speed / particle field swell -- bursts vs pauses)
       - totalChars: cumulative reply length this turn (reset by startReply())
       - sustained: eases toward a totalChars-based target while streaming,
               and toward 0 once streaming stops -- gives long replies a
               continuous ring pulse that ramps up then winds down, with
               no need to predict when the stream will end
       - ringBurst: one-shot kick fired by endReply() for short replies

     `breath` is a smooth, regular (never random) sine envelope whose
     tempo/amplitude depend on `mode` -- the readable "state changed"
     signal now that the old glitch-frequency differential is gone. See
     updateBreath() and CONFIG.breathFreq/breathAmp. */
  var state = {
    mode: 'idle',
    running: false,
    visible: true,
    time: 0,
    lastTs: 0,
    pointer: { x: 0, y: 0, tx: 0, ty: 0 },
    breath: { phase: 0, value: 0 },
    speak: {
      energy: 0,
      rate: 0,
      lastPulseAt: 0,
      totalChars: 0,
      sustained: 0,
      ringBurst: 0,
      streaming: false
    },
    blink: { active: false, t: 0, duration: 0.22 }, // deliberate end-of-reply blink, independent of mode
    boot: { t: 0, done: false }, // one-shot opening sequence, see BOOT above -- never replays once done
    activity: { current: 1, target: 1 } // scroll-driven intensity, see updateActivity()
  };

  // 0..1 ease-out progress through a [start, end] boot stage; 1 once the
  // whole boot sequence is done (short-circuits the common case cheaply).
  function bootFade(stage) {
    if (state.boot.done) return 1;
    var x = (state.boot.t - stage[0]) / (stage[1] - stage[0]);
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return easeOutCubic(x);
  }

  var rand = Math.random;
  function randRange(a, b) { return a + rand() * (b - a); }

  /* ── DOM scaffold ──────────────────────────────────────────
     Everything the scene needs is created here and scoped inside
     .hero-blobs -- nothing is hardcoded into the page markup, so
     mobile ships zero extra DOM/CSS for this feature. */
  var root, canvasEl, readoutEl;

  function buildDom() {
    root = document.createElement('div');
    root.className = 'hero-eye-root';
    root.setAttribute('aria-hidden', 'true'); // decorative -- the real reply text lives in the static #hero-eye-speech overlay
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

    root.appendChild(hud);
    zone.appendChild(root);
  }

  /* ── Three.js core objects ────────────────────────────────── */
  var renderer, scene, camera, clock;
  var sceneTarget, postScene, postCamera, postMaterial;
  var core, eyeGroup, pupil, pupilRing, lids = {}, ringA, ringB;
  var ticks = [], pulses = [];
  var irisRings = []; // [{ mesh, baseOpacity, boot: [start,end] }], largest radius first -- see buildEye()
  var spokes; // LineSegments, base opacity 0.4
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
        uColor: { value: new THREE.Color(PALETTE.dim) },
        uBootFade: { value: 0 }
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
        'uniform float uBootFade;',
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
        '  gl_FragColor = vec4(uColor, line * fade * (0.25 + 0.5 * pulse) * uBootFade);',
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
        uColor: { value: new THREE.Color(PALETTE.neon) },
        uBootFade: { value: 0 }
      },
      vertexShader: gridMat.vertexShader,
      fragmentShader: [
        'uniform float uAngle;',
        'uniform vec3 uColor;',
        'uniform float uBootFade;',
        'varying vec2 vUv;',
        'void main() {',
        '  vec2 c = vUv - 0.5;',
        '  float d = length(c);',
        '  float ang = atan(c.y, c.x);',
        '  float diff = mod(ang - uAngle + 3.14159265, 6.2831853) - 3.14159265;',
        '  float sweep = smoothstep(0.9, 0.0, abs(diff)) * smoothstep(0.7, 0.0, d);',
        '  gl_FragColor = vec4(uColor, sweep * 0.5 * uBootFade);',
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
      // Always neon -- previously overwritten every frame anyway (the old
      // color swap only ever fired on a hard glitch), now just set once.
      var mat = new THREE.MeshBasicMaterial({ color: PALETTE.neon, transparent: true, opacity: 0.5 });
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
    core = new THREE.LineSegments(icoGeo, new THREE.LineBasicMaterial({ color: PALETTE.neon, transparent: true, opacity: 0 }));
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
      var baseOpacity = 0.55 - i * 0.1;
      var ring = makeRingLoop(r, 64, PALETTE.neon, 0);
      eyeGroup.add(ring);
      irisRings.push({ mesh: ring, baseOpacity: baseOpacity, boot: BOOT.irisRings[i] });
    });

    var spokePts = [];
    var spokeCount = 16;
    for (var i = 0; i < spokeCount; i++) {
      var a = (i / spokeCount) * Math.PI * 2;
      spokePts.push(new THREE.Vector3(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0));
      spokePts.push(new THREE.Vector3(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0));
    }
    var spokeGeo = new THREE.BufferGeometry().setFromPoints(spokePts);
    spokes = new THREE.LineSegments(spokeGeo, new THREE.LineBasicMaterial({ color: PALETTE.dim, transparent: true, opacity: 0 }));
    eyeGroup.add(spokes);

    pupil = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    );
    pupil.position.z = 0.02;
    eyeGroup.add(pupil);

    pupilRing = makeRingLoop(0.16, 32, PALETTE.neon, 0);
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
        uBootFade: { value: 0 },
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
        'uniform float uBootFade;',
        'void main() {',
        '  vec2 c = gl_PointCoord - 0.5;',
        '  float d = length(c);',
        '  float a = smoothstep(0.5, 0.0, d);',
        '  gl_FragColor = vec4(uColor, a * 0.5 * uBootFade);',
        '}'
      ].join('\n')
    });
    particles = new THREE.Points(geo, particleMat);
    scene.add(particles);
  }

  /* ── Post-processing (bloom-ish / scanline / vignette) ────────
     Render the scene to a target, then run one fullscreen pass that
     adds a clean, static "precision optics" treatment on top -- no
     jitter, chromatic split or grain: those read as an unstable/hacked
     signal rather than a maîtrisée high-tech instrument, so this pass
     is now just bloom + a faint fixed scanline + vignette + tonemap. */
  function buildPost() {
    sceneTarget = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    postScene = new THREE.Scene();
    postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: sceneTarget.texture },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uActivity: { value: 1 }
      },
      vertexShader: [
        'varying vec2 vUv;',
        'void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }'
      ].join('\n'),
      fragmentShader: [
        'uniform sampler2D tScene;',
        'uniform vec2 uResolution;',
        'uniform float uTime;',
        'uniform float uActivity;',
        'varying vec2 vUv;',
        'void main() {',
        '  vec2 uv = vUv;',
        '  vec4 col = texture2D(tScene, uv);',
        // crude bloom: a few offset taps added back additively
        '  vec2 texel = 1.0 / uResolution;',
        '  vec3 bloom = vec3(0.0);',
        '  bloom += texture2D(tScene, uv + texel * vec2(1.5, 0.0)).rgb;',
        '  bloom += texture2D(tScene, uv - texel * vec2(1.5, 0.0)).rgb;',
        '  bloom += texture2D(tScene, uv + texel * vec2(0.0, 1.5)).rgb;',
        '  bloom += texture2D(tScene, uv - texel * vec2(0.0, 1.5)).rgb;',
        '  col.rgb += bloom * 0.06;',
        // faint fixed scanlines (display-glass texture, not noise) + vignette
        '  float scan = 0.96 + 0.04 * sin(uv.y * uResolution.y * 1.5);',
        '  col.rgb *= scan;',
        '  float vig = smoothstep(0.9, 0.25, length(uv - 0.5));',
        '  col.rgb *= mix(0.55, 1.0, vig);',
        // simple tonemap
        '  col.rgb = col.rgb / (col.rgb + vec3(1.0));',
        // scroll-away dimming -- fades the whole frame toward black
        // (near enough to the hero's #0A0D0B background at these low
        // values) rather than stopping outright; the rAF loop itself is
        // what actually stops once fully out of view.
        '  col.rgb *= uActivity;',
        '  gl_FragColor = col;',
        '}'
      ].join('\n')
    });

    var quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
    postScene.add(quad);
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

  /* Regular sine "breathing" envelope -- the readable, non-random signal
     that the mode changed (replaces the old glitch-frequency trick).
     Tempo/amplitude step per mode via CONFIG.breathFreq/breathAmp, and
     ease off with scroll-away activity same as everything else, but the
     motion itself is always a smooth continuous wave, never a random
     trigger. Consumed by updateCore()/updateEye()/updateRadar(). */
  function updateBreath(dt) {
    var freq = CONFIG.breathFreq[state.mode] || CONFIG.breathFreq.idle;
    state.breath.phase += dt * freq * state.activity.current;
    state.breath.value = Math.sin(state.breath.phase * Math.PI * 2);
  }

  /* Per-frame upkeep for the speak-intensity signals set by
     AlcalEye.pulse()/startReply()/endReply() -- still just decay/lerp
     math, no new animation path. */
  function updateSpeakEnvelope(dt) {
    state.speak.energy *= Math.pow(0.02, dt);   // per-token kick, decays fast between tokens
    state.speak.ringBurst *= Math.pow(0.002, dt); // short-reply one-shot kick, decays over ~1s
    state.speak.rate *= Math.pow(0.01, dt);     // falls back toward 0 during silent gaps

    // Long-reply sustained pulse: ramps toward a totalChars-based target
    // while streaming, and toward 0 the instant streaming stops (set by
    // endReply()) -- so it winds down gracefully without needing to
    // predict when the stream will end.
    var sustainTarget = state.speak.streaming
      ? Math.min(1, state.speak.totalChars / CONFIG.sustainRampChars)
      : 0;
    var sustainLerp = 1 - Math.pow(0.001, dt);
    state.speak.sustained += (sustainTarget - state.speak.sustained) * sustainLerp;

    if (state.blink.active) {
      state.blink.t += dt;
      if (state.blink.t >= state.blink.duration) state.blink.active = false;
    }
  }

  function updateCore() {
    var rateFactor = Math.min(1, state.speak.rate / CONFIG.fastStreamCharsPerSec);
    var spinBoost = state.mode === 'listening' ? 1.8
      : state.mode === 'thinking' ? 1.4
      : state.mode === 'speaking' ? 1 + rateFactor * 0.6
      : 1;
    // Scroll-away scenes rotate slower rather than stopping outright --
    // the rAF loop itself is what fully stops once the hero is entirely
    // out of view (see playIfAllowed/pauseRender).
    core.rotation.y += 0.15 * (1 / 60) * spinBoost * state.activity.current;
    core.rotation.x = Math.sin(state.time * 0.2) * 0.15;
    core.material.opacity = 0.35 * bootFade(BOOT.core);

    // Each streamed token kicks the core outward briefly -- a pulse
    // synced to token arrival instead of a plain idle loop -- layered on
    // top of the regular per-mode breathing envelope (see updateBreath),
    // which is what now reads as "the state changed" instead of glitch.
    var kick = state.mode === 'speaking' ? state.speak.energy * 0.12 : 0;
    var breathAmp = CONFIG.breathAmp[state.mode] || CONFIG.breathAmp.idle;
    var breathe = state.breath.value * breathAmp * bootFade(BOOT.core);
    core.scale.setScalar(1 + kick + breathe);
  }

  function updateEye(dt) {
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

    // Iris opens last, largest ring first -- see BOOT.irisRings. Plain
    // multiply against each ring's normal opacity; bootFade() is already
    // 1 once the sequence is done, so this is a no-op past boot.
    var pupilBoot = bootFade(BOOT.pupil);
    pupil.material.opacity = 0.85 * pupilBoot;
    pupilRing.material.opacity = 0.8 * pupilBoot;
    spokes.material.opacity = 0.4 * bootFade(BOOT.spokes);
    irisRings.forEach(function (r) {
      r.mesh.material.opacity = r.baseOpacity * bootFade(r.boot);
    });

    eyeGroup.rotation.y = state.pointer.x * 0.12;
    eyeGroup.rotation.x = -state.pointer.y * 0.1;

    // Deliberate end-of-reply blink only (state.blink, fired once by
    // AlcalEye.endReply()) -- no more involuntary glitch-triggered blink.
    // A dt-based (frame-rate independent) lerp keeps the close/open
    // motion crisp and fast rather than the old fixed-per-frame ease,
    // per the "net et volontaire" brief.
    var blink = state.blink.active ? 1 : 0;
    var lidY = blink ? 0 : 1.9;
    var lidLerp = 1 - Math.pow(0.00003, dt);
    lids.top.position.y += (lidY - lids.top.position.y) * lidLerp;
    lids.bottom.position.y += (-lidY - lids.bottom.position.y) * lidLerp;

    // The lids are only meant to be seen while closing/closed -- moving
    // them aside isn't enough on its own, since their resting position
    // (y = +-1.9) still falls inside the camera frustum and they'd sit
    // there permanently as two flat dark rectangles above and below the
    // eye (this was the actual cause of the reported letterboxing-like
    // bands: the reference demo's `topLid.visible = hardEnv > 0.02`
    // toggle never made it into this port). Stay visible while actively
    // blinking or still easing back to the open position; hide once
    // fully settled there.
    var lidsSettled = !blink && Math.abs(lids.top.position.y - 1.9) < 0.02;
    lids.top.visible = !lidsSettled;
    lids.bottom.visible = !lidsSettled;

    ringA.rotation.z += 0.003;
    ringB.rotation.z -= 0.0022;
    // Same regular breathing envelope as the core, at a much smaller
    // amplitude -- a steady, precise shimmer instead of the old random
    // glitch-triggered scale kick.
    var ringBreathe = 1 + state.breath.value * 0.015;
    ringA.scale.setScalar(ringBreathe);
    ringB.scale.setScalar(ringBreathe);
  }

  function updateRadar(dt) {
    var rateFactor = Math.min(1, state.speak.rate / CONFIG.fastStreamCharsPerSec);
    // Sweep tempo is a legible, steady per-mode step (not a random
    // trigger) -- "thinking" scans visibly faster, same signal role the
    // old glitch-frequency differential used to carry.
    var sweepSpeed = state.mode === 'speaking' ? 0.8 * (1 + rateFactor * 0.6)
      : state.mode === 'thinking' ? 1.3
      : state.mode === 'listening' ? 0.95
      : 0.8;
    // Scrolled-away scenes sweep slower rather than stopping outright,
    // same rationale as the core's rotation above.
    sweepMat.uniforms.uAngle.value += dt * sweepSpeed * state.activity.current;
    gridMat.uniforms.uTime.value = state.time;

    var radarBoot = bootFade(BOOT.radar);
    gridMat.uniforms.uBootFade.value = radarBoot;
    sweepMat.uniforms.uBootFade.value = radarBoot;

    ticks.forEach(function (tick) {
      var diff = Math.atan2(Math.sin(tick.userData.angle - sweepMat.uniforms.uAngle.value), Math.cos(tick.userData.angle - sweepMat.uniforms.uAngle.value));
      var hit = Math.max(0, 1 - Math.abs(diff) / 0.5);
      tick.material.opacity = Math.min(1, 0.5 + hit * 0.5) * radarBoot;
    });
  }

  function updatePulses(dt) {
    // Ambient cycle speeds up and brightens with `sustained` (a long
    // reply still streaming in), gets one extra outward kick from
    // `ringBurst` (a short reply's single crisp pulse, or the burst
    // fired by endReply()), and steps a bit faster in `thinking` -- all
    // layered on the same base loop rather than swapping in a separate
    // animation. Clamped so the cycle never gets fast enough to feel
    // frantic.
    var modeBoost = state.mode === 'thinking' ? 0.6 : state.mode === 'listening' ? 0.2 : 0;
    var cycle = Math.max(0.9, 2.4 - state.speak.sustained * 1.2 - modeBoost);
    pulses.forEach(function (ring, i) {
      var local = ((state.time / cycle) + ring.userData.offset) % 1;
      var burstBoost = state.speak.ringBurst * (1 - local);
      ring.scale.setScalar(0.4 + local * 1.6 + burstBoost * 0.8);
      ring.material.opacity = Math.min(1, (1 - local) * 0.35 + state.speak.sustained * 0.25 + state.speak.ringBurst * 0.4);
      ring.lookAt(camera.position);
    });
  }

  function updateParticles() {
    particleMat.uniforms.uTime.value = state.time;
    // The particle field now swells gently with real reply activity
    // (per-token energy + the long-reply sustained pulse) instead of a
    // random glitch burst -- a meaningful cue tied to the AI actually
    // responding, eased continuously rather than triggered.
    var burstTarget = Math.min(1, state.speak.energy * 0.5 + state.speak.sustained * 0.4);
    particleMat.uniforms.uBurst.value += (burstTarget - particleMat.uniforms.uBurst.value) * 0.1;
    particleMat.uniforms.uBootFade.value = bootFade(BOOT.particles);
  }

  function updateHud() {
    var t = Math.floor(state.time * 1000) % 65536;
    readoutEl.textContent = '0x' + t.toString(16).toUpperCase().padStart(4, '0');
  }

  function updatePost() {
    postMaterial.uniforms.uTime.value = state.time;
    postMaterial.uniforms.uActivity.value = state.activity.current;
  }

  /* Advances the one-shot boot timer (never past BOOT_END once done,
     and never replayed -- state.boot.done just latches true) and eases
     state.activity.current toward whatever bindLifecycle()'s
     IntersectionObserver last set as the target, so both a scroll-away
     dim and a scroll-back recovery read as a smooth transition instead
     of a snap in either direction. */
  function updateLifecycle(dt) {
    if (!state.boot.done) {
      state.boot.t += dt;
      if (state.boot.t >= BOOT_END) state.boot.done = true;
    }
    var activityLerp = 1 - Math.pow(0.0005, dt);
    state.activity.current += (state.activity.target - state.activity.current) * activityLerp;
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

    updateLifecycle(dt);
    updatePointer(dt);
    updateBreath(dt);
    updateSpeakEnvelope(dt);
    updateCore(dt);
    updateEye(dt);
    updateRadar(dt);
    updatePulses(dt);
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
      // Below ACTIVITY_VISIBLE_THRESHOLD visible, activity.target ramps
      // down proportionally (updateLifecycle() eases state.activity.current
      // toward it every frame, so neither direction snaps) instead of
      // just toggling on/off. The render loop itself only fully stops
      // once truly out of view (ratio 0, with the existing 80px
      // pre-buffer) -- that's the actual GPU/CPU saving; the graduated
      // activity level is a visual smoothing on top of it.
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          state.visible = entry.isIntersecting;
          state.activity.target = entry.intersectionRatio >= ACTIVITY_VISIBLE_THRESHOLD
            ? 1
            : entry.intersectionRatio / ACTIVITY_VISIBLE_THRESHOLD;
          if (state.visible) playIfAllowed(); else pauseRender();
        });
      }, { rootMargin: '80px', threshold: [0, 0.02, 0.04, 0.06, 0.08, 0.1, 0.25, 0.5, 0.75, 1] });
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
     updateCore/updateEye/updateBreath/updateRadar/updatePulses above.
     The reply lifecycle is three calls:
       startReply() -- once, right when a new turn begins (resets the
                        per-turn accumulators below)
       pulse(charDelta) -- once per SSE text chunk received, feeding
                        both the per-token core kick and the smoothed
                        chars/sec rate used to modulate radar sweep speed
       endReply() -- once, on the stream's last token: fires the
                        short-reply ring burst (long replies just ease
                        their already-running sustained pulse back to 0
                        via updateSpeakEnvelope) and the deliberate blink */
  window.AlcalEye = {
    setState: function (mode) {
      if (['idle', 'listening', 'thinking', 'speaking'].indexOf(mode) !== -1) {
        state.mode = mode;
      }
    },
    getState: function () { return state.mode; },

    pulse: function (charDelta) {
      var delta = typeof charDelta === 'number' && charDelta > 0 ? charDelta : 1;
      var now = performance.now();
      if (state.speak.lastPulseAt) {
        var intervalMs = now - state.speak.lastPulseAt;
        if (intervalMs > 0) {
          // Clamp before blending: two chunks landing a couple of ms apart
          // (bursty network delivery) would otherwise spike this to an
          // absurd instantaneous value even though every consumer already
          // clamps rateFactor to [0,1] -- keeps the raw number itself
          // sane for debugging too.
          var instantRate = Math.min((delta / intervalMs) * 1000, CONFIG.fastStreamCharsPerSec * 4);
          state.speak.rate += (instantRate - state.speak.rate) * 0.35;
        }
      }
      state.speak.lastPulseAt = now;
      state.speak.totalChars += delta;
      // Additive-with-cap rather than a flat reset: consecutive fast
      // tokens visibly stack into a stronger kick instead of each pulse
      // just re-flattening to the same value.
      state.speak.energy = Math.min(1.6, state.speak.energy + 0.35 + Math.min(0.5, delta * 0.03));
    },

    startReply: function () {
      state.speak.totalChars = 0;
      state.speak.rate = 0;
      state.speak.lastPulseAt = 0;
      state.speak.sustained = 0;
      state.speak.energy = 0;
      state.speak.ringBurst = 0;
      state.speak.streaming = true;
    },

    endReply: function () {
      state.speak.streaming = false; // sustained's target drops to 0 -> eases down naturally
      if (state.speak.totalChars > 0 && state.speak.totalChars < CONFIG.shortReplyChars) {
        state.speak.ringBurst = 1;
        state.speak.energy = Math.max(state.speak.energy, 1.2);
      }
      state.blink.active = true;
      state.blink.t = 0;
    },

    // Read-only snapshot for debugging/QA (devtools console, automated
    // tests) -- not used by any animation path itself.
    getDebugState: function () {
      return {
        mode: state.mode,
        speak: {
          energy: state.speak.energy,
          rate: state.speak.rate,
          totalChars: state.speak.totalChars,
          sustained: state.speak.sustained,
          ringBurst: state.speak.ringBurst,
          streaming: state.speak.streaming
        },
        blink: { active: state.blink.active, t: state.blink.t },
        breath: { value: state.breath.value },
        boot: {
          t: state.boot.t,
          done: state.boot.done,
          particlesOpacity: particleMat.uniforms.uBootFade.value,
          coreOpacity: core.material.opacity,
          irisOuterOpacity: irisRings[2].mesh.material.opacity, // r=0.95, fades in first
          irisInnerOpacity: irisRings[0].mesh.material.opacity, // r=0.5, fades in last
          pupilOpacity: pupil.material.opacity,
          radarOpacity: gridMat.uniforms.uBootFade.value
        },
        activity: { current: state.activity.current, target: state.activity.target },
        visible: state.visible,
        running: rafId !== null
      };
    }
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
