import React from 'react';
import ProjectCard from '../components/ProjectCard';
import defaultcursor from '../assets/cursor/defaultcursor.cur';
import anchalimac from '../assets/images/anchalimac.png';

const AnchalMaria: React.FC = () => {
  return (
    <ProjectCard
      image={anchalimac}
      cursor={defaultcursor}
      externalLink="https://anchalmaria.com/"
      title="Anchal Maria"
    />
  );
};

export default AnchalMaria;