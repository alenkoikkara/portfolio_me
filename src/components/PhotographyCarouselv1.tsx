import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCarousel } from "../context/CarouselContext";
import PhotographyTable from "./PhotographyTable";
import Navigation from "./Navigation";
import CarouselInfo from "./CarouselInfo";

import img1 from "../assets/photography/img1.webp";
import img2 from "../assets/photography/img2.webp";
import img3 from "../assets/photography/img3.webp";
import img4 from "../assets/photography/img4.webp";
import img5 from "../assets/photography/img5.webp";
import img6 from "../assets/photography/img6.webp";
import img7 from "../assets/photography/img7.webp";
import img8 from "../assets/photography/img8.webp";
import img9 from "../assets/photography/img9.webp";
import img10 from "../assets/photography/img10.webp";
import img11 from "../assets/photography/img11.webp";
import img12 from "../assets/photography/img12.webp";
import img13 from "../assets/photography/img13.webp";
import img14 from "../assets/photography/img14.webp";
import img15 from "../assets/photography/img15.webp";

interface CarouselItem {
  id: number;
  title?: string;
  description?: string;
  imageUrl?: string;
  component?: React.ReactNode;
  date?: string;
  location?: string;
  focalLength?: string;
  fNumber?: string;
}

const carouselItems: CarouselItem[] = [
  {
    id: 0,
    imageUrl: img1,
    title: "Render",
    date: "Friday, May 30, 2025 at 8:05 PM",
    location: "Madison, Chicago",
    focalLength: "250mm",
    fNumber: "f4-5.6 IS II",
  },
  {
    id: 1,
    imageUrl: img2,
    title: "Horizon",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "New York, NY",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 2,
    imageUrl: img3,
    title: "Ashland Intersection",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "Madison & Ashland, Chicago",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 3,
    imageUrl: img4,
    title: "Lonely Docks",
    date: "Saturday, May 24, 2025 at 6:50 PM",
    location: "New York, NY",
    focalLength: "26mm",
    fNumber: "f/1.6",
  },
  {
    id: 4,
    imageUrl: img5,
    title: "Astigmatic Eyes",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "New York, NY",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 5,
    imageUrl: img6,
    title: "Karwan",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "Mahabaleshwar, Maharashtra",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 6,
    imageUrl: img7,
    title: "City of Dreams",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "Worli Ceiling, Mumbai",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 7,
    imageUrl: img8,
    title: "Damen | Madison",
    date: "Tuesday, May 17, 2024 at 11:22 AM",
    location: "Damen & Madison, Chicago",
    focalLength: "96mm",
    fNumber: "f4-5.6 IS II",
  },
  {
    id: 8,
    imageUrl: img9,
    title: "Christmas",
    date: "Friday, December 30, 2024 at 6:06 PM",
    location: "New York, NY",
    focalLength: "55mm",
    fNumber: "f4-5.6 IS II",
  },
  {
    id: 9,
    imageUrl: img10,
    title: "Little Sailor",
    date: "Friday, May 5, 2023 at 4:07 PM",
    location: "Fort Kochi, Kerala",
    focalLength: "26mm",
    fNumber: "f/1.6",
  },
  {
    id: 10,
    imageUrl: img11,
    title: "Undisclosed Location",
    date: "Friday, January 1, 2025 at 2:58 PM",
    location: "New York, NY",
    focalLength: "208mm",
    fNumber: "f4-5.6 IS II",
  },
  {
    id: 11,
    imageUrl: img12,
    title: "Shy",
    date: "Friday, August 30, 2025 at 7:45 PM",
    location: "Cherry Blossom, Chicago",
    focalLength: "250mm",
    fNumber: "f4-5.6 IS II",
  },
  {
    id: 12,
    imageUrl: img13,
    title: "Bridges & Tunnels",
    date: "Friday, August 30, 2025 at 7:57 PM",
    location: "Cherry Blossom, Chicago",
    focalLength: "135mm",
    fNumber: "f4-5.6 IS II",
  },
  {
    id: 13,
    imageUrl: img14,
    title: "Lego City",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "New York, NY",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 14,
    imageUrl: img15,
    title: "Goodbyes & Goodnights",
    date: "Sunday, May 17, 2025 at 11:58 AM",
    location: "Damen Greenline, Chicago",
    focalLength: "163mm",
    fNumber: "f4-5.6 IS II",
  },
];

export { carouselItems };

const PhotographyCarousel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex, setActiveIndex, isTableView, setIsTableView } = useCarousel();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Handle escape key press
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscapeKey);
    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isModalOpen]);

  // Calculate width for each slide
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Set initial active index to first item
  useEffect(() => {
    setActiveIndex(0);
  }, [setActiveIndex]);

  // Animate x position based on activeIndex
  const x = -activeIndex * containerWidth;

  // Drag end handler for gallery
  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const threshold = containerWidth / 3; // Reduced threshold for better responsiveness
    const velocity = info.offset.x / 16; // Calculate velocity for momentum scrolling
    
    if (Math.abs(velocity) > 0.5) {
      // If there's significant velocity, use it to determine direction
      if (velocity < 0 && activeIndex < carouselItems.length - 1) {
        setActiveIndex(activeIndex + 1);
      } else if (velocity > 0 && activeIndex > 0) {
        setActiveIndex(activeIndex - 1);
      }
    } else if (Math.abs(info.offset.x) > threshold) {
      // If no significant velocity but past threshold, snap to next/prev
      if (info.offset.x < 0 && activeIndex < carouselItems.length - 1) {
        setActiveIndex(activeIndex + 1);
      } else if (info.offset.x > 0 && activeIndex > 0) {
        setActiveIndex(activeIndex - 1);
      }
    }
  };

  // Handle wheel events from anywhere on the page
  useEffect(() => {
    let accumulatedScroll = 0;
    const SCROLL_THRESHOLD = 30; // Reduced threshold for more responsive scrolling
    let isScrolling = false;
    let scrollTimeout: ReturnType<typeof setTimeout>;

    const handleWheel = (e: WheelEvent) => {
      if (containerRef.current && !isScrolling) {
        e.preventDefault();
        accumulatedScroll += e.deltaY;

        if (Math.abs(accumulatedScroll) >= SCROLL_THRESHOLD) {
          isScrolling = true;
          const direction = accumulatedScroll > 0 ? 1 : -1;
          const newIndex = activeIndex + direction;

          if (newIndex >= 0 && newIndex < carouselItems.length) {
            setActiveIndex(newIndex);
          }
          accumulatedScroll = 0;

          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            isScrolling = false;
          }, 150); // Reduced timeout for more responsive scrolling
        }
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
      clearTimeout(scrollTimeout);
    };
  }, [activeIndex, setActiveIndex]);

  const handleViewToggle = () => {
    setIsTableView(!isTableView);
    // Reset container width when switching views
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  };

  return (
    <div className="w-full h-full flex flex-col overscroll-none touch-none">
      {/* Toggle Button */}
      <button
        onClick={handleViewToggle}
        className="absolute bottom-14 right-8 z-50 px-4 py-2 rounded-full transition-all duration-300 cursor-pointer"
      >
        {isTableView ? (
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="slate"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6 dark:text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z"
              />
            </svg>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="slate"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6 text-blackboard-black dark:text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </div>
        )}
      </button>

      <AnimatePresence mode="wait">
        {isTableView ? (
          <motion.div
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="w-full h-full relative"
          >
            {/* Navigation */}
            <div className="absolute md:top-4 -bottom-18 md:-left-[90px] left-[4%] z-50 flex flex-col justify-between h-full">
              <Navigation />
            </div>
            <PhotographyTable />
          </motion.div>
        ) : (
          <motion.div
            key="carousel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="w-full h-full flex relative overscroll-none touch-none"
          >
            <div className="absolute md:top-0 -bottom-18 md:-left-[270px] left-[4%] z-50 flex flex-col justify-between h-full overscroll-none touch-none">
              {/* Navigation */}
              <Navigation />

            <div className="hidden md:block">
              {/* Title and Date Display */}
              <CarouselInfo
                title={carouselItems[activeIndex].title}
                date={carouselItems[activeIndex].date}
                location={carouselItems[activeIndex].location}
                focalLength={carouselItems[activeIndex].focalLength}
                fNumber={carouselItems[activeIndex].fNumber}
                activeIndex={activeIndex}
              />
            </div>
            </div>

            {/* Image Carousel */}
            <div className="flex-1 w-full md:h-full h-[70vh] relative overflow-visible overscroll-none touch-none">
              <div
                ref={containerRef}
                className="w-full h-full relative overflow-visible overscroll-none touch-none"
                style={{ 
                  transformStyle: "preserve-3d",
                  touchAction: "none",
                  overscrollBehavior: "none"
                }}
              >
                <motion.div
                  className="absolute md:top-0 top-40 left-0 h-full flex will-change-transform overscroll-none touch-none"
                  style={{
                    width: `${carouselItems.length * 100}%`,
                    transform: `translate3d(${x}px, 0, 0)`,
                    touchAction: "pan-x",
                    overscrollBehavior: "none",
                    WebkitOverflowScrolling: "touch"
                  }}
                  drag="x"
                  dragConstraints={{
                    left: -(carouselItems.length - 1) * containerWidth,
                    right: 0,
                  }}
                  dragElastic={0.2}
                  dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
                  onDragEnd={handleDragEnd}
                  animate={{ x }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                    mass: 0.8,
                    velocity: 0,
                    restDelta: 0.001,
                  }}
                >
                  {carouselItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`w-full h-full flex-shrink-0 flex items-center justify-center snap-start transition-opacity duration-300 ${
                        index === activeIndex || index === activeIndex + 1
                          ? "opacity-100"
                          : "opacity-0"
                      }`}
                      style={{ width: containerWidth }}
                    >
                      {item.component ? (
                        <motion.div
                          className="w-full h-full overflow-hidden"
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: index === activeIndex ? 1 : 0.7,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          {item.component}
                        </motion.div>
                      ) : (
                        <motion.div
                          className={`w-full h-full overflow-hidden cursor-pointer`}
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity:
                              index === activeIndex
                                ? 1
                                : index === activeIndex + 1
                                ? 0.2
                                : 0,
                            scale: index === activeIndex ? 1 : 0.95,
                            filter:
                              index === activeIndex ? "none" : "blur(1px)",
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          {item.imageUrl && (
                            <div className="relative w-full h-full bg-gray-900">
                              <button
                                type="button"
                                className="w-full h-full p-0 m-0 border-none bg-transparent cursor-pointer"
                                style={{ display: "block" }}
                                onClick={() => {
                                  if (index === activeIndex) {
                                    setIsModalOpen(true);
                                  } else if (
                                    Math.abs(index - activeIndex) === 1
                                  ) {
                                    setActiveIndex(index);
                                  }
                                }}
                                aria-label={
                                  index === activeIndex
                                    ? `Open modal for ${item.title}`
                                    : `Go to slide ${item.title}`
                                }
                              >
                                <img
                                  key={item.imageUrl}
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover object-center grayscale hover:grayscale-0 transition-all duration-300"
                                  loading="eager"
                                  decoding="async"
                                  style={{ display: "block" }}
                                />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
              {isModalOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
                  onClick={() => setIsModalOpen(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative md:h-[90vh] w-[90vw] md:w-max flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={carouselItems[activeIndex].imageUrl}
                      alt={carouselItems[activeIndex].title}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                      style={{ transform: "translateZ(0)" }}
                    />
                    <button
                      className="absolute md:top-0 -top-10 md:-right-8 right-0 text-white text-2xl hover:text-gray-300 cursor-pointer"
                      onClick={() => setIsModalOpen(false)}
                    >
                      ×
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scale Carousel */}
            <div className="absolute hidden md:flex px-[20%] -bottom-40 left-0 w-full h-32 items-center justify-center">
              <div className="relative w-48 h-12 flex items-center justify-center">
                <motion.div
                  className="absolute flex items-center justify-center will-change-transform"
                  animate={{ x: -activeIndex * 160 }}
                  transition={{
                    type: "spring",
                    stiffness: 200,
                    damping: 25,
                    mass: 1.2,
                    velocity: 0,
                    restDelta: 0.001,
                  }}
                >
                  {carouselItems.map((_, index) => {
                    const isActive = index === activeIndex;
                    const isAdjacent = Math.abs(index - activeIndex) === 1;
                    const isVisible = isActive || isAdjacent;

                    return (
                      <div
                        key={index}
                        className={`absolute transition-all duration-300 cursor-pointer ${
                          isActive
                            ? "opacity-100"
                            : isAdjacent
                            ? "opacity-70"
                            : "opacity-0"
                        }`}
                        style={{
                          left: `${index * 160}px`,
                          transform: "translateX(-50%)",
                          visibility: isVisible ? "visible" : "hidden",
                        }}
                        onClick={() => {
                          if (index === activeIndex) {
                            setIsModalOpen(true);
                          } else if (
                            Math.abs(index - activeIndex) === 1
                          ) {
                            setActiveIndex(index);
                          }
                        }}
                      >
                        <span className="text-sm text-blackboard-black dark:text-white font-regular">
                          {String(index).padStart(2, "0")}
                        </span>
                        <div className="absolute bottom-[-25px] left-1/2 transform -translate-x-1/2 flex items-end gap-4">
                          {/* Left small lines */}
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div
                              key={`left-${i}`}
                              className={`h-1 w-[.5px] transition-all duration-300 ${
                                isActive ? "bg-red-500" : "bg-gray-400"
                              }`}
                            />
                          ))}
                          {/* Active line */}
                          <div
                            className={`h-3 w-[.5px] transition-all duration-300 ${
                              isActive ? "bg-red-500" : "bg-gray-400"
                            }`}
                          />
                          {/* Right small lines */}
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div
                              key={`right-${i}`}
                              className={`h-1 w-[.5px] transition-all duration-300 ${
                                isActive ? "bg-red-500" : "bg-gray-400"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhotographyCarousel;
