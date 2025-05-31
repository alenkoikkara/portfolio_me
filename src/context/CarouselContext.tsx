import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface CarouselContextType {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  isTableView: boolean;
  setIsTableView: (isTableView: boolean) => void;
}

const CarouselContext = createContext<CarouselContextType | undefined>(undefined);

export const useCarousel = () => {
  const context = useContext(CarouselContext);
  if (context === undefined) {
    throw new Error('useCarousel must be used within a CarouselProvider');
  }
  return context;
};

interface CarouselProviderProps {
  children: ReactNode;
}

export const CarouselProvider: React.FC<CarouselProviderProps> = ({ children }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTableView, setIsTableView] = useState(false);

  return (
    <CarouselContext.Provider value={{ activeIndex, setActiveIndex, isTableView, setIsTableView }}>
      {children}
    </CarouselContext.Provider>
  );
}; 