import React from 'react';
import ProjectCard from '../components/ProjectCard';
import shreyaimac from '../assets/images/shreyaimac.png';
import defaultcursor from '../assets/cursor/defaultcursor.cur';

const ShreyaKumar: React.FC = () => {
  return (
    <ProjectCard
      image={shreyaimac}
      cursor={defaultcursor}
      externalLink="https://www.net.shreyauxfolio.com/"
      title="Shreya Kumar"
    />
  );
};

export default ShreyaKumar;