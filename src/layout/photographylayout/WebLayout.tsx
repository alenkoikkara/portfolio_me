import React from 'react'

const WebLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  return (
    <div className='py-[12%] px-[20%] h-full relative'>
      {children}
    </div>
  )
}

export default WebLayout