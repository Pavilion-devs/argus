# fab — CogniCore landing page (Next.js)

The `cognicore-ai-saas.aura.build` landing page, converted from a single static
HTML export into a component-based **Next.js 14 (App Router)** app with
TypeScript and Tailwind CSS.

## Run

```bash
cd fab
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start   # production
```

## Structure

```
app/
  layout.tsx        Root layout — Inter + Geist fonts, global metadata
  page.tsx          Composes the page (App → Home wrapper + all sections)
  globals.css       Tailwind layers + custom scrollbar / .step-bar utility
components/
  Navbar.tsx              Fixed glass navbar
  HeroSection.tsx         Hero with animated step-bar backdrop + masked heading
  DashboardOverview.tsx   Faux product dashboard mock
  HowItWorksSection.tsx   Process cards (uses ParticleCanvas)
  FeaturesSection.tsx     6-up feature grid
  MetricsSection.tsx      Stats band
  TestimonialSection.tsx  Customer quotes
  PricingSection.tsx      Pricing tiers
  CTASection.tsx          Closing call-to-action
  Footer.tsx              Footer + social links
  VerticalLines.tsx       Decorative background lines
  MaskedText.tsx          Reusable clip-masked heading (word-by-word reveal)
  ParticleCanvas.tsx      Neural-network particle canvas
  Animations.tsx          One GSAP/ScrollTrigger controller for all entrance
                          animations (reveal / stagger / masked-word)
```

## Notes

- **Icons** use `@iconify/react` (`solar` + `simple-icons` sets), loaded from
  the Iconify API on the client — the same behaviour as the original export.
- **Animations** are driven by GSAP + ScrollTrigger, wired through the class
  hooks (`reveal-element`, `stagger-item`, `masked-word`) preserved in the
  markup. They respect `prefers-reduced-motion`.
- **Images** are remote Unsplash URLs via plain `<img>` (kept as-is from the
  source).
