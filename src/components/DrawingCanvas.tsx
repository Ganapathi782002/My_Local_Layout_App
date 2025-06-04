import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useCanvasState } from '../hooks/useCanvasState';
import { Panel } from '../components/Panel';
import Toolbar from './ToolBar';
import CanvasControls from '../components/CanvasControls';
import { exportCanvasAsPNG, exportCanvasConfigAsJSON, importCanvasConfig } from '../utils/fileOperations';
import { generateUniqueId } from '../utils/idGenerator';
import { PanelInterface, ShapeType } from '../types';

const DEFAULT_PANEL_STYLES: { [key in ShapeType]?: Partial<PanelInterface> } = {
  rectangle: { width: 150, height: 100, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 3, borderStyle: 'solid', text: '' },
  circle: { width: 120, height: 120, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 3, borderStyle: 'solid', text: '' },
  textBlock: { width: 200, height: 50, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 3, borderStyle: 'solid', text: 'Text' },
  triangle: { width: 100, height: 100, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 3, borderStyle: 'solid', text: '' },
  line: { width: 150, height: 2, backgroundColor: '#000000', borderColor: '#000000', borderWidth: 3, borderStyle: 'solid', text: '' },
  arrow: { width: 150, height: 60, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 3, borderStyle: 'solid', text: '' },
  star: { width: 120, height: 120, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 3, borderStyle: 'solid', text: '' },
  polygon: { width: 120, height: 110, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 3, borderStyle: 'solid', text: '' },
  polyline: { width: 150, height: 80, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 3, borderStyle: 'solid', text: '' },
  heart: { width: 110, height: 100, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 3, borderStyle: 'solid', text: '' },
  cloud: { width: 150, height: 100, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 3, borderStyle: 'solid', text: '' },
  hexagon: { width: 130, height: 110, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 3, borderStyle: 'solid', text: '' },
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
const MIN_CANVAS_DIMENSION = 200;

const DrawingCanvas: React.FC = () => {
  const { state, dispatch } = useCanvasState();
  const { config, history, historyIndex } = state;
  const { panels, canvasWidth, canvasHeight, canvasBgColor, canvasFgColor, panelRoundedCorners, canvasBorderRadius, showGrid, theme } = config;

  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  // Refs for rAF optimization of guide lines
  const guideLinesDataRef = useRef<GuideLine[]>([]);
  const rafIdRef = useRef<number | null>(null);

  const draggingPanelIdRef = useRef<string | null>(null);
  const resizingPanelIdRef = useRef<string | null>(null);
  const startMouseXRef = useRef(0);
  const startMouseYRef = useRef(0);
  const startPanelXRef = useRef(0);
  const startPanelYRef = useRef(0);
  const startPanelWidthRef = useRef(0);
  const startPanelHeightRef = useRef(0);

  const isResizingCanvasRef = useRef<boolean>(false);
  const canvasResizeDirectionRef = useRef<string>('');
  const startCanvasWidthRef = useRef(0);
  const startCanvasHeightRef = useRef(0);

  useEffect(() => {
    if (history.length > 1 || panels.length > 0) { setHasUnsavedChanges(true); } else { setHasUnsavedChanges(false); }
    if (canvasRef.current) { canvasRef.current.style.borderRadius = `${canvasBorderRadius}px`; }
  }, [config, history.length, panels.length, canvasBorderRadius]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { if (hasUnsavedChanges) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, [hasUnsavedChanges]);

  // Cleanup rAF on component unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const onAddPanel = useCallback((shapeType: ShapeType) => {
    const maxZIndex = panels.length > 0 ? Math.max(...panels.map(p => p.zIndex)) : 0;
    const globalPanelDefaults = { width: 100, height: 100, text: '', backgroundColor: '#CCCCCC', borderColor: '#000000', borderWidth: 1, borderStyle: 'solid' };
    const shapeSpecificDefaults = DEFAULT_PANEL_STYLES[shapeType] || {};
    const newPanel: PanelInterface = {
      ...globalPanelDefaults, ...shapeSpecificDefaults,
      id: generateUniqueId(), x: 50, y: 50, zIndex: maxZIndex + 1, shapeType: shapeType,
      text: (shapeType === 'textBlock' && !shapeSpecificDefaults.text) ? 'Text' : (shapeSpecificDefaults.text ?? globalPanelDefaults.text),
    };
    dispatch({ type: 'ADD_PANEL', payload: newPanel });
    setSelectedPanels([newPanel.id]);
  }, [dispatch, panels]);

  const onUpdatePanelPosition = useCallback((id: string, newX: number, newY: number) => { dispatch({ type: 'UPDATE_PANEL_POSITION', payload: { id, x: newX, y: newY } }); }, [dispatch]);
  const onUpdatePanelDimensions = useCallback((id: string, newWidth: number, newHeight: number) => { dispatch({ type: 'UPDATE_PANEL_DIMENSIONS', payload: { id, width: newWidth, height: newHeight } }); }, [dispatch]);
  const onUpdatePanelText = useCallback((id: string, newText: string) => { dispatch({ type: 'UPDATE_PANEL_TEXT', payload: { id, text: newText } }); }, [dispatch]);
  const onUpdatePanelStyle = useCallback((id: string, styles: Partial<Omit<PanelInterface, 'id' | 'x' | 'y' | 'width' | 'height' | 'zIndex' | 'text' | 'shapeType'>>) => { dispatch({ type: 'UPDATE_PANEL_STYLE', payload: { id, styles } }); }, [dispatch]);
  const onRemoveSelectedPanels = useCallback(() => { if (selectedPanels.length > 0) { dispatch({ type: 'DELETE_PANELS', payload: { ids: selectedPanels } }); setSelectedPanels([]); } }, [dispatch, selectedPanels]);
  const onUpdateCanvasDimensions = useCallback((width: number, height: number) => { dispatch({ type: 'SET_CANVAS_DIMENSIONS', payload: { width, height } }); }, [dispatch]);
  const onUpdateCanvasColors = useCallback((bgColor: string, fgColor: string) => { dispatch({ type: 'SET_CANVAS_COLORS', payload: { bgColor, fgColor } }); }, [dispatch]);
  const onTogglePanelRoundedCorners = useCallback(() => { dispatch({ type: 'TOGGLE_PANEL_ROUNDED_CORNERS' }); }, [dispatch]);
  const onSetCanvasBorderRadius = useCallback((radius: number) => { dispatch({ type: 'SET_CANVAS_BORDER_RADIUS', payload: { radius } }); }, [dispatch]);
  const onToggleGrid = useCallback(() => { dispatch({ type: 'TOGGLE_GRID' }); }, [dispatch]);
  const onToggleTheme = useCallback(() => { dispatch({ type: 'TOGGLE_THEME' }); }, [dispatch]);
  const onCopySelectedPanels = useCallback(() => { if (selectedPanels.length > 0) { dispatch({ type: 'COPY_PANELS', payload: { ids: selectedPanels } }); } }, [dispatch, selectedPanels]);
  const onPastePanels = useCallback(() => { dispatch({ type: 'PASTE_PANELS' }); }, [dispatch]);

  const getCursorStyle = (direction: string) => {
    switch (direction) { case 's': return 'ns-resize'; case 'e': return 'ew-resize'; case 'se': return 'nwse-resize'; default: return 'default'; }
  };

  // Ref to hold the latest mouse move handler for stable event listener removal
  const handleGlobalMouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);

  // Original handleGlobalMouseUp modified for rAF cleanup
  const handleGlobalMouseUp = useCallback(() => {
    draggingPanelIdRef.current = null;
    resizingPanelIdRef.current = null;
    isResizingCanvasRef.current = false;
    canvasResizeDirectionRef.current = '';

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (guideLinesDataRef.current.length > 0) { // Only update state if ref had data
        guideLinesDataRef.current = [];
        setGuideLines([]); // Clear guides from state
    }

    if (handleGlobalMouseMoveRef.current) { // Use the ref for removal
      document.removeEventListener('mousemove', handleGlobalMouseMoveRef.current);
    }
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    document.body.style.cursor = 'default';
  }, []); // setGuideLines is stable, handleGlobalMouseMoveRef is stable

  // This is the main mouse move logic, now called internalHandleGlobalMouseMove
  const internalHandleGlobalMouseMove = useCallback((e: MouseEvent) => {
    const dx = e.clientX - startMouseXRef.current;
    const dy = e.clientY - startMouseYRef.current;
    let newCalculatedGuides: GuideLine[] = []; // Calculate guides into this local array

    if (isResizingCanvasRef.current) {
      let newWidth = startCanvasWidthRef.current;
      let newHeight = startCanvasHeightRef.current;
      const direction = canvasResizeDirectionRef.current;
      if (direction.includes('e')) { newWidth = Math.max(MIN_CANVAS_DIMENSION, startCanvasWidthRef.current + dx); }
      if (direction.includes('s')) { newHeight = Math.max(MIN_CANVAS_DIMENSION, startCanvasHeightRef.current + dy); }
      onUpdateCanvasDimensions(newWidth, newHeight); // Update dimensions directly
      
      guideLinesDataRef.current = []; // No guides for canvas resize
      // If an rAF is pending, let it run to clear guides, or schedule one if not.
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
            if (rafIdRef.current) { // Check if not cancelled by a quick mouseup
                 setGuideLines(guideLinesDataRef.current); // This will set to []
            }
            rafIdRef.current = null;
        });
      }
      return;
    }

    const currentPanelId = draggingPanelIdRef.current || resizingPanelIdRef.current;
    if (!currentPanelId) {
      if (guideLinesDataRef.current.length > 0) { // If guides were shown, schedule clear
        guideLinesDataRef.current = [];
        if (!rafIdRef.current) {
          rafIdRef.current = requestAnimationFrame(() => {
            if (rafIdRef.current) {  setGuideLines(guideLinesDataRef.current); }
            rafIdRef.current = null;
          });
        }
      }
      return;
    }

    const currentPanel = panels.find(p => p.id === currentPanelId);
    if (!currentPanel) {
        if (guideLinesDataRef.current.length > 0) {
            guideLinesDataRef.current = [];
            if (!rafIdRef.current) {
              rafIdRef.current = requestAnimationFrame(() => {
                if (rafIdRef.current) { setGuideLines(guideLinesDataRef.current); }
                rafIdRef.current = null;
              });
            }
        }
        return;
    }

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

    // --- SNAPPING LOGIC ---
    // All your original `guides.push` calls should now be `newCalculatedGuides.push`
    if (draggingPanelIdRef.current) {
      // Canvas Boundary Snapping
      if (Math.abs(snappedX) < SNAP_THRESHOLD) { snappedX = 0; newCalculatedGuides.push({ id: 'canvas-left', x1: 0, y1: 0, x2: 0, y2: canvasHeight, orientation: 'vertical' }); }
      if (Math.abs((snappedX + currentPanel.width) - canvasWidth) < SNAP_THRESHOLD) { snappedX = canvasWidth - currentPanel.width; newCalculatedGuides.push({ id: 'canvas-right', x1: canvasWidth, y1: 0, x2: canvasWidth, y2: canvasHeight, orientation: 'vertical' }); }
      if (Math.abs(snappedY) < SNAP_THRESHOLD) { snappedY = 0; newCalculatedGuides.push({ id: 'canvas-top', x1: 0, y1: 0, x2: canvasWidth, y2: 0, orientation: 'horizontal' }); }
      if (Math.abs((snappedY + currentPanel.height) - canvasHeight) < SNAP_THRESHOLD) { snappedY = canvasHeight - currentPanel.height; newCalculatedGuides.push({ id: 'canvas-bottom', x1: 0, y1: canvasHeight, x2: canvasWidth, y2: canvasHeight, orientation: 'horizontal' }); }
      if (Math.abs((snappedX + currentPanel.width / 2) - canvasWidth / 2) < SNAP_THRESHOLD) { snappedX = canvasWidth / 2 - currentPanel.width / 2; newCalculatedGuides.push({ id: 'canvas-h-center', x1: canvasWidth / 2, y1: 0, x2: canvasWidth / 2, y2: canvasHeight, orientation: 'vertical' }); }
      if (Math.abs((snappedY + currentPanel.height / 2) - canvasHeight / 2) < SNAP_THRESHOLD) { snappedY = canvasHeight / 2 - currentPanel.height / 2; newCalculatedGuides.push({ id: 'canvas-v-center', x1: 0, y1: canvasHeight / 2, x2: canvasWidth, y2: canvasHeight / 2, orientation: 'horizontal' }); }

      // Panel-to-Panel Snapping
      const currentPanelCenterX = snappedX + currentPanel.width / 2;
      const currentPanelCenterY = snappedY + currentPanel.height / 2;
      panels.forEach(otherPanel => {
        if (otherPanel.id === currentPanelId) return;
        const otherPanelRect = { x: otherPanel.x, y: otherPanel.y, width: otherPanel.width, height: otherPanel.height, centerX: otherPanel.x + otherPanel.width / 2, centerY: otherPanel.y + otherPanel.height / 2, right: otherPanel.x + otherPanel.width, bottom: otherPanel.y + otherPanel.height };
        // Horizontal Alignment (Vertical Guides)
        if (Math.abs(snappedX - otherPanelRect.x) < SNAP_THRESHOLD) { snappedX = otherPanelRect.x; newCalculatedGuides.push({ id: `panel-l-l-${otherPanel.id}`, x1: snappedX, y1: Math.min(snappedY, otherPanel.y), x2: snappedX, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
        if (Math.abs(snappedX - otherPanelRect.centerX) < SNAP_THRESHOLD) { snappedX = otherPanelRect.centerX - currentPanel.width / 2; newCalculatedGuides.push({ id: `panel-l-c-${otherPanel.id}`, x1: otherPanelRect.centerX, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.centerX, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
        if (Math.abs(snappedX - otherPanelRect.right) < SNAP_THRESHOLD) { snappedX = otherPanelRect.right - currentPanel.width; newCalculatedGuides.push({ id: `panel-l-r-${otherPanel.id}`, x1: otherPanelRect.right, y1: Math.min(snappedY, otherPanel.y), x2: snappedX + currentPanel.width, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
        if (Math.abs(currentPanelCenterX - otherPanelRect.centerX) < SNAP_THRESHOLD) { snappedX = otherPanelRect.centerX - currentPanel.width / 2; newCalculatedGuides.push({ id: `panel-c-c-h-${otherPanel.id}`, x1: otherPanelRect.centerX, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.centerX, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
        if (Math.abs((snappedX + currentPanel.width) - otherPanelRect.x) < SNAP_THRESHOLD) { snappedX = otherPanelRect.x - currentPanel.width; newCalculatedGuides.push({ id: `panel-r-l-${otherPanel.id}`, x1: otherPanelRect.x, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.x, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
        if (Math.abs((snappedX + currentPanel.width) - otherPanelRect.centerX) < SNAP_THRESHOLD) { snappedX = otherPanelRect.centerX - currentPanel.width; newCalculatedGuides.push({ id: `panel-r-c-${otherPanel.id}`, x1: otherPanelRect.centerX, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.centerX, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
        if (Math.abs((snappedX + currentPanel.width) - otherPanelRect.right) < SNAP_THRESHOLD) { snappedX = otherPanelRect.right - currentPanel.width; newCalculatedGuides.push({ id: `panel-r-r-${otherPanel.id}`, x1: otherPanelRect.right, y1: Math.min(snappedY, otherPanel.y), x2: otherPanelRect.right, y2: Math.max(snappedY + currentPanel.height, otherPanel.y + otherPanel.height), orientation: 'vertical' }); }
        // Vertical Alignment (Horizontal Guides)
        if (Math.abs(snappedY - otherPanelRect.y) < SNAP_THRESHOLD) { snappedY = otherPanelRect.y; newCalculatedGuides.push({ id: `panel-t-t-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: snappedY, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: snappedY, orientation: 'horizontal' }); }
        if (Math.abs(snappedY - otherPanelRect.centerY) < SNAP_THRESHOLD) { snappedY = otherPanelRect.centerY - currentPanel.height / 2; newCalculatedGuides.push({ id: `panel-t-c-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: otherPanelRect.centerY, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: otherPanelRect.centerY, orientation: 'horizontal' }); }
        if (Math.abs(snappedY - otherPanelRect.bottom) < SNAP_THRESHOLD) { snappedY = otherPanelRect.bottom - currentPanel.height; newCalculatedGuides.push({ id: `panel-t-b-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: otherPanelRect.bottom, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: snappedY + currentPanel.height, orientation: 'horizontal' }); }
        if (Math.abs(currentPanelCenterY - otherPanelRect.centerY) < SNAP_THRESHOLD) { snappedY = otherPanelRect.centerY - currentPanel.height / 2; newCalculatedGuides.push({ id: `panel-c-c-v-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: otherPanelRect.centerY, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: otherPanelRect.centerY, orientation: 'horizontal' }); }
        if (Math.abs((snappedY + currentPanel.height) - otherPanelRect.y) < SNAP_THRESHOLD) { snappedY = otherPanelRect.y - currentPanel.height; newCalculatedGuides.push({ id: `panel-b-t-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: otherPanelRect.y, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: otherPanelRect.y, orientation: 'horizontal' }); }
        if (Math.abs((snappedY + currentPanel.height) - otherPanelRect.centerY) < SNAP_THRESHOLD) { snappedY = otherPanelRect.centerY - currentPanel.height; newCalculatedGuides.push({ id: `panel-b-c-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: otherPanelRect.centerY, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: otherPanelRect.centerY, orientation: 'horizontal' }); }
        if (Math.abs((snappedY + currentPanel.height) - otherPanelRect.bottom) < SNAP_THRESHOLD) { snappedY = otherPanelRect.bottom - currentPanel.height; newCalculatedGuides.push({ id: `panel-b-b-${otherPanel.id}`, x1: Math.min(snappedX, otherPanel.x), y1: otherPanelRect.bottom, x2: Math.max(snappedX + currentPanel.width, otherPanel.x + otherPanel.width), y2: otherPanelRect.bottom, orientation: 'horizontal' }); }
      });
    }
    // --- END SNAPPING LOGIC ---

    // Update panel position or dimensions directly (synchronously)
    if (draggingPanelIdRef.current) {
      snappedX = Math.max(0, Math.min(snappedX, canvasWidth - currentPanel.width));
      snappedY = Math.max(0, Math.min(snappedY, canvasHeight - currentPanel.height));
      onUpdatePanelPosition(currentPanelId, snappedX, snappedY);
    } else if (resizingPanelIdRef.current) {
      snappedWidth = Math.max(snappedWidth, 50);
      snappedHeight = Math.max(snappedHeight, 50);
      snappedWidth = Math.min(snappedWidth, canvasWidth - currentPanel.x);
      snappedHeight = Math.min(snappedHeight, canvasHeight - currentPanel.y);
      if (currentPanel.shapeType === 'circle') { const size = Math.max(snappedWidth, snappedHeight); snappedWidth = size; snappedHeight = size; }
      onUpdatePanelDimensions(currentPanelId, snappedWidth, snappedHeight);
      newCalculatedGuides = []; // Clear guides during panel resize
    }
    
    // Store the calculated guides in the ref for rAF
    guideLinesDataRef.current = newCalculatedGuides;

    // Schedule rAF to update the guideLines state
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (rafIdRef.current) { // Check it wasn't cancelled just before firing
            setGuideLines(guideLinesDataRef.current);
        }
        rafIdRef.current = null; // Allow new rAF to be scheduled
      });
    }
  }, [panels, canvasWidth, canvasHeight, onUpdatePanelPosition, onUpdatePanelDimensions, onUpdateCanvasDimensions, SNAP_THRESHOLD]); // Added SNAP_THRESHOLD

  // Effect to keep the ref handleGlobalMouseMoveRef.current pointing to the latest internalHandleGlobalMouseMove
  useEffect(() => {
    handleGlobalMouseMoveRef.current = internalHandleGlobalMouseMove;
  }, [internalHandleGlobalMouseMove]);

  const handleCanvasResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    if (!canvasRef.current) return;
    isResizingCanvasRef.current = true;
    canvasResizeDirectionRef.current = direction;
    startMouseXRef.current = e.clientX;
    startMouseYRef.current = e.clientY;
    startCanvasWidthRef.current = canvasWidth;
    startCanvasHeightRef.current = canvasHeight;
    if (handleGlobalMouseMoveRef.current) { // Use the ref
        document.addEventListener('mousemove', handleGlobalMouseMoveRef.current);
    }
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.body.style.cursor = getCursorStyle(direction);
  }, [canvasWidth, canvasHeight, handleGlobalMouseUp]); // handleGlobalMouseUp is stable

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') { event.preventDefault(); dispatch({ type: 'UNDO' }); }
      if ((event.ctrlKey || event.metaKey) && event.key === 'y') { event.preventDefault(); dispatch({ type: 'REDO' }); }
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') { event.preventDefault(); onCopySelectedPanels(); }
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') { event.preventDefault(); onPastePanels(); }
      if ((event.key === 'Delete' || event.key === 'Backspace') && !isTyping) { if (selectedPanels.length > 0) { event.preventDefault(); onRemoveSelectedPanels(); } }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [dispatch, onCopySelectedPanels, onPastePanels, onRemoveSelectedPanels, selectedPanels]);

  const isUndoDisabled = historyIndex === 0;
  const isRedoDisabled = historyIndex === history.length - 1;
  const isDeleteDisabled = selectedPanels.length === 0;
  const isCopyDisabled = selectedPanels.length === 0;
  const isPasteDisabled = state.copiedPanels.length === 0;

  const handleExportPNG = useCallback(() => { if (canvasRef.current) { exportCanvasAsPNG(canvasRef.current, canvasBgColor, dispatch); } }, [canvasBgColor, dispatch]);
  const handleExportConfig = useCallback(() => { exportCanvasConfigAsJSON(config, dispatch); setHasUnsavedChanges(false); }, [config, dispatch]);
  const handleImportConfig = useCallback((event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { importCanvasConfig(file, dispatch); event.target.value = ''; setSelectedPanels([]); setHasUnsavedChanges(false); } }, [dispatch]);
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => { if (event.target === canvasRef.current) { setSelectedPanels([]); } }, []);
  
  const handlePanelInteractionStart = useCallback((panelId: string, event: React.MouseEvent, type: 'drag' | 'resize') => {
    event.stopPropagation();
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    if (type === 'drag') { draggingPanelIdRef.current = panelId; startPanelXRef.current = panel.x; startPanelYRef.current = panel.y; document.body.style.cursor = 'grab';
    } else if (type === 'resize') { resizingPanelIdRef.current = panelId; startPanelWidthRef.current = panel.width; startPanelHeightRef.current = panel.height; document.body.style.cursor = 'nwse-resize'; }
    startMouseXRef.current = event.clientX; startMouseYRef.current = event.clientY;
    if (handleGlobalMouseMoveRef.current) { // Use the ref
        document.addEventListener('mousemove', handleGlobalMouseMoveRef.current);
    }
    document.addEventListener('mouseup', handleGlobalMouseUp);
  }, [panels, handleGlobalMouseUp]); // handleGlobalMouseUp is stable

  const handlePanelClick = useCallback((panelId: string, event: React.MouseEvent) => { event.stopPropagation(); if (event.ctrlKey || event.metaKey) { setSelectedPanels(prevSelected => prevSelected.includes(panelId) ? prevSelected.filter(id => id !== panelId) : [...prevSelected, panelId]); } else { setSelectedPanels([panelId]); } }, []);
  const canvasClasses = useMemo(() => { const base = `relative overflow-hidden shadow-lg border-2 transition-all duration-300`; const themeBorders = theme === 'dark' ? 'border-gray-700' : 'border-gray-300'; const gridPattern = showGrid ? (theme === 'dark' ? 'bg-grid-dark' : 'bg-grid-light') : ''; return `${base} ${themeBorders} ${gridPattern}`; }, [theme, showGrid]);

  return (
    <div className={`min-h-screen flex flex-col items-center p-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} transition-colors duration-300`}>
      <Toolbar theme={theme} onAddPanel={onAddPanel} onUndo={() => dispatch({ type: 'UNDO' })} onRedo={() => dispatch({ type: 'REDO' })} onExportConfig={handleExportConfig} onImportConfig={handleImportConfig} onExportPNG={handleExportPNG} onRemoveSelectedPanels={onRemoveSelectedPanels} onToggleTheme={onToggleTheme} onCopySelectedPanels={onCopySelectedPanels} onPastePanels={onPastePanels} isUndoDisabled={isUndoDisabled} isRedoDisabled={isRedoDisabled} isDeleteDisabled={isDeleteDisabled} isCopyDisabled={isCopyDisabled} isPasteDisabled={isPasteDisabled} />
      <CanvasControls canvasWidth={canvasWidth} canvasHeight={canvasHeight} canvasBgColor={canvasBgColor} canvasFgColor={canvasFgColor} canvasBorderRadius={canvasBorderRadius} panelRoundedCorners={panelRoundedCorners} showGrid={showGrid} theme={theme} onUpdateCanvasDimensions={onUpdateCanvasDimensions} onUpdateCanvasColors={onUpdateCanvasColors} onSetCanvasBorderRadius={onSetCanvasBorderRadius} onTogglePanelRoundedCorners={onTogglePanelRoundedCorners} onToggleGrid={onToggleGrid} />
      <div ref={canvasRef} className={canvasClasses} style={{ width: canvasWidth, height: canvasHeight, backgroundColor: showGrid ? undefined : canvasBgColor, borderColor: canvasFgColor, borderRadius: `${canvasBorderRadius}px`, backgroundImage: showGrid ? `linear-gradient(${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px), linear-gradient(90deg, ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px)` : 'none', backgroundSize: showGrid ? '20px 20px' : 'auto' }} onClick={handleCanvasClick}>
        {panels.map((panel) => ( <Panel key={panel.id} panel={panel} isSelected={selectedPanels.includes(panel.id)} onSelect={handlePanelClick} onUpdatePosition={onUpdatePanelPosition} onUpdateDimensions={onUpdatePanelDimensions} onUpdateText={onUpdatePanelText} onUpdateStyle={onUpdatePanelStyle} canvasWidth={canvasWidth} canvasHeight={canvasHeight} canvasFgColor={canvasFgColor} panelRoundedCorners={panelRoundedCorners} theme={theme} onInteractionStart={handlePanelInteractionStart} /> ))}
        {guideLines.map((line) => ( <div key={line.id} className="absolute bg-red-500 z-[9999]" style={{ left: `${line.x1}px`, top: `${line.y1}px`, width: line.orientation === 'vertical' ? '2px' : `${Math.abs(line.x2 - line.x1)}px`, height: line.orientation === 'horizontal' ? '2px' : `${Math.abs(line.y2 - line.y1)}px`, }} /> ))}
        <div className={`absolute bottom-0 left-0 w-full h-2 cursor-ns-resize z-50`} style={{ backgroundColor: canvasFgColor }} onMouseDown={(e) => handleCanvasResizeStart(e, 's')} />
        <div className={`absolute top-0 right-0 h-full w-2 cursor-ew-resize z-50`} style={{ backgroundColor: canvasFgColor }} onMouseDown={(e) => handleCanvasResizeStart(e, 'e')} />
        <div className={`absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50`} style={{ backgroundColor: canvasFgColor }} onMouseDown={(e) => handleCanvasResizeStart(e, 'se')} />
      </div>
    </div>
  );
};

export default DrawingCanvas;