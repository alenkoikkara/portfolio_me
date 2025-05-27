import { createContext, useContext, useState, ReactNode } from 'react';

interface AnimationContextType {
  canAnimate: boolean;
  setCanAnimate: (value: boolean) => void;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export function AnimationProvider({ children }: { children: ReactNode }) {
  const [canAnimate, setCanAnimate] = useState(false);

  return (
    <AnimationContext.Provider value={{ canAnimate, setCanAnimate }}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAnimation() {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
} 