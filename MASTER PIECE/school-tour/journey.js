import { CatmullRomCurve3, Vector3, Box3 } from "three";

const v = (p) => new Vector3(...p);
// Every interior leg follows door openings and the clear circulation aisles.
const via = [
  [
    [-30, 16, 42],
    [-10, 4, 32],
    [0, 1.75, 28],
  ],
  [
    [0, 1.75, 22],
    [0, 1.75, 17],
    [0, 1.75, 12],
  ],
  [
    [0, 1.75, 6],
    [-3.8, 1.75, 6],
  ],
  [
    [-4, 1.75, 6],
    [0, 1.75, 6],
    [4, 1.75, 6],
  ],
  [
    [4, 1.75, 6],
    [0, 1.75, 6],
    [0, 1.75, -8],
    [0, 1.75, -15],
  ],
  [
    [0, 1.75, -22],
    [10, 1.75, -22],
  ],
  [
    [10, 1.75, -22],
    [0, 1.75, -22],
    [-12, 1.75, -22],
    [-17, 1.75, -22],
  ],
  [
    [-17, 1.75, -22],
    [-12, 1.75, -22],
    [-12, 1.75, -15],
    [-28, 1.75, -15],
    [-45, 1.75, -15],
    [-45, 1.75, 16],
    [-36, 1.75, 16],
  ],
  [
    [-36, 1.75, 16],
    [-36, 1.75, 28],
    [-12, 1.75, 28],
    [12, 1.75, 28],
    [36, 1.75, 28],
    [36, 1.75, 16],
  ],
  [
    [36, 1.75, 16],
    [45, 1.75, 18],
    [48, 8, 0],
    [48, 18, -32],
    [0, 27, -55],
  ],
];

export function createJourney(locations) {
  const curves = via.map(
    (points, i) =>
      new CatmullRomCurve3(
        [v(locations[i].position), ...points.map(v), v(locations[i + 1].position)],
        false,
        "centripetal",
      ),
  );
  const eye = new Vector3(),
    aim = new Vector3();
  function sample(progress, position = eye, look = aim) {
    const p = Math.max(0, Math.min(locations.length - 1, progress)),
      leg = Math.min(curves.length - 1, Math.floor(p)),
      fraction = p - leg;
    curves[leg].getPointAt(fraction, position);
    // A smooth view turn is separate from the traversable position path.
    const eased = fraction * fraction * (3 - 2 * fraction);
    look.fromArray(locations[leg].look).lerp(v(locations[leg + 1].look), eased);
    return { position, look };
  }
  function collisions(bounds) {
    const hits = [];
    for (let leg = 0; leg < curves.length; leg++)
      for (let step = 0; step <= 400; step++) {
        const p = curves[leg].getPointAt(step / 400);
        for (const item of bounds) {
          const b = item.box;
          // Walking clearance includes a body's footprint, not only lens height.
          if (
            p.x > b.min.x - 0.22 &&
            p.x < b.max.x + 0.22 &&
            p.z > b.min.z - 0.22 &&
            p.z < b.max.z + 0.22 &&
            p.y - 0.16 > b.min.y &&
            p.y - 1.6 < b.max.y
          ) {
            hits.push({ leg, step, solid: item.name, position: p.toArray() });
            break;
          }
        }
      }
    return hits;
  }
  return { sample, collisions, curves };
}

// Exact existing strong ease-in-out token (.77,0,.175,1), solved in x.
export function travelEase(t) {
  const cubic = (s, a, b) => 3 * (1 - s) * (1 - s) * s * a + 3 * (1 - s) * s * s * b + s * s * s;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    if (cubic(mid, 0.77, 0.175) < t) lo = mid;
    else hi = mid;
  }
  return cubic((lo + hi) / 2, 0, 1);
}
