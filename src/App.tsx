import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Photography from "./pages/Photography";
import About from "./pages/About";
import Footer from "./components/Footer";
import { CarouselProvider } from "./context/CarouselContext";

function App() {
  return (
    <CarouselProvider>
      <Router>
        <div className="min-h-screen dark:bg-blackboard-black bg-white">
          <div className="text-xs md:text-md absolute top-4 left-4 z-10">
            <div className="text-slate">Work</div>
            <div className="w-max dark:text-white text-blackboard-black">by Alen Koikkara</div>
          </div>
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/photography" element={<Photography />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </main>
        </div>
        <Footer />
      </Router>
    </CarouselProvider>
  );
}

export default App;
