import React from "react";
import PhotographyCarousel, { carouselItems } from "../components/PhotographyCarouselv1";
import WebLayout from "../layout/photographylayout/WebLayout";
import MobileLayout from "../layout/photographylayout/MobileLayout";
import CarouselInfo from "../components/CarouselInfo";
import { useCarousel } from "../context/CarouselContext";

const Photography: React.FC = () => {
  const { activeIndex, isTableView } = useCarousel();

  return (
    <div className="md:h-[100vh] h-[75vh] w-full md:overflow-hidden overscroll-none">
      {/* Mobile Layout (default) */}
      <div className="md:hidden h-full w-full overscroll-none">
        <MobileLayout>
          <div className="flex flex-col h-full overflow-hidden">
            <div className="w-full h-full overflow-hidden">
              <PhotographyCarousel />
            </div>
            {/* Title and Date Display */}
            {!isTableView && (
              <div className="px-4 py-8">
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
        </MobileLayout>
      </div>

      {/* Web Layout (md and up) */}
      <div className="hidden md:block h-full w-full">
        <WebLayout>
          <div className="flex flex-col h-full overflow-visible">
            <div className="h-full w-full overflow-visible text-white">
              <PhotographyCarousel />
            </div>
          </div>
        </WebLayout>
      </div>
    </div>
  );
};

export default Photography;
