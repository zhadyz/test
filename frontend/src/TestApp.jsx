import React from 'react'

function TestApp() {
  console.log('✅ TestApp component loaded')
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333' }}>🎉 React App is Working!</h1>
      <p>If you can see this, React is loading properly.</p>
      <p>Current time: {new Date().toLocaleTimeString()}</p>
      <div style={{ 
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb',
        borderRadius: '5px'
      }}>
        ✅ Frontend server is running correctly
      </div>
    </div>
  )
}

export default TestApp 