import React from 'react'
import CarouselHome from '../components/CarouselHome'
import { motion } from 'framer-motion'

const Home: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <CarouselHome />
    </motion.div>
  )
}

export default Home