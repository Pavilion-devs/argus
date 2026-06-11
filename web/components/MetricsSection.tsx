export default function MetricsSection() {
  return (
    <section className="z-20 xl:px-20 pb-20 relative backdrop-blur-sm" id="evaluation">
      <div className="stagger-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[1px] bg-[#27272a] border border-[#27272a] w-full relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[200px] bg-[#2563eb]/5 blur-[100px] rounded-full pointer-events-none z-0"></div>
        <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-500 p-12 xl:p-16 flex flex-col items-center text-center group cursor-default relative z-10">
          <h4 className="text-5xl md:text-6xl font-light tracking-tighter text-white font-geist mb-5 group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]">1.0</h4>
          <span className="text-[#2563eb] font-medium text-sm tracking-wide font-geist mb-2 uppercase">Verdict Accuracy</span>
          <span className="text-zinc-500 text-xs font-extralight font-geist">Across 18 real investigations</span>
        </div>
        <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-500 p-12 xl:p-16 flex flex-col items-center text-center group cursor-default relative z-10">
          <h4 className="text-5xl md:text-6xl font-light tracking-tighter text-white font-geist mb-5 group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]">0.99</h4>
          <span className="text-[#2563eb] font-medium text-sm tracking-wide font-geist mb-2 uppercase">Grounding Precision</span>
          <span className="text-zinc-500 text-xs font-extralight font-geist">Every reported IOC verified in-data</span>
        </div>
        <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-500 p-12 xl:p-16 flex flex-col items-center text-center group cursor-default relative z-10">
          <h4 className="text-5xl md:text-6xl font-light tracking-tighter text-white font-geist mb-5 group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]">0</h4>
          <span className="text-[#2563eb] font-medium text-sm tracking-wide font-geist mb-2 uppercase">Invalid ATT&amp;CK IDs</span>
          <span className="text-zinc-500 text-xs font-extralight font-geist">Validated vs pinned ATT&amp;CK v19.1</span>
        </div>
        <div className="stagger-item bg-[#18181b] hover:bg-[#1e1e22] transition-colors duration-500 p-12 xl:p-16 flex flex-col items-center text-center group cursor-default relative z-10">
          <h4 className="text-5xl md:text-6xl font-light tracking-tighter text-white font-geist mb-5 group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.05)]">6</h4>
          <span className="text-[#2563eb] font-medium text-sm tracking-wide font-geist mb-2 uppercase">BOTS v3 Scenarios</span>
          <span className="text-zinc-500 text-xs font-extralight font-geist">4 attacks + 2 precision controls · 18 runs</span>
        </div>
      </div>
    </section>
  );
}
