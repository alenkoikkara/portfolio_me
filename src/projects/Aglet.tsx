import React from "react";
import ProjectCard from "../components/ProjectCard";
import agletcursor from "../assets/cursor/agletcursor.cur";
import agletipad from "../assets/images/agletipad.png";

const Aglet: React.FC = () => {
  return (
    <ProjectCard
      image={agletipad}
      cursor={agletcursor}
      title="Aglet"
    />
  );
};

export default Aglet;
