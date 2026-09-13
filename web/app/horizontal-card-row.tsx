'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export function HorizontalCardRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  const rowRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({
    overflow: false,
    start: true,
    end: true,
  });

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const update = () => {
      const maximum = row.scrollWidth - row.clientWidth;
      const position = Math.abs(row.scrollLeft);
      setEdges({
        overflow: maximum > 1,
        start: position <= 1,
        end: position >= maximum - 1,
      });
    };
    const observer = new ResizeObserver(update);
    observer.observe(row);
    for (const child of Array.from(row.children)) observer.observe(child);
    row.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      row.removeEventListener('scroll', update);
    };
  }, [children]);

  const scroll = (direction: -1 | 1) => {
    const row = rowRef.current;
    if (!row || (direction < 0 ? edges.start : edges.end)) return;
    const first = row.firstElementChild;
    if (!first) return;
    const second = first.nextElementSibling;
    const distance = second
      ? Math.abs(
          second.getBoundingClientRect().left -
            first.getBoundingClientRect().left,
        )
      : first.getBoundingClientRect().width;
    const rtl = getComputedStyle(row).direction === 'rtl';
    row.scrollBy({
      left: direction * distance * (rtl ? -1 : 1),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  };

  return (
    <>
      <div className="card-row-heading">
        <p className="up-next-label" id={`${id}-label`}>
          {label}
        </p>
        <div className="card-row-controls" hidden={!edges.overflow}>
          <button
            type="button"
            className="card-row-control"
            aria-label={`Previous cards in ${label}`}
            aria-controls={id}
            aria-disabled={edges.start}
            onClick={() => scroll(-1)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="card-row-control"
            aria-label={`Next cards in ${label}`}
            aria-controls={id}
            aria-disabled={edges.end}
            onClick={() => scroll(1)}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        id={id}
        ref={rowRef}
        className="up-next-track"
        role="region"
        aria-labelledby={`${id}-label`}
        tabIndex={0}
      >
        {children}
      </div>
    </>
  );
}
