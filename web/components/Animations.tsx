"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Mounted once at the page root. Wires the class hooks left in the markup
 * (`masked-word`, `reveal-element`, `stagger-container`/`stagger-item`,
 * `bg-vertical-line`, `step-bar`) to GSAP scroll-triggered entrance
 * animations — the same effects the original template shipped with.
 *
 * Everything is registered inside a gsap.context so it is fully reverted on
 * unmount, and animations are no-ops when the user prefers reduced motion.
 */
export default function Animations() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // Background vertical lines — grow in on load.
      gsap.from(".bg-vertical-line", {
        scaleY: 0,
        transformOrigin: "top",
        duration: 1.4,
        ease: "power2.out",
        stagger: 0.08,
      });

      // Hero step bars — rise from the baseline on load.
      gsap.from(".step-bar", {
        scaleY: 0,
        transformOrigin: "bottom",
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: { each: 0.02, from: "center" },
      });

      // Masked headings — reveal each word from behind its clip mask.
      const headings = new Set<HTMLElement>();
      gsap.utils
        .toArray<HTMLElement>(".masked-word")
        .forEach((word) => {
          const heading = word.closest("h1, h2, h3") as HTMLElement | null;
          if (heading) headings.add(heading);
        });
      headings.forEach((heading) => {
        const words = heading.querySelectorAll(".masked-word");
        gsap.from(words, {
          yPercent: 115,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: heading, start: "top 85%" },
        });
      });

      // Generic fade-up reveals.
      gsap.utils.toArray<HTMLElement>(".reveal-element").forEach((el) => {
        gsap.from(el, {
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });

      // Staggered groups.
      gsap.utils
        .toArray<HTMLElement>(".stagger-container")
        .forEach((container) => {
          const items = container.querySelectorAll(".stagger-item");
          if (!items.length) return;
          const step = Number(container.dataset.stagger) || 0.1;
          gsap.from(items, {
            y: 24,
            opacity: 0,
            duration: 0.7,
            ease: "power2.out",
            stagger: step,
            scrollTrigger: { trigger: container, start: "top 85%" },
          });
        });

      ScrollTrigger.refresh();
    });

    return () => ctx.revert();
  }, []);

  return null;
}
