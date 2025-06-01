import { useEffect, useRef, useState, useCallback } from "react";
import type { ReactNode } from "react";
import gsap from "gsap";
import Navigation from "./Navigation";
import LandingInfo from "./LandingInfo";
import Aglet from "../projects/Aglet";
import AnchalMaria from "../projects/AnchalMaria";
import Ketto from "../projects/Ketto";
// import ParishonNet from "../projects/ParishonNet";
import ShreyaKumar from "../projects/ShreyaKumar";
import Memento from "../projects/Memento";
import SplitSense from "../projects/SplitSense";
import { motion } from "framer-motion";

interface Slide {
  content: ReactNode;
  title?: string;
  description?: string;
  bgColor: string;
}

const CarouselHome = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<HTMLDivElement[]>([]);
  const isAnimating = useRef(false);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const slides: Slide[] = [
    {
      content: <LandingInfo />,
      bgColor: "bg-blackboard-black",
    },
    {
      content: <Aglet/>,
      bgColor: "bg-silver",
      title: "aglet",
      description: "e-commerce website",
    },
    {
      content: <Ketto/>,
      bgColor: "bg-silver",
      title: "ketto",
      description: "crowdfunding website",
    },
    {
      content: <AnchalMaria/>,
      bgColor: "bg-silver",
      title: "anchal maria",
      description: "portfolio website",
    },
    // {
    //   content: <ParishonNet/>,
    //   bgColor: "bg-silver",
    //   title: "parishonnet",
    //   description: "dashboard management",
    // },
    {
      content: <ShreyaKumar/>,
      bgColor: "bg-silver",
      title: "shreya kumar",
      description: "portfolio website",
    },
    {
      content: <Memento/>,
      bgColor: "bg-silver",
      title: "memento",
      description: "knowledge base",
    },
    {
      content: <SplitSense/>,
      bgColor: "bg-silver",
      title: "split sense",
      description: "expense & budget tracker",
    },
  ];

  const updateCarousel = useCallback(() => {
    if (!carouselRef.current) return;

    slidesRef.current.forEach((slide, index) => {
      if (!slide) return;

      const offset = index - currentIndex;

      if (offset === 0) {
        // Current slide
        slide.style.transformOrigin = "center center";
        gsap.to(slide, {
          y: 0,
          scale: 1,
          opacity: 1,
          rotateZ: 0,
          z: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      } else if (offset > 0) {
        // Slides below
        slide.style.transformOrigin = "center center";
        gsap.to(slide, {
          y: offset * 25,
          scale: 1 - offset * 0.05,
          opacity: 1 - offset * 0.2,
          rotateZ: 0,
          z: -offset * 50,
          duration: 0.3,
          ease: "power2.out",
        });
      } else if (offset === -1) {
        // Only the immediate top slide gets the rotation
        slide.style.transformOrigin = "right center";
        gsap.to(slide, {
          y: -800,
          scale: 0.8,
          opacity: 0,
          rotateZ: 30,
          z: 100,
          duration: 0.3,
          ease: "power2.in",
        });
      } else {
        // Other slides above just fade out
        slide.style.transformOrigin = "center center";
        gsap.to(slide, {
          y: -100,
          scale: 0.8,
          opacity: 0,
          rotateZ: 0,
          z: 100,
          duration: 0.3,
          ease: "power2.in",
        });
      }
    });
  }, [currentIndex]);

  const goToNextSlide = useCallback(() => {
    if (isAnimating.current) return;
    if (currentIndex < slides.length - 1) {
      isAnimating.current = true;
      setCurrentIndex((prev) => prev + 1);
      setTimeout(() => {
        isAnimating.current = false;
      }, 300);
    }
  }, [currentIndex, slides.length]);

  const goToPrevSlide = useCallback(() => {
    if (isAnimating.current) return;
    if (currentIndex > 0) {
      isAnimating.current = true;
      setCurrentIndex((prev) => prev - 1);
      setTimeout(() => {
        isAnimating.current = false;
      }, 300);
    }
  }, [currentIndex]);

  useEffect(() => {
    updateCarousel();
  }, [currentIndex, updateCarousel]);

  useEffect(() => {
    const element = carouselRef.current;
    if (!element) return;

    let lastScrollTime = 0;
    const scrollThreshold = 50; // Minimum time between scrolls in ms

    const handleScroll = (e: WheelEvent) => {
      e.preventDefault();

      const now = Date.now();
      if (now - lastScrollTime < scrollThreshold) return;
      lastScrollTime = now;

      if (e.deltaY > 0) {
        goToNextSlide();
      } else {
        goToPrevSlide();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goToNextSlide();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goToPrevSlide();
      }
    };

    // Touch event handlers
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isAnimating.current) return;

      const touchEndY = e.touches[0].clientY;
      const touchEndX = e.touches[0].clientX;
      const deltaY = touchEndY - touchStartY.current;
      const deltaX = touchEndX - touchStartX.current;

      // Only handle vertical swipes if the vertical movement is greater than horizontal
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        e.preventDefault(); // Prevent page scroll when swiping vertically
        if (deltaY > 50) {
          goToPrevSlide();
        } else if (deltaY < -50) {
          goToNextSlide();
        }
      }
    };

    window.addEventListener("wheel", handleScroll, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
    };
  }, [goToNextSlide, goToPrevSlide]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-blackboard-black perspective-1000 overflow-hidden overscroll-none touch-none">
      <div className="flex flex-row items-start justify-center gap-8 relative mb-15 md:mb-0">
        <div className="absolute md:top-0 md:-left-24 -left-[0%] -top-20 z-30 flex flex-col md:items-end items-start justify-between h-full">
          <Navigation />
          <div className="text-white flex flex-col md:items-end items-start justify-between text-end absolute -bottom-[58%] md:bottom-[0px]">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="md:text-xl text-md italic text-white md:text-end text-start"
            >
              {slides[currentIndex].title}
            </motion.div>
            <motion.div
              key={`desc-${currentIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
              className="md:text-sm text-xs text-slate md:text-end text-start w-[130px]"
            >
              {slides[currentIndex].description}
            </motion.div>
          </div>
        </div>
        <div className="relative md:w-[60vw] md:h-[60vh] w-[90vw] h-[45vh] flex items-center justify-center overscroll-none touch-none">
          <div
            ref={carouselRef}
            className="relative w-full h-full preserve-3d cursor-pointer flex items-center justify-center overscroll-none touch-none"
            style={{ 
              transformStyle: "preserve-3d",
              touchAction: "none",
              overscrollBehavior: "none"
            }}
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                ref={(el) => {
                  if (el) slidesRef.current[index] = el;
                }}
                className={`absolute w-full h-full ${slide.bgColor} flex items-center justify-center`}
                style={{
                  backfaceVisibility: "hidden",
                  zIndex: slides.length - Math.abs(index - currentIndex),
                  pointerEvents: index === currentIndex ? "auto" : "none",
                  transformOrigin:
                    index === currentIndex + 1 ? "right" : "center center",
                }}
              >
                {slide.content}
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default CarouselHome;
