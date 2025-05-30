import React, { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, Plus, Trash2, Settings, Download, Upload, Save, RotateCcw, RotateCw } from 'lucide-react';
import Draggable from 'react-draggable';
import html2canvas from 'html2canvas';

interface Panel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  text: string;
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

interface CanvasState {
  config: CanvasConfig;
  hasUnsavedChanges: boolean;
  history: CanvasConfig[];
  historyIndex: number;
}

type CanvasAction =
  | { type: 'ADD_PANEL'; payload: Panel }
  | { type: 'UPDATE_PANEL_POSITION'; payload: { id: string; x: number; y: number } }
  | { type: 'UPDATE_PANEL_DIMENSIONS'; payload: { id: string; width: number; height: number } }
  | { type: 'UPDATE_PANEL_TEXT'; payload: { id: string; text: string } }
  | { type: 'REMOVE_PANELS'; payload: string[] }
  | { type: 'SET_CANVAS_DIMENSIONS'; payload: { width: number; height: number } }
  | { type: 'SET_CANVAS_COLORS'; payload: { bgColor: string; fgColor: string } }
  | { type: 'TOGGLE_ROUNDED_CORNERS' }
  | { type: 'TOGGLE_GRID' }
  | { type: 'LOAD_CONFIG'; payload: CanvasConfig }
  | { type: 'MARK_AS_SAVED' }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const initialCanvasConfig: CanvasConfig = {
  panels: [],
  canvasWidth: 1280,
  canvasHeight: 720,
  canvasBgColor: '#ffffff',
  canvasFgColor: '#000000',
  roundedCorners: true,
  showGrid: false,
};

const initialState: CanvasState = {
  config: initialCanvasConfig,
  hasUnsavedChanges: false,
  history: [initialCanvasConfig], // Initial state in history
  historyIndex: 0,
};

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  let newConfig: CanvasConfig | null = null; // Initialize as null, will be set for modification actions

  switch (action.type) {
    case 'ADD_PANEL':
      newConfig = {
        ...state.config,
        panels: [...state.config.panels, action.payload],
      };
      break;
    case 'UPDATE_PANEL_POSITION':
      newConfig = {
        ...state.config,
        panels: state.config.panels.map(p =>
          p.id === action.payload.id ? { ...p, x: action.payload.x, y: action.payload.y } : p
        ),
      };
      break;
    case 'UPDATE_PANEL_DIMENSIONS':
      newConfig = {
        ...state.config,
        panels: state.config.panels.map(p =>
          p.id === action.payload.id ? { ...p, width: action.payload.width, height: action.payload.height } : p
        ),
      };
      break;
    case 'UPDATE_PANEL_TEXT':
      newConfig = {
        ...state.config,
        panels: state.config.panels.map(p =>
          p.id === action.payload.id ? { ...p, text: action.payload.text } : p
        ),
      };
      break;
    case 'REMOVE_PANELS':
      newConfig = {
        ...state.config,
        panels: state.config.panels.filter(panel => !action.payload.includes(panel.id)),
      };
      break;
    case 'SET_CANVAS_DIMENSIONS':
      newConfig = {
        ...state.config,
        canvasWidth: action.payload.width,
        canvasHeight: action.payload.height,
      };
      break;
    case 'SET_CANVAS_COLORS':
      newConfig = {
        ...state.config,
        canvasBgColor: action.payload.bgColor,
        canvasFgColor: action.payload.fgColor,
      };
      break;
    case 'TOGGLE_ROUNDED_CORNERS':
      newConfig = {
        ...state.config,
        roundedCorners: !state.config.roundedCorners,
      };
      break;
    case 'TOGGLE_GRID':
      newConfig = {
        ...state.config,
        showGrid: !state.config.showGrid,
      };
      break;

    case 'LOAD_CONFIG':
      // When loading, clear history and set initial state
      return {
        config: action.payload,
        hasUnsavedChanges: false,
        history: [action.payload],
        historyIndex: 0,
      };
    case 'MARK_AS_SAVED':
      // When saved, reset hasUnsavedChanges and clear future history
      return {
        ...state,
        hasUnsavedChanges: false,
        history: [state.config], // Reset history to current config
        historyIndex: 0,
      };
    case 'UNDO':
      const newHistoryIndexUndo = Math.max(0, state.historyIndex - 1);
      return {
        ...state,
        config: state.history[newHistoryIndexUndo],
        historyIndex: newHistoryIndexUndo,
        hasUnsavedChanges: newHistoryIndexUndo !== 0, // Assume unsaved if not at initial history state
      };
    case 'REDO':
      const newHistoryIndexRedo = Math.min(state.history.length - 1, state.historyIndex + 1);
      return {
        ...state,
        config: state.history[newHistoryIndexRedo],
        historyIndex: newHistoryIndexRedo,
        hasUnsavedChanges: newHistoryIndexRedo !== 0,
      };
    default:
      // Fallback for unhandled actions (should not be reached if all actions are typed)
      return state;
  }

  // This block will only be reached by modification actions (where newConfig was set)
  // and which did not return early (like UNDO/REDO/LOAD/SAVE).
  if (newConfig && JSON.stringify(newConfig) !== JSON.stringify(state.config)) {
    const newHistory = state.history.slice(0, state.historyIndex + 1); // Discard future history
    newHistory.push(newConfig);
    
    // Limit history size to prevent memory issues, e.g., last 100 states
    const HISTORY_LIMIT = 100;
    if (newHistory.length > HISTORY_LIMIT) {
        newHistory.splice(0, newHistory.length - HISTORY_LIMIT); // Remove oldest items
    }
    
    return {
      config: newConfig,
      hasUnsavedChanges: true,
      history: newHistory,
      historyIndex: newHistory.length - 1, // Always point to the last item after push
    };
  } else {
    // If newConfig is null (unhandled action) or config didn't actually change,
    // return the current state without modifying history or unsaved changes.
    return state;
  }
}


export default function DrawingCanvas() {
  const { theme, toggleTheme } = useTheme();
  const [state, dispatch] = useReducer(canvasReducer, initialState);

  // Destructure config and other states for easier access
  const { config, hasUnsavedChanges, history, historyIndex } = state;
  const { panels, canvasWidth, canvasHeight, canvasBgColor, canvasFgColor, roundedCorners, showGrid } = config;

  // Local UI states (not part of undo/redo history, still managed by useState)
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [editingPanel, setEditingPanel] = useState<string | null>(null);
  const [newWidth, setNewWidth] = useState('');
  const [newHeight, setNewHeight] = useState('');
  const [isEditingCanvas, setIsEditingCanvas] = useState(false);
  const [newCanvasWidth, setNewCanvasWidth] = useState('');
  const [newCanvasHeight, setNewCanvasHeight] = useState('');

  const [isResizing, setIsResizing] = useState(false);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  const initialX = useRef(0);
  const initialY = useRef(0);
  const initialWidth = useRef(0);
  const initialHeight = useRef(0);

  const [copiedPanelData, setCopiedPanelData] = useState<Panel[] | null>(null);

  // Effect to manage "Save your changes" alert on browser tab/window close
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = ''; // Standard way to trigger the confirmation dialog
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleMouseDownResize = (e: React.MouseEvent, panel: Panel) => {
    e.stopPropagation();
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

    const newWidth = Math.max(50, initialWidth.current + deltaX);
    const newHeight = Math.max(50, initialHeight.current + deltaY);

    dispatch({
      type: 'UPDATE_PANEL_DIMENSIONS',
      payload: { id: activePanelId, width: newWidth, height: newHeight },
    });
  };

  const handleMouseUpResize = () => {
    setIsResizing(false);
    setActivePanelId(null);
  };

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
  }, [isResizing, activePanelId]);

  const removeSelectedPanels = useCallback(() => {
    if (selectedPanels.length > 0) {
      dispatch({ type: 'REMOVE_PANELS', payload: selectedPanels });
      setSelectedPanels([]);
    }
  }, [selectedPanels, dispatch]); // Added dispatch to dependency array

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedPanels.length > 0) {
          removeSelectedPanels();
        }
      }

      if ((e.ctrlKey || e.metaKey)) {
        if (e.key === 'c') {
          if (selectedPanels.length > 0) {
            const panelsToCopy = panels.filter(p => selectedPanels.includes(p.id));
            if (panelsToCopy.length > 0) {
              setCopiedPanelData(panelsToCopy);
            }
          }
        } else if (e.key === 'v') {
          e.preventDefault();
          if (copiedPanelData && copiedPanelData.length > 0) {
            const maxZIndex = panels.length > 0 ? Math.max(...panels.map(p => p.zIndex)) : 0;
            const newSelectedIds: string[] = [];

            copiedPanelData.forEach((copiedPanel, index) => {
              const newId = crypto.randomUUID();
              const newPanel: Panel = {
                ...copiedPanel,
                id: newId,
                x: copiedPanel.x + 20 * (index + 1), // Offset to see the new panel
                y: copiedPanel.y + 20 * (index + 1),
                zIndex: maxZIndex + 1 + index,
              };
              dispatch({ type: 'ADD_PANEL', payload: newPanel });
              newSelectedIds.push(newId);
            });
            setSelectedPanels(newSelectedIds);
          }
        } else if (e.key === 'z') {
          if (e.shiftKey) {
            dispatch({ type: 'REDO' }); // Ctrl+Shift+Z for Redo
          } else {
            dispatch({ type: 'UNDO' }); // Ctrl+Z for Undo
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPanels, copiedPanelData, panels, removeSelectedPanels, dispatch]); // Added dispatch to dependency array

  const addPanel = () => {
    const canvasEl = document.querySelector('.canvas-container');
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const x = rect.width / 2 - 200;
      const y = rect.height / 2 - 100;
      const maxZIndex = panels.length > 0
        ? Math.max(...panels.map(p => p.zIndex))
        : 0;
      const newPanelId = crypto.randomUUID();
      const newPanel: Panel = {
        id: newPanelId,
        x,
        y,
        width: 400,
        height: 200,
        zIndex: maxZIndex + 1,
        text: '',
      };
      dispatch({ type: 'ADD_PANEL', payload: newPanel });
      setSelectedPanels([newPanelId]);
    }
  };

  const handleDragStop = (id: string, _e: any, data: { x: number; y: number }) => {
    if (!isResizing) {
      dispatch({ type: 'UPDATE_PANEL_POSITION', payload: { id, x: data.x, y: data.y } });
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
      dispatch({ type: 'UPDATE_PANEL_DIMENSIONS', payload: { id, width, height } });
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
      dispatch({ type: 'SET_CANVAS_DIMENSIONS', payload: { width, height } });
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
        scale: 2,
        logging: false,
      }).then((canvas: HTMLCanvasElement) => {
        const link = document.createElement('a');
        link.download = 'panel-drawing.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        dispatch({ type: 'MARK_AS_SAVED' });
      });
    }
  };

  const exportConfig = () => {
    const configToExport: CanvasConfig = {
      panels,
      canvasWidth,
      canvasHeight,
      canvasBgColor,
      canvasFgColor,
      roundedCorners,
      showGrid
    };

    const blob = new Blob([JSON.stringify(configToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'panel-layout.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    dispatch({ type: 'MARK_AS_SAVED' });
  };

  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedConfig: CanvasConfig = JSON.parse(e.target?.result as string);
          // Ensure imported panels have 'text' property
          importedConfig.panels = importedConfig.panels.map(p => ({ ...p, text: p.text || '' }));
          dispatch({ type: 'LOAD_CONFIG', payload: importedConfig });
          setSelectedPanels([]);
        } catch (error) {
          console.error('Error importing configuration:', error);
          alert('Error importing configuration. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handlePanelTextChange = (id: string, newText: string) => {
    dispatch({ type: 'UPDATE_PANEL_TEXT', payload: { id, text: newText } });
  };

  const handlePanelClick = (e: React.MouseEvent, panelId: string) => {
    e.stopPropagation();
    if (e.shiftKey) {
      setSelectedPanels(prev =>
        prev.includes(panelId)
          ? prev.filter(id => id !== panelId)
          : [...prev, panelId]
      );
    } else {
      setSelectedPanels([panelId]);
    }
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
              onClick={() => dispatch({ type: 'UNDO' })}
              disabled={historyIndex === 0}
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800'
                  : 'bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300'
              } text-white transition-colors disabled:cursor-not-allowed`}
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={() => dispatch({ type: 'REDO' })}
              disabled={historyIndex === history.length - 1}
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800'
                  : 'bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300'
              } text-white transition-colors disabled:cursor-not-allowed`}
              title="Redo (Ctrl+Shift+Z)"
            >
              <RotateCw size={20} />
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
            <button
              onClick={removeSelectedPanels}
              disabled={selectedPanels.length === 0}
              className={`p-2 rounded-lg ${
                theme === 'dark'
                  ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-800'
                  : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
              } text-white transition-colors disabled:cursor-not-allowed`}
              title={selectedPanels.length > 0 ? "Delete selected panel(s)" : "No panel selected"}
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
            onClick={() => setSelectedPanels([])}
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
                        onChange={(e) => dispatch({ type: 'SET_CANVAS_COLORS', payload: { bgColor: e.target.value, fgColor: canvasFgColor } })}
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
                        onChange={(e) => dispatch({ type: 'SET_CANVAS_COLORS', payload: { bgColor: canvasBgColor, fgColor: e.target.value } })}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className={`text-xs font-mono ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                    }`}>Rounded Corners</label>
                    <button
                      onClick={() => dispatch({ type: 'TOGGLE_ROUNDED_CORNERS' })}
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
                      onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
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
                disabled={isResizing}
              >
                <div
                  className={`absolute ${
                    selectedPanels.includes(panel.id) ? 'z-10' : 'z-0'
                  }`}
                  style={{ zIndex: panel.zIndex }}
                  onClick={(e) => handlePanelClick(e, panel.id)}
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
                        selectedPanels.includes(panel.id)
                          ? 'border-green-500 border-dotted'
                          : theme === 'dark'
                            ? 'border-gray-500'
                            : 'border-gray-300'
                      } transition-colors duration-200 flex flex-col justify-between p-2`}
                      style={{ width: panel.width, height: panel.height }}
                    >
                      <textarea
                        value={panel.text}
                        onChange={(e) => handlePanelTextChange(panel.id, e.target.value)}
                        placeholder="Type text"
                        className={`w-full h-full p-1 bg-transparent border-none outline-none text-sm resize-none ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPanels([panel.id]);
                            setTimeout(() => removeSelectedPanels(), 0);
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