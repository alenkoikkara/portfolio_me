import React from "react";
import Connect from "./Connect";

const Footer: React.FC = () => {
  return (
    <div className="flex justify-between items-center px-4 gap-4 md:gap-10 absolute bottom-[3%] right-0 left-0 text-black dark:text-white text-center">
      <div>
        <Connect />
      </div>
      <div className="flex text-xs md:text-md gap-2">
        <div className="cursor-pointer hover:text-linkedin transition-all duration-300">
          <a href="https://www.linkedin.com/in/alenkoikkara/" target="_blank" rel="noopener noreferrer">LI</a>
        </div>
        <div>|</div>
        <div className="cursor-pointer hover:text-github transition-all duration-300">
          <a href="https://github.com/alenkoikkara" target="_blank" rel="noopener noreferrer">GH</a>
        </div>
        <div>|</div>
        <div className="cursor-pointer hover:text-github transition-all duration-300">
          <a href="https://medium.com/@alendennis77" target="_blank" rel="noopener noreferrer">M</a>
        </div>
      </div>
      <div className="text-[10px] md:text-xs">© 2025 Alen Koikkara</div>
    </div>
  );
};

export default Footer;
