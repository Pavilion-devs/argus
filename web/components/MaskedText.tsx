/**
 * Renders a heading's words as individually clip-masked spans so each word can
 * be revealed (slide up from behind an overflow-hidden mask) by the GSAP
 * animations wired in `Animations.tsx`. Drop it inside a heading element that
 * carries the flex-wrap layout classes.
 */
export default function MaskedText({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span key={i} className="overflow-hidden inline-flex">
          <span className="masked-word inline-block origin-bottom-left will-change-transform pb-1">
            {word}
          </span>
        </span>
      ))}
    </>
  );
}
