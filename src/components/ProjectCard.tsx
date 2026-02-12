import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ProjectCardProps {
    image: string;
    cursor: string;
    externalLink?: string;
    className?: string;
    title?: string;
    onClick?: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
    image,
    cursor,
    externalLink,
    onClick,
    title = "Project"
}) => {
    const [currentIndex] = useState(0);
    const [direction] = useState(0);

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        })
    };

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (externalLink) {
            window.open(externalLink, "_blank");
        }
    };

    return (
        <div
            className="relative w-full h-full overflow-hidden bg-silver grayscale hover:grayscale-0 transition-all duration-300 flex items-center justify-center cursor-pointer"
            style={{
                cursor: `url(${cursor}) 4 4, auto`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: 1
            }}
            onClick={handleClick}
        >
            {/* Mobile - Show only image */}
            <div className="md:hidden w-full h-full p-4">
                <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Desktop - Show animated image */}
            <div className="hidden md:block">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 150, damping: 20 },
                            opacity: { duration: 1.2 },
                        }}
                        className="w-full h-full flex items-center justify-center group"
                    >
                        <img
                            src={image}
                            alt={title}
                            // Merged classes from Aglet and Ketto with a safe default
                            className="md:w-[40%] md:h-[40%] w-[40%] h-[40%] object-cover transition-all duration-500 group-hover:scale-210 group-hover:translate-y-[30%]"
                        />
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ProjectCard;
