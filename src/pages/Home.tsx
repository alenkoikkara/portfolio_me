import React from "react";
import ScrollCarousel from "../components/ScrollCarousel";
import WebLayout from "../layout/homelayout/WebLayout";
import MobileLayout from "../layout/homelayout/MobileLayout";

const Home: React.FC = () => {
  return (
    <div className="md:h-full h-[60%] w-full overflow-hidden">
      {/* Mobile Layout (default) */}
      <div className="md:hidden h-full w-full">
        <MobileLayout>
          <div className="flex flex-col h-full overflow-hidden">
            <div className="w-full h-full overflow-hidden">
              <ScrollCarousel />
            </div>
          </div>{" "}
        </MobileLayout>
      </div>

      {/* Web Layout (md and up) */}
      <div className="hidden md:block h-full w-full">
        <WebLayout>
          <div className="flex flex-col h-full overflow-hidden">
            <div className="h-screen w-full overflow-hidden">
              <ScrollCarousel />
            </div>
          </div>
        </WebLayout>
      </div>
    </div>
  );
};

export default Home;
