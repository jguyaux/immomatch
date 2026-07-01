import { useState, useRef } from "react";

interface PhotoCarouselProps {
  images: string[];
  alt: string;
  className?: string;
}

export function PhotoCarousel({ images, alt, className = "w-full h-48" }: PhotoCarouselProps) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrent((c) => (c - 1 + images.length) % images.length);
  };
  const next = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrent((c) => (c + 1) % images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStartX.current = null;
  };

  if (images.length === 0) {
    return (
      <div className={`${className} bg-gray-200 flex items-center justify-center text-gray-400 text-sm`}>
        Pas d'image
      </div>
    );
  }

  return (
    <div
      className={`relative group select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img
        src={images[current]}
        alt={`${alt} - photo ${current + 1}`}
        className="w-full h-full object-cover"
        draggable={false}
      />

      {images.length > 1 && (
        <>
          {/* Prev — toujours visible sur mobile, au hover sur desktop */}
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none transition sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Photo précédente"
          >
            ‹
          </button>
          {/* Next */}
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none transition sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Photo suivante"
          >
            ›
          </button>
          {/* Dots */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.slice(0, 8).map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`w-1.5 h-1.5 rounded-full transition ${i === current ? "bg-white" : "bg-white/50"}`}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
          {/* Counter */}
          <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded pointer-events-none">
            {current + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}
