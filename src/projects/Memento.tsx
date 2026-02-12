import React from "react";
import { useNavigate } from "react-router-dom";
import ProjectCard from "../components/ProjectCard";
import kettocursor from "../assets/cursor/kettocursor.cur";
import mementoipad from "../assets/images/mementoipad.png";

const Memento: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ProjectCard
      image={mementoipad}
      cursor={kettocursor}
      onClick={() => navigate("/case-study/memento")}
      title="Memento"
    />
  );
};

export default Memento;
