import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { caseStudies } from "../data/caseStudies";
import Footer from "../components/Footer";

const ProjectCaseStudy: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = id ? caseStudies[id] : null;

  // Scroll to top on mount or id change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!project) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-white bg-blackboard-black">
        <p>Project not found</p> {/* TODO: Better 404 */}
        <button onClick={() => navigate("/")} className="ml-4 underline">Go Home</button>
      </div>
    );
  }

  // Find next project for navigation
  const projectKeys = Object.keys(caseStudies);
  const currentIndex = projectKeys.indexOf(project.id);
  const nextProjectKey = projectKeys[(currentIndex + 1) % projectKeys.length];
  // const prevProjectKey = projectKeys[(currentIndex - 1 + projectKeys.length) % projectKeys.length];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-white dark:bg-blackboard-black text-blackboard-black dark:text-white relative overflow-x-hidden"
    >


      {/* Hero Section */}
      <section className="h-[80vh] w-full flex flex-col md:flex-row items-center justify-end md:justify-between pb-20 px-[5%] md:px-[10%] relative">
        <div className="absolute top-0 left-0 w-full h-[60%] bg-gradient-to-b from-transparent to-white dark:to-blackboard-black z-0 pointer-events-none opacity-20" />

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="z-10"
        >
          <h1 className="text-6xl md:text-8xl font-bold mb-4 tracking-tighter">{project.title}</h1>
          <p className="text-xl md:text-2xl text-slate font-light">{project.subtitle}</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="w-[90vw] md:w-[30vw] z-0 opacity-40 md:opacity-100"
        >
          <img src={project.heroImage} alt={project.title} className="w-full h-full object-cover" />
        </motion.div>
      </section>

      {/* Meta Grid */}
      <section className="px-[5%] md:px-[10%] py-12 border-t border-slate/20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-slate text-sm uppercase mb-2">Role</h3>
            <p className="font-medium">{project.role}</p>
          </div>
          <div>
            <h3 className="text-slate text-sm uppercase mb-2">Timeline</h3>
            <p className="font-medium">{project.timeline}</p>
          </div>
          <div className="col-span-2">
            <h3 className="text-slate text-sm uppercase mb-2">Stack</h3>
            <div className="flex flex-wrap gap-2">
              {project.stack.map(tech => (
                <span key={tech} className="px-3 py-1 border border-slate/30 rounded-full text-sm hover:bg-slate/10 transition-colors cursor-default">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-[5%] md:px-[10%] py-20 flex flex-col md:flex-row gap-20">
        <div className="md:w-1/2">
          <h2 className="text-3xl font-bold mb-6">About the Project</h2>
          <p className="text-lg leading-relaxed text-slate mb-8">{project.description}</p>

          {project.challenges && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3">The Challenge</h3>
              <p className="text-slate">{project.challenges}</p>
            </div>
          )}
          {project.solution && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3">The Solution</h3>
              <p className="text-slate">{project.solution}</p>
            </div>
          )}

          {project.liveLink && (
            <a
              href={project.liveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 bg-blackboard-black dark:bg-white text-white dark:text-blackboard-black rounded-full font-medium hover:scale-105 transition-transform mt-8"
            >
              Visit Live Site
            </a>
          )}
        </div>

        <div className="md:w-1/2 flex items-center justify-center bg-silver/10 rounded-2xl p-8 dark:bg-white/5">
          <img src={project.mainImage} alt="Project Showcase" className="w-full h-auto object-contain shadow-2xl rounded-lg transform hover:-translate-y-2 transition-transform duration-500" />
        </div>
      </section>

      {/* Next Project Navigation */}
      <section className="px-[5%] md:px-[10%] py-32 border-t border-slate/20 flex justify-end cursor-pointer">
        <button
          onClick={() => navigate(`/case-study/${nextProjectKey}`)}
          className="text-right group cursor-pointer"
        >
          <span className="block text-slate text-sm mb-2 group-hover:translate-x-1 transition-transform">Next Project</span>
          <span className="text-4xl md:text-6xl font-bold group-hover:text-slate transition-colors">
            {caseStudies[nextProjectKey].title}
          </span>
        </button>
      </section>

      <div className="fixed bottom-8 left-0 w-full z-50">
        <Footer />
      </div>
    </motion.div>
  );
};

export default ProjectCaseStudy;
