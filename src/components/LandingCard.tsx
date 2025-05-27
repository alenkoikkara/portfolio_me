import React from 'react'
import { motion } from 'framer-motion'
import { useAnimation } from '../context/AnimationContext'

const LandingCard: React.FC = () => {
  const { canAnimate } = useAnimation();

  return (
    <div className="flex py-[30px] flex-col justify-center items-start gap-[10%] text-4xl h-full w-full bg-image bg-blackboard-black dark:bg-white">
        <div className="w-full flex flex-col justify-center items-start gap-2 md:gap-4 text-white dark:text-blackboard-black text-[clamp(2.3rem,11.5vw,20rem)] md:text-[clamp(2rem,6vw,7rem)] font-[300] transition-all duration-300 relative">
          <div className="px-[30px] leading-[1] flex gap-2 md:gap-4 flex-wrap">
            <motion.span
              className=''
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={canAnimate ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 20, filter: "blur(10px)" }}
              transition={{ duration: .8 }}
            >
              I
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={canAnimate ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 20, filter: "blur(10px)" }}
              transition={{ duration: .8, delay: 0.2 }}
            >
              {" "}believe in{" "}
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={canAnimate ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 20, filter: "blur(10px)" }}
              transition={{ duration: .8, delay: 0.4 }}
              className="text-sun font-['Montaga']"
            >
              change,
            </motion.span>
          </div>
          <div className="h-[.5px] mt-2 w-full bg-slate opacity-50 hidden md:block"></div>
          <div className="px-[30px] leading-[1] flex gap-2 md:gap-4 flex-wrap">
            <motion.span
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={canAnimate ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 20, filter: "blur(10px)" }}
              transition={{ duration: .8, delay: 0.3 }}
              className="text-sun font-['Montaga']"
            >
              Change
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={canAnimate ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 20, filter: "blur(10px)" }}
              transition={{ duration: .8, delay: 0.5 }}
            >
              {" "}that
            </motion.span>
            <motion.span
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={canAnimate ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 20, filter: "blur(10px)" }}
              transition={{ duration: .8, delay: 0.6 }}
            >
              {" "} drives
            </motion.span>
          </div>
          <div className="h-[.5px] mt-2 w-full bg-slate opacity-50 hidden md:block"></div>
          <div className="px-[30px] leading-[.8] flex flex-wrap">
            <motion.span
              initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
              animate={canAnimate ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 20, filter: "blur(10px)" }}
              transition={{ duration: .8, delay: 0.4 }}
            >
              innovation.
            </motion.span>
          </div>
        </div>
        <div className="px-[30px] text-slate text-[clamp(.9rem,1.1vw,1.3rem)] font-[300] transition-all duration-300">
          <motion.span
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            animate={canAnimate ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 20, filter: "blur(10px)" }}
            transition={{ duration: .8, delay: 0.4 }}
          >
            Developer | Designer | Photographer
          </motion.span>
        </div>
      </div>
  )
}

export default LandingCard