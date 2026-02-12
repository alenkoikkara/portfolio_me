import React from "react";
import ProjectCard from "../components/ProjectCard";
import kettocursor from "../assets/cursor/kettocursor.cur";
import kettoi3g from "../assets/images/kettoi3g.png";

const Ketto: React.FC = () => {
  return (
    <ProjectCard
      image={kettoi3g}
      cursor={kettocursor}
      externalLink="https://ketto.org/"
      title="Ketto"
    />
  );
};

export default Ketto;
