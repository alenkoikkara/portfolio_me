import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useCarousel } from "../context/CarouselContext";
import LandingCard from "./LandingCard";
import Aglet from "../projects/Aglet";
import Ketto from "../projects/Ketto";
import AnchalMaria from "../projects/AnchalMaria";
import SplitSense from "../projects/SplitSense";
import Memento from "../projects/Memento";
import ShreyaKumar from "../projects/ShreyaKumar";
interface CarouselItem {
  id: number;
  title?: string;
  description?: string;
  imageUrl?: string;
  component?: React.ReactNode;
}

const carouselItems: CarouselItem[] = [
  {
    id: 0,
    component: <LandingCard />,
  },
  {
    id: 1,
    title:
      "React | Redux | Node.js | MongoDB | AWS Lambda | EC2 | GitHub Actions",
    description:
      "Built a full-stack e-commerce platform using the MERN stack. Integrated Firebase Authentication and simulated Stripe payments via webhooks. Deployed a serverless backend on AWS Lambda and hosted the frontend on EC2. Automated deployments for both using GitHub Actions.",
    component: <Aglet />,
  },
  {
    id: 2,
    title: "React | Angular | Figma | Webflow",
    description:
      "I worked here as a software developer, where i developed features, optimizations, and bug fixes for the company's web application.",
    component: <Ketto />,
  },
  {
    id: 3,
    title: "Figma | Framer | React",
    description:
      "This was a freelance gig, where i built a portfolio website for a UX researcher client Anchal Maria. We both contributed to the designs in Figma, iteratively finding satisfaction for the client and then built the portfolio on Framer.",
    component: <AnchalMaria />,
  },
  {
    id: 4,
    title: "Figma | Framer | React",
    description:
      "This was a freelance gig, where i built a portfolio website for a UX researcher client.We both contributed to the designs in Figma, iteratively finding satisfaction for the client and then built the portfolio on Framer.",
    component: <ShreyaKumar />,
  },
  {
    id: 5,
    title:
      "Python | React | ChromaDB | FastApi | MongoDB | Github Actions | Docker",
    description:
      "This was a freelance gig, where i built a portfolio website for a UX researcher client.We both contributed to the designs in Figma, iteratively finding satisfaction for the client and then built the portfolio on Framer.",
    component: <Memento />,
  },
  {
    id: 6,
    component: <SplitSense />,
  },
];

// Export carouselItems so it can be used in BottomBar
export { carouselItems };

const ScrollCarousel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeIndex, setActiveIndex } = useCarousel();

  // Handle scroll events within the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollPosition = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollPosition / itemHeight);

      if (newIndex >= 0 && newIndex < carouselItems.length) {
        setActiveIndex(newIndex);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [setActiveIndex]);

  // Handle wheel events from anywhere on the page
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (containerRef.current) {
        // Prevent default scrolling behavior
        e.preventDefault();

        // Scroll the container based on wheel delta
        containerRef.current.scrollTop += e.deltaY;

        // Update active index
        const scrollPosition = containerRef.current.scrollTop;
        const itemHeight = containerRef.current.clientHeight;
        const newIndex = Math.round(scrollPosition / itemHeight);

        if (newIndex >= 0 && newIndex < carouselItems.length) {
          setActiveIndex(newIndex);
        }
      }
    };

    // Add event listener to the window
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [setActiveIndex]);

  // Scroll to a specific slide
  const scrollToSlide = (index: number) => {
    if (containerRef.current) {
      const itemHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTo({
        top: index * itemHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Scrollable content container with only images */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-hide"
        style={{
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
          height: "100%",
        }}
      >
        {carouselItems.map((item) => (
          <div
            key={item.id}
            className="w-full h-full flex items-center justify-center snap-start"
          >
            {item.component ? (
              <motion.div
                className="w-full h-full overflow-hidden"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
              >
                {item.component}
              </motion.div>
            ) : (
              <motion.div
                className="w-full h-full overflow-hidden"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                viewport={{ once: true }}
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation dots on the right side */}
      <div className="absolute right-1 md:right-50 top-1/2 md:top-1/2 transform -translate-y-1/2 flex flex-col gap-3 z-10">
        {carouselItems.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => scrollToSlide(idx)}
            className={`w-8 h-8 flex items-center justify-center transition-all duration-300 text-xs md:text-sm cursor-pointer dark:text-white text-blackboard-black`}
            style={{
              color: activeIndex !== idx ? "var(--color-slate)" : "",
              transform: activeIndex === idx ? "scale(1.7)" : "scale(1)",
              opacity: activeIndex === idx ? 1 : 0.7,
              display: idx === 0 ? "none" : "block",
            }}
            aria-label={`Go to slide ${idx}`}
          >
            {String(idx).padStart(2, "0")}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ScrollCarousel;
