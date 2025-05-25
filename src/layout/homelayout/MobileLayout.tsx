import React, { useEffect, useState } from 'react'

const MobileLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className='pt-4 pr-[40px] h-[100%] relative'>
      <div 
        className={`z-10 fixed left-0 h-[.5px] w-0 bg-slate transition-all duration-2000 ease-out ${
          isLoaded ? 'w-full' : ''
        }`}
      />
      {children}
      <div 
          className={`z-10 fixed left-0 h-[.5px] w-0 bg-slate transition-all duration-2000 ease-out ${
          isLoaded ? 'w-full' : ''
        }`}
      />
    </div>
  )
}

export default MobileLayout