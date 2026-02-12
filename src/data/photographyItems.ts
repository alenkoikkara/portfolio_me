import img1 from "../assets/photography/img1.webp";
import img2 from "../assets/photography/img2.webp";
import img3 from "../assets/photography/img3.webp";
import img4 from "../assets/photography/img4.webp";
import img5 from "../assets/photography/img5.webp";
import img6 from "../assets/photography/img6.webp";
import img7 from "../assets/photography/img7.webp";
import img8 from "../assets/photography/img8.webp";
import img9 from "../assets/photography/img9.webp";
import img10 from "../assets/photography/img10.webp";
import img11 from "../assets/photography/img11.webp";
import img12 from "../assets/photography/img12.webp";
import img13 from "../assets/photography/img13.webp";
import img14 from "../assets/photography/img14.webp";
import img15 from "../assets/photography/img15.webp";

export interface CarouselItem {
    id: number;
    title?: string;
    description?: string;
    imageUrl?: string;
    component?: React.ReactNode;
    date?: string;
    location?: string;
    focalLength?: string;
    fNumber?: string;
}

export const carouselItems: CarouselItem[] = [
    {
        id: 0,
        imageUrl: img1,
        title: "Render",
        date: "Friday, May 30, 2025 at 8:05 PM",
        location: "Madison, Chicago",
        focalLength: "250mm",
        fNumber: "f4-5.6 IS II",
    },
    {
        id: 1,
        imageUrl: img2,
        title: "Horizon",
        date: "Saturday, May 17, 2025 at 7:58 PM",
        location: "New York, NY",
        focalLength: "100mm",
        fNumber: "f/1.4",
    },
    {
        id: 2,
        imageUrl: img3,
        title: "Ashland Intersection",
        date: "Saturday, May 17, 2025 at 7:58 PM",
        location: "Madison & Ashland, Chicago",
        focalLength: "100mm",
        fNumber: "f/1.4",
    },
    {
        id: 3,
        imageUrl: img4,
        title: "Lonely Docks",
        date: "Saturday, May 24, 2025 at 6:50 PM",
        location: "New York, NY",
        focalLength: "26mm",
        fNumber: "f/1.6",
    },
    {
        id: 4,
        imageUrl: img5,
        title: "Astigmatic Eyes",
        date: "Saturday, May 17, 2025 at 7:58 PM",
        location: "New York, NY",
        focalLength: "100mm",
        fNumber: "f/1.4",
    },
    {
        id: 5,
        imageUrl: img6,
        title: "Karwan",
        date: "Saturday, May 17, 2025 at 7:58 PM",
        location: "Mahabaleshwar, Maharashtra",
        focalLength: "100mm",
        fNumber: "f/1.4",
    },
    {
        id: 6,
        imageUrl: img7,
        title: "City of Dreams",
        date: "Saturday, May 17, 2025 at 7:58 PM",
        location: "Worli Ceiling, Mumbai",
        focalLength: "100mm",
        fNumber: "f/1.4",
    },
    {
        id: 7,
        imageUrl: img8,
        title: "Damen | Madison",
        date: "Tuesday, May 17, 2024 at 11:22 AM",
        location: "Damen & Madison, Chicago",
        focalLength: "96mm",
        fNumber: "f4-5.6 IS II",
    },
    {
        id: 8,
        imageUrl: img9,
        title: "Christmas",
        date: "Friday, December 30, 2024 at 6:06 PM",
        location: "New York, NY",
        focalLength: "55mm",
        fNumber: "f4-5.6 IS II",
    },
    {
        id: 9,
        imageUrl: img10,
        title: "Little Sailor",
        date: "Friday, May 5, 2023 at 4:07 PM",
        location: "Fort Kochi, Kerala",
        focalLength: "26mm",
        fNumber: "f/1.6",
    },
    {
        id: 10,
        imageUrl: img11,
        title: "Undisclosed Location",
        date: "Friday, January 1, 2025 at 2:58 PM",
        location: "New York, NY",
        focalLength: "208mm",
        fNumber: "f4-5.6 IS II",
    },
    {
        id: 11,
        imageUrl: img12,
        title: "Shy",
        date: "Friday, August 30, 2025 at 7:45 PM",
        location: "Cherry Blossom, Chicago",
        focalLength: "250mm",
        fNumber: "f4-5.6 IS II",
    },
    {
        id: 12,
        imageUrl: img13,
        title: "Bridges & Tunnels",
        date: "Friday, August 30, 2025 at 7:57 PM",
        location: "Cherry Blossom, Chicago",
        focalLength: "135mm",
        fNumber: "f4-5.6 IS II",
    },
    {
        id: 13,
        imageUrl: img14,
        title: "Lego City",
        date: "Saturday, May 17, 2025 at 7:58 PM",
        location: "New York, NY",
        focalLength: "100mm",
        fNumber: "f/1.4",
    },
    {
        id: 14,
        imageUrl: img15,
        title: "Goodbyes & Goodnights",
        date: "Sunday, May 17, 2025 at 11:58 AM",
        location: "Damen Greenline, Chicago",
        focalLength: "163mm",
        fNumber: "f4-5.6 IS II",
    },
];
