import React from 'react';

interface CanvasControlsProps {
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string;
  canvasFgColor: string;
  canvasBorderRadius: number;
  panelRoundedCorners: boolean;
  showGrid: boolean;
  theme: 'light' | 'dark';
  onUpdateCanvasDimensions: (width: number, height: number) => void;
  onUpdateCanvasColors: (bgColor: string, fgColor: string) => void;
  onSetCanvasBorderRadius: (radius: number) => void;
  onTogglePanelRoundedCorners: () => void;
  onToggleGrid: () => void;
}

const CanvasControls: React.FC<CanvasControlsProps> = ({
  canvasWidth,
  canvasHeight,
  canvasBgColor,
  canvasFgColor,
  canvasBorderRadius,
  //panelRoundedCorners,
  showGrid,
  theme,
  onUpdateCanvasDimensions,
  onUpdateCanvasColors,
  onSetCanvasBorderRadius,
  //onTogglePanelRoundedCorners,
  onToggleGrid,
}) => {
  const mainTextColor = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';
  const labelTextColor = theme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const componentBgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const componentBorderColor = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';
  
  const inputBg = theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50';
  const inputText = theme === 'dark' ? 'text-gray-200' : 'text-gray-900';
  const inputBorder = theme === 'dark' ? 'border-gray-600' : 'border-gray-300';
  const focusRing = theme === 'dark' ? 'focus:ring-blue-500' : 'focus:ring-blue-500';

  const inputBaseClasses = `p-2 rounded border ${inputBorder} ${inputBg} ${inputText} focus:outline-none focus:ring-2 ${focusRing}`;
  const labelBaseClasses = `block text-sm font-medium mb-1 ${labelTextColor}`;

  const colorInputClasses = `w-full h-10 p-0 border-none rounded cursor-pointer overflow-hidden ${inputBaseClasses.replace('p-2', '')}`;

  return (
    <div className={`w-full max-w-7xl mx-auto p-4 rounded-lg shadow-xl mb-6 ${componentBgColor} ${componentBorderColor} border ${mainTextColor} transition-colors duration-300`}>
      <h2 className={`text-xl font-semibold mb-6 text-center ${mainTextColor}`}>Canvas Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Canvas Dimensions */}
        <div className="flex flex-col">
          <label className={labelBaseClasses}>Canvas Dimensions (px)</label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={canvasWidth}
              onChange={(e) => onUpdateCanvasDimensions(parseInt(e.target.value, 10) || 0, canvasHeight)}
              className={`${inputBaseClasses} w-full`}
              placeholder="Width"
              min="100"
              title="Canvas Width"
            />
            <input
              type="number"
              value={canvasHeight}
              onChange={(e) => onUpdateCanvasDimensions(canvasWidth, parseInt(e.target.value, 10) || 0)}
              className={`${inputBaseClasses} w-full`}
              placeholder="Height"
              min="100"
              title="Canvas Height"
            />
          </div>
        </div>

        {/* Background Color */}
        <div className="flex flex-col">
          <label className={labelBaseClasses}>Background Color</label>
          <input
            type="color"
            value={canvasBgColor}
            onChange={(e) => onUpdateCanvasColors(e.target.value, canvasFgColor)}
            className={colorInputClasses} 
            title="Canvas Background Color"
          />
        </div>

        {/* Border Color */}
        <div className="flex flex-col">
          <label className={labelBaseClasses}>Border Color</label>
          <input
            type="color"
            value={canvasFgColor}
            onChange={(e) => onUpdateCanvasColors(canvasBgColor, e.target.value)}
            className={colorInputClasses}
            title="Canvas Border Color"
          />
        </div>

        {/* Canvas Border Radius */}
        <div className="flex flex-col">
          <label htmlFor="canvasBorderRadius" className={labelBaseClasses}>Canvas Border Radius (px)</label>
          <input
            id="canvasBorderRadius"
            type="number"
            value={canvasBorderRadius}
            onChange={(e) => onSetCanvasBorderRadius(parseInt(e.target.value, 10) || 0)}
            className={`${inputBaseClasses} w-full`}
            min="0"
            max="100"
            title="Canvas Border Radius"
          />
        </div>

        {/* Show Grid Toggle */}
        <div className="flex flex-col justify-center"> {/* Aligned with other inputs better */}
          <label className={labelBaseClasses}>Grid</label>
          <label className="inline-flex items-center cursor-pointer mt-1"> {/* Added mt-1 for alignment with inputs that have labels above */}
            <input
              type="checkbox"
              className="sr-only peer"
              checked={showGrid}
              onChange={onToggleGrid}
            />
            <div className={`relative w-11 h-6 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'} peer-focus:outline-none peer-focus:ring-4 ${theme === 'dark' ? 'peer-focus:ring-blue-800' : 'peer-focus:ring-blue-300'} rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${theme === 'dark' ? 'peer-checked:bg-blue-600' : 'peer-checked:bg-blue-600'}`}></div>
            <span className={`ms-3 text-sm font-medium ${mainTextColor}`}>Show Grid</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default CanvasControls;