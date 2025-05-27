import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import anchalmaria from '../assets/webm/anchalmariabento.webm';
import defaultcursor from '../assets/cursor/defaultcursor.cur';

const images = [
  {
    url: anchalmaria,
  }
];

const AnchalMaria: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
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
  }, [currentIndex]);
  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  // const paginate = (newDirection: number) => {
  //   setDirection(newDirection);
  //   setCurrentIndex((prevIndex) => (prevIndex + newDirection + images.length) % images.length);
  // };

  return (
    <div
      className="relative w-[100%] h-[100%] overflow-hidden bg-blackboard-black "
      style={{ cursor: `url(${defaultcursor}) 4 4, auto` }}
      onClick={() => {
        window.open("https://anchalmaria.com/", "_blank");
      }}
    >
      <motion.div
        className="absolute top-5 left-5 text-white z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2 }}
      >
        <div className="text-5xl font-regular mb-2">Portfolio</div>
        <div className="text-slate text-sm">for Anchal Maria</div>
      </motion.div>
      
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 150, damping: 20 },
            opacity: { duration: 1.2 }
          }}
          className="absolute w-full h-full right-0 bottom-0"
        >
          <video
          ref={videoRef}
          src={images[currentIndex].url}
          muted
          playsInline
          className="h-[65%] md:h-[105%] absolute md:bottom-auto bottom-[-10px] md:right-20 object-contain"
        />
        </motion.div>
      </AnimatePresence>

      {/* <div className="absolute bottom-5 left-5 flex space-x-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              const newDirection = index > currentIndex ? 1 : -1;
              paginate(newDirection);
            }}
            className={`w-1 h-1 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'bg-anchalmaria scale-125' : 'bg-slate'
            }`}
          />
        ))}
      </div> */}
    </div>
  );
};

export default AnchalMaria;