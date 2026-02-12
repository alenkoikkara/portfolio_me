import React from "react";
import { useNavigate } from "react-router-dom";
import ProjectCard from "../components/ProjectCard";
import kettocursor from "../assets/cursor/kettocursor.cur";
import kettoi3g from "../assets/images/kettoi3g.png";

const Ketto: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ProjectCard
      image={kettoi3g}
      cursor={kettocursor}
      onClick={() => navigate("/case-study/ketto")}
      title="Ketto"
    />
  );
};

export default Ketto;
