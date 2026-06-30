import { useState } from "react";

interface PhotoCarouselProps {
  images: string[];
  alt: string;
}

export function PhotoCarousel({ images, alt }: PhotoCarouselProps) {
  const [current, setCurrent] = useState(0);

  if (images.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
        Pas d'image
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 group">
      <img
        src={images[current]}
        alt={`${alt} - photo ${current + 1}`}
        className="w-full h-48 object-cover"
      />

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
          >
            &lt;
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
          >
            &gt;
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.slice(0, 8).map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`w-2 h-2 rounded-full transition ${i === current ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
          <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
            {current + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}
