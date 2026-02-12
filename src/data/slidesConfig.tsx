import type { ReactNode } from "react";
import LandingInfo from "../components/LandingInfo";
import Ketto from "../projects/Ketto";
import AnchalMaria from "../projects/AnchalMaria";
import ShreyaKumar from "../projects/ShreyaKumar";
import Memento from "../projects/Memento";
// import ParishonNet from "../projects/ParishonNet";

export interface Slide {
    id: string;
    content: ReactNode;
    title?: string;
    description?: string;
    bgColor: string;
}

export const slides: Slide[] = [
    {
        id: "landing",
        content: <LandingInfo />,
        bgColor: "bg-blackboard-black",
    },
    {
        id: "ketto",
        content: <Ketto />,
        bgColor: "bg-silver",
        title: "ketto",
        description: "crowdfunding website",
    },
    {
        id: "anchal-maria",
        content: <AnchalMaria />,
        bgColor: "bg-silver",
        title: "anchal maria",
        description: "portfolio website",
    },
    // {
    //   id: "parishonnet",
    //   content: <ParishonNet/>,
    //   bgColor: "bg-silver",
    //   title: "parishonnet",
    //   description: "dashboard management",
    // },
    {
        id: "shreya-kumar",
        content: <ShreyaKumar />,
        bgColor: "bg-silver",
        title: "shreya kumar",
        description: "portfolio website",
    },
    {
        id: "memento",
        content: <Memento />,
        bgColor: "bg-silver",
        title: "memento",
        description: "knowledge base",
    },
];
