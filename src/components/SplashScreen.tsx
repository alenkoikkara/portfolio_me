import { useEffect, useState } from "react";
import { useAnimation } from "../context/AnimationContext";
import { motion } from "framer-motion";

interface SplashScreenProps {
  onFadeComplete: () => void;
}

const SplashScreen = ({ onFadeComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const { setCanAnimate } = useAnimation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCanAnimate(true);
        onFadeComplete();
      }, 500); // Wait for fade out animation to complete
    }, 2000); // Show splash screen for 2 seconds

    return () => clearTimeout(timer);
  }, [onFadeComplete, setCanAnimate]);

  const name = "Alen Koikkara.";
  const letters = name.split("");

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-white transition-opacity duration-500 z-50 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex flex-col items-start justify-center">
        <div className="text-4xl text-blackboard-black flex">
          {letters.map((letter, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{
                duration: 0.3,
                delay: index * 0.1,
                ease: "easeOut"
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
