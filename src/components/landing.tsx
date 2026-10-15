"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Landing: a turbofan face turning slowly in warm light. mode "leave" spools it up and flies the camera into the hub;
// onDone fires when the screen has gone dark, so the simulator can take over. mode "enter" is the way back: it starts
// inside the hub, holds while the landing fades in over the simulator, then pulls out as the fan spins down.
const BLADES = 64, R0 = 0.34, R1 = 1.6;

// One swept, twisted fan blade as a thin ribbon: along the span (r) the leading edge sweeps forward and the
// pitch flattens toward the tip, like a real fan stage.
function bladeGeometry() {
  const nr = 24, nc = 6, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= nr; i++) {
    const t = i / nr, r = R0 + (R1 - R0) * t, sweep = 0.28 * t * t, pitch = 1.05 - 0.6 * t, chord = 0.1 + 0.05 * Math.sin(Math.PI * t);
    for (let j = 0; j <= nc; j++) {
      const c = (j / nc - 0.5) * chord, a = sweep + (c * Math.cos(pitch)) / r;
      pos.push(r * Math.cos(a), r * Math.sin(a), c * Math.sin(pitch));
    }
  }
  for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { const a = i * (nc + 1) + j, b = a + nc + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export type FanMode = "idle" | "leave" | "enter";
const FLY = 1500, HOLD = 900;   // ms: the fly-in/out, and the hold inside the hub while the page fades in

export function Landing({ mode, onDone }: { mode: FanMode; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const anim = useRef<{ dir: 1 | -1; t0: number; fired: boolean } | null>(null);
  const done = useRef(onDone); done.current = onDone;

  useEffect(() => {
    const cv = canvas.current!, renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.75;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050608);
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.12;
    const cam = new THREE.PerspectiveCamera(32, 1, 0.05, 50);

    const fan = new THREE.Group(); scene.add(fan);
    const metal = new THREE.MeshStandardMaterial({ color: 0xb48a5c, metalness: 0.92, roughness: 0.32, side: THREE.DoubleSide });
    const blade = bladeGeometry();
    for (let k = 0; k < BLADES; k++) { const m = new THREE.Mesh(blade, metal); m.rotation.z = (k / BLADES) * Math.PI * 2; fan.add(m); }
    const dark = new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.8, roughness: 0.45 });
    const hub = new THREE.Mesh(new THREE.ConeGeometry(R0 * 1.05, 0.55, 64), dark); hub.rotation.x = Math.PI / 2; hub.position.z = 0.22; fan.add(hub);
    const casing = new THREE.Mesh(new THREE.TorusGeometry(R1 + 0.07, 0.05, 24, 160), new THREE.MeshStandardMaterial({ color: 0x8a6a48, metalness: 0.95, roughness: 0.4 }));
    scene.add(casing);
    // Approach-blue rim on the casing: the one cool note, the colour of the approach surface in the simulator
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R1 + 0.125, 0.004, 8, 200), new THREE.MeshBasicMaterial({ color: 0x4f7dff, transparent: true, opacity: 0.55 }));
    scene.add(rim);

    const key = new THREE.DirectionalLight(0xffc48a, 2.6); key.position.set(2.5, 3, 2.2); scene.add(key);
    const fill = new THREE.DirectionalLight(0x6f86ff, 0.35); fill.position.set(-3, -1.5, 1); scene.add(fill);

    // Framing: the fan sits right of centre and tilted toward the text, cut by the frame like the hero shot; on narrow
    // screens it moves up behind the headline.
    let narrow = false;
    const frame = () => {
      const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); narrow = w < 768;
      const g = narrow ? [0.35, 0.75, -0.35] : [1.55, 0.3, -0.45], sc = narrow ? 0.85 : 1.3;
      fan.position.set(g[0], g[1], 0); casing.position.copy(fan.position); rim.position.copy(fan.position);
      fan.scale.setScalar(sc); casing.scale.setScalar(sc); rim.scale.setScalar(sc);
      fan.rotation.y = casing.rotation.y = rim.rotation.y = g[2];
    };
    const ro = new ResizeObserver(frame); ro.observe(cv); frame();

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let mx = 0, my = 0, spin = 0, last = performance.now(), alive = true;
    const onMove = (e: PointerEvent) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; };
    addEventListener("pointermove", onMove);
    const home = new THREE.Vector3(), look = new THREE.Vector3();
    const loop = (now: number) => {
      if (!alive) return; const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const A = anim.current, fly = reduced ? 300 : FLY, t = A ? now - A.t0 : 0;
      const p = !A ? 0 : A.dir > 0 ? Math.min(1, t / fly) : 1 - Math.min(1, Math.max(0, (t - HOLD) / fly)), e = p * p * (3 - 2 * p);
      spin += dt * (reduced ? 0 : 0.06 + 9 * e * e);   // idle turn ↔ spool-up
      fan.rotation.z = -spin;
      home.set(mx * 0.12, -my * 0.08, 5.2);
      look.copy(fan.position);
      // fly in: along the fan axis into the hub
      const axis = new THREE.Vector3(Math.sin(fan.rotation.y), 0, Math.cos(fan.rotation.y));
      const into = fan.position.clone().addScaledVector(axis, 0.35);
      cam.position.lerpVectors(home, into, e * e);
      cam.lookAt(new THREE.Vector3(0, 0, 0).lerp(look, 0.35 + 0.65 * e));
      key.intensity = 2.6 + 3 * e;
      renderer.render(scene, cam);
      if (A && !A.fired && (A.dir > 0 ? p >= 1 : t >= HOLD + fly)) { A.fired = true; done.current(); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => { alive = false; ro.disconnect(); removeEventListener("pointermove", onMove); pm.dispose(); blade.dispose(); renderer.dispose(); };
  }, []);

  useEffect(() => { anim.current = mode === "idle" ? null : { dir: mode === "leave" ? 1 : -1, t0: performance.now(), fired: false }; }, [mode]);

  return <canvas ref={canvas} className="absolute inset-0 h-full w-full" />;
}
