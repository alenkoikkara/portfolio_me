import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { carouselItems } from "./PhotographyCarouselv1";

const PhotographyTable: React.FC = () => {
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<number | null>(null);

  const handleRowClick = (itemId: number) => {
    setSelectedItem(itemId);
    setIsModalOpen(true);
  };

  return (
    <div className="w-full md:h-full h-[65vh] md:mt-0 mt-40 overflow-y-auto px-4 scrollbar-hide relative">
      <table className="w-full">
        <tbody>
          {carouselItems.map((item) => (
            <tr
              key={item.id}
              className="border-b-[0.5px] border-slate hover:bg-slate/10 cursor-pointer transition-colors"
              onClick={() => handleRowClick(item.id)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <td>
                <p className="text-slate text-[10px] md:text-xs">{item.date}</p>
              </td>
              <td className="py-4 px-2">
                <h3 className="text-white text-xs md:text-sm text-center">
                  {item.title?.toUpperCase()}
                </h3>
              </td>
              <td className="py-4 px-2 text-slate text-[10px] md:text-sm text-end">
                {item.location}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Fixed Center Preview */}
      <AnimatePresence mode="wait">
        {hoveredItem !== null && carouselItems[hoveredItem]?.imageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed top-1/2 right-1 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] rounded-lg overflow-hidden shadow-lg z-10 pointer-events-none hidden md:block"
          >
            <motion.img
              key={hoveredItem}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ 
                duration: 0.4,
                ease: [0.4, 0, 0.2, 1],
                opacity: { duration: 0.3 }
              }}
              src={carouselItems[hoveredItem].imageUrl}
              alt={carouselItems[hoveredItem].title}
              className="w-full h-full object-cover"
              style={{ 
                willChange: "transform, opacity",
                transform: "translateZ(0)"
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && selectedItem !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-[90vw] md:w-max md:h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={carouselItems[selectedItem].imageUrl}
                alt={carouselItems[selectedItem].title}
                className="w-full h-full object-contain"
                loading="eager"
                decoding="async"
                style={{ transform: "translateZ(0)" }}
              />
              <button
                className="absolute md:top-0 -top-10 md:-right-8 right-0 text-white text-2xl hover:text-gray-300 cursor-pointer"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhotographyTable;
