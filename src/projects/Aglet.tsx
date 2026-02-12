import React from "react";
import { useNavigate } from "react-router-dom";
import ProjectCard from "../components/ProjectCard";
import agletcursor from "../assets/cursor/agletcursor.cur";
import agletipad from "../assets/images/agletipad.png";

const Aglet: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ProjectCard
      image={agletipad}
      cursor={agletcursor}
      onClick={() => navigate("/case-study/aglet")}
      title="Aglet"
    />
  );
};

export default Aglet;
