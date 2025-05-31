import { motion } from "framer-motion";

interface CarouselInfoProps {
  title?: string;
  date?: string;
  location?: string;
  focalLength?: string;
  fNumber?: string;
  activeIndex: number;
}

const CarouselInfo: React.FC<CarouselInfoProps> = ({
  title,
  date,
  location,
  focalLength,
  fNumber,
  activeIndex,
}) => {
  return (
    <div className="text-white md:text-end text-start w-[250px]">
      <motion.div
        key={activeIndex}
        initial={{ opacity: 0}}
        animate={{ opacity: 1}}
        exit={{ opacity: 0}}
        transition={{ duration: 0.5, delay: 0.5, ease: "easeInOut" }}
      >
        <h2 className="text-lg font-regular italic text-blackboard-black dark:text-white">
          {title}
        </h2>
        <p className="text-slate text-sm">{date}</p>
        <p className="text-slate text-xs mt-1">{location}</p>
        <div className="flex items-end md:justify-end font-light justify-start gap-2 text-red-500">
          <p className="text-xs">{focalLength}</p>
          <p className="text-xs">{fNumber}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default CarouselInfo; 