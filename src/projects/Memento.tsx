import React from "react";
import ProjectCard from "../components/ProjectCard";
import kettocursor from "../assets/cursor/kettocursor.cur";
import mementoipad from "../assets/images/mementoipad.png";

const Memento: React.FC = () => {
  return (
    <ProjectCard
      image={mementoipad}
      cursor={kettocursor}
      externalLink="https://memorygraph.alenkoikkara.com/"
      title="Memento"
    />
  );
};

export default Memento;
