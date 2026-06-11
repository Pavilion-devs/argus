export default function VerticalLines() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden mix-blend-screen">
      <div className="w-full max-w-7xl h-full flex justify-between px-6 opacity-[0.05]">
        <div className="bg-vertical-line w-[1px] h-full bg-white"></div>
        <div className="bg-vertical-line w-[1px] h-full bg-white"></div>
        <div className="bg-vertical-line w-[1px] h-full bg-white"></div>
        <div className="bg-vertical-line w-[1px] h-full bg-white"></div>
        <div className="bg-vertical-line w-[1px] h-full bg-white"></div>
        <div className="bg-vertical-line w-[1px] h-full bg-white"></div>
      </div>
    </div>
  );
}
