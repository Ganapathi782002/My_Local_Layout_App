import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useCanvasState } from '../hooks/useCanvasState';
import { Panel } from '../components/Panel';
import Toolbar from './ToolBar';
import CanvasControls from '../components/CanvasControls';
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
const MIN_CANVAS_DIMENSION = 200; // Minimum size for canvas to prevent collapse

const DrawingCanvas: React.FC = () => {
  const { state, dispatch } = useCanvasState();
  const { config, history, historyIndex } = state;
  const { panels, canvasWidth, canvasHeight, canvasBgColor, canvasFgColor, panelRoundedCorners, canvasBorderRadius, showGrid, theme } = config;

  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // --- STATE FOR GUIDES ---
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

  // --- REFS FOR CANVAS RESIZING ---
  const isResizingCanvasRef = useRef<boolean>(false);
  const canvasResizeDirectionRef = useRef<string>(''); // 's' (south), 'e' (east), 'se' (south-east)
  const startCanvasWidthRef = useRef(0);
  const startCanvasHeightRef = useRef(0);

  // FEATURE 2: Monitor config changes to set hasUnsavedChanges
  useEffect(() => {
    // Only mark as unsaved if history has moved beyond initial state or panels exist
    if (history.length > 1 || panels.length > 0) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
    // Update effect for canvas border radius from config
    if (canvasRef.current) {
      canvasRef.current.style.borderRadius = `${canvasBorderRadius}px`;
    }
  }, [config, history.length, panels.length, canvasBorderRadius]);

  // FEATURE 2: Alert on browser close/reload if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = ''; // Standard way to trigger the browser's warning
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


  const onUpdateCanvasDimensions = useCallback((width: number, height: number) => {
    dispatch({ type: 'SET_CANVAS_DIMENSIONS', payload: { width, height } });
  }, [dispatch]);

  const onUpdateCanvasColors = useCallback((bgColor: string, fgColor: string) => {
    dispatch({ type: 'SET_CANVAS_COLORS', payload: { bgColor, fgColor } });
  }, [dispatch]);

  const onTogglePanelRoundedCorners = useCallback(() => {
    dispatch({ type: 'TOGGLE_PANEL_ROUNDED_CORNERS' });
  }, [dispatch]);

  const onSetCanvasBorderRadius = useCallback((radius: number) => {
    dispatch({ type: 'SET_CANVAS_BORDER_RADIUS', payload: { radius } });
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


  // Helper function to get cursor style based on resize direction
  const getCursorStyle = (direction: string) => {
    switch (direction) {
      case 's': return 'ns-resize';
      case 'e': return 'ew-resize';
      case 'se': return 'nwse-resize';
      default: return 'default';
    }
  };

  // FIX 2: Declare handleGlobalMouseUp and handleGlobalMouseMove BEFORE their usage
  const handleGlobalMouseUp = useCallback(() => {
    draggingPanelIdRef.current = null;
    resizingPanelIdRef.current = null;
    isResizingCanvasRef.current = false; // Reset canvas resizing state
    canvasResizeDirectionRef.current = ''; // Clear direction
    setGuideLines([]);
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    document.body.style.cursor = 'default'; // Reset cursor
  }, []); // Dependency array can be empty now as it doesn't depend on other functions that change during re-renders

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    const dx = e.clientX - startMouseXRef.current;
    const dy = e.clientY - startMouseYRef.current;
    let guides: GuideLine[] = [];

    // --- HANDLE CANVAS RESIZING ---
    if (isResizingCanvasRef.current) {
      let newWidth = startCanvasWidthRef.current;
      let newHeight = startCanvasHeightRef.current;

      const direction = canvasResizeDirectionRef.current;
      if (direction.includes('e')) { // East or South-East
        newWidth = Math.max(MIN_CANVAS_DIMENSION, startCanvasWidthRef.current + dx);
      }
      if (direction.includes('s')) { // South or South-East
        newHeight = Math.max(MIN_CANVAS_DIMENSION, startCanvasHeightRef.current + dy);
      }

      onUpdateCanvasDimensions(newWidth, newHeight);
      return; // Exit early, as we're resizing canvas, not panels
    }

    // --- HANDLE PANEL DRAG/RESIZE (EXISTING LOGIC) ---
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

    // Initialize snapped values based on current interaction type
    let snappedX = currentPanel.x;
    let snappedY = currentPanel.y;
    let snappedWidth = currentPanel.width;
    let snappedHeight = currentPanel.height;

    if (draggingPanelIdRef.current) {
      snappedX = startPanelXRef.current + dx;
      snappedY = startPanelYRef.current + dy;
    } else if (resizingPanelIdRef.current) {
      snappedWidth = startPanelWidthRef.current + dx;
      snappedHeight = startPanelHeightRef.current + dy;
    }

    // 1. Canvas Boundary Snapping (Drag)
    if (draggingPanelIdRef.current) {
      // Left edge
      if (Math.abs(snappedX) < SNAP_THRESHOLD) {
        snappedX = 0;
        guides.push({ id: 'canvas-left', x1: 0, y1: 0, x2: 0, y2: canvasHeight, orientation: 'vertical' });
      }
      // Right edge
      if (Math.abs((snappedX + currentPanel.width) - canvasWidth) < SNAP_THRESHOLD) {
        snappedX = canvasWidth - currentPanel.width;
        guides.push({ id: 'canvas-right', x1: canvasWidth, y1: 0, x2: canvasWidth, y2: canvasHeight, orientation: 'vertical' });
      }
      // Top edge
      if (Math.abs(snappedY) < SNAP_THRESHOLD) {
        snappedY = 0;
        guides.push({ id: 'canvas-top', x1: 0, y1: 0, x2: canvasWidth, y2: 0, orientation: 'horizontal' });
      }
      // Bottom edge
      if (Math.abs((snappedY + currentPanel.height) - canvasHeight) < SNAP_THRESHOLD) {
        snappedY = canvasHeight - currentPanel.height;
        guides.push({ id: 'canvas-bottom', x1: 0, y1: canvasHeight, x2: canvasWidth, y2: canvasHeight, orientation: 'horizontal' });
      }

      // Canvas Center Snapping (Drag)
      if (Math.abs((snappedX + currentPanel.width / 2) - canvasWidth / 2) < SNAP_THRESHOLD) {
        snappedX = canvasWidth / 2 - currentPanel.width / 2;
        guides.push({ id: 'canvas-h-center', x1: canvasWidth / 2, y1: 0, x2: canvasWidth / 2, y2: canvasHeight, orientation: 'vertical' });
      }
      if (Math.abs((snappedY + currentPanel.height / 2) - canvasHeight / 2) < SNAP_THRESHOLD) {
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
        if (Math.abs(snappedX - otherPanelRect.centerX) < SNAP_THRESHOLD) { snappedX = otherPanelRect.centerX - currentPanel.width / 2; guides.push({ id: `panel-l-c-${otherPanel.id}`, x1: otherPanelRect.centerX, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.centerX, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
        if (Math.abs(snappedX - otherPanelRect.right) < SNAP_THRESHOLD) { snappedX = otherPanelRect.right - currentPanel.width; guides.push({ id: `panel-l-r-${otherPanel.id}`, x1: otherPanelRect.right, y1: Math.min(snappedY, otherPanel.y), x2: snappedX + currentPanel.width, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }

        // Center to Center of other panel (Horizontal)
        if (Math.abs(currentPanelCenterX - otherPanelRect.centerX) < SNAP_THRESHOLD) { snappedX = otherPanelRect.centerX - currentPanel.width / 2; guides.push({ id: `panel-c-c-h-${otherPanel.id}`, x1: otherPanelRect.centerX, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.centerX, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }

        // Right edge to Left/Center/Right of other panel
        if (Math.abs((snappedX + currentPanel.width) - otherPanelRect.x) < SNAP_THRESHOLD) { snappedX = otherPanelRect.x - currentPanel.width; guides.push({ id: `panel-r-l-${otherPanel.id}`, x1: otherPanelRect.x, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.x, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
        if (Math.abs((snappedX + currentPanel.width) - otherPanelRect.centerX) < SNAP_THRESHOLD) { snappedX = otherPanelRect.centerX - currentPanel.width; guides.push({ id: `panel-r-c-${otherPanel.id}`, x1: otherPanelRect.centerX, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.centerX, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
        if (Math.abs((snappedX + currentPanel.width) - otherPanelRect.right) < SNAP_THRESHOLD) { snappedX = otherPanelRect.right - currentPanel.width; guides.push({ id: `panel-r-r-${otherPanel.id}`, x1: otherPanelRect.right, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.right, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }

        // Vertical Alignment (Horizontal Guides)
        // Top edge to Top/Middle/Bottom of other panel
        if (Math.abs(snappedY - otherPanelRect.y) < SNAP_THRESHOLD) { snappedY = otherPanelRect.y; guides.push({ id: `panel-t-t-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: snappedY, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: snappedY, orientation: 'horizontal' }); }
        if (Math.abs(snappedY - otherPanelRect.centerY) < SNAP_THRESHOLD) { snappedY = otherPanelRect.centerY - currentPanel.height / 2; guides.push({ id: `panel-t-c-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: otherPanelRect.centerY, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: otherPanelRect.centerY, orientation: 'horizontal' }); }
        if (Math.abs(snappedY - otherPanelRect.bottom) < SNAP_THRESHOLD) { snappedY = otherPanelRect.bottom - currentPanel.height; guides.push({ id: `panel-t-b-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: otherPanelRect.bottom, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: snappedY + currentPanel.height, orientation: 'horizontal' }); }

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
      // Minimum panel dimension
      snappedWidth = Math.max(snappedWidth, 50);
      snappedHeight = Math.max(snappedHeight, 50);

      // Constrain panel resizing to canvas boundaries
      snappedWidth = Math.min(snappedWidth, canvasWidth - currentPanel.x);
      snappedHeight = Math.min(snappedHeight, canvasHeight - currentPanel.y);


      if (currentPanel.shapeType === 'circle') {
        const size = Math.max(snappedWidth, snappedHeight);
        snappedWidth = size;
        snappedHeight = size;
      }
      onUpdatePanelDimensions(currentPanelId, snappedWidth, snappedHeight);
      guides = []; // Clear guides during panel resize
    }

    setGuideLines(guides);
  }, [
    panels, onUpdatePanelPosition, onUpdatePanelDimensions,
    canvasWidth, canvasHeight, onUpdateCanvasDimensions
  ]);


  // --- Canvas Resizing Interaction Start ---
  const handleCanvasResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.stopPropagation(); // Prevent canvas click from deselecting panels
    if (!canvasRef.current) return;

    isResizingCanvasRef.current = true;
    canvasResizeDirectionRef.current = direction;
    startMouseXRef.current = e.clientX;
    startMouseYRef.current = e.clientY;
    startCanvasWidthRef.current = canvasWidth;
    startCanvasHeightRef.current = canvasHeight;

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.body.style.cursor = getCursorStyle(direction); // Change cursor for resizing
  }, [canvasWidth, canvasHeight, handleGlobalMouseMove, handleGlobalMouseUp]);


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
    setHasUnsavedChanges(false); // Mark as saved after export
  }, [config, dispatch]);

  const handleImportConfig = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importCanvasConfig(file, dispatch);
      event.target.value = ''; // Clear file input
      setSelectedPanels([]);
      setHasUnsavedChanges(false); // Mark as saved after import
    }
  }, [dispatch]);


  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Only deselect panels if the click truly originated from the canvas background
    if (event.target === canvasRef.current) {
      setSelectedPanels([]);
    }
  }, []);

  const handlePanelInteractionStart = useCallback((panelId: string, event: React.MouseEvent, type: 'drag' | 'resize') => {
    event.stopPropagation(); // Prevent interaction with elements below

    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;

    if (type === 'drag') {
      draggingPanelIdRef.current = panelId;
      startMouseXRef.current = event.clientX;
      startMouseYRef.current = event.clientY;
      startPanelXRef.current = panel.x;
      startPanelYRef.current = panel.y;
      document.body.style.cursor = 'grab';
    } else if (type === 'resize') {
      resizingPanelIdRef.current = panelId;
      startMouseXRef.current = event.clientX;
      startMouseYRef.current = event.clientY;
      startPanelWidthRef.current = panel.width;
      startPanelHeightRef.current = panel.height;
      // You might want to set a specific cursor for resizing
      document.body.style.cursor = 'nwse-resize';
    }

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);

  }, [panels, handleGlobalMouseMove, handleGlobalMouseUp]);


  const handlePanelClick = useCallback((panelId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent canvas click from deselecting other panels
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


  // UPDATED: canvasClasses now uses canvasBorderRadius for style
  const canvasClasses = useMemo(() => {
    const base = `relative overflow-hidden shadow-lg border-2 transition-all duration-300`;
    const themeBorders = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';
    // Dynamically apply grid pattern if showGrid is true
    const gridPattern = showGrid ?
      (theme === 'dark' ? 'bg-grid-dark' : 'bg-grid-light') : '';
    // Removed direct 'rounded-lg' class; border-radius applied via inline style
    return `${base} ${themeBorders} ${gridPattern}`;
  }, [theme, showGrid]);


  return (
    <div className={`min-h-screen flex flex-col items-center p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} transition-colors duration-300`}>
      {/* Toolbar remains at the top */}
      <Toolbar
        theme={theme}
        onAddPanel={onAddPanel}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRedo={() => dispatch({ type: 'REDO' })}
        onExportConfig={handleExportConfig}
        onImportConfig={handleImportConfig}
        onExportPNG={handleExportPNG}
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

      {/* NEW: Canvas Controls Ribbon */}
      <CanvasControls
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        canvasBgColor={canvasBgColor}
        canvasFgColor={canvasFgColor}
        canvasBorderRadius={canvasBorderRadius}
        panelRoundedCorners={panelRoundedCorners}
        showGrid={showGrid}
        theme={theme}
        onUpdateCanvasDimensions={onUpdateCanvasDimensions}
        onUpdateCanvasColors={onUpdateCanvasColors}
        onSetCanvasBorderRadius={onSetCanvasBorderRadius}
        onTogglePanelRoundedCorners={onTogglePanelRoundedCorners}
        onToggleGrid={onToggleGrid}
      />

      {/* Main Canvas Area */}
      <div
        ref={canvasRef}
        className={canvasClasses}
        style={{
          width: canvasWidth,
          height: canvasHeight,
          backgroundColor: showGrid ? undefined : canvasBgColor,
          borderColor: canvasFgColor,
          borderRadius: `${canvasBorderRadius}px`,
          backgroundImage: showGrid ? `linear-gradient(${theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'} 1px, transparent 1px),
          linear-gradient(90deg, ${theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'} 1px, transparent 1px)` : 'none',
          backgroundSize: showGrid ? '20px 20px' : 'auto'
        }}
        onClick={handleCanvasClick}
      >
        {panels.map((panel) => (
          <Panel
            key={panel.id}
            panel={panel}
            isSelected={selectedPanels.includes(panel.id)}
            onSelect={handlePanelClick}
            onUpdatePosition={onUpdatePanelPosition}
            onUpdateDimensions={onUpdatePanelDimensions}
            onUpdateText={onUpdatePanelText}
            onUpdateStyle={onUpdatePanelStyle}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            canvasFgColor={canvasFgColor}
            panelRoundedCorners={panelRoundedCorners}
            theme={theme}
            onInteractionStart={handlePanelInteractionStart}
          />
        ))}

        {/* Render Guide Lines */}
        {guideLines.map((line) => (
          <div
            key={line.id}
            className="absolute bg-red-500 z-[9999]" // Use a high z-index to be visible
            style={{
              left: `${line.x1}px`,
              top: `${line.y1}px`,
              width: line.orientation === 'vertical' ? '2px' : `${Math.abs(line.x2 - line.x1)}px`,
              height: line.orientation === 'horizontal' ? '2px' : `${Math.abs(line.y2 - line.y1)}px`,
            }}
          />
        ))}

        {/* --- Canvas Resizer Handles --- */}
        {/* South (bottom) resizer */}
        <div
          className={`absolute bottom-0 left-0 w-full h-2 cursor-ns-resize z-50`}
          style={{ backgroundColor: canvasFgColor }} // Use border color for resizers
          onMouseDown={(e) => handleCanvasResizeStart(e, 's')}
        />
        {/* East (right) resizer */}
        <div
          className={`absolute top-0 right-0 h-full w-2 cursor-ew-resize z-50`}
          style={{ backgroundColor: canvasFgColor }}
          onMouseDown={(e) => handleCanvasResizeStart(e, 'e')}
        />
        {/* South-East (bottom-right) resizer */}
        <div
          className={`absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50`}
          style={{ backgroundColor: canvasFgColor }}
          onMouseDown={(e) => handleCanvasResizeStart(e, 'se')}
        />
      </div>
    </div>
  );
};

export default DrawingCanvas;