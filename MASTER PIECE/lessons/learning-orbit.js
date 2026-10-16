import * as THREE from "three";
// One controller per host; search owns the state, rendering never declares success.
window.OrbitScene = {
  mount(host) {
    host._orbitScene?.dispose();
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      host.dataset.unavailable = "true";
      return { setState() {}, dispose() {} };
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.append(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene(),
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    const baseCamera = new THREE.Vector3(0, 2.6, 10.2),
      focus = new THREE.Vector3();
    camera.position.copy(baseCamera);
    scene.add(new THREE.HemisphereLight(0xb9dfff, 0x142b4a, 2));
    const key = new THREE.DirectionalLight(0xc1eaff, 4);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0x3b82f6, 35);
    rim.position.set(3, 0, -2);
    scene.add(rim);
    const metal = new THREE.MeshStandardMaterial({
      color: 0xbcc7dc,
      metalness: 0.8,
      roughness: 0.3,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: 0xc7d7e5,
      metalness: 0.65,
      roughness: 0.45,
    });
    const blue = new THREE.MeshStandardMaterial({
      color: 0x093773,
      metalness: 0.55,
      roughness: 0.28,
      emissive: 0x092a63,
      emissiveIntensity: 0.3,
    });
    const glow = new THREE.MeshBasicMaterial({ color: 0x69dcff });
    function mesh(g, m, parent = scene, x = 0, y = 0, z = 0) {
      const o = new THREE.Mesh(g, m);
      o.position.set(x, y, z);
      parent.add(o);
      return o;
    }
    const planet = new THREE.Group();
    scene.add(planet);
    planet.position.set(-0.35, -0.15, 0);
    const globe = mesh(
      new THREE.SphereGeometry(0.98, 48, 32),
      new THREE.MeshStandardMaterial({ color: 0x142b4a, metalness: 0.3, roughness: 0.6 }),
      planet,
    );
    mesh(
      new THREE.SphereGeometry(1.06, 40, 28),
      new THREE.MeshBasicMaterial({
        color: 0x7397ff,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
      }),
      planet,
    );
    const orbit = new THREE.Group();
    orbit.position.copy(planet.position);
    orbit.rotation.set(0.32, 0, -0.28);
    scene.add(orbit);
    for (const [r, c] of [
      [1.9, 0x22c7a9],
      [2.15, 0x71caff],
    ]) {
      const ring = mesh(
        new THREE.TorusGeometry(r, 0.008, 8, 180),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.42 }),
        orbit,
      );
      ring.rotation.x = Math.PI / 2;
    }
    const satellite = new THREE.Group();
    satellite.scale.setScalar(1.4);
    scene.add(satellite);
    mesh(new THREE.BoxGeometry(0.43, 0.43, 0.5), metal, satellite);
    mesh(new THREE.BoxGeometry(0.48, 0.12, 0.55), gold, satellite, 0, -0.17, 0);
    const lens = mesh(
      new THREE.CylinderGeometry(0.15, 0.18, 0.17, 28),
      metal,
      satellite,
      0,
      0,
      0.31,
    );
    lens.rotation.x = Math.PI / 2;
    const sensor = mesh(new THREE.CircleGeometry(0.115, 32), glow, satellite, 0, 0, 0.407);
    mesh(new THREE.BoxGeometry(2.05, 0.045, 0.045), metal, satellite);
    for (const sign of [-1, 1]) {
      mesh(new THREE.BoxGeometry(0.7, 0.48, 0.04), blue, satellite, sign * 0.73, 0, 0);
      for (let x = 0; x < 5; x++)
        for (let y = 0; y < 3; y++)
          mesh(
            new THREE.BoxGeometry(0.11, 0.13, 0.006),
            new THREE.MeshStandardMaterial({ color: 0x285694, metalness: 0.65, roughness: 0.25 }),
            satellite,
            sign * 0.73 + (x - 2) * 0.135,
            (y - 1) * 0.15,
            0.026,
          );
      mesh(new THREE.BoxGeometry(0.75, 0.025, 0.055), metal, satellite, sign * 0.73, 0.255, 0);
      mesh(new THREE.BoxGeometry(0.75, 0.025, 0.055), metal, satellite, sign * 0.73, -0.255, 0);
    }
    const antenna = mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8),
      metal,
      satellite,
      0,
      0.4,
      0,
    );
    mesh(new THREE.SphereGeometry(0.04, 12, 8), glow, satellite, 0, 0.63, 0);
    const beam = mesh(
      new THREE.ConeGeometry(0.48, 1.7, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x65d7ff,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      satellite,
      0,
      0,
      1.25,
    );
    beam.rotation.x = -Math.PI / 2;
    const pulses = mesh(
      new THREE.TorusGeometry(0.43, 0.015, 6, 48),
      new THREE.MeshBasicMaterial({ color: 0x7ddcff, transparent: true, opacity: 0 }),
      satellite,
      0,
      0,
      1.7,
    );
    // Layered planets, procedural surface and nebulae; no remote assets.
    const surfaceCanvas = document.createElement("canvas");
    surfaceCanvas.width = 768;
    surfaceCanvas.height = 384;
    const surfaceContext = surfaceCanvas.getContext("2d"),
      pixels = surfaceContext.createImageData(768, 384);
    for (let y = 0; y < 384; y++)
      for (let x = 0; x < 768; x++) {
        const lon = (x / 768) * Math.PI * 2,
          lat = (y / 384 - 0.5) * Math.PI;
        const sx = Math.cos(lon) * Math.cos(lat),
          sy = Math.sin(lat),
          sz = Math.sin(lon) * Math.cos(lat);
        const terrain =
          Math.sin(sx * 9 + Math.sin(sz * 5)) * Math.cos(sy * 7 + sz * 4) +
          0.45 * Math.sin(sx * 23 + sy * 14) * Math.cos(sz * 17) +
          0.2 * Math.sin(sx * 47 + sz * 31);
        const landWeight = THREE.MathUtils.smoothstep(terrain, 0.12, 0.38),
          cloud =
            THREE.MathUtils.smoothstep(
              Math.sin(sx * 20 + sz * 11 + Math.sin(sy * 15)) * Math.cos(sy * 22 + sx * 7),
              0.58,
              0.93,
            ) * 0.35;
        const color = new THREE.Color(0x172f75)
          .lerp(new THREE.Color(0x0f9d91), landWeight)
          .lerp(new THREE.Color(0xb3d7ff), cloud);
        const i = (y * 768 + x) * 4;
        pixels.data[i] = color.r * 255;
        pixels.data[i + 1] = color.g * 255;
        pixels.data[i + 2] = color.b * 255;
        pixels.data[i + 3] = 255;
      }
    surfaceContext.putImageData(pixels, 0, 0);
    const surfaceTexture = new THREE.CanvasTexture(surfaceCanvas);
    surfaceTexture.colorSpace = THREE.SRGBColorSpace;
    globe.material.map = surfaceTexture;
    globe.material.color.setHex(0xffffff);
    globe.material.needsUpdate = true;
    const atmosphereMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: { tint: { value: new THREE.Color(0x659cff) } },
      vertexShader:
        "varying vec3 n;varying vec3 eye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}",
      fragmentShader:
        "varying vec3 n;varying vec3 eye;uniform vec3 tint;void main(){float f=pow(1.-abs(dot(normalize(n),normalize(eye))),3.);gl_FragColor=vec4(tint,f*.65);}",
    });
    mesh(new THREE.SphereGeometry(1.1, 40, 28), atmosphereMaterial, planet);
    const distantPlanets = [];
    for (const [r, x, y, z, color] of [
      [0.54, -2.9, 1.35, -2.1, 0x654ec1],
      [0.3, 2.7, 1.45, -3.7, 0x3b8fc2],
      [0.18, -1.7, -1.65, -1, 0x9a82d4],
      [0.38, 2.25, -1.4, -2.8, 0x4456ab],
    ]) {
      const p = mesh(
        new THREE.SphereGeometry(r, 28, 20),
        new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.65 }),
        scene,
        x,
        y,
        z,
      );
      distantPlanets.push(p);
      const halo = mesh(new THREE.SphereGeometry(r * 1.07, 24, 16), atmosphereMaterial, p);
    }
    const distantRing = mesh(
      new THREE.TorusGeometry(0.79, 0.027, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0xa29aff, transparent: true, opacity: 0.4 }),
      scene,
    );
    distantRing.position.copy(distantPlanets[0].position);
    distantRing.rotation.copy(orbit.rotation);
    distantRing.rotation.x += Math.PI / 2;
    const moon = mesh(new THREE.SphereGeometry(0.13, 20, 16), metal, scene, -1.65, 0.62, 0.8);
    const nebulaMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { time: { value: 0 } },
      vertexShader:
        "varying vec2 uvSpace;void main(){uvSpace=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 uvSpace;uniform float time;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
    void main(){vec2 p=uvSpace*6.+vec2(time*.012,0.);float n=0.;float a=.55;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.1+1.3;a*=.5;}float edge=pow(max(0.,1.-length((uvSpace-.5)*1.8)),1.5);vec3 color=mix(vec3(.17,.22,.6),vec3(.43,.22,.68),n);gl_FragColor=vec4(color,n*edge*.36);}`,
    });
    mesh(new THREE.PlaneGeometry(13, 8), nebulaMaterial, scene, 0, 0.3, -5);
    const destination = new THREE.Group();
    destination.position.set(2.15, 1.05, -0.3);
    scene.add(destination);
    const destinationCore = mesh(
      new THREE.SphereGeometry(0.08, 18, 12),
      new THREE.MeshBasicMaterial({ color: 0xa9efff }),
      destination,
    );
    const destinationRing = mesh(
      new THREE.TorusGeometry(0.27, 0.016, 8, 60),
      new THREE.MeshBasicMaterial({ color: 0x77caff, transparent: true, opacity: 0 }),
      destination,
    );
    destinationRing.rotation.y = 0.3;
    const sensorLight = new THREE.PointLight(0x69dcff, 0, 2);
    sensorLight.position.set(0, 0, 0.5);
    satellite.add(sensorLight);

    const starPositions = new Float32Array(
      (matchMedia("(max-width:760px)").matches ? 1100 : 2600) * 3,
    );
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < starPositions.length; i += 3) {
      starPositions[i] = (random() - 0.5) * 15;
      starPositions[i + 1] = (random() - 0.5) * 9;
      starPositions[i + 2] = (random() - 0.5) * 8 - 3;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({ color: 0x9cbcff, size: 0.018, transparent: true, opacity: 0.7 }),
    );
    scene.add(stars);
    const trailPositions = new Float32Array(36 * 3),
      trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    const trail = new THREE.Points(
      trailGeometry,
      new THREE.PointsMaterial({
        color: 0x85d5ff,
        size: 0.045,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    scene.add(trail);
    let state = "Idle",
      phase = 0.55,
      elapsed = 0,
      speed = 0.13,
      scan = 0,
      launch = 0,
      previous = 0,
      disposed = false,
      visible = !document.hidden,
      intersecting = true,
      flightAge = 0,
      flightActive = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)"),
      position = new THREE.Vector3(),
      target = new THREE.Vector3(),
      launchOrigin = new THREE.Vector3();
    const isCalm = () => reduced.matches || document.body.dataset.mood === "calm";
    function frame(now = performance.now()) {
      if (disposed) return;
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      const calm = isCalm(),
        k = calm ? 1 : 1 - Math.exp(-dt * 4);
      if (!calm) {
        elapsed += dt;
        speed = THREE.MathUtils.lerp(speed, state === "Scanning" ? 0.5 : 0.13, k);
        phase += dt * speed;
      }
      scan = THREE.MathUtils.lerp(scan, state === "Scanning" ? 1 : 0, k);
      if (flightActive && !calm) {
        flightAge += dt;
        if (state === "Results" && flightAge > 1.45) flightActive = false;
      }
      const flightTarget =
        flightActive && !calm ? THREE.MathUtils.smoothstep(flightAge, 0, 1.05) : 0;
      launch = THREE.MathUtils.lerp(launch, flightTarget, calm ? 1 : 1 - Math.exp(-dt * 7));
      host.dataset.flight = flightActive
        ? state === "Results"
          ? "arriving"
          : "departing"
        : "idle";
      position
        .set(
          Math.cos(phase) * 2.15,
          calm ? 0 : Math.sin(elapsed * 1.7) * 0.035,
          Math.sin(phase) * 2.15,
        )
        .applyQuaternion(orbit.quaternion)
        .add(orbit.position);
      if (state === "Launch" || launch > 0.002) {
        target.copy(launchOrigin).lerp(destination.position, launch);
        target.z += Math.sin(launch * Math.PI) * 1.6;
        position.lerp(target, launch);
      }
      satellite.position.copy(position);
      target.copy(planet.position);
      target.z += 2.5 * (1 - scan) * (1 - launch);
      satellite.lookAt(target);
      beam.material.opacity =
        scan * (calm ? 0.12 : 0.1 + 0.12 * Math.max(0, Math.sin(elapsed * 5)));
      pulses.material.opacity = scan * 0.6;
      pulses.scale.setScalar(calm ? 1 : 0.7 + (elapsed % 1.2) * 0.6);
      sensor.material.color.setHex(state === "Error" || state === "Empty" ? 0xb59aff : 0x69dcff);
      sensorLight.intensity = scan * 2 + launch * 1.2;
      destinationRing.material.opacity = launch * 0.85;
      destinationCore.scale.setScalar(0.4 + launch * 1.6);
      nebulaMaterial.uniforms.time.value = elapsed;
      stars.rotation.z = calm ? 0 : Math.sin(elapsed * 0.035) * 0.015;
      distantPlanets.forEach((p) => {
        if (!calm) p.rotation.y += dt * 0.025;
      });
      const cameraTarget = baseCamera
        .clone()
        .add(new THREE.Vector3(position.x * 0.32, position.y * 0.25, 0).multiplyScalar(launch));
      camera.position.lerp(cameraTarget, k);
      focus.set(position.x * 0.25 * launch, position.y * 0.15 * launch, 0);
      camera.lookAt(focus);
      if (!calm) globe.rotation.y += dt * 0.035;
      trail.material.opacity = calm ? 0 : launch * 0.7;
      for (let i = 35; i > 0; i--) {
        trailPositions[i * 3] = trailPositions[(i - 1) * 3];
        trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
        trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
      }
      trailPositions.set([position.x, position.y, position.z], 0);
      trailGeometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    }
    function sync() {
      renderer.setAnimationLoop(null);
      previous = 0;
      if (!disposed && visible && intersecting) {
        frame();
        if (!isCalm()) renderer.setAnimationLoop(frame);
      }
    }
    function resize() {
      if (disposed) return;
      const w = host.clientWidth,
        h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      sync();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const io = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    io.observe(host);
    function visibility() {
      visible = !document.hidden;
      sync();
    }
    document.addEventListener("visibilitychange", visibility);
    reduced.addEventListener("change", sync);
    const mood = new MutationObserver(sync);
    mood.observe(document.body, { attributes: true, attributeFilter: ["data-mood"] });
    const removal = new MutationObserver(() => {
      if (!host.isConnected) controller.dispose();
    });
    removal.observe(document.body, { childList: true, subtree: true });
    function contextLost(e) {
      e.preventDefault();
      host.dataset.unavailable = "true";
      renderer.setAnimationLoop(null);
    }
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    const controller = {
      setState(next) {
        if (disposed || !["Idle", "Scanning", "Launch", "Results", "Empty", "Error"].includes(next))
          return;
        if (next === "Launch" && state !== "Launch") {
          launchOrigin.copy(satellite.position);
          flightAge = 0;
          flightActive = true;
        }
        if (["Idle", "Scanning", "Empty", "Error"].includes(next)) flightActive = false;
        state = next;
        host.dataset.state = next;
        sync();
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        renderer.setAnimationLoop(null);
        ro.disconnect();
        io.disconnect();
        mood.disconnect();
        removal.disconnect();
        document.removeEventListener("visibilitychange", visibility);
        reduced.removeEventListener("change", sync);
        renderer.domElement.removeEventListener("webglcontextlost", contextLost);
        const geometries = new Set(),
          materials = new Set();
        scene.traverse((o) => {
          if (o.geometry) geometries.add(o.geometry);
          if (o.material)
            (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
              materials.add(m),
            );
        });
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => {
          for (const value of Object.values(m)) if (value?.isTexture) value.dispose();
          m.dispose();
        });
        renderer.dispose();
        renderer.domElement.remove();
        delete host._orbitScene;
      },
    };
    host._orbitScene = controller;
    resize();
    return controller;
  },
};
