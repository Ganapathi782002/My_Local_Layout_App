import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Plus, Trash2, Settings, Download, Upload, Save } from 'lucide-react'; // Removed LineChart, SlidersHorizontal, Gauge
import Draggable from 'react-draggable';
import html2canvas from 'html2canvas';

interface Panel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  text: string; // Added for Feature 2: Text box in panels
}

interface CanvasConfig {
  panels: Panel[];
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string;
  canvasFgColor: string;
  roundedCorners: boolean;
  showGrid: boolean;
}

export default function DrawingCanvas() {
  const { theme, toggleTheme } = useTheme();
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [editingPanel, setEditingPanel] = useState<string | null>(null);
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [canvasWidth, setCanvasWidth] = useState(1280);
  const [canvasHeight, setCanvasHeight] = useState(720);
  const [isEditingCanvas, setIsEditingCanvas] = useState(false);
  const [newCanvasWidth, setNewCanvasWidth] = useState('');
  const [newCanvasHeight, setNewCanvasHeight] = useState('');
  const [canvasBgColor, setCanvasBgColor] = useState('#ffffff');
  const [canvasFgColor, setCanvasFgColor] = useState('#000000');
  const [roundedCorners, setRoundedCorners] = useState(true);
  const [showGrid, setShowGrid] = useState(false);

  // New states and refs for resizing functionality
  const [isResizing, setIsResizing] = useState(false);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const initialX = useRef(0);
  const initialY = useRef(0);
  const initialWidth = useRef(0);
  const initialHeight = useRef(0);

  // New state for Feature 3: Copy-paste panels
  const [copiedPanelData, setCopiedPanelData] = useState<Panel | null>(null);

  // New functions for resizing
  const handleMouseDownResize = (e: React.MouseEvent, panel: Panel) => {
    e.stopPropagation(); // Prevent dragging from starting when clicking resize handle
    setIsResizing(true);
    setActivePanelId(panel.id);
    initialX.current = e.clientX;
    initialY.current = e.clientY;
    initialWidth.current = panel.width;
    initialHeight.current = panel.height;
  };

  const handleMouseMoveResize = (e: MouseEvent) => {
    if (!isResizing || !activePanelId) return;

    const deltaX = e.clientX - initialX.current;
    const deltaY = e.clientY - initialY.current;

    setPanels(prevPanels =>
      prevPanels.map(p => {
        if (p.id === activePanelId) {
          const newWidth = Math.max(50, initialWidth.current + deltaX); // Minimum width of 50px
          const newHeight = Math.max(50, initialHeight.current + deltaY); // Minimum height of 50px
          return { ...p, width: newWidth, height: newHeight };
        }
        return p;
      })
    );
  };

  const handleMouseUpResize = () => {
    setIsResizing(false);
    setActivePanelId(null);
  };

  // Effect to add/remove global mouse event listeners for resizing
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
  }, [isResizing, activePanelId]); // Re-run effect when resizing state or active panel changes

  // Effect for Feature 3: Copy-paste keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey)) { // Ctrl for Windows/Linux, Meta for Mac
        if (e.key === 'c') {
          if (selectedPanel) {
            const panelToCopy = panels.find(p => p.id === selectedPanel);
            if (panelToCopy) {
              setCopiedPanelData(panelToCopy);
            }
          }
        } else if (e.key === 'v') {
          e.preventDefault(); // Prevent default browser paste behavior
          if (copiedPanelData) {
            const newId = crypto.randomUUID();
            const maxZIndex = panels.length > 0 ? Math.max(...panels.map(p => p.zIndex)) : 0;
            const newPanel: Panel = { // Explicitly type as Panel
              ...copiedPanelData,
              id: newId,
              x: copiedPanelData.x + 20, // Offset for visibility
              y: copiedPanelData.y + 20, // Offset for visibility
              zIndex: maxZIndex + 1, // Bring to front
            };
            setPanels(prev => [...prev, newPanel]);
            setSelectedPanel(newId); // Select the newly pasted panel
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPanel, copiedPanelData, panels]); // Dependencies for keyboard events

  const addPanel = () => {
    const canvas = document.querySelector('.canvas-container');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = rect.width / 2 - 200; // Center horizontally
      const y = rect.height / 2 - 100; // Center vertically
      const maxZIndex = panels.length > 0
        ? Math.max(...panels.map(p => p.zIndex))
        : 0;
      setPanels(prev => [...prev, {
        id: crypto.randomUUID(),
        x,
        y,
        width: 400, // Default width
        height: 200, // Default height
        zIndex: maxZIndex + 1,
        text: '', // Feature 2: Initialize text
      }]);
    }
  };

  // Feature 1: Modified removePanel to only delete the specified ID.
  const removeSelectedPanel = () => {
    if (selectedPanel) {
      setPanels(prev => prev.filter(panel => panel.id !== selectedPanel));
      setSelectedPanel(null); // Deselect the panel after removal
    }
  };

  const handleDragStop = (id: string, e: any, data: { x: number; y: number }) => {
    // Only update position if not currently resizing
    if (!isResizing) {
      setPanels(prev => prev.map(panel =>
        panel.id === id ? { ...panel, x: data.x, y: data.y } : panel
      ));
    }
  };

  const handleDimensionClick = (panel: Panel) => {
    setEditingPanel(panel.id);
    setNewWidth(panel.width.toString());
    setNewHeight(panel.height.toString());
  };

  const handleDimensionSubmit = (id: string) => {
    const width = parseInt(newWidth);
    const height = parseInt(newHeight);

    if (!isNaN(width) && !isNaN(height) && width >= 50 && height >= 50) {
      setPanels(prev => prev.map(panel =>
        panel.id === id ? { ...panel, width, height } : panel
      ));
    }
    setEditingPanel(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleDimensionSubmit(id);
    } else if (e.key === 'Escape') {
      setEditingPanel(null);
    }
  };

  const handleCanvasDimensionClick = () => {
    setIsEditingCanvas(true);
    setNewCanvasWidth(canvasWidth.toString());
    setNewCanvasHeight(canvasHeight.toString());
  };

  const handleCanvasDimensionSubmit = () => {
    const width = parseInt(newCanvasWidth);
    const height = parseInt(newCanvasHeight);

    if (!isNaN(width) && !isNaN(height) && width >= 200 && height >= 200) {
      setCanvasWidth(width);
      setCanvasHeight(height);
    }
    setIsEditingCanvas(false);
  };

  const handleCanvasKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCanvasDimensionSubmit();
    } else if (e.key === 'Escape') {
      setIsEditingCanvas(false);
    }
  };

  const exportToPNG = () => {
    const canvas = document.querySelector('.canvas-container');
    if (canvas) {
      html2canvas(canvas as HTMLElement, {
        backgroundColor: canvasBgColor,
        scale: 2, // Higher quality
        logging: false,
      }).then((canvas: HTMLCanvasElement) => {
        const link = document.createElement('a');
        link.download = 'panel-drawing.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }
  };

  const exportConfig = () => {
    const config: CanvasConfig = {
      panels,
      canvasWidth,
      canvasHeight,
      canvasBgColor,
      canvasFgColor,
      roundedCorners,
      showGrid
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'panel-layout.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config: CanvasConfig = JSON.parse(e.target?.result as string);
          // Ensure imported panels have 'text' property, default to empty string if missing
          const importedPanels = config.panels.map(p => ({ ...p, text: p.text || '' }));
          setPanels(importedPanels);
          setCanvasWidth(config.canvasWidth);
          setCanvasHeight(config.canvasHeight);
          setCanvasBgColor(config.canvasBgColor);
          setCanvasFgColor(config.canvasFgColor);
          setRoundedCorners(config.roundedCorners);
          setShowGrid(config.showGrid);
        } catch (error) {
          console.error('Error importing configuration:', error);
          alert('Error importing configuration. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Feature 2: Handler for text input in panels
  const handlePanelTextChange = (id: string, newText: string) => {
    setPanels(prevPanels =>
      prevPanels.map(p =>
        p.id === id ? { ...p, text: newText } : p
      )
    );
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Layout Designer
          </h1>
          <div className="flex gap-4">
            <button
              onClick={addPanel}
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-green-500 hover:bg-green-600'
              } text-white transition-colors`}
            >
              <Plus size={20} />
            </button>
            <button
              onClick={exportConfig}
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white transition-colors`}
            >
              <Save size={20} />
            </button>
            <label
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white transition-colors cursor-pointer`}
            >
              <Upload size={20} />
              <input
                type="file"
                accept=".json"
                onChange={importConfig}
                className="hidden"
              />
            </label>
            <button
              onClick={exportToPNG}
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-purple-500 hover:bg-purple-600'
              } text-white transition-colors`}
            >
              <Download size={20} />
            </button>
            <button
              onClick={() => setIsEditingCanvas(!isEditingCanvas)}
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-600 hover:bg-gray-700'
                  : 'bg-gray-500 hover:bg-gray-600'
              } text-white transition-colors`}
            >
              <Settings size={20} />
            </button>
            {/* Feature 1: Delete selected panel only */}
            <button
              onClick={removeSelectedPanel}
              disabled={!selectedPanel} // Disable if no panel is selected
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-800'
                  : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
              } text-white transition-colors disabled:cursor-not-allowed`}
              title={selectedPanel ? "Delete selected panel" : "No panel selected"}
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-yellow-600 hover:bg-yellow-700'
                  : 'bg-blue-500 hover:bg-blue-600'
              } text-white transition-colors`}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>

        <div className="flex justify-center items-center">
          <div
            className={`relative border-2 canvas-container transition-colors duration-200 overflow-hidden ${
              roundedCorners ? 'rounded-xl' : ''
            } ${showGrid ? 'grid-background' : ''}`}
            style={{
              width: canvasWidth,
              height: canvasHeight,
              backgroundColor: canvasBgColor,
              color: canvasFgColor,
              backgroundImage: showGrid ? `linear-gradient(${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px),
                linear-gradient(90deg, ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px)` : 'none',
              backgroundSize: showGrid ? '20px 20px' : 'auto'
            }}
            // Added onClick to deselect panels when clicking on canvas background
            onClick={() => setSelectedPanel(null)}
          >
            {isEditingCanvas && (
              <div className="absolute top-4 right-4 z-30 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border dark:border-gray-700">
                <div className="space-y-4">
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={newCanvasWidth}
                      onChange={(e) => setNewCanvasWidth(e.target.value)}
                      onKeyDown={handleCanvasKeyDown}
                      className={`w-16 h-8 text-sm font-mono rounded px-2 ${
                        theme === 'dark'
                          ? 'bg-gray-600 text-white border-gray-500'
                          : 'bg-white text-gray-900 border-gray-300'
                      } border`}
                      min="200"
                      max="1200"
                    />
                    <span className={`text-sm font-mono ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>×</span>
                    <input
                      type="number"
                      value={newCanvasHeight}
                      onChange={(e) => setNewCanvasHeight(e.target.value)}
                      onKeyDown={handleCanvasKeyDown}
                      className={`w-16 h-8 text-sm font-mono rounded px-2 ${
                        theme === 'dark'
                          ? 'bg-gray-600 text-white border-gray-500'
                          : 'bg-white text-gray-900 border-gray-300'
                      } border`}
                      min="200"
                      max="1200"
                    />
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="flex flex-col gap-1">
                      <label className={`text-xs font-mono ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>Background</label>
                      <input
                        type="color"
                        value={canvasBgColor}
                        onChange={(e) => setCanvasBgColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={`text-xs font-mono ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}>Foreground</label>
                      <input
                        type="color"
                        value={canvasFgColor}
                        onChange={(e) => setCanvasFgColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className={`text-xs font-mono ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Rounded Corners</label>
                    <button
                      onClick={() => setRoundedCorners(!roundedCorners)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        roundedCorners
                          ? theme === 'dark'
                            ? 'bg-blue-600'
                            : 'bg-blue-500'
                          : theme === 'dark'
                            ? 'bg-gray-600'
                            : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          roundedCorners ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className={`text-xs font-mono ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Show Grid</label>
                    <button
                      onClick={() => setShowGrid(!showGrid)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showGrid
                          ? theme === 'dark'
                            ? 'bg-blue-600'
                            : 'bg-blue-500'
                          : theme === 'dark'
                            ? 'bg-gray-600'
                            : 'bg-gray-300'
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
            )}
            {panels.map(panel => (
              <Draggable
                key={panel.id}
                position={{ x: panel.x, y: panel.y }}
                onStop={(e, data) => handleDragStop(panel.id, e, data)}
                bounds="parent"
                disabled={isResizing} // Disable dragging while resizing
              >
                <div
                  className={`absolute ${
                    selectedPanel === panel.id ? 'z-10' : 'z-0'
                  }`}
                  style={{ zIndex: panel.zIndex }}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent deselecting canvas when clicking panel
                    setSelectedPanel(panel.id);
                  }}
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
                        selectedPanel === panel.id
                          ? 'border-green-500 border-dotted' // Green dotted border for selected panels
                          : theme === 'dark'
                            ? 'border-gray-500'
                            : 'border-gray-300'
                      } transition-colors duration-200 flex flex-col justify-between p-2`}
                      style={{ width: panel.width, height: panel.height }}
                    >
                      {/* Feature 2: Text box in panels */}
                      <textarea
                        value={panel.text}
                        onChange={(e) => handlePanelTextChange(panel.id, e.target.value)}
                        placeholder="Type text"
                        className={`w-full h-full p-1 bg-transparent border-none outline-none text-sm resize-none ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                        }`}
                        onClick={(e) => e.stopPropagation()} // Prevent selecting panel when clicking textarea
                      />

                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                        {/* The trash icon now calls removeSelectedPanel */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSelectedPanel(); // Calls the function to delete only the selected panel
                          }}
                          className={`p-1.5 rounded-md ${
                            theme === 'dark'
                              ? 'bg-red-600 hover:bg-red-700'
                              : 'bg-red-500 hover:bg-red-600'
                          } text-white shadow-lg`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div
                        className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDimensionClick(panel);
                        }}
                      >
                        {editingPanel === panel.id ? (
                          <div className="flex gap-1 items-center">
                            <input
                              type="number"
                              value={newWidth}
                              onChange={(e) => setNewWidth(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, panel.id)}
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
                              onKeyDown={(e) => handleKeyDown(e, panel.id)}
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

                      {/* Bottom-right resize handle */}
                      <div
                        className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-nwse-resize z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onMouseDown={(e) => handleMouseDownResize(e, panel)}
                      />
                    </div>
                  </div>
                </div>
              </Draggable>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}