import React from "react";
import Connect from "./Connect";
// import { motion, AnimatePresence } from "framer-motion";
// import { useCarousel } from "../context/CarouselContext";
// import { carouselItems } from "./ScrollCarousel";

const BottomBar: React.FC = () => {
  // const { activeIndex } = useCarousel();
  
  return (
    <div className="mt-2 md:mt-0 flex flex-col-reverse md:flex-row justify-start items-start md:absolute md:top-[82%]">
      <div className="text-md mt-2 md:mt-4 md:pr-8">
        <Connect />
      </div>
      
      <div className="text-slate flex-1 mx-4 md:ml-8">
        {/* <AnimatePresence mode="wait">
          <motion.div
            key={`title-${activeIndex}`}
            className="text-[12px] md:text-[20px] text-blackboard-black dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {carouselItems[activeIndex].title}
          </motion.div>
        </AnimatePresence>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={`desc-${activeIndex}`}
            className="text-[10px] md:text-[14px] max-w-[800px] text-slate md:mt-2 line-clamp-3 md:line-clamp-none"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {carouselItems[activeIndex].description}
          </motion.div>
        </AnimatePresence> */}
      </div>
    </div>
  );
};

export default BottomBar;
