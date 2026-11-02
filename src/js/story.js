// Homepage "Why crocheters love it": cartoon scenes that act out each card.
// Each scene is an SVG whose expression and pose change with data-phase.
// Scenes play only while visible; with reduced motion they show the happy ending.

const SCRIPTS = {
  forget: [
    ['knit', 2800],
    ['forget', 3000],
    ['phone', 1300],
    ['happy', 3400],
  ],
};

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

for (const scene of document.querySelectorAll('.scene[data-scene]')) {
  const script = SCRIPTS[scene.dataset.scene];
  if (!script) continue;
  if (reduce) { scene.dataset.phase = script[script.length - 1][0]; continue; }

  let visible = false;
  let timer = null;
  let step = 0;
  const next = () => {
    const [phase, ms] = script[step];
    scene.dataset.phase = phase;
    step = (step + 1) % script.length;
    timer = setTimeout(() => (visible ? next() : (timer = null)), ms);
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !timer) next();
  }, { threshold: 0.4 }).observe(scene);
}
