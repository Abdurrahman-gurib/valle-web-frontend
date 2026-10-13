import { useEffect, useRef } from 'react';

/**
 * Ambient Three.js layer behind the park map: a slow drift of green and
 * yellow motes, like spray and fireflies over the valley. Decorative only.
 *
 * Cost control: desktop only (pointer: fine, 900px+), never for reduced
 * motion, Three.js is imported only when the section scrolls into view, the
 * render loop stops whenever the section is off screen or the tab is hidden,
 * pixel ratio is capped, and everything is disposed on unmount.
 */
export function ValleyMist() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(min-width: 900px) and (pointer: fine)').matches) return;

    let disposed = false;
    let stop: (() => void) | undefined;

    const boot = async () => {
      const THREE = await import('three');
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 1, 1000);
      camera.position.z = 400;

      const COUNT = 260;
      const pos = new Float32Array(COUNT * 3);
      const col = new Float32Array(COUNT * 3);
      const speed = new Float32Array(COUNT);
      const green = new THREE.Color('#33FF74');
      const yellow = new THREE.Color('#FFFC33');
      for (let i = 0; i < COUNT; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 900;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 600;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 300;
        const c = Math.random() < 0.7 ? green : yellow;
        col.set([c.r, c.g, c.b], i * 3);
        speed[i] = 0.12 + Math.random() * 0.3;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({ size: 3.2, vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      let raf = 0;
      let running = false;
      let tick = 0;
      const frame = () => {
        tick += 1;
        for (let i = 0; i < COUNT; i++) {
          pos[i * 3 + 1] += speed[i];
          pos[i * 3] += Math.sin((tick + i * 37) / 140) * 0.15;
          if (pos[i * 3 + 1] > 300) pos[i * 3 + 1] = -300;
        }
        geo.attributes.position.needsUpdate = true;
        points.rotation.y = Math.sin(tick / 900) * 0.15;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };
      const play = () => { if (!running && !document.hidden) { running = true; raf = requestAnimationFrame(frame); } };
      const pause = () => { running = false; cancelAnimationFrame(raf); };

      const io = new IntersectionObserver(([e]) => (e.isIntersecting ? play() : pause()), { threshold: 0.05 });
      io.observe(el);
      const onVis = () => (document.hidden ? pause() : play());
      document.addEventListener('visibilitychange', onVis);
      const onResize = () => {
        renderer.setSize(el.clientWidth, el.clientHeight);
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.updateProjectionMatrix();
      };
      window.addEventListener('resize', onResize);

      stop = () => {
        pause();
        io.disconnect();
        document.removeEventListener('visibilitychange', onVis);
        window.removeEventListener('resize', onResize);
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    };

    // load Three.js only when the section is about to be seen
    const gate = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { gate.disconnect(); void boot(); }
    }, { rootMargin: '200px' });
    gate.observe(el);

    return () => { disposed = true; gate.disconnect(); stop?.(); };
  }, []);

  return <div ref={host} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} data-testid="valley-mist" />;
}
