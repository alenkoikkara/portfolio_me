import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

const Navigation: React.FC = () => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const NavItem = ({ to, children }: { to: string; children: React.ReactNode }) => {
    return (
      <div 
        onMouseEnter={() => setHoveredItem(to)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <NavLink to={to}>
          {({ isActive }) => (
            <motion.div className="relative overflow-hidden">
              <motion.span
                className={`relative z-10 ${isActive ? "text-blackboard-black dark:text-white" : "text-slate"}`}
              >
                {isActive ? `[${children}]` : children}
              </motion.span>
              <motion.span
                className={`absolute inset-0 z-20 hidden md:block ${isActive ? "text-blackboard-black dark:text-white" : "text-blackboard-black dark:text-white"}`}
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{ clipPath: hoveredItem === to ? "inset(0 0 0 0)" : "inset(0 100% 0 0)" }}
                transition={{ duration: 0.6 }}
              >
                {isActive ? `[${children}]` : children}
              </motion.span>
            </motion.div>
          )}
        </NavLink>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col text-black dark:text-white gap-6 z-50">
      <div className="text-xs md:text-md text-slate md:text-end text-start space-y-2">
        <NavItem to="/">Home</NavItem>
        {/* <NavItem to="/blogs">Blogs</NavItem> */}
        <NavItem to="/photography">Photography</NavItem>
        {/* <NavItem to="/about">About</NavItem> */}
      </div>
    </div>
  );
};

export default Navigation;
