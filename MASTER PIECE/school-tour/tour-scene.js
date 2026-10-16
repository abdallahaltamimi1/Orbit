import "./physics-laboratory.js";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  Fog,
  HemisphereLight,
  DirectionalLight,
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  Vector3,
  Ray,
} from "three";
import { buildCampus } from "./campus.js";
import { createJourney, travelEase } from "./journey.js";

window.OrbitSchoolTour = {
  create(
    host,
    {
      locations,
      initialProgress = 0,
      onLocation = () => {},
      onReady = () => {},
      onError = () => {},
    } = {},
  ) {
    if (host._schoolTour) return host._schoolTour;
    const canvas = document.createElement("canvas");
    canvas.id = "tour-canvas";
    canvas.setAttribute("aria-hidden", "true");
    let renderer,
      campus,
      resizeObserver,
      frame = 0,
      disposed = false,
      suspended = false,
      visible = !document.hidden;
    let width = 0,
      height = 0,
      progress = initialProgress,
      flight = null,
      lastLocation = -1,
      paused = false,
      simple = false,
      readyNotified = false;
    const position = new Vector3(),
      look = new Vector3(),
      projected = new Vector3(),
      direction = new Vector3(),
      ray = new Ray();
    const hit = new Vector3(),
      cameraWorld = new Vector3();
    try {
      const context = canvas.getContext("webgl2", {
        antialias: true,
        alpha: false,
        powerPreference: "low-power",
      });
      if (!context) throw Error("WEBGL_UNAVAILABLE");
      renderer = new WebGLRenderer({ canvas, context, antialias: true });
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.type = PCFSoftShadowMap;
      renderer.shadowMap.autoUpdate = false;
      const scene = new Scene();
      scene.background = new Color("#dbe9ee");
      scene.fog = new Fog("#e8e8dc", 115, 200);
      const camera = new PerspectiveCamera(50, 1, 0.12, 250);
      scene.add(new HemisphereLight("#e6f0ff", "#929579", 2.4));
      const sun = new DirectionalLight("#fff0d8", 3.2);
      sun.position.set(-35, 45, 30);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, {
        left: -64,
        right: 64,
        top: 64,
        bottom: -64,
        near: 1,
        far: 140,
      });
      sun.shadow.bias = -0.0006;
      sun.shadow.normalBias = 0.025;
      scene.add(sun);
      campus = buildCampus({ mobile: innerWidth < 760 });
      scene.add(campus.group);
      const journey = createJourney(locations),
        pathCollisions = journey.collisions(campus.bounds);
      // A broken authored route must never run through solids.
      if (pathCollisions.length)
        throw Object.assign(Error("UNSAFE_CAMERA_PATH"), { collisions: pathCollisions });
      host.append(canvas);
      const hotspots = [...document.querySelectorAll("[data-tour-hotspot]")].map((button) => ({
        button,
        location: locations.find((l) => l.id === button.dataset.tourHotspot),
        world: new Vector3(),
      }));
      function drawable() {
        return !disposed && !suspended && visible && width > 0 && height > 0;
      }
      function cancel() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      }
      function request() {
        if (drawable() && !frame) frame = requestAnimationFrame(tick);
      }
      function location() {
        return Math.max(0, Math.min(locations.length - 1, Math.round(progress)));
      }
      function projectMarker(item) {
        item.world.fromArray(item.location.marker);
        projected.copy(item.world).project(camera);
        let occluded = false;
        direction.copy(item.world).sub(camera.position);
        const distance = direction.length();
        direction.normalize();
        ray.set(camera.position, direction);
        for (const solid of campus.bounds) {
          if (
            ray.intersectBox(solid.box, hit) &&
            hit.distanceTo(camera.position) < distance - 0.25
          ) {
            occluded = true;
            break;
          }
        }
        const shown =
          width >= 760 &&
          !occluded &&
          projected.z > -1 &&
          projected.z < 1 &&
          Math.abs(projected.x) < 0.94 &&
          Math.abs(projected.y) < 0.87;
        item.button.hidden = !shown;
        if (shown)
          item.button.style.transform =
            "translate3d(" +
            ((projected.x + 1) * width) / 2 +
            "px," +
            ((1 - projected.y) * height) / 2 +
            "px,0) translate(-50%,-100%)";
      }
      function render(arrival = false) {
        journey.sample(progress, position, look);
        // Wider establishing view on portrait screens, entirely outside the building.
        const overviewWeight =
          Math.max(0, 1 - progress) + Math.max(0, progress - (locations.length - 2));
        if (width < 760 && overviewWeight > 0)
          position
            .sub(look)
            .multiplyScalar(1 + 0.65 * overviewWeight)
            .add(look);
        camera.position.copy(position);
        camera.lookAt(look);
        camera.updateMatrixWorld();
        renderer.render(scene, camera);
        renderer.shadowMap.needsUpdate = false;
        hotspots.forEach(projectMarker);
        const current = location();
        if (
          (arrival || !flight || flight.kind !== "navigation") &&
          (arrival || current !== lastLocation)
        ) {
          lastLocation = current;
          onLocation(current);
        }
      }
      function tick(now) {
        frame = 0;
        if (!drawable()) return;
        let arrived = false;
        if (flight) {
          if (!flight.started) flight.started = now;
          const t = Math.min(1, (now - flight.started) / flight.duration);
          progress = flight.from + (flight.to - flight.from) * travelEase(t);
          if (t === 1) {
            progress = flight.to;
            arrived = flight.kind === "navigation";
            flight = null;
          }
        }
        try {
          render(arrived);
        } catch {
          dispose();
          onError("SCENE_RENDER_FAILED");
          return;
        }
        if (!readyNotified) {
          readyNotified = true;
          onReady(api);
        }
        if (flight) request();
      }
      function setProgress(value, { instant = false, navigation = false } = {}) {
        if (disposed) return;
        const target = Math.max(0, Math.min(locations.length - 1, value));
        if (simple || paused || instant) {
          cancel();
          flight = null;
          progress = target;
          request();
          return;
        }
        const distance = Math.abs(target - progress);
        if (distance < 0.0005) {
          flight = null;
          progress = target;
          request();
          return;
        }
        flight = {
          from: progress,
          to: target,
          duration: navigation ? Math.min(3600, 1000 + distance * 360) : 220,
          started: 0,
          kind: navigation ? "navigation" : "scroll",
        };
        request();
      }
      function resize() {
        if (disposed || suspended) return;
        width = host.clientWidth;
        height = host.clientHeight;
        if (!width || !height) {
          cancel();
          return;
        }
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, width < 760 ? 1.25 : 1.5));
        renderer.setSize(width, height, false);
        renderer.shadowMap.enabled = width >= 760;
        renderer.shadowMap.needsUpdate = true;
        camera.aspect = width / height;
        camera.fov = width < 760 ? 66 : 50;
        camera.updateProjectionMatrix();
        request();
      }
      function visibility() {
        visible = !document.hidden;
        if (!visible) {
          cancel();
          if (flight) {
            progress = flight.to;
            flight = null;
          }
        } else request();
      }
      function suspend(event) {
        suspended = true;
        cancel();
        resizeObserver.disconnect();
        if (!event.persisted) dispose();
      }
      function resume() {
        if (disposed) return;
        suspended = false;
        visible = !document.hidden;
        resizeObserver.observe(host);
        resize();
      }
      function contextLost(event) {
        event.preventDefault();
        dispose();
        onError("WEBGL_CONTEXT_LOST");
      }
      function dispose() {
        if (disposed) return;
        disposed = true;
        cancel();
        flight = null;
        resizeObserver?.disconnect();
        document.removeEventListener("visibilitychange", visibility);
        window.removeEventListener("pagehide", suspend);
        window.removeEventListener("pageshow", resume);
        canvas.removeEventListener("webglcontextlost", contextLost);
        campus?.dispose();
        sun.shadow.map?.dispose();
        renderer?.dispose();
        renderer?.forceContextLoss();
        canvas.remove();
        delete host._schoolTour;
        hotspots.forEach(({ button }) => {
          button.hidden = true;
        });
      }
      const api = {
        setProgress,
        setSimple(value) {
          simple = Boolean(value);
          if (simple && flight) {
            progress = flight.to;
            flight = null;
            cancel();
          }
          request();
        },
        setPaused(value) {
          paused = Boolean(value);
          if (paused) {
            flight = null;
            cancel();
          }
          request();
        },
        redraw: request,
        dispose,
        project(id) {
          const item = hotspots.find((item) => item.location.id === id);
          if (!item) return null;
          projected.copy(item.world).project(camera);
          return {
            x: ((projected.x + 1) * width) / 2,
            y: ((1 - projected.y) * height) / 2,
            visible: !item.button.hidden,
          };
        },
        inspect() {
          return {
            disposed,
            suspended,
            framePending: Boolean(frame),
            progress,
            location: locations[location()].id,
            paused,
            simple,
            position: camera.position.toArray(),
            renders: renderer.info.render.frame,
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures,
            canvasCount: host.querySelectorAll("canvas").length,
            pathCollisions,
            model: campus.stats,
          };
        },
      };
      host._schoolTour = api;
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      document.addEventListener("visibilitychange", visibility);
      window.addEventListener("pagehide", suspend);
      window.addEventListener("pageshow", resume);
      canvas.addEventListener("webglcontextlost", contextLost);
      resize();
      return api;
    } catch (error) {
      campus?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      canvas.remove();
      resizeObserver?.disconnect();
      onError(error.message, error.collisions || []);
      return null;
    }
  },
};
