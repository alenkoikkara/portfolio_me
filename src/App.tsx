import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Blogs from './pages/Blogs';
import Photography from './pages/Photography';
import About from './pages/About';
import './App.css';
import Footer from './components/Footer';
import BottomBar from './components/BottomBar';
import { CarouselProvider } from './context/CarouselContext';
import { AnimationProvider } from './context/AnimationContext';
import { useState } from 'react';
import SplashScreen from './components/SplashScreen';

function AppContent() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const [showSplash, setShowSplash] = useState(true);
  const [showContent, setShowContent] = useState(false);

  const handleSplashComplete = () => {
    setShowSplash(false);
    setShowContent(true);
  };

  return (
    <CarouselProvider>
      <AnimationProvider>
        {showSplash && <SplashScreen onFadeComplete={handleSplashComplete} />}
        <div 
          className={`h-dvh max-w-[1600px] relative mx-auto bg-white dark:bg-blackboard-black transition-opacity duration-500 ${
            showContent ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Navigation />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/photography" element={<Photography />} />
            <Route path="/about" element={<About />} />
          </Routes>
          {isHomePage && (
            <>
              <Footer />
              <BottomBar />
            </>
          )}
        </div>
      </AnimationProvider>
    </CarouselProvider>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
// 