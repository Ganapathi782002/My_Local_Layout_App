import React, { useState, useEffect, useCallback, useRef } from 'react';
import Panel from './Panel';
import Toolbar from './ToolBar';
import CanvasSettingsPanel from './CanvasSettingsPanel/CanvasSettingsPanel';
import { useCanvasState } from '../hooks/useCanvasState';
import { PanelInterface } from '../types';
import { exportCanvasAsPNG, exportCanvasConfigAsJSON, importCanvasConfig } from '../utils/fileOperations';
import { generateUniqueId } from '../utils/idGenerator';

const DrawingCanvas: React.FC = () => {
  // Use our custom hook to manage canvas state
  const { state, dispatch } = useCanvasState();
  const {
    config: {
      panels,
      canvasWidth,
      canvasHeight,
      canvasBgColor,
      canvasFgColor,
      roundedCorners,
      showGrid,
      theme
    },
    history,
    historyIndex,
    hasUnsavedChanges,
    copiedPanels,
  } = state;

  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [editingPanel, setEditingPanel] = useState<string | null>(null);
  const [isEditingCanvas, setIsEditingCanvas] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Callbacks for Panel Component ---
  const handlePanelDragStop = useCallback((id: string, x: number, y: number) => {
    dispatch({ type: 'UPDATE_PANEL_POSITION', payload: { id, x, y } });
    setSelectedPanels([id]);
  }, [dispatch]);

  const handlePanelUpdateDimensions = useCallback((id: string, width: number, height: number) => {
    dispatch({ type: 'UPDATE_PANEL_DIMENSIONS', payload: { id, width, height } });
  }, [dispatch]);

  const handlePanelUpdateText = useCallback((id: string, newText: string) => {
    dispatch({ type: 'UPDATE_PANEL_TEXT', payload: { id, text: newText } });
  }, [dispatch]);

  const handlePanelDelete = useCallback((panelId: string) => {
    dispatch({ type: 'DELETE_PANELS', payload: { ids: [panelId] } });
    setSelectedPanels(prev => prev.filter(id => id !== panelId));
  }, [dispatch]);

  const removeSelectedPanels = useCallback(() => {
    if (selectedPanels.length > 0) {
      dispatch({ type: 'DELETE_PANELS', payload: { ids: selectedPanels } });
      setSelectedPanels([]);
    }
  }, [dispatch, selectedPanels]);

  const handlePanelClick = useCallback((e: React.MouseEvent, panelId: string) => {
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
  }, []);

  const handleDimensionClick = useCallback((panel: PanelInterface) => {
    setEditingPanel(panel.id);
  }, []);

  const handleDimensionSubmit = useCallback((id: string, newWidthVal: string, newHeightVal: string) => {
    const width = parseInt(newWidthVal);
    const height = parseInt(newHeightVal);
    if (!isNaN(width) && !isNaN(height) && width >= 50 && height >= 50) {
      dispatch({ type: 'UPDATE_PANEL_DIMENSIONS', payload: { id, width, height } });
    }
    setEditingPanel(null);
  }, [dispatch]);

  const handleDimensionCancel = useCallback(() => {
    setEditingPanel(null);
  }, []);


  // --- Callbacks for Canvas Settings Panel Component ---
  const handleCanvasDimensionsUpdate = useCallback((width: number, height: number) => {
    dispatch({ type: 'SET_CANVAS_DIMENSIONS', payload: { width, height } });
  }, [dispatch]);

  const handleCanvasColorsUpdate = useCallback((bgColor: string, fgColor: string) => {
    dispatch({ type: 'SET_CANVAS_COLORS', payload: { bgColor, fgColor } });
  }, [dispatch]);

  const handleToggleRoundedCorners = useCallback(() => {
    dispatch({ type: 'TOGGLE_ROUNDED_CORNERS' });
  }, [dispatch]);

  const handleToggleGrid = useCallback(() => {
    dispatch({ type: 'TOGGLE_GRID' });
  }, [dispatch]);

  const toggleTheme = useCallback(() => {
    dispatch({ type: 'TOGGLE_THEME' });
  }, [dispatch]);

  // --- Add Panel Logic ---
  const addPanel = useCallback(() => {
    const newPanel: PanelInterface = {
      id: generateUniqueId(),
      x: 50,
      y: 50,
      width: 200,
      height: 150,
      text: 'Type your text Here',
      zIndex: panels.length > 0 ? Math.max(...panels.map(p => p.zIndex)) + 1 : 1 
    };
    dispatch({ type: 'ADD_PANEL', payload: newPanel });
    setSelectedPanels([newPanel.id]);
  }, [dispatch, panels]);

  // --- Copy/Paste Logic ---
  const handleCopySelectedPanels = useCallback(() => {
    if (selectedPanels.length > 0) {
      dispatch({ type: 'COPY_PANELS', payload: { ids: selectedPanels } });
    }
  }, [dispatch, selectedPanels]);

  const handlePastePanels = useCallback(() => {
    if (copiedPanels.length > 0) {
      dispatch({ type: 'PASTE_PANELS' });
      setSelectedPanels([]);
      // TODO: Future improvement: dispatch a PASTE_AND_SELECT action that returns the new IDs
    }
  }, [dispatch, copiedPanels]);

  // --- Export/Import Logic (using new utilities) ---
  const handleExportPNG = useCallback(() => {
    if (canvasRef.current) {
      exportCanvasAsPNG(canvasRef.current, canvasBgColor, dispatch);
    }
  }, [canvasRef, canvasBgColor, dispatch]);

  const handleExportConfig = useCallback(() => {
    exportCanvasConfigAsJSON(state.config, dispatch);
  }, [state.config, dispatch]);

  const handleImportConfig = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    importCanvasConfig(event.target.files?.[0], dispatch);
    setSelectedPanels([]);
  }, [dispatch]);

  // --- Keyboard Shortcuts (Undo/Redo: Ctrl+Z / Ctrl+Y, Copy/Paste: Ctrl+C / Ctrl+V, Delete) ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isInputFocused = (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement);

      // Undo/Redo
      if ((event.ctrlKey || event.metaKey)) {
        if (event.key === 'z') {
          event.preventDefault();
          if (event.shiftKey) {
            dispatch({ type: 'REDO' });
          } else {
            dispatch({ type: 'UNDO' });
          }
        } else if (event.key === 'y') {
          event.preventDefault();
          dispatch({ type: 'REDO' });
        } else if (event.key === 'c' && !isInputFocused) {
            event.preventDefault();
            handleCopySelectedPanels();
        } else if (event.key === 'v' && !isInputFocused) {
            event.preventDefault();
            handlePastePanels();
        }
      }

      // Delete selected panels (Delete key)
      if (event.key === 'Delete' && selectedPanels.length > 0 && !isInputFocused) {
        event.preventDefault();
        removeSelectedPanels();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, selectedPanels, removeSelectedPanels, handleCopySelectedPanels, handlePastePanels]);


  // --- Unsaved Changes Warning (Optional) ---
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);


  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Toolbar Component */}
        <Toolbar
          theme={theme}
          onAddPanel={addPanel}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onRedo={() => dispatch({ type: 'REDO' })}
          onExportConfig={handleExportConfig}
          onImportConfig={handleImportConfig}
          onExportPNG={handleExportPNG}
          onToggleCanvasSettings={() => setIsEditingCanvas(prev => !prev)}
          onRemoveSelectedPanels={removeSelectedPanels}
          onToggleTheme={toggleTheme}
          onCopySelectedPanels={handleCopySelectedPanels}
          onPastePanels={handlePastePanels}              
          isUndoDisabled={historyIndex === 0}
          isRedoDisabled={historyIndex === history.length - 1}
          isDeleteDisabled={selectedPanels.length === 0}
          isCopyDisabled={selectedPanels.length === 0}
          isPasteDisabled={copiedPanels.length === 0}
        />

        <div className="flex justify-center items-center">
          <div
            ref={canvasRef}
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
            {/* Canvas Settings Panel */}
            {isEditingCanvas && (
              <CanvasSettingsPanel
                theme={theme}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                canvasBgColor={canvasBgColor}
                canvasFgColor={canvasFgColor}
                roundedCorners={roundedCorners}
                showGrid={showGrid}
                onClose={() => setIsEditingCanvas(false)}
                onUpdateDimensions={handleCanvasDimensionsUpdate}
                onUpdateColors={handleCanvasColorsUpdate}
                onToggleRoundedCorners={handleToggleRoundedCorners}
                onToggleGrid={handleToggleGrid}
              />
            )}
            {/* Render Panels */}
            {panels.map(panel => (
              <Panel
                key={panel.id}
                panel={panel}
                theme={theme}
                isSelected={selectedPanels.includes(panel.id)}
                isEditingDimensions={editingPanel === panel.id}
                roundedCorners={roundedCorners}
                onDragStop={handlePanelDragStop}
                onUpdateDimensions={handlePanelUpdateDimensions}
                onUpdateText={handlePanelUpdateText}
                onSelectPanel={handlePanelClick}
                onDeletePanel={handlePanelDelete}
                onDimensionClick={handleDimensionClick}
                onDimensionSubmit={handleDimensionSubmit}
                onDimensionCancel={handleDimensionCancel}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingCanvas;