"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CarouselContextValue = {
  contentRef: React.RefObject<HTMLDivElement | null>;
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  currentIndex: number;
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
};

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    initialIndex?: number;
    activeIndex?: number;
    onIndexChange?: (index: number) => void;
  }
>(({ className, children, initialIndex, activeIndex, onIndexChange, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [slides, setSlides] = React.useState<HTMLElement[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const syncSlides = React.useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const nodes = Array.from(el.children) as HTMLElement[];
    setSlides(nodes);
  }, []);

  const updateScrollState = React.useCallback(() => {
    const el = contentRef.current;
    if (!el || slides.length === 0) return;
    const scrollLeft = el.scrollLeft;
    const nearestIndex = slides.reduce(
      (acc, slide, idx) => {
        const distance = Math.abs(slide.offsetLeft - scrollLeft);
        if (distance < acc.distance) return { index: idx, distance };
        return acc;
      },
      { index: 0, distance: Number.POSITIVE_INFINITY },
    ).index;
    setCurrentIndex(nearestIndex);
    setCanScrollPrev(nearestIndex > 0);
    setCanScrollNext(nearestIndex < slides.length - 1);
    if (onIndexChange) onIndexChange(nearestIndex);
  }, [slides, onIndexChange]);

  const scrollToIndex = React.useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const el = contentRef.current;
      const slide = slides[index];
      if (!el || !slide) return;
      el.scrollTo({ left: slide.offsetLeft, behavior });
    },
    [slides],
  );

  const scrollPrev = React.useCallback(() => {
    if (currentIndex <= 0) return;
    scrollToIndex(currentIndex - 1);
  }, [currentIndex, scrollToIndex]);

  const scrollNext = React.useCallback(() => {
    if (currentIndex >= slides.length - 1) return;
    scrollToIndex(currentIndex + 1);
  }, [currentIndex, slides.length, scrollToIndex]);

  React.useEffect(() => {
    syncSlides();
  }, [children, syncSlides]);

  React.useEffect(() => {
    if (activeIndex !== undefined && slides.length > 0) {
      const target = Math.max(0, Math.min(activeIndex, slides.length - 1));
      scrollToIndex(target);
    }
  }, [activeIndex, scrollToIndex, slides.length]);

  React.useEffect(() => {
    if (initialIndex !== undefined && slides.length > 0) {
      const target = Math.max(0, Math.min(initialIndex, slides.length - 1));
      scrollToIndex(target, "instant");
    }
  }, [initialIndex, scrollToIndex, slides.length]);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    updateScrollState();
    const onScroll = () => updateScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });

    const observer = new ResizeObserver(() => {
      syncSlides();
      requestAnimationFrame(updateScrollState);
    });
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", onScroll);
      observer.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [syncSlides, updateScrollState]);

  return (
    <CarouselContext.Provider
      value={{
        contentRef,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
        currentIndex,
        scrollToIndex,
      }}
    >
      <div ref={ref} className={cn("relative", className)} {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  );
});
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("CarouselContent must be used within Carousel");
  }

  return (
    <div
      ref={(node) => {
        if (typeof ref === "function") ref(node as HTMLDivElement);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        context.contentRef.current = node ?? null;
      }}
      className={cn(
        "flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none]",
        className,
      )}
      {...props}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {children}
    </div>
  );
});
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("min-w-0 shrink-0 grow-0 basis-full pl-2 snap-start", className)}
    {...props}
  />
));
CarouselItem.displayName = "CarouselItem";

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("CarouselPrevious must be used within Carousel");
  }
  const { scrollPrev, canScrollPrev } = context;

  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      onClick={scrollPrev}
      className={cn(
        "absolute left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 cursor-pointer rounded-full border border-white/20 bg-slate-900/80 text-white shadow-lg shadow-black/30 backdrop-blur transition hover:border-white/40 hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      disabled={!canScrollPrev}
      aria-label="Previous slide"
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  );
});
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("CarouselNext must be used within Carousel");
  }
  const { scrollNext, canScrollNext } = context;

  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      onClick={scrollNext}
      className={cn(
        "absolute right-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 cursor-pointer rounded-full border border-white/20 bg-slate-900/80 text-white shadow-lg shadow-black/30 backdrop-blur transition hover:border-white/40 hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      disabled={!canScrollNext}
      aria-label="Next slide"
      {...props}
    >
      <ChevronRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  );
});
CarouselNext.displayName = "CarouselNext";

export { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious };
