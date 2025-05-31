import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import kettohand from "../assets/webm/kettoshowreel.webm";
import kettocursor from "../assets/cursor/kettocursor.cur";
const videos = [
  {
    url: kettohand,
  },
];

const SplitSense: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  // const [direction, setDirection] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play();
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 } // Video will play/pause when 50% visible
    );

    observer.observe(video);

    return () => {
      observer.unobserve(video);
    };
  }, [currentIndex]); // Re-run when video source changes

  useEffect(() => {
    const interval = setInterval(() => {
      // setDirection(1);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % videos.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // const slideVariants = {
  //   enter: (direction: number) => ({
  //     x: direction > 0 ? 1000 : -1000,
  //     opacity: 0,
  //   }),
  //   center: {
  //     zIndex: 1,
  //     x: 0,
  //     opacity: 1,
  //   },
  //   exit: (direction: number) => ({
  //     zIndex: 0,
  //     x: direction < 0 ? 1000 : -1000,
  //     opacity: 0,
  //   }),
  // };

  // const paginate = (newDirection: number) => {
  //   setDirection(newDirection);
  //   setCurrentIndex(
  //     (prevIndex) => (prevIndex + newDirection + videos.length) % videos.length
  //   );
  // };

  return (
    <div
      className="relative w-full h-full overflow-hidden cursor-none flex flex-col items-center justify-center"
      style={{ cursor: `url(${kettocursor}) 4 4, auto` }}
      onClick={() => {
        window.open("https://ketto.org/", "_blank");
      }}
    >
      <motion.div
        className="text-white z-10 blur-xs"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2 }}
      >
        <div className="text-5xl font-regular mb-2 text-blackboard-black dark:text-white">SplitSense</div>
        <div className="text-splitSense text-sun text-sm">
          Expense and budget tracking app
        </div>
      </motion.div>
      <motion.div>
        <div className="text-blackboard-black dark:text-white text-sm mt-6">
          <motion.span initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: .8 }}>in</motion.span> 
          <motion.span initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: .8 }}> progress...</motion.span>
        </div>
      </motion.div>

      {/* <motion.div
        key={currentIndex}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 150, damping: 20 },
          opacity: { duration: 1.2 },
        }}
        className="absolute w-full h-full right-0 flex items-center justify-center"
      >
        <video
          ref={videoRef}
          src={videos[currentIndex].url}
          muted
          playsInline
          className="h-[110%] absolute right-0 object-contain"
        />
      </motion.div> */}
      {/* <div className="absolute bottom-5 left-5 flex space-x-2 z-10">
        {videos.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              const newDirection = index > currentIndex ? 1 : -1;
              paginate(newDirection);
            }}
            className={`w-1 h-1 rounded-full transition-all duration-300 ${
              index === currentIndex ? "bg-ketto scale-125" : "bg-white/50"
            }`}
          />
        ))}
      </div> */}
    </div>
  );
};

export default SplitSense;
