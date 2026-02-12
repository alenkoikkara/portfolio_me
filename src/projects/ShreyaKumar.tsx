import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';
import shreyaimac from '../assets/images/shreyaimac.png';
import defaultcursor from '../assets/cursor/defaultcursor.cur';

const ShreyaKumar: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ProjectCard
      image={shreyaimac}
      cursor={defaultcursor}
      onClick={() => navigate("/case-study/shreya-kumar")}
      title="Shreya Kumar"
    />
  );
};

export default ShreyaKumar;