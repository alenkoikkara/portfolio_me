import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  imageUrl: string;
  title: string;
  date: string;
  location: string;
  focalLength: string;
  fNumber?: string;
}

const carouselItems: CarouselItem[] = [
  {
    id: 0,
    imageUrl: img1,
    title: "The 1000th Day",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "Adler Planetarium, Chicago",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 1,
    imageUrl: img2,
    title: "Photo 2",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "New York, NY",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 2,
    imageUrl: img3,
    title: "Ashland Intersection",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "Madison & Ashland, Chicago",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 3,
    imageUrl: img4,
    title: "Symmetry",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "New York, NY",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 4,
    imageUrl: img5,
    title: "Astigmatic Eyes",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "New York, NY",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 5,
    imageUrl: img6,
    title: "Karwan",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "Mahabaleshwar, Maharashtra",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 6,
    imageUrl: img7,
    title: "City of Dreams",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "Worli Ceiling, Mumbai",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 7,
    imageUrl: img8,
    title: "Damen | Madison",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "Damen & Madison, Chicago",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 8,
    imageUrl: img9,
    title: "Christmas",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "New York, NY",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 9,
    imageUrl: img10,
    title: "Photo 10",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "New York, NY",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 10,
    imageUrl: img11,
    title: "Undisclosed Location",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "New York, NY",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 11,
    imageUrl: img12,
    title: "Shy",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "New York, NY",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 12,
    imageUrl: img13,
    title: "Bridges & Tunnels",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "New York, NY",
    focalLength: "100mm",
  },
  {
    id: 13,
    imageUrl: img14,
    title: "Lego City",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "New York, NY",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
  {
    id: 14,
    imageUrl: img15,
    title: "Goodbyes & Goodnights",
    date: "Saturday, May 17, 2025 at 7:58 PM",
    location: "Damen Greenline, Chicago",
    focalLength: "100mm",
    fNumber: "f/1.4",
  },
];

interface PhotographyCarouselProps {
  containerClassName?: string;
}

const PhotographyCarousel: React.FC<PhotographyCarouselProps> = ({ containerClassName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);  

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

  // Handle wheel events
  useEffect(() => {
    let isScrolling = false;
    let scrollTimeout: NodeJS.Timeout;
    const SCROLL_THRESHOLD = 50; // Minimum scroll amount to trigger
    let accumulatedScroll = 0;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isScrolling) {
        return;
      }

      // Handle both vertical and horizontal scroll
      const scrollAmount = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      accumulatedScroll += scrollAmount;

          setTimeout(() => {
            isScrolling = false;
          }, 300);
        }

        // Reset accumulated scroll
        accumulatedScroll = 0;

        // Clear any existing timeout
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }

        // Reset scrolling flag after animation
        scrollTimeout = setTimeout(() => {
          isScrolling = false;
        }, 800);
      }
    };

    // Only add wheel event listener in carousel view
    if (!isTableView) {
      window.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      window.removeEventListener("wheel", handleWheel);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [activeIndex]);

  // Animate x position based on activeIndex
  const x = -activeIndex * containerWidth;

  // Drag end handler
  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    const threshold = containerWidth / 4;
    if (info.offset.x < -threshold && activeIndex < carouselItems.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else if (info.offset.x > threshold && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  return (
    <div className={containerClassName}>
      <div ref={containerRef} className="w-full h-full relative">
        <motion.div
          className="absolute top-0 left-0 h-full flex will-change-transform"
          style={{
            width: `${carouselItems.length * 100}%`,
            transform: `translate3d(${x}px, 0, 0)`,
          }}
          drag="x"
          dragConstraints={{
            left: -(carouselItems.length - 1) * containerWidth,
            right: 0,
          }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          animate={{ x }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 1,
            velocity: 0,
          }}
        >
          {carouselItems.map((item, index) => (
            <div
              key={item.id}
              className={`w-full h-full flex-shrink-0 flex items-center justify-center transition-opacity duration-300 ${
                Math.abs(index - activeIndex) <= 1 ? "opacity-100" : "opacity-0"
              }`}
              style={{ width: containerWidth }}
            >
              <motion.div
                className="w-full h-full overflow-hidden cursor-pointer"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: index === activeIndex ? 1 : 0.5,
                  scale: index === activeIndex ? 1 : 0.95,
                  filter: index === activeIndex ? "none" : "blur(1px)",
                }}
                transition={{ duration: 0.3 }}
                onClick={() => {
                  if (index === activeIndex) {
                    setIsModalOpen(true);
                  } else if (Math.abs(index - activeIndex) === 1) {
                    setActiveIndex(index);
                  }
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover object-center"
                  loading="eager"
                  decoding="async"
                />
              </motion.div>
            </div>
          ))}
        </motion.div>
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
              className="relative w-[90vw] h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={carouselItems[activeIndex].imageUrl}
                alt={carouselItems[activeIndex].title}
                className="w-full h-full object-contain"
                loading="eager"
                decoding="async"
                style={{ transform: "translateZ(0)" }}
              />
              <button
                className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 cursor-pointer"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhotographyCarousel; 