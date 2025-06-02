import React, { useState, useEffect, useRef, useCallback } from 'react';
import Draggable, { DraggableEventHandler } from 'react-draggable';
import { Trash2 } from 'lucide-react';
import type { PanelInterface } from '../types';

interface PanelProps {
  panel: PanelInterface;
  theme: 'light' | 'dark';
  isSelected: boolean;
  isEditingDimensions: boolean;
  roundedCorners: boolean;
  onDragStop: (id: string, x: number, y: number) => void;
  onUpdateDimensions: (id: string, width: number, height: number) => void;
  onUpdateText: (id: string, text: string) => void;
  onSelectPanel: (e: React.MouseEvent, panelId: string) => void;
  onDeletePanel: (panelId: string) => void;
  onDimensionClick: (panel: PanelInterface) => void;
  onDimensionSubmit: (panelId: string, newWidth: string, newHeight: string) => void;
  onDimensionCancel: () => void;
}

const Panel: React.FC<PanelProps> = ({
  panel,
  theme,
  isSelected,
  isEditingDimensions,
  roundedCorners,
  onDragStop,
  onUpdateDimensions,
  onUpdateText,
  onSelectPanel,
  onDeletePanel,
  onDimensionClick,
  onDimensionSubmit,
  onDimensionCancel,
}) => {
  const [newWidth, setNewWidth] = useState(panel.width.toString());
  const [newHeight, setNewHeight] = useState(panel.height.toString());

  const [isResizing, setIsResizing] = useState(false);
  const initialX = useRef(0);
  const initialY = useRef(0);
  const initialWidth = useRef(0);
  const initialHeight = useRef(0);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    initialX.current = e.clientX;
    initialY.current = e.clientY;
    initialWidth.current = panel.width;
    initialHeight.current = panel.height;
  };

  const handleMouseMoveResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - initialX.current;
    const deltaY = e.clientY - initialY.current;

    const newW = Math.max(50, initialWidth.current + deltaX);
    const newH = Math.max(50, initialHeight.current + deltaY);

    onUpdateDimensions(panel.id, newW, newH);
  }, [isResizing, panel.id, initialWidth, initialHeight, onUpdateDimensions]);


  const handleMouseUpResize = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMoveResize);
      window.addEventListener('mouseup', handleMouseUpResize);
    } else {
      window.removeEventListener('mousemove', handleMouseMoveResize);
      window.removeEventListener('mouseup', handleMouseUpResize);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveResize);
      window.removeEventListener('mouseup', handleMouseUpResize);
    };
  }, [isResizing, handleMouseMoveResize, handleMouseUpResize]);

  const handleKeyDownDimensions = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onDimensionSubmit(panel.id, newWidth, newHeight);
    } else if (e.key === 'Escape') {
      onDimensionCancel();
    }
  };

  const handleDrag: DraggableEventHandler = (_e, data) => {
  };

  const handleStop: DraggableEventHandler = (_e, data) => {
    if (!isResizing) {
      onDragStop(panel.id, data.x, data.y);
    }
  };


  return (
    <Draggable
      position={{ x: panel.x, y: panel.y }}
      onStop={handleStop}
      onDrag={handleDrag}
      bounds="parent"
      disabled={isResizing}
    >
      <div
        className={`absolute ${isSelected ? 'z-10' : 'z-0'}`}
        style={{ zIndex: panel.zIndex }}
        onClick={(e) => onSelectPanel(e, panel.id)}
      >
        <div className="relative group">
          <div
            className={`${
              roundedCorners ? 'rounded-lg' : ''
            } ${
              theme === 'dark'
                ? 'bg-gray-700 shadow-xl shadow-gray-900/70'
                : 'bg-white shadow-xl shadow-gray-300/70'
            } border-2 ${
              isSelected
                ? 'border-green-500 border-dotted'
                : theme === 'dark'
                  ? 'border-gray-500'
                  : 'border-gray-300'
            } transition-colors duration-200 flex flex-col justify-between p-2`}
            style={{ width: panel.width, height: panel.height }}
          >
            <textarea
              value={panel.text}
              onChange={(e) => onUpdateText(panel.id, e.target.value)}
              placeholder="Type text"
              className={`w-full h-full p-1 bg-transparent border-none outline-none text-sm resize-none ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
              }`}
              onClick={(e) => e.stopPropagation()} // Prevent selection when clicking textarea
            />

            {/* Delete Button */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePanel(panel.id);
                }}
                className={`p-1.5 rounded-md ${
                  theme === 'dark'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-red-500 hover:bg-red-600'
                } text-white shadow-lg`}
                title="Delete this panel"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div
              className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onDimensionClick(panel);
              }}
            >
              {isEditingDimensions ? (
                <div className="flex gap-1 items-center">
                  <input
                    type="number"
                    value={newWidth}
                    onChange={(e) => setNewWidth(e.target.value)}
                    onKeyDown={handleKeyDownDimensions}
                    className={`w-12 h-6 text-xs font-mono rounded px-1 ${
                      theme === 'dark'
                        ? 'bg-gray-600 text-white border-gray-500'
                        : 'bg-white text-gray-900 border-gray-300'
                    } border`}
                    min="50"
                    max="400"
                  />
                  <span className={`text-xs font-mono ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  }`}>×</span>
                  <input
                    type="number"
                    value={newHeight}
                    onChange={(e) => setNewHeight(e.target.value)}
                    onKeyDown={handleKeyDownDimensions}
                    className={`w-12 h-6 text-xs font-mono rounded px-1 ${
                      theme === 'dark'
                        ? 'bg-gray-600 text-white border-gray-500'
                        : 'bg-white text-gray-900 border-gray-300'
                    } border`}
                    min="50"
                    max="400"
                  />
                </div>
              ) : (
                <span className={`text-xs font-mono ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {panel.width} × {panel.height}
                </span>
              )}
            </div>

            {/* Resize Handle */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              onMouseDown={handleMouseDownResize}
            />
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default Panel;