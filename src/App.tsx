import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import Home from "./pages/Home";
import Photography from "./pages/Photography";
import About from "./pages/About";
import Footer from "./components/Footer";
import { CarouselProvider } from "./context/CarouselContext";
import ProjectCaseStudy from "./pages/ProjectCaseStudy";
import UnderRenovation from "./pages/UnderRenovation";
import { useLocation, Link } from "react-router-dom";

function AppContent() {
  const location = useLocation();
  const isCaseStudy = location.pathname.startsWith("/case-study/");

  return (
    <>
      <div className="min-h-screen dark:bg-blackboard-black bg-white relative">
        <Link to="/" className="text-xs md:text-md absolute top-4 left-4 z-10 cursor-pointer block">
          <div className="text-slate">Work</div>
          <div className="w-max dark:text-white text-blackboard-black">by Alen Koikkara</div>
        </Link>
        <main>
          <Routes>
            {/* <Route path="/" element={<Home />} /> */}
            <Route path="/" element={<UnderRenovation />} />
            <Route path="/photography" element={<Photography />} />
            <Route path="/about" element={<About />} />
            <Route path="/case-study/:id" element={<ProjectCaseStudy />} />
          </Routes>
        </main>
      </div>
      {!isCaseStudy && <Footer />}
    </>
  );
}

function App() {
  return (
    <CarouselProvider>
      <Router>
        <AppContent />
      </Router>
    </CarouselProvider>
  );
}

export default App;
