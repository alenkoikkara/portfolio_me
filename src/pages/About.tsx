import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-6">About Me</h1>
      <div className="max-w-2xl">
        <p className="text-lg mb-4">
          Welcome to my portfolio! I'm a passionate developer and photographer.
        </p>
        <p className="text-lg">
          This is where you can learn more about my journey, skills, and interests.
        </p>
      </div>
    </div>
  );
};

export default AboutPage; 