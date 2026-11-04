import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from './Icon';

// Blocks that fade up as they scroll into view. Picked from the shared layout
// classes so page markup and content stay untouched.
const REVEAL_SELECTORS = [
  'main .page-hero .container > *',
  'main .section-head',
  'main .card-base',
  'main .data-table-wrap',
  'main .journey',
  'main blockquote',
  'main .grid-4 > *',
  'main .split-2 > *',
  'main .split-2 > div > *',
  'main .contact-grid > *',
  'main section > .container > *',
].join(',');

const STAGGER_MS = 70;
const MAX_STAGGER_STEPS = 6;
const REVEAL_MS = 700;

function preloaderPending() {
  const el = document.getElementById('ac-preloader');
  return !!el && !el.classList.contains('is-done');
}

function collectTargets(): HTMLElement[] {
  const all = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTORS));
  // Animate the innermost blocks only: a grid fades in through its cards, not as one slab.
  return all.filter((el) => !all.some((other) => other !== el && el.contains(other)));
}

function useScrollReveal(pathname: string) {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;

    const timers: number[] = [];
    let observer: IntersectionObserver | null = null;
    let targets: HTMLElement[] = [];

    const finish = (el: HTMLElement) => {
      el.removeAttribute('data-reveal');
      el.removeAttribute('data-revealed');
      el.style.removeProperty('--reveal-delay');
    };

    const start = () => {
      targets = collectTargets();
      targets.forEach((el) => el.setAttribute('data-reveal', ''));

      observer = new IntersectionObserver(
        (entries) => {
          const entering = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);

          entering.forEach((entry, i) => {
            const el = entry.target as HTMLElement;
            const delay = Math.min(i, MAX_STAGGER_STEPS) * STAGGER_MS;
            el.style.setProperty('--reveal-delay', `${delay}ms`);
            el.setAttribute('data-revealed', '');
            observer?.unobserve(el);
            timers.push(window.setTimeout(() => finish(el), delay + REVEAL_MS + 50));
          });
        },
        { rootMargin: '0px 0px -60px 0px', threshold: 0 }
      );

      // Wait a frame so the hidden state is painted before anything reveals.
      requestAnimationFrame(() => targets.forEach((el) => observer?.observe(el)));
    };

    let waitingForPreloader = false;
    if (preloaderPending()) {
      waitingForPreloader = true;
      window.addEventListener('ac:preloader-done', start, { once: true });
    } else {
      start();
    }

    return () => {
      if (waitingForPreloader) window.removeEventListener('ac:preloader-done', start);
      observer?.disconnect();
      timers.forEach(window.clearTimeout);
      targets.forEach(finish);
    };
  }, [pathname]);
}

export const MotionLayer: React.FC = () => {
  const { pathname } = useLocation();
  const barRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);

  useScrollReveal(pathname);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      setShowTop(window.scrollY > 640);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <>
      <div ref={barRef} className="scroll-progress" aria-hidden="true" />
      <button
        type="button"
        className="back-to-top"
        data-visible={showTop ? '' : undefined}
        aria-label="Back to top"
        tabIndex={showTop ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <Icon name="alt-arrow-down" size={20} />
      </button>
    </>
  );
};
