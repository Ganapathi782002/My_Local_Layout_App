//import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import DrawingCanvas from './components/DrawingCanvas';

function App() {
  return (
    <ThemeProvider>
      <DrawingCanvas />
    </ThemeProvider>
  );
}

export default App;