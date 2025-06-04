import React from 'react';

// Define the props interface for the CanvasControls component
interface CanvasControlsProps {
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string;
  canvasFgColor: string;
  canvasBorderRadius: number; // New: numeric border radius for the canvas
  panelRoundedCorners: boolean; // Renamed: now specifically for panels
  showGrid: boolean;
  theme: 'light' | 'dark'; // To apply light/dark mode styling
  // Dispatch functions (callbacks) from useCanvasState
  onUpdateCanvasDimensions: (width: number, height: number) => void;
  onUpdateCanvasColors: (bgColor: string, fgColor: string) => void;
  onSetCanvasBorderRadius: (radius: number) => void; // New: for setting canvas border radius
  onTogglePanelRoundedCorners: () => void; // Renamed: for toggling panel rounded corners
  onToggleGrid: () => void;
}

const CanvasControls: React.FC<CanvasControlsProps> = ({
  canvasWidth,
  canvasHeight,
  canvasBgColor,
  canvasFgColor,
  canvasBorderRadius,
  panelRoundedCorners,
  showGrid,
  theme,
  onUpdateCanvasDimensions,
  onUpdateCanvasColors,
  onSetCanvasBorderRadius,
  onTogglePanelRoundedCorners,
  onToggleGrid,
}) => {
  // Tailwind CSS classes for theme-based styling
  const textColor = theme === 'dark' ? 'text-gray-600' : 'text-black-400';
  const bgColor = theme === 'dark' ? 'bg-white-800' : 'bg-white';
  const borderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';
  const inputClasses = `p-2 rounded border ${borderColor} ${bgColor} ${textColor} focus:outline-none focus:ring-2 ${theme === 'dark' ? 'focus:ring-blue-600' : 'focus:ring-blue-400'}`;

  return (
    // The main container for the "Canvas Settings" ribbon
    <div className={`w-full max-w-7xl mx-auto p-4 rounded-lg shadow-xl mb-4 ${bgColor} ${borderColor} border ${textColor} transition-colors duration-300`}>
      <h2 className="text-xl font-semibold mb-4 text-center">Canvas Settings</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Canvas Dimensions Inputs */}
        {/* These inputs provide numeric control, complementing mouse resizing */}
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Canvas Dimensions</label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={canvasWidth}
              onChange={(e) => onUpdateCanvasDimensions(parseInt(e.target.value) || 0, canvasHeight)}
              className={inputClasses}
              placeholder="Width"
              min="100" // Minimum width for usability
            />
            <input
              type="number"
              value={canvasHeight}
              onChange={(e) => onUpdateCanvasDimensions(canvasWidth, parseInt(e.target.value) || 0)}
              className={inputClasses}
              placeholder="Height"
              min="100" // Minimum height for usability
            />
          </div>
        </div>

        {/* Canvas Background Color Picker */}
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Background Color</label>
          <input
            type="color"
            value={canvasBgColor}
            onChange={(e) => onUpdateCanvasColors(e.target.value, canvasFgColor)}
            // Apply Tailwind classes for styling, hide default color input border
            className={`w-full h-10 p-0 border-none rounded overflow-hidden cursor-pointer ${inputClasses}`}
            title="Canvas Background Color"
          />
        </div>

        {/* Canvas Border Color Picker */}
        <div className="flex flex-col">
          <label className="text-sm font-medium mb-1">Border Color</label>
          <input
            type="color"
            value={canvasFgColor}
            onChange={(e) => onUpdateCanvasColors(canvasBgColor, e.target.value)}
            className={`w-full h-10 p-0 border-none rounded overflow-hidden cursor-pointer ${inputClasses}`}
            title="Canvas Border Color"
          />
        </div>

        {/* Canvas Border Radius Input */}
        <div className="flex flex-col">
          <label htmlFor="canvasBorderRadius" className="text-sm font-medium mb-1">Canvas Border Radius (px)</label>
          <input
            id="canvasBorderRadius"
            type="number"
            value={canvasBorderRadius}
            onChange={(e) => onSetCanvasBorderRadius(parseInt(e.target.value) || 0)}
            className={inputClasses}
            min="0" // Cannot have negative border radius
            max="100" // A reasonable maximum for typical rounded corners
          />
        </div>

        {/* Show Grid Toggle */}
        <div className="flex flex-col justify-end">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer" // Hide checkbox visually but keep it accessible
              checked={showGrid}
              onChange={onToggleGrid}
            />
            {/* Custom toggle switch styling */}
            <div className={`relative w-11 h-6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 ${theme === 'dark' ? 'peer-focus:ring-blue-800' : 'peer-focus:ring-blue-300'} rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${theme === 'dark' ? 'peer-checked:bg-blue-600' : 'peer-checked:bg-blue-600'}`}></div>
            <span className={`ms-3 text-sm font-medium ${textColor}`}>Show Grid</span>
          </label>
        </div>

        {/* Toggle Panel Rounded Corners */}
        <div className="flex flex-col justify-end">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={panelRoundedCorners}
              onChange={onTogglePanelRoundedCorners}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default CanvasControls;