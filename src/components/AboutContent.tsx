import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const AboutContent: React.FC = () => {
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    sectionsRef.current.forEach((section, index) => {
      if (!section) return;

      const elements = section.querySelectorAll('.animate-element');
      
      // Different animation effects for each section
      const animations = [
        // Section 1: Fade in and slide up
        () => {
          gsap.fromTo(elements, 
            { y: 100, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              stagger: 0.2,
              scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "top 20%",
                scrub: 1
              }
            }
          );
        },
        // Section 2: Scale and rotate
        () => {
          gsap.fromTo(elements,
            { scale: 0.8, rotation: -10, opacity: 0 },
            {
              scale: 1,
              rotation: 0,
              opacity: 1,
              duration: 1,
              stagger: 0.2,
              scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "top 20%",
                scrub: 1
              }
            }
          );
        },
        // Section 3: Slide from sides
        () => {
          gsap.fromTo(elements,
            { x: (i) => i % 2 === 0 ? -100 : 100, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 1,
              stagger: 0.2,
              scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "top 20%",
                scrub: 1
              }
            }
          );
        },
        // Section 4: Blur and scale
        () => {
          gsap.fromTo(elements,
            { filter: "blur(10px)", scale: 0.5, opacity: 0 },
            {
              filter: "blur(0px)",
              scale: 1,
              opacity: 1,
              duration: 1,
              stagger: 0.2,
              scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "top 20%",
                scrub: 1
              }
            }
          );
        },
        // Section 5: 3D rotation
        () => {
          gsap.fromTo(elements,
            { rotationY: 90, opacity: 0 },
            {
              rotationY: 0,
              opacity: 1,
              duration: 1,
              stagger: 0.2,
              scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "top 20%",
                scrub: 1
              }
            }
          );
        },
        // Section 6: Bounce effect
        () => {
          gsap.fromTo(elements,
            { y: -100, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              stagger: 0.2,
              ease: "bounce.out",
              scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "top 20%",
                scrub: 1
              }
            }
          );
        },
        // Section 7: Color transition
        () => {
          gsap.fromTo(elements,
            { backgroundColor: "#000000", opacity: 0 },
            {
              backgroundColor: "#ffffff",
              opacity: 1,
              duration: 1,
              stagger: 0.2,
              scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "top 20%",
                scrub: 1
              }
            }
          );
        },
        // Section 8: Skew effect
        () => {
          gsap.fromTo(elements,
            { skewX: 45, opacity: 0 },
            {
              skewX: 0,
              opacity: 1,
              duration: 1,
              stagger: 0.2,
              scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "top 20%",
                scrub: 1
              }
            }
          );
        },
        // Section 9: Flip effect
        () => {
          gsap.fromTo(elements,
            { rotationX: 180, opacity: 0 },
            {
              rotationX: 0,
              opacity: 1,
              duration: 1,
              stagger: 0.2,
              scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "top 20%",
                scrub: 1
              }
            }
          );
        },
        // Section 10: Wave effect
        () => {
          gsap.fromTo(elements,
            { y: (i) => Math.sin(i) * 100, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              stagger: 0.2,
              scrollTrigger: {
                trigger: section,
                start: "top 80%",
                end: "top 20%",
                scrub: 1
              }
            }
          );
        }
      ];

      if (animations[index]) {
        animations[index]();
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const sections = [
    {
      title: "About Me",
      content: "I'm a passionate developer and designer with a keen eye for creating beautiful, functional digital experiences. My journey in tech has been driven by a constant desire to learn and innovate.",
      type: "text"
    },
    {
      title: "Skills & Expertise",
      content: ["Full Stack Development", "UI/UX Design", "Photography", "Project Management"],
      type: "list"
    },
    {
      title: "Education",
      content: "Bachelor's in Computer Science with a focus on Software Engineering and Artificial Intelligence.",
      type: "text"
    },
    {
      title: "Work Experience",
      content: "5+ years of experience in web development, working with startups and enterprise clients.",
      type: "text"
    },
    {
      title: "Projects",
      content: ["E-commerce Platform", "Portfolio Websites", "Mobile Applications", "AI Projects"],
      type: "list"
    },
    {
      title: "Technologies",
      content: ["React", "Node.js", "Python", "TypeScript", "AWS", "Docker"],
      type: "list"
    },
    {
      title: "Interests",
      content: ["Photography", "Travel", "Reading", "Music"],
      type: "list"
    },
    {
      title: "Achievements",
      content: ["Best Developer Award 2023", "Open Source Contributor", "Tech Speaker"],
      type: "list"
    },
    {
      title: "Languages",
      content: ["English (Native)", "Spanish (Intermediate)", "French (Basic)"],
      type: "list"
    },
    {
      title: "Contact",
      content: "Let's connect and discuss how we can work together on your next project.",
      type: "text"
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-blackboard-black relative">
      {sections.map((section, index) => (
        <div
          key={index}
          ref={(el) => {
            sectionsRef.current[index] = el;
          }}
          className="min-h-screen flex items-center justify-center py-8 about-section"
        >
          <div className="max-w-4xl w-full">
            <h2 className="text-4xl md:text-5xl font-bold text-blackboard-black dark:text-white mb-8 animate-element">
              {section.title}
            </h2>
            {section.type === "text" ? (
              <p className="text-lg text-slate animate-element">
                {section.content}
              </p>
            ) : (
              <ul className="space-y-4 animate-element">
                {(section.content as string[]).map((item, i) => (
                  <li key={i} className="text-lg text-slate">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AboutContent; 