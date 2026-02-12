import React from "react";
import PhotographyCarousel, { carouselItems } from "../components/PhotographyCarouselv1";
import CarouselInfo from "../components/CarouselInfo";
import { useCarousel } from "../context/CarouselContext";

const Photography: React.FC = () => {
  const { activeIndex, isTableView } = useCarousel();

  return (
    <div className="h-[75vh] md:h-screen w-full md:overflow-hidden overscroll-none md:py-[12%] md:px-[20%] pt-2 relative">
      <div className="flex flex-col h-full w-full relative">
        {/* Carousel Container */}
        <div className="flex-1 w-full h-full overflow-hidden md:overflow-visible text-blackboard-black dark:text-white md:text-white">
          <PhotographyCarousel />
        </div>

        {/* Mobile-only Info Display */}
        {!isTableView && (
          <div className="md:hidden px-4 py-8">
            <CarouselInfo
              title={carouselItems[activeIndex].title}
              date={carouselItems[activeIndex].date}
              location={carouselItems[activeIndex].location}
              focalLength={carouselItems[activeIndex].focalLength}
              fNumber={carouselItems[activeIndex].fNumber}
              activeIndex={activeIndex}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Photography;
