import {
  Group,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  Mesh,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  MeshBasicMaterial,
  InstancedMesh,
  Object3D,
  CanvasTexture,
  RepeatWrapping,
  SRGBColorSpace,
  Box3,
  Vector3,
  DoubleSide,
} from "three";

/* Original modular architecture, in metres. No external model or texture. */
export function buildCampus({ mobile = false } = {}) {
  const group = new Group(),
    geometries = new Set(),
    materials = new Set(),
    textures = new Set(),
    instances = [],
    bounds = [];
  const batches = new Map(),
    boxGeometry = new BoxGeometry(1, 1, 1);
  geometries.add(boxGeometry);
  let seed = 42;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  function texture(kind, color) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 256, 256);
    if (kind === "grass")
      for (let i = 0; i < 6000; i++) {
        ctx.fillStyle = random() > 0.5 ? "#719255" : "#526e3c";
        ctx.globalAlpha = 0.25 + random() * 0.2;
        ctx.fillRect(random() * 256, random() * 256, 1, 2);
      }
    else if (kind === "wood") {
      for (let i = 0; i < 300; i++) {
        ctx.strokeStyle = random() > 0.5 ? "#ad8054" : "#7d5838";
        ctx.globalAlpha = 0.1 + random() * 0.14;
        ctx.beginPath();
        const y = random() * 256;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(80, y + random() * 6, 180, y - 4, 256, y + 3);
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 1600; i++) {
        ctx.fillStyle = random() > 0.5 ? "#ffffff" : "#675c4f";
        ctx.globalAlpha = 0.04;
        ctx.fillRect(random() * 256, random() * 256, 2, 2);
      }
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "#a8a296";
      ctx.lineWidth = 1;
      const pitch = kind === "stone" ? 32 : 64;
      for (let y = 0; y <= 256; y += pitch) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
        for (let x = (((y / pitch) % 2) * pitch) / 2; x <= 256; x += pitch * 2) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + pitch);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(kind === "wood" ? 3 : 6, kind === "wood" ? 1 : 4);
    textures.add(map);
    return map;
  }
  function material(color, extra = {}) {
    const m = new MeshStandardMaterial({ color, roughness: 0.78, ...extra });
    materials.add(m);
    return m;
  }
  const stone = material("#e8e2d5", { map: texture("stone", "#e8e2d5") });
  const white = material("#f4f0e6"),
    concrete = material("#d1cfbe", { map: texture("tile", "#cfccbb") });
  const pavement = material("#b9b7a8", { map: texture("tile", "#c0bbac") });
  const timber = material("#b8946d", { map: texture("wood", "#b78c62"), roughness: 0.58 });
  const grass = material("#83a367", { map: texture("grass", "#83a367") });
  const blue = material("#285b77"),
    teal = material("#167d77"),
    metal = material("#405457", { metalness: 0.65, roughness: 0.38 });
  const charcoal = material("#334342"),
    paper = material("#eae7db"),
    leafA = material("#68874e"),
    leafB = material("#86a561");
  const soil = material("#817153"),
    sport = material("#608668"),
    sportLight = material("#6d9275"),
    clay = material("#b89779");
  const foliageGeometry = new SphereGeometry(1, mobile ? 8 : 12, mobile ? 6 : 8),
    trunkGeometry = new CylinderGeometry(0.64, 1, 1, 8),
    treeBatches = new Map();
  geometries.add(foliageGeometry);
  geometries.add(trunkGeometry);
  const glass = new MeshPhysicalMaterial({
    color: "#a0c6cd",
    roughness: 0.15,
    metalness: 0.12,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
  });
  materials.add(glass);
  const water = new MeshStandardMaterial({ color: "#6eafb6", roughness: 0.22, metalness: 0.35 });
  materials.add(water);
  const line = material("#f1eee0"),
    board = material("#315757");
  function box(
    mat,
    x,
    y,
    z,
    w,
    h,
    d,
    { solid = false, name = "structure", rotation = 0, shadow = true } = {},
  ) {
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push({ x, y, z, w, h, d, rotation, shadow });
    if (solid)
      bounds.push({
        name,
        box: new Box3(
          new Vector3(x - w / 2, y - h / 2, z - d / 2),
          new Vector3(x + w / 2, y + h / 2, z + d / 2),
        ),
      });
  }
  function shape(geometry, mat, x, y, z, rotationX = 0, rotationZ = 0) {
    geometries.add(geometry);
    const mesh = new Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotationX, 0, rotationZ);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  function post(mat, x, z, height = 3, radius = 0.065) {
    return shape(new CylinderGeometry(radius, radius, height, 8), mat, x, height / 2, z);
  }
  function windowFront(x, z, width = 2.6) {
    box(glass, x, 2.2, z, width, 2.35, 0.06, { shadow: false });
    for (const sx of [-1, 1]) box(metal, x + (sx * width) / 2, 2.2, z, 0.07, 2.5, 0.1);
    box(metal, x, 2.2, z, 0.045, 2.4, 0.11);
    for (const y of [1.0, 3.4]) box(metal, x, y, z, width + 0.12, 0.07, 0.11);
    box(white, x, 0.75, z, width + 0.35, 0.38, 0.3);
  }
  function desk(x, z, mat = timber) {
    box(mat, x, 0.83, z, 1.25, 0.09, 0.7, { solid: true, name: "desk" });
    for (const dx of [-0.49, 0.49])
      for (const dz of [-0.24, 0.24]) box(metal, x + dx, 0.41, z + dz, 0.055, 0.8, 0.055);
    box(blue, x, 0.46, z + 0.8, 0.48, 0.08, 0.46, { solid: true, name: "chair" });
    box(blue, x, 0.79, z + 1.02, 0.48, 0.57, 0.07, { solid: true, name: "chair" });
    for (const dx of [-0.2, 0.2])
      for (const dz of [-0.17, 0.17]) box(metal, x + dx, 0.23, z + 0.8 + dz, 0.045, 0.46, 0.045);
    box(paper, x + 0.2, 0.897, z, 0.3, 0.025, 0.23);
    box(teal, x - 0.28, 0.896, z, 0.23, 0.025, 0.32);
  }
  function bench(x, z, rotation = 0) {
    for (let i = 0; i < 4; i++)
      box(timber, x, 0.57, z + (i - 1.5) * 0.14, 2.6, 0.08, 0.115, { rotation });
    for (const dx of [-0.95, 0.95]) box(metal, x + dx, 0.28, z, 0.1, 0.55, 0.7);
  }
  function tree(x, z, scale = 1) {
    if (!treeBatches.has(timber)) treeBatches.set(timber, { geometry: trunkGeometry, items: [] });
    treeBatches
      .get(timber)
      .items.push({
        x,
        y: 1.4 * scale,
        z,
        sx: 0.25 * scale,
        sy: 2.8 * scale,
        sz: 0.25 * scale,
        rotation: 0,
      });
    const count = mobile ? 2 : 4;
    for (let i = 0; i < count; i++) {
      const mat = i % 2 ? leafA : leafB,
        radius = (1.25 + random() * 0.35) * scale;
      if (!treeBatches.has(mat)) treeBatches.set(mat, { geometry: foliageGeometry, items: [] });
      treeBatches
        .get(mat)
        .items.push({
          x: x + (random() - 0.5) * scale,
          y: 3.1 * scale + random() * 0.75 * scale,
          z: z + (random() - 0.5) * scale,
          sx: radius,
          sy: radius * 1.18,
          sz: radius,
          rotation: random() * 3,
        });
    }
  }
  // Landscape, grounds and the clear arrival axis.
  box(grass, 0, -0.22, -8, 126, 0.4, 128, { shadow: false });
  box(pavement, 0, -0.01, 27, 58, 0.14, 22);
  box(concrete, 0, 0.025, 23, 8, 0.12, 25);
  box(clay, -35, 0.015, 8, 18, 0.12, 26);
  for (let i = 0; i < 6; i++) box(line, -35, 0.09, -3 + i * 4, 12, 0.025, 0.08);
  for (const x of [-30, 30])
    for (const z of [17, 29, 39]) {
      box(white, x, 0.32, z, 4, 0.65, 4);
      box(soil, x, 0.67, z, 3.7, 0.06, 3.7);
      tree(x, z, 0.85);
    }
  for (const x of [-47, 48])
    for (const z of [-44, -27, -10, 7, 24, 43]) tree(x, z, 1.1 + random() * 0.3);
  for (let x = -39; x <= 39; x += 13) tree(x, -51, 1.1);
  // Two single-storey classroom wings, sharing a wide central corridor.
  for (const side of [-1, 1]) {
    const cx = side * 13;
    box(concrete, cx, 0.05, 0, 20, 0.18, 24);
    box(stone, side * 23, 2.2, 0, 0.35, 4.4, 24, { solid: true, name: "outer classroom wall" });
    box(stone, cx, 2.2, -12, 20, 4.4, 0.35, { solid: true, name: "classroom rear wall" });
    box(stone, side * 3, 2.2, -3.5, 0.3, 4.4, 17, { solid: true, name: "corridor partition" });
    box(stone, side * 3, 2.2, 9.5, 0.3, 4.4, 5, { solid: true, name: "corridor partition" });
    box(white, side * 3, 3.65, 6, 0.35, 1.4, 2, { solid: true, name: "classroom door lintel" });
    box(timber, side * 3.1, 1.5, 8, 0.1, 3, 1.7);
    // Front glazing sits above solid low sill; room furniture is modeled inside.
    box(stone, cx, 0.45, 12, 20, 0.9, 0.32, { solid: true, name: "classroom front sill" });
    box(white, cx, 3.95, 12, 20, 0.9, 0.36, { solid: true, name: "front beam" });
    for (let k = 0; k < 6; k++) windowFront(side * (4.65 + k * 3.1), 12.05, 2.55);
    box(white, cx, 4.48, 0, 20.7, 0.22, 24.7, { solid: true, name: "classroom roof" });
    box(stone, cx, 4.82, 12.22, 20.8, 0.5, 0.26);
    box(stone, cx, 4.82, -12.22, 20.8, 0.5, 0.26);
    box(white, side * 23.2, 4.82, 0, 0.28, 0.5, 24.8);
    for (let z = -9; z <= 9; z += 4.5) {
      box(blue, side * 23.25, 2.2, z, 0.12, 2.4, 2.7);
      box(white, side * 23.32, 0.7, z, 0.14, 0.22, 3.2);
    }
    box(board, cx, 2.15, -11.7, 8.4, 1.7, 0.08);
    box(timber, cx, 1.22, -11.58, 8.6, 0.09, 0.24);
    box(timber, cx, 0.85, -8, 2.8, 0.14, 1.2, { solid: true, name: "teacher desk" });
    box(teal, cx, 0.38, -8, 2.6, 0.76, 0.95, { solid: true, name: "teacher desk" });
    for (let row = 0; row < 3; row++)
      for (let column = 0; column < 4; column++) desk(side * (8 + column * 4), -5 + row * 4);
    box(white, side * 21, 1.1, -9, 2, 2.2, 1);
    for (let shelf = 0; shelf < 3; shelf++)
      for (let b = 0; b < 8; b++)
        box(
          b % 2 ? blue : teal,
          side * 21 + (b - 3.5) * 0.18,
          0.5 + shelf * 0.65,
          -8.46,
          0.12,
          0.45,
          0.08,
        );
    for (let x = side * 6; Math.abs(x) <= 20; x += side * 4.8)
      box(charcoal, x, 4.65, -5, 3.8, 0.05, 6);
  }
  // Open entrance and covered central corridor: no invisible closed doors.
  box(concrete, 0, 0.06, 3, 6, 0.16, 34);
  box(white, 0, 4.4, 3, 6.6, 0.2, 34.5, { solid: true, name: "corridor roof" });
  box(white, 0, 4.48, 17, 10, 0.25, 8);
  for (const x of [-4.2, 4.2])
    box(stone, x, 2.2, 20, 0.55, 4.4, 0.55, { solid: true, name: "entrance column" });
  box(timber, 0, 3.83, 20, 9, 0.62, 0.35, { solid: true, name: "entrance lintel" });
  for (const x of [-2.75, 2.75]) {
    box(metal, x, 1.65, 20, 0.07, 3.3, 0.08);
    box(glass, x, 1.65, 20, 2.5, 3.3, 0.07, { shadow: false });
  }
  // Brand sign is a label, not an invented school identity.
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 128;
  const sc = signCanvas.getContext("2d");
  sc.fillStyle = "#142b4a";
  sc.fillRect(0, 0, 512, 128);
  sc.fillStyle = "#f5f1e7";
  sc.font = "bold 64px Arial";
  sc.textAlign = "center";
  sc.textBaseline = "middle";
  sc.fillText("ORBIT", 256, 67);
  const signTexture = new CanvasTexture(signCanvas);
  signTexture.colorSpace = SRGBColorSpace;
  textures.add(signTexture);
  const signMaterial = new MeshBasicMaterial({ map: signTexture });
  materials.add(signMaterial);
  shape(new BoxGeometry(4.4, 1.1, 0.08), signMaterial, 0, 4.4, 20.22);
  // Courtyard: benches and planters leave the cross-campus route clear.
  box(pavement, 0, 0.03, -24, 15, 0.15, 22);
  box(concrete, 0, 0.04, -22, 46, 0.12, 3.2);
  for (const x of [-5, 5]) {
    box(white, x, 0.35, -28, 3.6, 0.7, 4);
    box(soil, x, 0.72, -28, 3.3, 0.07, 3.7);
    tree(x, -28, 0.82);
    bench(x, -24.8);
  }
  shape(new CylinderGeometry(2.0, 2.0, 0.38, 32), concrete, 0, 0.26, -30);
  shape(new CylinderGeometry(1.75, 1.75, 0.04, 32), water, 0, 0.48, -30);
  for (const x of [-2.45, 2.45]) for (const z of [-3, -9]) box(white, x, 0.5, z, 0.65, 1, 0.7);
  // Sports field with actual markings, nets, perimeter and an open gate.
  box(clay, 29, 0.035, -31, 30, 0.15, 26);
  box(sport, 29, 0.12, -31, 26, 0.08, 22);
  for (let i = 0; i < 6; i++)
    box(i % 2 ? sport : sportLight, 29, 0.168, -40 + i * 3.6, 25.8, 0.018, 3.6);
  for (const z of [-41.6, -20.4]) box(line, 29, 0.19, z, 25.2, 0.025, 0.08);
  for (const x of [16.4, 41.6]) box(line, x, 0.19, -31, 0.08, 0.025, 21.2);
  box(line, 29, 0.19, -31, 25.2, 0.025, 0.08);
  shape(new TorusGeometry(2.8, 0.035, 5, 48), line, 29, 0.195, -31, Math.PI / 2);
  for (const z of [-40.8, -21.2]) {
    for (const x of [26.8, 31.2]) post(line, x, z, 2.4, 0.065);
    box(line, 29, 2.38, z, 4.55, 0.1, 0.1);
    for (let x = 26.8; x <= 31.2; x += 0.28)
      box(line, x, 1.2, z + (z < -30 ? -0.8 : 0.8), 0.015, 2.3, 0.015);
    for (let y = 0.2; y < 2.4; y += 0.28)
      box(line, 29, y, z + (z < -30 ? -0.8 : 0.8), 4.4, 0.015, 0.015);
  }
  for (let z = -43; z <= -20; z += 2.5) post(metal, 44, z, 2.8, 0.035);
  for (let x = 15; x <= 44; x += 2.5) post(metal, x, -44, 2.8, 0.035);
  // Cafeteria: east doorway lines up with the courtyard route.
  box(concrete, -24, 0.055, -26, 16, 0.17, 16);
  box(stone, -32, 2.1, -26, 0.3, 4.2, 16, { solid: true, name: "cafeteria west wall" });
  box(stone, -24, 2.1, -34, 16, 4.2, 0.3, { solid: true, name: "cafeteria rear wall" });
  box(stone, -16, 2.1, -28.6, 0.3, 4.2, 10.8, { solid: true, name: "cafeteria east wall" });
  box(stone, -16, 2.1, -19.4, 0.3, 4.2, 2.8, { solid: true, name: "cafeteria east wall" });
  box(white, -16, 3.6, -22, 0.35, 1.2, 2.4, { solid: true, name: "cafeteria door lintel" });
  box(stone, -24, 0.4, -18, 16, 0.8, 0.3, { solid: true, name: "cafeteria front sill" });
  for (let x = -30.5; x <= -17; x += 3.2) windowFront(x, -17.95, 2.5);
  box(timber, -24, 4.28, -26, 16.5, 0.2, 16.5, { solid: true, name: "cafeteria roof" });
  box(white, -24, 4.52, -18.2, 16.6, 0.4, 0.26);
  box(charcoal, -25, 0.95, -32, 10, 0.13, 1.3, { solid: true, name: "cafeteria counter" });
  box(white, -25, 0.46, -32, 10, 0.9, 1.1, { solid: true, name: "cafeteria counter" });
  for (const x of [-28, -23])
    for (const z of [-28, -24]) {
      box(timber, x, 0.86, z, 2.2, 0.1, 1.05, { solid: true, name: "cafeteria table" });
      for (const dx of [-0.85, 0.85]) box(metal, x + dx, 0.42, z, 0.08, 0.82, 0.8);
      bench(x, z - 1.1);
      bench(x, z + 1.1);
      box(paper, x + 0.3, 0.93, z, 0.34, 0.025, 0.22);
    }
  for (const x of [-28, -23]) shape(new CylinderGeometry(0.4, 0.25, 0.4, 16), white, x, 3.35, -26);
  // Library and laboratory: original materials, full interiors and clear doors.
  for (const cx of [-36, 36]) {
    const label = cx < 0 ? "library" : "science lab";
    box(concrete, cx, 0.03, 3, 12, 0.16, 12);
    for (const side of [-1, 1])
      box(stone, cx + side * 6, 2, 3, 0.3, 4, 12, { solid: true, name: label + " side wall" });
    box(stone, cx, 2, -3, 12, 4, 0.3, { solid: true, name: label + " rear wall" });
    for (const side of [-1, 1]) {
      box(stone, cx + side * 3.75, 2, 9, 4.5, 4, 0.3, { solid: true, name: label + " front wall" });
      windowFront(cx + side * 3.75, 9.18, 2.6);
    }
    box(white, cx, 3.5, 9, 3, 1, 0.32, { solid: true, name: label + " doorway lintel" });
    box(white, cx, 4.2, 3, 12.5, 0.3, 12.5, { solid: true, name: label + " roof" });
    box(concrete, cx, 0.01, 13, 3, 0.12, 8);
    const sign = document.createElement("canvas");
    sign.width = 512;
    sign.height = 128;
    const ink = sign.getContext("2d");
    ink.fillStyle = white.color.getStyle();
    ink.fillRect(0, 0, 512, 128);
    ink.fillStyle = blue.color.getStyle();
    ink.font = "bold 44px sans-serif";
    ink.textAlign = "center";
    ink.fillText(cx < 0 ? "LIBRARY" : "SCIENCE LAB", 256, 80);
    const map = new CanvasTexture(sign);
    map.colorSpace = SRGBColorSpace;
    textures.add(map);
    const signMat = new MeshBasicMaterial({ map });
    materials.add(signMat);
    box(signMat, cx, 3.3, 9.25, 2.8, 0.7, 0.03, { shadow: false });
    if (cx < 0) {
      for (const x of [cx - 4.5, cx + 4.5]) {
        box(timber, x, 1.25, -1.8, 1.8, 2.5, 0.7, { solid: true, name: "library shelf" });
        for (const y of [0.5, 1.25, 2])
          for (let i = 0; i < 8; i++)
            box(i % 2 ? paper : blue, x - 0.7 + i * 0.2, y, -1.35, 0.14, 0.45, 0.22);
      }
      desk(cx - 3, 3);
      desk(cx + 3, 3);
      box(board, cx, 2.1, -2.75, 4, 1.6, 0.08);
    } else {
      for (const x of [cx - 3.5, cx + 3.5]) {
        box(metal, x, 0.45, 1, 2.5, 0.9, 1, { solid: true, name: "lab bench" });
        box(paper, x, 0.96, 1, 2.7, 0.12, 1.2);
        for (const dx of [-0.6, 0.6])
          shape(new CylinderGeometry(0.18, 0.25, 0.45, 12), glass, x + dx, 1.24, 1);
        box(teal, x, 1.05, 1.2, 0.4, 0.1, 0.3);
      }
      box(board, cx, 2.1, -2.75, 5, 1.8, 0.08);
      post(metal, cx + 3, -1, 2);
      box(metal, cx + 2.4, 1.95, -1, 1.3, 0.08, 0.08);
      shape(new SphereGeometry(0.16, 12, 8), blue, cx + 2.1, 1.12, -1);
      box(metal, cx + 2.1, 1.56, -1, 0.02, 0.9, 0.02);
    }
  }
  // Sparse illustrative school figures; no names or relationship to actual membership.
  for (const [x, z] of [
    [-5, -26],
    [5, -28],
    [-39, 5],
    [39, 5],
  ]) {
    box(blue, x, 1.1, z, 0.42, 0.62, 0.25);
    shape(new SphereGeometry(0.19, 10, 8), timber, x, 1.63, z);
    for (const side of [-1, 1]) {
      box(charcoal, x + side * 0.13, 0.5, z, 0.16, 0.62, 0.18);
      box(blue, x + side * 0.29, 1.04, z, 0.12, 0.55, 0.14);
    }
  }
  // Static repeated architectural pieces share geometry/material batches.
  const dummy = new Object3D();
  for (const [mat, items] of batches) {
    const mesh = new InstancedMesh(boxGeometry, mat, items.length);
    items.forEach((item, index) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.rotation.set(0, item.rotation, 0);
      dummy.scale.set(item.w, item.h, item.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.castShadow = mat !== glass;
    mesh.receiveShadow = true;
    group.add(mesh);
    instances.push(mesh);
  }
  for (const [mat, { geometry, items }] of treeBatches) {
    const mesh = new InstancedMesh(geometry, mat, items.length);
    items.forEach((item, index) => {
      dummy.position.set(item.x, item.y, item.z);
      dummy.rotation.set(0, item.rotation, 0);
      dummy.scale.set(item.sx, item.sy, item.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    instances.push(mesh);
  }
  return {
    group,
    bounds,
    stats: {
      batches: instances.length,
      instances: [...batches.values()].reduce((sum, items) => sum + items.length, 0),
      textures: textures.size,
      geometries: geometries.size,
    },
    dispose() {
      instances.forEach((mesh) => mesh.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      group.clear();
    },
  };
}
