import {
  Scene,
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  Shape,
  ExtrudeGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  ACESFilmicToneMapping,
  CanvasTexture,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  WebGLRenderer,
  SRGBColorSpace,
  DoubleSide,
  BufferGeometry,
  BufferAttribute,
} from "three";

// The Signup scene is decorative only; it never reads form values or account data.
window.OrbitRegistrationUniverse = {
  create(host) {
    if (!host || host._learningUniverse) return host?._learningUniverse;

    let renderer;
    try {
      renderer = new WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      host.dataset.renderer = "fallback";
      return null;
    }

    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const canvas = renderer.domElement;
    canvas.className = "universe-canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.append(canvas);
    host.dataset.renderer = "ready";

    const scene = new Scene();
    const camera = new PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(-1.8, 2.65, 7.45);
    camera.lookAt(-0.2, 0, 0);
    scene.add(new HemisphereLight(0xe7fffb, 0x17383b, 2.0));

    const key = new DirectionalLight(0xfff6e8, 3.0);
    key.position.set(-3.8, 5.2, 5.6);
    scene.add(key);
    const fill = new DirectionalLight(0x8de0d4, 1.15);
    fill.position.set(4.2, 1.8, 3.4);
    scene.add(fill);
    const rim = new DirectionalLight(0xb2caff, 0.7);
    rim.position.set(1.5, 3.2, -4);
    scene.add(rim);

    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const mat = (color, options = {}) => {
      const value = new MeshStandardMaterial({
        color,
        roughness: 0.68,
        metalness: 0.04,
        ...options,
      });
      materials.add(value);
      return value;
    };
    const mesh = (geometry, material, parent, position = [0, 0, 0]) => {
      geometries.add(geometry);
      const object = new Mesh(geometry, material);
      object.position.set(...position);
      parent.add(object);
      return object;
    };

    function makeLogoTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, 1024, 1024);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(207,245,236,.58)";
      ctx.beginPath();
      ctx.arc(512, 350, 66, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(512, 350, 100, 35, -0.24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#e6f5f1";
      ctx.beginPath();
      ctx.arc(574, 326, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = '700 184px "DM Sans", "Inter", Arial, sans-serif';
      if ("letterSpacing" in ctx) ctx.letterSpacing = "8px";
      ctx.fillStyle = "rgba(2,29,31,.44)";
      ctx.fillText("ORBIT", 512, 616);
      const silver = ctx.createLinearGradient(0, 520, 0, 710);
      silver.addColorStop(0, "#ffffff");
      silver.addColorStop(0.48, "#d9eeea");
      silver.addColorStop(1, "#a9d5cf");
      ctx.fillStyle = silver;
      ctx.fillText("ORBIT", 512, 604);

      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      textures.add(texture);
      return texture;
    }

    function makePageTexture(title, pageNumber) {
      const canvas = document.createElement("canvas");
      canvas.width = 768;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fbf8f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0d766f";
      ctx.font = '700 34px "DM Sans", "Inter", Arial, sans-serif';
      ctx.fillText(title, 76, 132);
      ctx.fillStyle = "#627773";
      ctx.fillRect(76, 168, 310, 5);
      ctx.font = '400 20px "DM Sans", "Inter", Arial, sans-serif';
      ctx.fillText("LEARNING NOTES", 76, 218);
      for (let index = 0; index < 8; index++) {
        ctx.globalAlpha = index > 5 ? 0.46 : 0.72;
        ctx.fillStyle = index === 2 ? "#62b9ad" : "#9aa9a2";
        ctx.fillRect(76, 280 + index * 56, 560 - ((index * 53) % 150), index === 2 ? 10 : 5);
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#d2e5dc";
      ctx.lineWidth = 3;
      ctx.strokeRect(76, 812, 210, 90);
      ctx.fillStyle = "#0d9488";
      ctx.fillRect(96, 840, 166, 6);
      ctx.fillRect(96, 862, 114, 6);
      ctx.fillStyle = "#87968f";
      ctx.font = '400 18px "DM Sans", "Inter", Arial, sans-serif';
      ctx.fillText(String(pageNumber).padStart(2, "0"), 640, 940);
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      textures.add(texture);
      return texture;
    }

    function roundedBoard(width, height, radius, depth) {
      const shape = new Shape();
      shape.moveTo(radius, -height / 2);
      shape.lineTo(width - radius, -height / 2);
      shape.quadraticCurveTo(width, -height / 2, width, -height / 2 + radius);
      shape.lineTo(width, height / 2 - radius);
      shape.quadraticCurveTo(width, height / 2, width - radius, height / 2);
      shape.lineTo(radius, height / 2);
      shape.quadraticCurveTo(0, height / 2, 0, height / 2 - radius);
      shape.lineTo(0, -height / 2 + radius);
      shape.quadraticCurveTo(0, -height / 2, radius, -height / 2);
      shape.closePath();
      const geometry = new ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.018,
        bevelThickness: 0.018,
        curveSegments: 8,
      });
      geometry.computeVertexNormals();
      return geometry;
    }

    const book = new Group();
    book.position.x = -0.42;
    scene.add(book);

    const leather = mat("#12615d", { roughness: 0.54, metalness: 0.16 });
    const spineLeather = mat("#0d514f", { roughness: 0.62, metalness: 0.12 });
    const lining = mat("#1a625e", {
      roughness: 0.77,
      metalness: 0.04,
      side: DoubleSide,
    });
    const paperEdge = mat("#d9d1c2", { roughness: 0.94 });
    const paperSide = mat("#eee9de", { roughness: 0.9 });
    const leftPageMaterial = mat("#fbf8f0", {
      map: makePageTexture("IDEAS TAKE SHAPE", 4),
      roughness: 0.92,
      side: DoubleSide,
    });
    const rightPageMaterial = mat("#fbf8f0", {
      map: makePageTexture("LEARN WITH ORBIT", 5),
      roughness: 0.92,
      side: DoubleSide,
    });

    // Closed page block, lower board, rounded spine and fore-edge lines.
    mesh(new BoxGeometry(1.29, 1.78, 0.14), paperSide, book, [0.655, 0, -0.105]);
    mesh(new BoxGeometry(1.25, 1.73, 0.12), paperEdge, book, [0.655, 0, -0.055]);
    const edgeLine = mat("#d0c5b2", { roughness: 1 });
    for (let index = 0; index < 7; index++) {
      mesh(
        new BoxGeometry(0.012, 1.72, 0.006),
        edgeLine,
        book,
        [1.292 + index * 0.004, 0, -0.02 + index * 0.004],
      );
    }
    mesh(
      roundedBoard(1.36, 1.88, 0.075, 0.085),
      spineLeather,
      book,
      [0, 0, -0.275],
    );
    const spine = mesh(
      new CylinderGeometry(0.105, 0.105, 1.88, 24, 1, false),
      spineLeather,
      book,
      [0, 0, -0.08],
    );
    spine.rotation.z = 0;
    for (const y of [-0.56, 0.56]) {
      const rib = mesh(
        new CylinderGeometry(0.012, 0.012, 0.16, 10),
        mat("#4e8b83", { roughness: 0.66, metalness: 0.2 }),
        book,
        [0, y, -0.08],
      );
      rib.rotation.z = Math.PI / 2;
    }

    // The front board is a true hinge group at the spine edge (x = 0).
    const coverPivot = new Group();
    book.add(coverPivot);
    coverPivot.position.set(0, 0, -0.012);
    mesh(roundedBoard(1.36, 1.88, 0.075, 0.09), leather, coverPivot);
    mesh(
      new PlaneGeometry(1.22, 1.68),
      lining,
      coverPivot,
      [0.68, 0, -0.003],
    );
    const logoMaterial = mat("#ffffff", {
      map: makeLogoTexture(),
      transparent: true,
      roughness: 0.34,
      metalness: 0.52,
      side: DoubleSide,
      depthWrite: false,
    });
    mesh(
      new PlaneGeometry(1.2, 1.62),
      logoMaterial,
      coverPivot,
      [0.68, 0, 0.112],
    );

    // Open-book leaves expand from the binding when the board lifts.
    const leftWing = new Group();
    book.add(leftWing);
    leftWing.position.set(0, 0, 0.035);
    mesh(new BoxGeometry(1.29, 1.78, 0.08), paperSide, leftWing, [-0.655, 0, -0.12]);
    mesh(new BoxGeometry(1.25, 1.73, 0.07), paperEdge, leftWing, [-0.655, 0, -0.07]);
    mesh(
      new PlaneGeometry(1.24, 1.72),
      leftPageMaterial,
      leftWing,
      [-0.64, 0, 0.04],
    );
    const rightWing = new Group();
    book.add(rightWing);
    rightWing.position.set(0, 0, 0.035);
    mesh(
      new PlaneGeometry(1.24, 1.72),
      rightPageMaterial,
      rightWing,
      [0.64, 0, 0.04],
    );

    // A subdivided leaf flexes at its fore edge as it turns around the binding.
    const cols = 24;
    const rows = 18;
    const pageWidth = 1.28;
    const pageHeight = 1.72;
    const positions = new Float32Array((cols + 1) * (rows + 1) * 3);
    const basePositions = new Float32Array(positions.length);
    const uvs = new Float32Array((cols + 1) * (rows + 1) * 2);
    const indices = [];
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        const index = y * (cols + 1) + x;
        const offset = index * 3;
        const u = x / cols;
        positions[offset] = u * pageWidth;
        positions[offset + 1] = (y / rows - 0.5) * pageHeight;
        basePositions[offset] = positions[offset];
        basePositions[offset + 1] = positions[offset + 1];
        uvs[index * 2] = u;
        uvs[index * 2 + 1] = y / rows;
        if (x < cols && y < rows) {
          indices.push(
            index,
            index + 1,
            index + cols + 1,
            index + 1,
            index + cols + 2,
            index + cols + 1,
          );
        }
      }
    }
    const turnGeometry = new BufferGeometry();
    turnGeometry.setAttribute("position", new BufferAttribute(positions, 3));
    turnGeometry.setAttribute("uv", new BufferAttribute(uvs, 2));
    turnGeometry.setIndex(indices);
    turnGeometry.computeVertexNormals();
    geometries.add(turnGeometry);

    const turners = [];
    const turnStarts = [2.65, 3.55, 4.45];
    const turnDuration = 0.78;
    for (let index = 0; index < turnStarts.length; index++) {
      const pivot = new Group();
      pivot.position.set(0, 0, 0.083 + index * 0.006);
      book.add(pivot);
      const material = mat("#fffdf7", {
        map: makePageTexture(index === 1 ? "A PLACE TO GROW" : "LEARNING IN MOTION", 6 + index),
        roughness: 0.9,
        side: DoubleSide,
      });
      mesh(turnGeometry.clone(), material, pivot);
      const geometry = pivot.children[0].geometry;
      geometries.add(geometry);
      turners.push({ pivot, geometry, material, completed: false });
    }

    // A soft contact shadow stays underneath the complete book.
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext("2d");
    const shadowGradient = shadowContext.createRadialGradient(128, 64, 8, 128, 64, 62);
    shadowGradient.addColorStop(0, "rgba(0,20,25,.3)");
    shadowGradient.addColorStop(1, "rgba(0,20,25,0)");
    shadowContext.fillStyle = shadowGradient;
    shadowContext.fillRect(0, 0, 256, 128);
    const shadowTexture = new CanvasTexture(shadowCanvas);
    textures.add(shadowTexture);
    const shadowMaterial = new MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    });
    materials.add(shadowMaterial);
    mesh(new PlaneGeometry(3.8, 2.25), shadowMaterial, scene, [-0.45, -0.96, -0.42]);

    let role = "student";
    let status = "closed";
    let frame = 0;
    let timer = 0;
    let last = 0;
    let elapsed = 0;
    let idleElapsed = 0;
    let visible = true;
    let disposed = false;
    let suspended = false;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const duration = 5.55;

    const cubic = (t, x1, y1, x2, y2) => {
      const bezier = (a, b, progress) =>
        3 * (1 - progress) ** 2 * progress * a +
        3 * (1 - progress) * progress ** 2 * b +
        progress ** 3;
      let low = 0;
      let high = 1;
      let progress = t;
      for (let iteration = 0; iteration < 12; iteration++) {
        progress = (low + high) / 2;
        if (bezier(x1, x2, progress) < t) low = progress;
        else high = progress;
      }
      return bezier(y1, y2, progress);
    };
    const easeInOut = (t) => cubic(t, 0.77, 0, 0.175, 1);

    function updateLeaf(leaf, turnProgress) {
      const eased = easeInOut(Math.max(0, Math.min(1, turnProgress)));
      leaf.pivot.rotation.y = -Math.PI * eased;
      const position = leaf.geometry.attributes.position;
      const bend = Math.sin(Math.PI * eased);
      for (let index = 0; index < position.count; index++) {
        const offset = index * 3;
        const u = basePositions[offset] / pageWidth;
        const across = Math.sin(u * Math.PI);
        position.setX(index, basePositions[offset] - across * bend * 0.035);
        position.setY(index, basePositions[offset + 1]);
        position.setZ(index, across * bend * 0.13 + u * bend * 0.035);
      }
      position.needsUpdate = true;
      leaf.geometry.computeVertexNormals();
      return turnProgress >= 0 && turnProgress < 1;
    }

    function updatePose(time) {
      const openT = Math.max(0, Math.min(1, (time - 0.62) / 1.72));
      const openEase = easeInOut(openT);
      coverPivot.rotation.y = -Math.PI * openEase;
      leftWing.scale.x = openEase;

      let activePage = false;
      let pagesCompleted = 0;
      for (let index = 0; index < turners.length; index++) {
        const progress = (time - turnStarts[index]) / turnDuration;
        const leaf = turners[index];
        leaf.pivot.visible = progress >= 0 && openEase > 0.92;
        if (progress >= 1) {
          if (!leaf.completed) {
            updateLeaf(leaf, 1);
            leaf.completed = true;
          }
          pagesCompleted++;
        } else if (progress >= 0) {
          activePage = updateLeaf(leaf, progress) || activePage;
        } else {
          leaf.pivot.rotation.y = 0;
        }
      }

      const idlePhase = Math.max(0, time - duration) + idleElapsed;
      if (!reduce.matches && time >= duration) {
        book.rotation.z = Math.sin(idlePhase * 0.48) * 0.005;
        book.rotation.y = Math.sin(idlePhase * 0.34) * 0.004;
      } else {
        book.rotation.z = 0;
        book.rotation.y = 0;
      }

      status = openT >= 1 ? "open" : openT <= 0 ? "closed" : "opening";
      host.dataset.bookPose = status;
      host.dataset.pagesTurned = String(pagesCompleted);
      host.dataset.pageTurning = String(activePage);
    }

    function cancel() {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      frame = 0;
      timer = 0;
      last = 0;
    }
    function request() {
      if (disposed || suspended || !visible || document.hidden || frame || timer || reduce.matches)
        return;
      if (elapsed >= duration) {
        timer = setTimeout(() => {
          timer = 0;
          draw(performance.now());
        }, 1000 / 12);
      } else frame = requestAnimationFrame(draw);
    }
    function draw(now) {
      frame = 0;
      timer = 0;
      if (disposed || suspended || !visible || document.hidden) return;
      const delta = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      if (elapsed < duration) elapsed = Math.min(duration, elapsed + delta);
      else idleElapsed += delta;
      updatePose(elapsed);
      renderer.render(scene, camera);
      request();
    }
    function renderStatic() {
      elapsed = duration;
      idleElapsed = 0;
      updatePose(duration);
      renderer.render(scene, camera);
    }
    function resize() {
      if (disposed) return;
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, width < 500 ? 1.15 : 1.4));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = camera.aspect < 1 ? 7.35 : 7.05;
      camera.updateProjectionMatrix();
      camera.lookAt(-0.2, 0, 0);
      if (reduce.matches) renderStatic();
      else request();
    }

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        if (reduce.matches) renderStatic();
        else request();
      } else cancel();
    });
    resizeObserver.observe(host);
    intersectionObserver.observe(host);

    function preferenceChanged() {
      cancel();
      if (reduce.matches) renderStatic();
      else {
        elapsed = 0;
        idleElapsed = 0;
        turners.forEach((leaf) => (leaf.completed = false));
        request();
      }
    }
    function visibilityChanged() {
      if (document.hidden) cancel();
      else if (reduce.matches) renderStatic();
      else request();
    }
    function pageHide(event) {
      suspended = true;
      cancel();
      if (!event.persisted) dispose();
    }
    function pageShow() {
      suspended = false;
      resize();
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      cancel();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reduce.removeEventListener("change", preferenceChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
      removeEventListener("pagehide", pageHide);
      removeEventListener("pageshow", pageShow);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      canvas.remove();
      host.dataset.renderer = "fallback";
      delete host._learningUniverse;
    }

    reduce.addEventListener("change", preferenceChanged);
    document.addEventListener("visibilitychange", visibilityChanged);
    addEventListener("pagehide", pageHide);
    addEventListener("pageshow", pageShow);
    const api = {
      setRole(value) {
        if (["student", "teacher", "school"].includes(value)) {
          role = value;
          host.dataset.sceneRole = role;
        }
      },
      setFocus() {},
      setState(value) {
        host.dataset.sceneState = value;
      },
      dispose,
      inspect() {
        return {
          role,
          status,
          elapsed: Number(elapsed.toFixed(2)),
          reduced: reduce.matches,
          coverAngle: Number(coverPivot.rotation.y.toFixed(2)),
          pageTurning: host.dataset.pageTurning === "true",
          pagesCompleted: Number(host.dataset.pagesTurned || 0),
          framePending: !!frame || !!timer,
          disposed,
          renders: renderer.info.render.frame,
        };
      },
    };

    host._learningUniverse = api;
    host.dataset.sceneRole = role;
    resize();
    if (reduce.matches) renderStatic();
    else request();
    return api;
  },
};
