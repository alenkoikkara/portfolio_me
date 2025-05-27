import React, { useEffect, useState } from 'react'

const WebLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className='py-[12%] px-[300px] h-full relative'>
      <div 
        className={`z-10 fixed left-0 h-[.5px] w-0 bg-slate transition-all duration-2000 ease-out ${
          isLoaded ? 'w-full' : ''
        }`}
      />
      <div 
        className={`z-10 fixed top-0 h-0 w-[.5px] bg-slate transition-all duration-2000 ease-out ${
          isLoaded ? 'h-full' : ''
        }`}
      />
      {children}
      <div 
        className={`z-10 fixed left-0 h-[.5px] w-0 bg-slate transition-all duration-2000 ease-out ${
          isLoaded ? 'w-full' : ''
        }`}
      />
      <div 
        className={`z-10 absolute top-0 right-[300px] h-0 w-[.5px] bg-slate transition-all duration-2000 ease-out ${
          isLoaded ? 'h-full' : ''
        }`}
      />
    </div>
  )
}

export default WebLayout