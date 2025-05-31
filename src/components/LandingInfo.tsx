import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import noiseSvg from "../assets/noise.svg";
import transformGif from "../assets/gif/transform.gif";

interface AnimatedTextProps {
  words: string[];
  className?: string;
}

const AnimatedText = ({ words, className = "" }: AnimatedTextProps) => (
  <motion.div 
    className={`flex flex-wrap ${className}`}
    initial="hidden"
    animate="visible"
    variants={containerVariants}
    style={{ gap: 0 }}
  >
    {words.map((word: string, wordIndex: number) => (
      <span key={`word-${wordIndex}`} className="mr-2">
        {word.split('').map((letter: string, letterIndex: number) => (
          <motion.span
            key={`letter-${wordIndex}-${letterIndex}`}
            className="inline-block transition-colors duration-300 hover:text-blackboard-black"
          >
            {letter}
          </motion.span>
        ))}
      </span>
    ))}
  </motion.div>
);

interface AnimatedRolesProps {
  roles: string[];
}

const AnimatedRoles = ({ roles }: AnimatedRolesProps) => (
  <motion.div 
    className="md:text-lg text-[16px] text-blackboard-black relative z-10 flex flex-wrap"
    initial="hidden"
    animate="visible"
    variants={containerVariants}
    style={{ gap: 0 }}
  >
    {roles.map((role: string, index: number) => (
      <span key={`role-${index}`}>
        {role}
        {index < roles.length - 1 && " | "}
      </span>
    ))}
  </motion.div>
);

const containerVariants = {
  hidden: { 
    opacity: 0,
    filter: "blur(10px)",
    y: 20,
    gap: "0px"
  },
  visible: { 
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    gap: "8px",
    transition: {
      duration: 0.8,
      ease: "easeOut",
      gap: {
        delay: 0.4,
        duration: 0.4
      }
    }
  }
};

const LandingInfo = () => {
  const [showText, setShowText] = useState(false);
  const [gifCompleted, setGifCompleted] = useState(false);
  const [gifLoaded, setGifLoaded] = useState(false);
  const content = useMemo(() => ({
    firstLine: "I believe in change.".split(" "),
    secondLine: "Change that drives innovation.".split(" "),
    roles: "Developer | Designer | Photographer".split(" | ")
  }), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowText(true);
    }, 3500); // Show text after 2 seconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (gifLoaded) {
      // Assuming the GIF is 2 seconds long, adjust this value based on your actual GIF duration
      const timer = setTimeout(() => {
        setGifCompleted(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gifLoaded]);

  return (
    <div 
      className="flex flex-col items-start justify-center md:p-14 p-4 gap-4 font-light text-4xl text-[clamp(1.5rem,14vw,12rem)] md:text-[clamp(2rem,6vw,7rem)] text-silver-dark transition-all duration-300 h-full w-full bg-image bg-silver relative"
      style={{
        backgroundImage: `url("${noiseSvg}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 1
      }}
    >
      <AnimatePresence mode="wait">
        {!showText ? (
          !gifCompleted && (
            <motion.div
              key="gif"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-20 inset-0 flex items-center justify-center overflow-hidden rounded-[20px]"
            >
              <img 
                src={transformGif} 
                alt="Transform" 
                className="h-[100%] object-contain grayscale rounded-top-[40px] rounded-t-[50px]"
                onLoad={() => setGifLoaded(true)}
              />
            </motion.div>
          )
        ) : (
          <motion.div
            key="text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 space-y-2"
          >
            <AnimatedText words={content.firstLine} />
            <AnimatedText words={content.secondLine} />
            <AnimatedRoles roles={content.roles} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingInfo;
