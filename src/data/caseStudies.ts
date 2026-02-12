
import kettoi3g from "../assets/images/kettoi3g.png";
import kettohand from "../assets/images/kettohand.png";
import anchalmain from "../assets/images/anchalmain.png";
import anchalimac from "../assets/images/anchalimac.png";
import agletmain from "../assets/images/agletmain.png";
import agletipad from "../assets/images/agletipad.png";
import mementomain from "../assets/images/mementoipad.png"; // Using iPad as main for Memento as placeholder if main missing
// impoer parishonnet images if available, otherwise skip for now

export interface CaseStudy {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    heroImage: string;
    mainImage: string;
    role: string;
    timeline: string;
    stack: string[];
    liveLink?: string;
    challenges?: string;
    solution?: string;
}

export const caseStudies: Record<string, CaseStudy> = {
    ketto: {
        id: "ketto",
        title: "Ketto",
        subtitle: "Crowdfunding Platform Redesign",
        description: "Ketto is one of Asia's most visited crowdfunding platforms. I was responsible for redesigning key user flows and improving the mobile experience.",
        heroImage: kettoi3g,
        mainImage: kettohand,
        role: "Frontend Developer",
        timeline: "2022",
        stack: ["React", "Angular", "TypeScript", "Tailwind CSS", "Redux"],
        liveLink: "https://ketto.org/",
        challenges: "The main challenge was to improve the donation conversion rate on mobile devices, which was significantly lower than desktop.",
        solution: "We implemented a sticky donation button and streamlined the checkout process, resulting in a 15% increase in mobile conversions."
    },
    "anchal-maria": {
        id: "anchal-maria",
        title: "Anchal Maria",
        subtitle: "Portfolio Website",
        description: "A minimal and elegant portfolio website for a designer, focusing on showcasing visual work with smooth transitions.",
        heroImage: anchalimac,
        mainImage: anchalmain,
        role: "Developer & Designer",
        timeline: "2024",
        stack: ["React", "Framer", "GSAP"],
        liveLink: "https://anchalmaria.framer.website/",
        challenges: "Creating a unique navigation system that felt intuitive but distinct from standard portfolio sites.",
        solution: "Developed a custom cursor-based navigation and seamless page transitions using Framer Motion."
    },
    "aglet": {
        id: "aglet",
        title: "Aglet",
        subtitle: "Sneaker Culture App",
        description: "An app for sneakerheads to explore, collect, and trade virtual sneakers based on real-world location data.",
        heroImage: agletipad,
        mainImage: agletmain,
        role: "Developer & UI Engineer",
        timeline: "2024",
        stack: ["React", "TypeScript", "Tailwind CSS", "Node.js", "Docker", "Express", "MongoDB"],
        liveLink: "https://aglet.app",
        challenges: "Optimizing map rendering performance with thousands of interactive markers.",
        solution: "Implemented clustering and lazy loading for map markers, significantly improving frame rates."
    },
    "memento": {
        id: "memento",
        title: "Memento",
        subtitle: "Personal Knowledge Base",
        description: "A tool for capturing and organizing thoughts, built for speed and simplicity.",
        heroImage: mementomain,
        mainImage: mementomain,
        role: "Solo Developer",
        timeline: "2025",
        stack: ["React", "TypeScript", "Tailwind CSS", "FastAPI", "Docker", "Python", "MongoDB", "Supabase"],
        challenges: "Designing a schema that allows for flexible, graph-like connections between notes.",
        solution: "Used a graph database approach within a relational structure to enable bi-directional linking."
    },
    "shreya-kumar": {
        id: "shreya-kumar",
        title: "Shreya Kumar",
        subtitle: "Architecture Portfolio",
        description: "A clean, grid-based portfolio for an architect to display high-resolution project images.",
        heroImage: anchalimac,
        mainImage: anchalmain,
        role: "Developer & Designer",
        timeline: "2025",
        stack: ["React", "Framer", "Figma"],
        liveLink: "#"
    }
};
