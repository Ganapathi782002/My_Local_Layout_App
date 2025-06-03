import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface CanvasSettingsPanelProps {
  theme: 'light' | 'dark';
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string;
  canvasFgColor: string;
  roundedCorners: boolean;
  showGrid: boolean;
  onClose: () => void;
  onUpdateDimensions: (width: number, height: number) => void;
  onUpdateColors: (bgColor: string, fgColor: string) => void;
  onToggleRoundedCorners: () => void;
  onToggleGrid: () => void;
}

const CanvasSettingsPanel: React.FC<CanvasSettingsPanelProps> = ({
  theme,
  canvasWidth,
  canvasHeight,
  canvasBgColor,
  canvasFgColor,
  roundedCorners,
  showGrid,
  onClose,
  onUpdateDimensions,
  onUpdateColors,
  onToggleRoundedCorners,
  onToggleGrid,
}) => {
  const [newCanvasWidth, setNewCanvasWidth] = useState(String(canvasWidth));
  const [newCanvasHeight, setNewCanvasHeight] = useState(String(canvasHeight));

  useEffect(() => {
    setNewCanvasWidth(String(canvasWidth));
    setNewCanvasHeight(String(canvasHeight));
  }, [canvasWidth, canvasHeight]);

  const handleCanvasDimensionKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const parsedWidth = parseInt(newCanvasWidth);
      const parsedHeight = parseInt(newCanvasHeight);

      if (!isNaN(parsedWidth) && !isNaN(parsedHeight) && parsedWidth >= 200 && parsedWidth <= 1200 && parsedHeight >= 200 && parsedHeight <= 1200) {
        onUpdateDimensions(parsedWidth, parsedHeight);
      } else {
        alert('Please enter valid dimensions between 200 and 1200.');
        setNewCanvasWidth(String(canvasWidth));
        setNewCanvasHeight(String(canvasHeight));
      }
      (event.target as HTMLInputElement).blur();
    }
  }, [newCanvasWidth, newCanvasHeight, onUpdateDimensions, canvasWidth, canvasHeight]);


  return (
    <div className="absolute top-4 right-4 z-30 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border dark:border-gray-700">
      <button
        onClick={onClose}
        className={`absolute top-2 right-2 p-1 rounded-full ${
          theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'
        }`}
        title="Close settings"
      >
        <X size={20} />
      </button>
      <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-black' : 'text-black-900'}`}>
        Canvas Settings
      </h3>
      <div className="space-y-4">
        {/* Dimensions */}
        <div>
          <label className={`block text-sm font-mono mb-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Dimensions (px)</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={newCanvasWidth}
              onChange={(e) => setNewCanvasWidth(e.target.value)}
              onKeyDown={handleCanvasDimensionKeyDown}
              className={`w-16 h-8 text-sm font-mono rounded px-2 ${
                theme === 'dark'
                  ? 'bg-gray-600 text-white border-gray-500'
                  : 'bg-white text-gray-900 border-gray-300'
              } border`}
              min="200"
              max="1200"
            />
            <span className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>×</span>
            <input
              type="number"
              value={newCanvasHeight}
              onChange={(e) => setNewCanvasHeight(e.target.value)}
              onKeyDown={handleCanvasDimensionKeyDown}
              className={`w-16 h-8 text-sm font-mono rounded px-2 ${
                theme === 'dark'
                  ? 'bg-gray-600 text-white border-gray-500'
                  : 'bg-white text-gray-900 border-gray-300'
              } border`}
              min="200"
              max="1200"
            />
          </div>
        </div>

        {/* Colors */}
        <div className="flex gap-4 items-center">
          <div className="flex flex-col gap-1">
            <label className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Background</label>
            <input
              type="color"
              value={canvasBgColor}
              onChange={(e) => onUpdateColors(e.target.value, canvasFgColor)}
              className="w-8 h-8 rounded cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Foreground</label>
            <input
              type="color"
              value={canvasFgColor}
              onChange={(e) => onUpdateColors(canvasBgColor, e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Rounded Corners Toggle */}
        <div className="flex items-center gap-2">
          <label className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Rounded Corners</label>
          <button
            onClick={onToggleRoundedCorners}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              roundedCorners
                ? theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
                : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                roundedCorners ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Show Grid Toggle */}
        <div className="flex items-center gap-2">
          <label className={`text-sm font-mono ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Show Grid</label>
          <button
            onClick={onToggleGrid}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showGrid
                ? theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
                : theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showGrid ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CanvasSettingsPanel;