import React, { useState } from "react";
import { motion } from "framer-motion";
import Modal from "./Modal";
import ContactForm from "./ContactForm";

const Connect: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setTimeout(() => {
      setIsModalOpen(false);
    }, 2000); // Close after 2 seconds to show success state if implemented, or just close immediate. 
    // Actually ContactForm handles submission state, let's just close it or let it close itself?
    // The previous plan said "submit button will just log the data... and close the modal".
    // My ContactForm calls onSuccess.
    setIsModalOpen(false);
  };

  return (
    <>
      <div
        className="cursor-pointer z-50 flex flex-col justify-center items-start h-max text-slate text-center text-md transition-all duration-300"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative flex items-center gap-2">
          {/* Mobile version - simple text */}
          <div className="text-[12px] text-blackboard-black dark:text-white md:hidden">
            Let's Connect
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-6 inline-block ml-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
              />
            </svg>
          </div>

          {/* Web version - with animations */}
          <div className="hidden md:flex items-center gap-4">
            <motion.div className="relative overflow-hidden">
              <motion.span className="relative z-10 text-slate text-sm">
                Let's Connect
              </motion.span>
              <motion.span
                className="absolute top-[2px] inset-0 z-20 dark:text-white text-blackboard-black text-sm"
                initial={{ clipPath: "inset(0 100% 0 0)" }}
                animate={{
                  clipPath: isHovered ? "inset(0 0 0 0)" : "inset(0 100% 0 0)",
                }}
                transition={{ duration: 0.5 }}
              >
                Let's Connect
              </motion.span>
            </motion.div>
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="size-6 "
              animate={{ x: isHovered ? 5 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.25 8.25 21 12m0 0-3.75 3.75M21 12H3"
              />
            </motion.svg>
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ContactForm onSuccess={handleSuccess} />
      </Modal>
    </>
  );
};

export default Connect;
