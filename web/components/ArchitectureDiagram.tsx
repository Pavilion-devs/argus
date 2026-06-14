type Props = {
  className?: string;
  /** Wrap in a light card (useful when placed on a dark background). */
  framed?: boolean;
};

/**
 * Responsive Argus architecture diagram.
 *
 * Renders the hand-authored SVG via <object> (so its embedded Inter @import
 * loads and it stays vector-crisp at any size), with the rendered PNG as a
 * graceful fallback. The aspect ratio is locked to the source artboard
 * (1644 x 1010) so it scales to any width with no layout shift.
 */
export default function ArchitectureDiagram({ className = "", framed = false }: Props) {
  return (
    <div
      className={[
        "w-full overflow-hidden",
        framed ? "rounded-2xl border border-zinc-200 bg-white shadow-2xl" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ aspectRatio: "1644 / 1010" }}
    >
      <object
        type="image/svg+xml"
        data="/media/argus-architecture-diagram-clean.svg"
        aria-label="Argus architecture — autonomous SOC investigation on Splunk"
        className="pointer-events-none block h-full w-full select-none"
      >
        <img
          src="/media/argus-architecture-diagram-clean.png"
          alt="Argus architecture — autonomous SOC investigation on Splunk"
          className="block h-full w-full"
        />
      </object>
    </div>
  );
}
