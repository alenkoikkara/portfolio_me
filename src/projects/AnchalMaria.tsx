import React from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';
import defaultcursor from '../assets/cursor/defaultcursor.cur';
import anchalimac from '../assets/images/anchalimac.png';

const AnchalMaria: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ProjectCard
      image={anchalimac}
      cursor={defaultcursor}
      onClick={() => navigate("/case-study/anchal-maria")}
      title="Anchal Maria"
    />
  );
};

export default AnchalMaria;