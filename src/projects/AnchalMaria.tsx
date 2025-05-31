import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import defaultcursor from '../assets/cursor/defaultcursor.cur';
import anchalimac from '../assets/images/anchalimac.png';
import noise from "../assets/noise.svg";

const images = [
  {
    url: anchalimac,
  }
];

const AnchalMaria: React.FC = () => {
  const [currentIndex] = useState(0);
  const [direction] = useState(0);

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

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-silver grayscale hover:grayscale-0 transition-all duration-300 flex items-center justify-center"
      style={{ 
        cursor: `url(${defaultcursor}) 4 4, auto`,
        backgroundImage: `url("${noise}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 1
      }}
      onClick={() => {
        window.open("https://anchalmaria.com/", "_blank");
      }}
    >
      {/* Mobile - Show only first image */}
      <div className="md:hidden w-full h-full">
        <img
          src={images[0].url}
          alt="Anchal Maria"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Desktop - Show carousel */}
      <div className="hidden md:block">
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
              opacity: { duration: 1.2 },
            }}
            className="w-full h-full flex items-center justify-center group"
          >
            <img
              src={images[currentIndex].url}
              alt="Anchal Maria"
              className="w-[40%] h-[40%] object-cover transition-all duration-500 group-hover:scale-210 group-hover:translate-y-[25%]"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AnchalMaria;