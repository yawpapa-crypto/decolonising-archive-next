"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * The spatial and temporal layer. Semantic content stays in normal document flow; this
 * only moves it. Everything is a transform or opacity change driven by ScrollTrigger,
 * loaded after first paint so the hero never waits on it. Skipped entirely for
 * visitors who ask for reduced motion.
 */
export default function HomeMotion() {
  useLayoutEffect(() => {
    document.querySelector(".ared-home")?.classList.add("is-motion");
  }, []);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".ared-home");
    let mm: { revert: () => void } | undefined;
    let io: IntersectionObserver | undefined;
    let heroObserver: IntersectionObserver | undefined;
    let cancelled = false;

    (async () => {
      try {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);

        const match = gsap.matchMedia();
        mm = match;

        match.add({ calm: "(prefers-reduced-motion: no-preference)", wide: "(min-width: 761px)" }, (ctx) => {
          const { calm, wide } = ctx.conditions as { calm: boolean; wide: boolean };
          if (!calm) {
            root?.classList.remove("is-motion");
            return;
          }
          const amp = wide ? 1 : 0.55;
          const scrub = { scrub: 0.8 };

          // Hero objects flow upward through a clipped, faded band and re-enter at the bottom,
          // each at its own pace, while tilting slowly (some turn in 3D). Others drift against scroll.
          const heroEl = document.querySelector<HTMLElement>(".ared-field--hero");
          const flows: Array<{ paused: (v?: boolean) => unknown }> = [];
          const geom = new Map<HTMLElement, { T: number; h: number }>();
          const heroObjs = gsap.utils.toArray<HTMLElement>(".ared-field--hero .ared-obj");
          let H = heroEl?.clientHeight ?? window.innerHeight;
          const measure = () => {
            H = heroEl?.clientHeight ?? window.innerHeight;
            heroObjs.forEach((el) => geom.set(el, { T: el.offsetTop, h: el.offsetHeight }));
          };
          measure();
          window.addEventListener("resize", measure);
          const scale = Math.min(1.25, Math.max(0.6, window.innerWidth / 1440));
          heroObjs.forEach((el, i) => {
            const depth = Number(el.dataset.depth ?? 0.5);
            const speed = (30 + depth * 50) * scale * (wide ? 1 : 0.7);
            const pad = 40;
            const g0 = geom.get(el) ?? { T: 0, h: 80 };
            const L = H + 2 * pad + g0.h;
            flows.push(
              gsap.to(el, {
                y: -L,
                duration: L / speed,
                ease: "none",
                repeat: -1,
                modifiers: {
                  y: gsap.utils.unitize((v: number) => {
                    const g = geom.get(el) ?? g0;
                    return gsap.utils.wrap(-(g.T + g.h + pad), H - g.T + pad, v);
                  }),
                },
              }),
            );
            const tile = el.querySelector<HTMLElement>(".ared-obj__tile");
            if (tile) {
              const dir = i % 2 ? 1 : -1;
              gsap.to(tile, { rotation: dir * (10 + (i % 5) * 3), duration: 4 + (i % 6), yoyo: true, repeat: -1, ease: "sine.inOut" });
              if (wide && i % 3 === 0) {
                gsap.to(tile, { rotationY: dir * 40, rotationX: -dir * 14, transformPerspective: 600, duration: 3.5 + (i % 4), yoyo: true, repeat: -1, ease: "sine.inOut" });
              }
            }
          });

          gsap.utils.toArray<HTMLElement>(".ared-field:not(.ared-field--hero) .ared-obj").forEach((el) => {
            const s = Number(el.dataset.speed ?? 0) * amp;
            const tile = el.querySelector<HTMLElement>(".ared-obj__tile");
            const trigger = { trigger: el, start: "top bottom", end: "bottom top", ...scrub };
            gsap.fromTo(el, { y: s * -110 }, { y: s * 110, ease: "none", scrollTrigger: trigger });
            if (tile) gsap.fromTo(tile, { rotation: -s * 7 }, { rotation: s * 7, ease: "none", scrollTrigger: trigger });
            const from = el.dataset.from;
            if (from) {
              gsap.fromTo(
                el,
                { x: (from === "l" ? -1 : 1) * (wide ? 170 : 90), autoAlpha: 0 },
                {
                  x: 0,
                  autoAlpha: 1,
                  ease: "power2.out",
                  scrollTrigger: { trigger: el, start: "top 94%", end: "top 62%", scrub: 0.6 },
                },
              );
            }
          });

          // The hero stops flowing once it is off screen.
          if (heroEl) {
            const heroIo = new IntersectionObserver(([en]) => flows.forEach((t) => t.paused(!en.isIntersecting)));
            heroIo.observe(heroEl);
            heroObserver = heroIo;
          }

          // Type arrives out of focus, as the reference's does.
          gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
            gsap.fromTo(
              el,
              { autoAlpha: 0.08, filter: "blur(9px)", y: 28 },
              {
                autoAlpha: 1,
                filter: "blur(0px)",
                y: 0,
                ease: "none",
                scrollTrigger: { trigger: el, start: "top 90%", end: "top 58%", scrub: 0.5 },
              },
            );
          });

          // Large images move at their own rate against the document.
          gsap.utils.toArray<HTMLElement>("[data-drift]").forEach((el) => {
            const d = Number(el.dataset.drift ?? 0) * amp;
            gsap.fromTo(el, { y: d }, {
              y: -d,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", ...scrub },
            });
          });
          gsap.utils.toArray<HTMLElement>("[data-zoom]").forEach((el) => {
            gsap.fromTo(el, { scale: 1.14 }, {
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top bottom", end: "top 25%", ...scrub },
            });
          });

          // The invitation's images travel with the scroll, each at its own depth and direction.
          gsap.utils.toArray<HTMLElement>(".ared-cta__image").forEach((el, i) => {
            const depth = (0.45 + (i % 4) * 0.3) * amp;
            const dir = i % 2 ? 1 : -1;
            gsap.fromTo(el, { y: 90 * depth, x: dir * 14 * depth, rotation: -dir * 3 }, {
              y: -90 * depth,
              x: -dir * 14 * depth,
              rotation: dir * 3,
              ease: "none",
              scrollTrigger: { trigger: ".ared-band--cta", start: "top bottom", end: "bottom top", ...scrub },
            });
          });

          // Pointer depth: the near objects lean a little against the cursor.
          let off = () => {};
          if (wide) {
            const invitation = document.querySelector<HTMLElement>(".ared-band--cta");
            const invitationImages = gsap.utils.toArray<HTMLElement>(".ared-cta__image img").map((el, i) => ({
              x: gsap.quickTo(el, "x", { duration: 1.2, ease: "power3.out" }),
              y: gsap.quickTo(el, "y", { duration: 1.2, ease: "power3.out" }),
              tilt: gsap.quickTo(el, "rotation", { duration: 1.2, ease: "power3.out" }),
              depth: 0.5 + (i % 4) * 0.25,
            }));
            const invitationMove = (e: PointerEvent) => {
              if (e.pointerType !== "mouse" || !invitation) return;
              const box = invitation.getBoundingClientRect();
              const x = (e.clientX - box.left) / box.width - 0.5;
              const y = (e.clientY - box.top) / box.height - 0.5;
              invitationImages.forEach(m => { m.x(x * 32 * m.depth); m.y(y * 24 * m.depth); m.tilt(x * 5 * m.depth); });
            };
            const invitationLeave = () => invitationImages.forEach(m => { m.x(0); m.y(0); m.tilt(0); });
            invitation?.addEventListener("pointermove", invitationMove, { passive: true });
            invitation?.addEventListener("pointerleave", invitationLeave);
            const movers = gsap.utils.toArray<HTMLElement>(".ared-obj").flatMap((el) => {
              const depth = Number(el.dataset.depth ?? 0);
              const p = el.querySelector<HTMLElement>(".ared-obj__p");
              if (!depth || !p) return [];
              return [{ depth, x: gsap.quickTo(p, "x", { duration: 1.1, ease: "power3.out" }), y: gsap.quickTo(p, "y", { duration: 1.1, ease: "power3.out" }) }];
            });
            const onMove = (e: PointerEvent) => {
              const nx = e.clientX / window.innerWidth - 0.5;
              const ny = e.clientY / window.innerHeight - 0.5;
              movers.forEach((m) => {
                m.x(-nx * m.depth * 26);
                m.y(-ny * m.depth * 26);
              });
            };
            window.addEventListener("pointermove", onMove, { passive: true });
            off = () => {
              window.removeEventListener("pointermove", onMove);
              invitation?.removeEventListener("pointermove", invitationMove);
              invitation?.removeEventListener("pointerleave", invitationLeave);
            };
          }

          // Objects far off screen stop drifting.
          io = new IntersectionObserver(
            (entries) => entries.forEach((en) => ((en.target as HTMLElement).dataset.off = en.isIntersecting ? "0" : "1")),
            { rootMargin: "20% 0px" },
          );
          document.querySelectorAll(".ared-obj").forEach((el) => io?.observe(el));

          return () => {
            off();
            window.removeEventListener("resize", measure);
            heroObserver?.disconnect();
          };
        });
      } catch {
        root?.classList.remove("is-motion");
      }
    })();

    return () => {
      cancelled = true;
      io?.disconnect();
      mm?.revert();
    };
  }, []);

  return null;
}
