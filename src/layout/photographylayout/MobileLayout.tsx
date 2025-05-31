import React from 'react'

const MobileLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  return (
    <div className='pt-2'>
      {children}
    </div>
  )
}

export default MobileLayout