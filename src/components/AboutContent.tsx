import React from "react";
import Spline from "@splinetool/react-spline";
import Navigation from "./Navigation";

const AboutContent: React.FC = () => {
  return (
    <div className="w-full h-full touch-none overflow-hidden overscroll-none flex items-center justify-center">
      <div className="absolute top-[20%] md:left-[20%] left-[4%] z-10">
        <Navigation />
      </div>
      <Spline scene="https://prod.spline.design/kbmPSPzxZzYr8YCU/scene.splinecode" />
      <div className="absolute bottom-0 right-0 z-1 w-50 md:h-100 h-70 dark:bg-blackboard-black bg-white"></div>
      <div className="absolute top-[48%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-1 text-blackboard-black dark:text-white md:text-[64px] text-[48px] text-base/16 md:text-base/16">Alen Koikkara</div>
    </div>
  );
};

export default AboutContent;
