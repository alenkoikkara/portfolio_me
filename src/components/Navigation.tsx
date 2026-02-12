import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";

interface NavItemProps {
  to: string;
  children: React.ReactNode;
  hoveredItem: string | null;
  setHoveredItem: (item: string | null) => void;
}

const NavItem = ({ to, children, hoveredItem, setHoveredItem }: NavItemProps) => {
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

const Navigation: React.FC = () => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div className="h-full flex flex-col text-black dark:text-white gap-6 z-50">
      <div className="text-xs md:text-md text-slate md:text-end text-start space-y-2">
        <NavItem to="/" hoveredItem={hoveredItem} setHoveredItem={setHoveredItem}>Home</NavItem>
        {/* <NavItem to="/blogs" hoveredItem={hoveredItem} setHoveredItem={setHoveredItem}>Blogs</NavItem> */}
        <NavItem to="/photography" hoveredItem={hoveredItem} setHoveredItem={setHoveredItem}>Photography</NavItem>
        {/* <NavItem to="/about" hoveredItem={hoveredItem} setHoveredItem={setHoveredItem}>About</NavItem> */}
        <NavItem to="/graphicdesign" hoveredItem={hoveredItem} setHoveredItem={setHoveredItem}>Graphic Design</NavItem>
      </div>
    </div>
  );
};

export default Navigation;
