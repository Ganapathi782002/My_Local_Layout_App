import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useCanvasState } from '../hooks/useCanvasState';
import { Panel } from '../components/Panel';
import Toolbar from './ToolBar';
import CanvasSettingsPanel from '../components/CanvasSettingsPanel/CanvasSettingsPanel';
import { exportCanvasAsPNG, exportCanvasConfigAsJSON, importCanvasConfig } from '../utils/fileOperations';
import { generateUniqueId } from '../utils/idGenerator';
import { PanelInterface, ShapeType } from '../types';

const DEFAULT_PANEL_STYLES = {
  textBlock: {
    width: 200,
    height: 150,
    backgroundColor: '#ffffff',
    borderColor: '#000000',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  rectangle: {
    width: 150,
    height: 100,
    backgroundColor: '#add8e6',
    borderColor: '#000000',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  circle: {
    width: 120,
    height: 120,
    backgroundColor: '#ffb6c1',
    borderColor: '#000000',
    borderWidth: 2,
    borderStyle: 'solid',
  },
};

interface GuideLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  orientation: 'horizontal' | 'vertical';
}

const SNAP_THRESHOLD = 10;

const DrawingCanvas: React.FC = () => {
  const { state, dispatch } = useCanvasState();
  const { config, history, historyIndex } = state;
  const { panels, canvasWidth, canvasHeight, canvasBgColor, canvasFgColor, roundedCorners, showGrid, theme } = config;

  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [isCanvasSettingsOpen, setIsCanvasSettingsOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // --- NEW STATE FOR GUIDES ---
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);

  // Refs for tracking drag/resize state centrally
  const draggingPanelIdRef = useRef<string | null>(null);
  const resizingPanelIdRef = useRef<string | null>(null);
  const startMouseXRef = useRef(0);
  const startMouseYRef = useRef(0);
  const startPanelXRef = useRef(0);
  const startPanelYRef = useRef(0);
  const startPanelWidthRef = useRef(0);
  const startPanelHeightRef = useRef(0);

  // FEATURE 2: Monitor config changes to set hasUnsavedChanges
  useEffect(() => {
    if (history.length > 1 || panels.length > 0) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [config, history.length, panels.length]);

  // FEATURE 2: Alert on browser close/reload if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);


  const onAddPanel = useCallback((shapeType: ShapeType) => {
    const maxZIndex = panels.length > 0 ? Math.max(...panels.map(p => p.zIndex)) : 0;
    const defaultStyles = DEFAULT_PANEL_STYLES[shapeType];

    const newPanel: PanelInterface = {
      id: generateUniqueId(),
      x: 50,
      y: 50,
      text: 'Click to type',
      zIndex: maxZIndex + 1,
      shapeType,
      ...defaultStyles,
    };
    dispatch({ type: 'ADD_PANEL', payload: newPanel });
    setSelectedPanels([newPanel.id]);
  }, [dispatch, panels]);

  const onUpdatePanelPosition = useCallback((id: string, newX: number, newY: number) => {
    dispatch({ type: 'UPDATE_PANEL_POSITION', payload: { id, x: newX, y: newY } });
  }, [dispatch]);

  const onUpdatePanelDimensions = useCallback((id: string, newWidth: number, newHeight: number) => {
    dispatch({ type: 'UPDATE_PANEL_DIMENSIONS', payload: { id, width: newWidth, height: newHeight } });
  }, [dispatch]);

  const onUpdatePanelText = useCallback((id: string, newText: string) => {
    dispatch({ type: 'UPDATE_PANEL_TEXT', payload: { id, text: newText } });
  }, [dispatch]);

  const onUpdatePanelStyle = useCallback((id: string, styles: Partial<Omit<PanelInterface, 'id' | 'x' | 'y' | 'width' | 'height' | 'zIndex' | 'text' | 'shapeType'>>) => {
    dispatch({ type: 'UPDATE_PANEL_STYLE', payload: { id, styles } });
  }, [dispatch]);

  const onRemoveSelectedPanels = useCallback(() => {
    if (selectedPanels.length > 0) {
      dispatch({ type: 'DELETE_PANELS', payload: { ids: selectedPanels } });
      setSelectedPanels([]);
    }
  }, [dispatch, selectedPanels]);

  const onToggleCanvasSettings = useCallback(() => {
    setIsCanvasSettingsOpen(prev => !prev);
  }, []);

  const onUpdateCanvasDimensions = useCallback((width: number, height: number) => {
    dispatch({ type: 'SET_CANVAS_DIMENSIONS', payload: { width, height } });
  }, [dispatch]);

  const onUpdateCanvasColors = useCallback((bgColor: string, fgColor: string) => {
    dispatch({ type: 'SET_CANVAS_COLORS', payload: { bgColor, fgColor } });
  }, [dispatch]);

  const onToggleRoundedCorners = useCallback(() => {
    dispatch({ type: 'TOGGLE_ROUNDED_CORNERS' });
  }, [dispatch]);

  const onToggleGrid = useCallback(() => {
    dispatch({ type: 'TOGGLE_GRID' });
  }, [dispatch]);

  const onToggleTheme = useCallback(() => {
    dispatch({ type: 'TOGGLE_THEME' });
  }, [dispatch]);

  const onCopySelectedPanels = useCallback(() => {
    if (selectedPanels.length > 0) {
      dispatch({ type: 'COPY_PANELS', payload: { ids: selectedPanels } });
    }
  }, [dispatch, selectedPanels]);

  const onPastePanels = useCallback(() => {
    dispatch({ type: 'PASTE_PANELS' });
  }, [dispatch]);


  // Centralized mouse handlers for drag/resize with snapping ---
  const handlePanelInteractionStart = useCallback((panelId: string, e: React.MouseEvent, type: 'drag' | 'resize') => {
    e.stopPropagation();
    setSelectedPanels([panelId]);

    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;

    startMouseXRef.current = e.clientX;
    startMouseYRef.current = e.clientY;
    startPanelXRef.current = panel.x;
    startPanelYRef.current = panel.y;
    startPanelWidthRef.current = panel.width;
    startPanelHeightRef.current = panel.height;

    if (type === 'drag') {
      draggingPanelIdRef.current = panelId;
    } else {
      resizingPanelIdRef.current = panelId;
    }

    // Attach global mouse move/up listeners
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  }, [panels]);


  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    let newX = startPanelXRef.current;
    let newY = startPanelYRef.current;
    let newWidth = startPanelWidthRef.current;
    let newHeight = startPanelHeightRef.current;
    const currentPanelId = draggingPanelIdRef.current || resizingPanelIdRef.current;

    if (!currentPanelId) {
      setGuideLines([]);
      return;
    }

    const currentPanel = panels.find(p => p.id === currentPanelId);
    if (!currentPanel) {
      setGuideLines([]);
      return;
    }

    const dx = e.clientX - startMouseXRef.current;
    const dy = e.clientY - startMouseYRef.current;
    const currentPanelRect = {
      x: currentPanel.x, y: currentPanel.y,
      width: currentPanel.width, height: currentPanel.height,
      centerX: currentPanel.x + currentPanel.width / 2,
      centerY: currentPanel.y + currentPanel.height / 2,
      right: currentPanel.x + currentPanel.width,
      bottom: currentPanel.y + currentPanel.height,
    };

    let guides: GuideLine[] = [];
    let snappedX = newX + dx;
    let snappedY = newY + dy;
    let snappedWidth = newWidth + dx; // Only if resizing from bottom-right
    let snappedHeight = newHeight + dy; // Only if resizing from bottom-right

    if (Math.abs(snappedX) < SNAP_THRESHOLD) { // Snap to canvas left edge
      snappedX = 0;
      guides.push({ id: 'canvas-left', x1: 0, y1: 0, x2: 0, y2: canvasHeight, orientation: 'vertical' });
    }
    if (Math.abs((snappedX + currentPanel.width) - canvasWidth) < SNAP_THRESHOLD) { // Snap to canvas right edge
      snappedX = canvasWidth - currentPanel.width;
      guides.push({ id: 'canvas-right', x1: canvasWidth, y1: 0, x2: canvasWidth, y2: canvasHeight, orientation: 'vertical' });
    }
    // Top/Bottom
    if (Math.abs(snappedY) < SNAP_THRESHOLD) { // Snap to canvas top edge
      snappedY = 0;
      guides.push({ id: 'canvas-top', x1: 0, y1: 0, x2: canvasWidth, y2: 0, orientation: 'horizontal' });
    }
    if (Math.abs((snappedY + currentPanel.height) - canvasHeight) < SNAP_THRESHOLD) { // Snap to canvas bottom edge
      snappedY = canvasHeight - currentPanel.height;
      guides.push({ id: 'canvas-bottom', x1: 0, y1: canvasHeight, x2: canvasWidth, y2: canvasHeight, orientation: 'horizontal' });
    }

    // Canvas Center Snapping (Drag)
    if (draggingPanelIdRef.current) {
        if (Math.abs((snappedX + currentPanel.width / 2) - canvasWidth / 2) < SNAP_THRESHOLD) { // Canvas horizontal center
            snappedX = canvasWidth / 2 - currentPanel.width / 2;
            guides.push({ id: 'canvas-h-center', x1: canvasWidth / 2, y1: 0, x2: canvasWidth / 2, y2: canvasHeight, orientation: 'vertical' });
        }
        if (Math.abs((snappedY + currentPanel.height / 2) - canvasHeight / 2) < SNAP_THRESHOLD) { // Canvas vertical center
            snappedY = canvasHeight / 2 - currentPanel.height / 2;
            guides.push({ id: 'canvas-v-center', x1: 0, y1: canvasHeight / 2, x2: canvasWidth, y2: canvasHeight / 2, orientation: 'horizontal' });
        }
    }


    // 2. Panel-to-Panel Snapping (Drag only)
    if (draggingPanelIdRef.current) {
        const currentPanelCenterX = snappedX + currentPanel.width / 2;
        const currentPanelCenterY = snappedY + currentPanel.height / 2;

        panels.forEach(otherPanel => {
            if (otherPanel.id === currentPanelId) return;

            const otherPanelRect = {
                x: otherPanel.x, y: otherPanel.y,
                width: otherPanel.width, height: otherPanel.height,
                centerX: otherPanel.x + otherPanel.width / 2,
                centerY: otherPanel.y + otherPanel.height / 2,
                right: otherPanel.x + otherPanel.width,
                bottom: otherPanel.y + otherPanel.height,
            };

            // Horizontal Alignment (Vertical Guides)
            // Left edge to Left/Center/Right of other panel
            if (Math.abs(snappedX - otherPanelRect.x) < SNAP_THRESHOLD) { snappedX = otherPanelRect.x; guides.push({ id: `panel-l-l-${otherPanel.id}`, x1: snappedX, y1: Math.min(snappedY, otherPanel.y), x2: snappedX, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
            if (Math.abs(snappedX - otherPanelRect.centerX) < SNAP_THRESHOLD) { snappedX = otherPanelRect.centerX; guides.push({ id: `panel-l-c-${otherPanel.id}`, x1: snappedX, y1: Math.min(snappedY, otherPanel.y), x2: snappedX, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
            if (Math.abs(snappedX - otherPanelRect.right) < SNAP_THRESHOLD) { snappedX = otherPanelRect.right; guides.push({ id: `panel-l-r-${otherPanel.id}`, x1: snappedX, y1: Math.min(snappedY, otherPanel.y), x2: snappedX, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }

            // Center to Center of other panel (Horizontal)
            if (Math.abs(currentPanelCenterX - otherPanelRect.centerX) < SNAP_THRESHOLD) { snappedX = otherPanelRect.centerX - currentPanel.width / 2; guides.push({ id: `panel-c-c-h-${otherPanel.id}`, x1: otherPanelRect.centerX, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.centerX, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }

            // Right edge to Left/Center/Right of other panel
            if (Math.abs((snappedX + currentPanel.width) - otherPanelRect.x) < SNAP_THRESHOLD) { snappedX = otherPanelRect.x - currentPanel.width; guides.push({ id: `panel-r-l-${otherPanel.id}`, x1: otherPanelRect.x, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.x, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
            if (Math.abs((snappedX + currentPanel.width) - otherPanelRect.centerX) < SNAP_THRESHOLD) { snappedX = otherPanelRect.centerX - currentPanel.width; guides.push({ id: `panel-r-c-${otherPanel.id}`, x1: otherPanelRect.centerX, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.centerX, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
            if (Math.abs((snappedX + currentPanel.width) - otherPanelRect.right) < SNAP_THRESHOLD) { snappedX = otherPanelRect.right - currentPanel.width; guides.push({ id: `panel-r-r-${otherPanel.id}`, x1: otherPanelRect.right, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.right, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }

            // Vertical Alignment (Horizontal Guides)
            // Top edge to Top/Middle/Bottom of other panel
            if (Math.abs(snappedY - otherPanelRect.y) < SNAP_THRESHOLD) { snappedY = otherPanelRect.y; guides.push({ id: `panel-t-t-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: snappedY, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: snappedY, orientation: 'horizontal' }); }
            if (Math.abs(snappedY - otherPanelRect.centerY) < SNAP_THRESHOLD) { snappedY = otherPanelRect.centerY; guides.push({ id: `panel-t-c-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: snappedY, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: snappedY, orientation: 'horizontal' }); }
            if (Math.abs(snappedY - otherPanelRect.bottom) < SNAP_THRESHOLD) { snappedY = otherPanelRect.bottom; guides.push({ id: `panel-t-b-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: snappedY, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: snappedY, orientation: 'horizontal' }); }

            // Middle to Middle of other panel (Vertical)
            if (Math.abs(currentPanelCenterY - otherPanelRect.centerY) < SNAP_THRESHOLD) { snappedY = otherPanelRect.centerY - currentPanel.height / 2; guides.push({ id: `panel-c-c-v-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: otherPanelRect.centerY, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: otherPanelRect.centerY, orientation: 'horizontal' }); }

            // Bottom edge to Top/Middle/Bottom of other panel
            if (Math.abs((snappedY + currentPanel.height) - otherPanelRect.y) < SNAP_THRESHOLD) { snappedY = otherPanelRect.y - currentPanel.height; guides.push({ id: `panel-b-t-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: otherPanelRect.y, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: otherPanelRect.y, orientation: 'horizontal' }); }
            if (Math.abs((snappedY + currentPanel.height) - otherPanelRect.centerY) < SNAP_THRESHOLD) { snappedY = otherPanelRect.centerY - currentPanel.height; guides.push({ id: `panel-b-c-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: otherPanelRect.centerY, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: otherPanelRect.centerY, orientation: 'horizontal' }); }
            if (Math.abs((snappedY + currentPanel.height) - otherPanelRect.bottom) < SNAP_THRESHOLD) { snappedY = otherPanelRect.bottom - currentPanel.height; guides.push({ id: `panel-b-b-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: otherPanelRect.bottom, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: otherPanelRect.bottom, orientation: 'horizontal' }); }

        });
    }

    if (draggingPanelIdRef.current) {
        snappedX = Math.max(0, Math.min(snappedX, canvasWidth - currentPanel.width));
        snappedY = Math.max(0, Math.min(snappedY, canvasHeight - currentPanel.height));
        onUpdatePanelPosition(currentPanelId, snappedX, snappedY);
    } else if (resizingPanelIdRef.current) {
        let newResizedWidth = startPanelWidthRef.current + dx;
        let newResizedHeight = startPanelHeightRef.current + dy;

        newResizedWidth = Math.max(newResizedWidth, 50);
        newResizedHeight = Math.max(newResizedHeight, 50);

        newResizedWidth = Math.min(newResizedWidth, canvasWidth - currentPanel.x);
        newResizedHeight = Math.min(newResizedHeight, canvasHeight - currentPanel.y);

        if (currentPanel.shapeType === 'circle') {
            const size = Math.max(newResizedWidth, newResizedHeight);
            newResizedWidth = size;
            newResizedHeight = size;
        }
        onUpdatePanelDimensions(currentPanelId, newResizedWidth, newResizedHeight);
        guides = [];
    }

    setGuideLines(guides);
  }, [
    panels, onUpdatePanelPosition, onUpdatePanelDimensions,
    canvasWidth, canvasHeight,
  ]);


  const handleGlobalMouseUp = useCallback(() => {
    draggingPanelIdRef.current = null;
    resizingPanelIdRef.current = null;
    setGuideLines([]);
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        dispatch({ type: 'UNDO' });
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault();
        dispatch({ type: 'REDO' });
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        event.preventDefault();
        onCopySelectedPanels();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        event.preventDefault();
        onPastePanels();
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && !isTyping) {
        if (selectedPanels.length > 0) {
          event.preventDefault();
          onRemoveSelectedPanels();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch, onCopySelectedPanels, onPastePanels, onRemoveSelectedPanels, selectedPanels]);


  const isUndoDisabled = historyIndex === 0;
  const isRedoDisabled = historyIndex === history.length - 1;
  const isDeleteDisabled = selectedPanels.length === 0;
  const isCopyDisabled = selectedPanels.length === 0;
  const isPasteDisabled = state.copiedPanels.length === 0;


  const handleExportPNG = useCallback(() => {
    if (canvasRef.current) {
      exportCanvasAsPNG(canvasRef.current, canvasBgColor, dispatch);
    }
  }, [canvasBgColor, dispatch]);

  const handleExportConfig = useCallback(() => {
    exportCanvasConfigAsJSON(config, dispatch);
    setHasUnsavedChanges(false);
  }, [config, dispatch]);

  const handleImportConfig = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importCanvasConfig(file, dispatch);
      event.target.value = '';
      setSelectedPanels([]);
      setHasUnsavedChanges(false);
    }
  }, [dispatch]);


  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === canvasRef.current) {
      setSelectedPanels([]);
    }
  }, []);

  const handlePanelClick = useCallback((panelId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey) {
      setSelectedPanels(prevSelected =>
        prevSelected.includes(panelId)
          ? prevSelected.filter(id => id !== panelId)
          : [...prevSelected, panelId]
      );
    } else {
      setSelectedPanels([panelId]);
    }
  }, []);


  const canvasClasses = useMemo(() => {
    const base = `relative overflow-hidden shadow-lg border-2 transition-all duration-300`;
    const themeBorders = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';
    const gridPattern = showGrid ?
      `bg-grid-${theme === 'dark' ? 'dark' : 'light'}` : '';
    const rounded = roundedCorners ? 'rounded-lg' : 'rounded-none';

    return `${base} ${themeBorders} ${gridPattern} ${rounded}`;
  }, [theme, showGrid, roundedCorners]);


  return (
    <div className={`min-h-screen flex flex-col items-center p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} transition-colors duration-300`}>
      <Toolbar
        theme={theme}
        onAddPanel={onAddPanel}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onExportConfig={handleExportConfig}
        onImportConfig={handleImportConfig}
        onExportPNG={handleExportPNG}
        onToggleCanvasSettings={onToggleCanvasSettings}
        onRemoveSelectedPanels={onRemoveSelectedPanels}
        onToggleTheme={onToggleTheme}
        onCopySelectedPanels={onCopySelectedPanels}
        onPastePanels={onPastePanels}
        isUndoDisabled={isUndoDisabled}
        isRedoDisabled={isRedoDisabled}
        isDeleteDisabled={isDeleteDisabled}
        isCopyDisabled={isCopyDisabled}
        isPasteDisabled={isPasteDisabled}
      />

      <div
        ref={canvasRef}
        className={canvasClasses}
        style={{
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: canvasBgColor,
          borderColor: canvasFgColor,
        }}
        onClick={handleCanvasClick}
      >
        {panels.map((panel) => (
          <Panel
            key={panel.id}
            panel={panel}
            isSelected={selectedPanels.includes(panel.id)}
            onSelect={handlePanelClick} // For regular selection clicks
            onUpdatePosition={onUpdatePanelPosition}
            onUpdateDimensions={onUpdatePanelDimensions}
            onUpdateText={onUpdatePanelText}
            onUpdateStyle={onUpdatePanelStyle}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            canvasFgColor={canvasFgColor}
            roundedCorners={roundedCorners}
            theme={theme}
            // --- NEW PROP: Pass down the centralized interaction start handler ---
            onInteractionStart={handlePanelInteractionStart}
          />
        ))}

        {/* Render Guide Lines --- */}
        {guideLines.map((line) => (
          <div
            key={line.id}
            className="absolute bg-red-500 z-[9999]" // Use a high z-index to be visible
            style={{
              left: line.orientation === 'vertical' ? line.x1 : line.x1,
              top: line.orientation === 'horizontal' ? line.y1 : line.y1,
              width: line.orientation === 'vertical' ? '2px' : Math.abs(line.x2 - line.x1),
              height: line.orientation === 'horizontal' ? '2px' : Math.abs(line.y2 - line.y1),
            }}
          />
        ))}

      </div>

      {isCanvasSettingsOpen && (
        <CanvasSettingsPanel
          theme={theme}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          canvasBgColor={canvasBgColor}
          canvasFgColor={canvasFgColor}
          roundedCorners={roundedCorners}
          showGrid={showGrid}
          onClose={onToggleCanvasSettings}
          onUpdateDimensions={onUpdateCanvasDimensions}
          onUpdateColors={onUpdateCanvasColors}
          onToggleRoundedCorners={onToggleRoundedCorners}
          onToggleGrid={onToggleGrid}
        />
      )}
    </div>
  );
};

export default DrawingCanvas;