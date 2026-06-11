// A reliable, GPU-cheap backdrop: faint grid + drifting blue/indigo glow blobs,
// matching the template's dark aesthetic. Pure CSS (no external 3D dependency),
// so it always renders for the demo.

export default function Background({ dense = false }: { dense?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      {/* faint grid */}
      <div
        className="absolute inset-0 bg-grid-faint opacity-[0.5]"
        style={{ backgroundSize: dense ? "40px 40px" : "64px 64px" }}
      />
      {/* radial vignette to fade the grid at the edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(37,99,235,0.10), transparent 60%), radial-gradient(80% 60% at 100% 100%, rgba(96,165,250,0.06), transparent 50%)",
        }}
      />
      {/* drifting glow blobs */}
      <div className="absolute -left-40 top-[-10%] h-[36rem] w-[36rem] rounded-full bg-primary/20 blur-[120px] animate-drift" />
      <div
        className="absolute right-[-15%] top-[20%] h-[30rem] w-[30rem] rounded-full bg-indigo-600/15 blur-[120px] animate-drift"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute bottom-[-20%] left-[30%] h-[28rem] w-[28rem] rounded-full bg-primary-deep/30 blur-[120px] animate-drift"
        style={{ animationDelay: "-12s" }}
      />
    </div>
  );
}
