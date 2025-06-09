import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useCanvasState } from '../hooks/useCanvasState';
import { Panel } from '../components/Panel';
import Ribbon from './Ribbon';
import { exportCanvasAsPNG, exportCanvasConfigAsJSON, importCanvasConfig } from '../utils/fileOperations';
import { generateUniqueId } from '../utils/idGenerator';
import { PanelInterface, ShapeType } from '../types';
import ContextMenu from './ContextMenu';

const DEFAULT_PANEL_STYLES: { [key in ShapeType]?: Partial<PanelInterface> } = {
  rectangle: { width: 150, height: 100, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 2, borderStyle: 'solid', text: '' },
  circle: { width: 120, height: 120, backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: 2, borderStyle: 'solid', text: '' },
  textBlock: { width: 200, height: 50, backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, text: 'Click to Type' },
};

interface GuideLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  orientation: 'horizontal' | 'vertical';
}

interface DistanceIndicator {
    id: 'top' | 'bottom' | 'left' | 'right';
    value: string;
    style: React.CSSProperties;
}

const SNAP_THRESHOLD = 8;
const MIN_CANVAS_DIMENSION = 200;
const DISTANCE_INDICATOR_THRESHOLD = 40;

const DrawingCanvas: React.FC = () => {
  const { state, dispatch } = useCanvasState();
  const { config, history, historyIndex } = state;
  const {
    panels, canvasWidth, canvasHeight, canvasBgColor, canvasFgColor,
    panelRoundedCorners, canvasBorderRadius, showGrid, theme
  } = config;

  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
  const [distanceIndicators, setDistanceIndicators] = useState<DistanceIndicator[]>([]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    panelId: string;
  } | null>(null);

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
  const onUpdatePanelStyle = useCallback((id: string, styles: Partial<PanelInterface>) => { dispatch({ type: 'UPDATE_PANEL_STYLE', payload: { id, styles } }); }, [dispatch]);
  const onRemoveSelectedPanels = useCallback(() => { if (selectedPanels.length > 0) { dispatch({ type: 'DELETE_PANELS', payload: { ids: selectedPanels } }); setSelectedPanels([]); } }, [dispatch, selectedPanels]);
  const onUpdateCanvasDimensions = useCallback((width: number, height: number) => { dispatch({ type: 'SET_CANVAS_DIMENSIONS', payload: { width, height } }); }, [dispatch]);
  const onUpdateCanvasColors = useCallback((bgColor: string, fgColor: string) => { dispatch({ type: 'SET_CANVAS_COLORS', payload: { bgColor, fgColor } }); }, [dispatch]);
  const onSetCanvasBorderRadius = useCallback((radius: number) => { dispatch({ type: 'SET_CANVAS_BORDER_RADIUS', payload: { radius } }); }, [dispatch]);
  const onToggleGrid = useCallback(() => { dispatch({ type: 'TOGGLE_GRID' }); }, [dispatch]);
  const onToggleTheme = useCallback(() => { dispatch({ type: 'TOGGLE_THEME' }); }, [dispatch]);
  const onCopySelectedPanels = useCallback(() => { if (selectedPanels.length > 0) { dispatch({ type: 'COPY_PANELS', payload: { ids: selectedPanels } }); } }, [dispatch, selectedPanels]);
  const onPastePanels = useCallback(() => { dispatch({ type: 'PASTE_PANELS' }); }, [dispatch]);
  const handleCloseContextMenu = useCallback(() => {
    console.log("!!! Closing context menu right now !!!");
    setContextMenu(null);
  }, []);
  const handleContextMenu = useCallback((event: React.MouseEvent, panelId: string) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, panelId })
    setSelectedPanels(prevSelected => 
      prevSelected.includes(panelId) ? prevSelected : [panelId]
    );
  }, []);
  const handleDeleteFromMenu = useCallback(() => {
    if (contextMenu) {
      dispatch({ type: 'DELETE_PANELS', payload: { ids: [contextMenu.panelId] } });
      handleCloseContextMenu();
    }
  }, [contextMenu, dispatch, handleCloseContextMenu]);

  const handleBringToFront = useCallback(() => {
    if (contextMenu) {
      dispatch({ type: 'BRING_TO_FRONT', payload: { id: contextMenu.panelId } });
      handleCloseContextMenu();
    }
  }, [contextMenu, dispatch, handleCloseContextMenu]);
  
  const handleSendToBack = useCallback(() => {
    if (contextMenu) {
      dispatch({ type: 'SEND_TO_BACK', payload: { id: contextMenu.panelId } });
      handleCloseContextMenu();
    }
  }, [contextMenu, dispatch, handleCloseContextMenu]);

  const getCursorStyle = (direction: string) => {
    switch (direction) { case 's': return 'ns-resize'; case 'e': return 'ew-resize'; case 'se': return 'nwse-resize'; default: return 'default'; }
  };

  const handleGlobalMouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);

  const handleGlobalMouseUp = useCallback(() => {
    draggingPanelIdRef.current = null;
    resizingPanelIdRef.current = null;
    isResizingCanvasRef.current = false;
    canvasResizeDirectionRef.current = '';

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    setGuideLines([]);
    setDistanceIndicators([]);

    if (handleGlobalMouseMoveRef.current) {
      document.removeEventListener('mousemove', handleGlobalMouseMoveRef.current);
    }
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    document.body.style.cursor = 'default';
  }, []);

  const internalHandleGlobalMouseMove = useCallback((e: MouseEvent) => {
    const dx = e.clientX - startMouseXRef.current;
    const dy = e.clientY - startMouseYRef.current;
    const newGuides: GuideLine[] = [];
    const newIndicators: DistanceIndicator[] = [];

    if (isResizingCanvasRef.current) {
        const newWidth = Math.max(MIN_CANVAS_DIMENSION, startCanvasWidthRef.current + (canvasResizeDirectionRef.current.includes('e') ? dx : 0));
        const newHeight = Math.max(MIN_CANVAS_DIMENSION, startCanvasHeightRef.current + (canvasResizeDirectionRef.current.includes('s') ? dy : 0));
        dispatch({ type: 'SET_CANVAS_DIMENSIONS', payload: { width: newWidth, height: newHeight } });
        setGuideLines([]);
        setDistanceIndicators([]);
        return;
    }

    const currentPanelId = draggingPanelIdRef.current || resizingPanelIdRef.current;
    if (!currentPanelId) return;
    
    const currentPanel = panels.find(p => p.id === currentPanelId);
    if (!currentPanel) return;
    if (draggingPanelIdRef.current) {
        let snappedX = startPanelXRef.current + dx;
        let snappedY = startPanelYRef.current + dy;

        let closestPanel: PanelInterface | null = null;
        let minDistance = Infinity;

        const currentCenter = { x: snappedX + currentPanel.width / 2, y: snappedY + currentPanel.height / 2 };
        for (const otherPanel of panels) {
            if (otherPanel.id === currentPanelId) continue;
            const otherCenter = { x: otherPanel.x + otherPanel.width / 2, y: otherPanel.y + otherPanel.height / 2 };
            const distance = Math.hypot(currentCenter.x - otherCenter.x, currentCenter.y - otherCenter.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestPanel = otherPanel;
            }
        }

        if (Math.abs(snappedX) < SNAP_THRESHOLD) { snappedX = 0; }
        if (Math.abs((snappedX + currentPanel.width) - canvasWidth) < SNAP_THRESHOLD) { snappedX = canvasWidth - currentPanel.width; }
        if (Math.abs(snappedY) < SNAP_THRESHOLD) { snappedY = 0; }
        if (Math.abs((snappedY + currentPanel.height) - canvasHeight) < SNAP_THRESHOLD) { snappedY = canvasHeight - currentPanel.height; }
        if (Math.abs((snappedX + currentPanel.width / 2) - canvasWidth / 2) < SNAP_THRESHOLD) { snappedX = canvasWidth / 2 - currentPanel.width / 2; }
        if (Math.abs((snappedY + currentPanel.height / 2) - canvasHeight / 2) < SNAP_THRESHOLD) { snappedY = canvasHeight / 2 - currentPanel.height / 2; }
        
        if (closestPanel && minDistance < Math.max(currentPanel.width, currentPanel.height) * 1.5) {
            const other = closestPanel;
            if (Math.abs((snappedX + currentPanel.width / 2) - (other.x + other.width / 2)) < SNAP_THRESHOLD) {
                snappedX = other.x + other.width / 2 - currentPanel.width / 2;
                newGuides.push({ id: `guide-v-${other.id}`, x1: other.x + other.width / 2, y1: Math.min(snappedY, other.y), x2: other.x + other.width / 2, y2: Math.max(snappedY + currentPanel.height, other.y + other.height), orientation: 'vertical' });
            }
            if (Math.abs((snappedY + currentPanel.height / 2) - (other.y + other.height / 2)) < SNAP_THRESHOLD) {
                snappedY = other.y + other.height / 2 - currentPanel.height / 2;
                newGuides.push({ id: `guide-h-${other.id}`, x1: Math.min(snappedX, other.x), y1: other.y + other.height / 2, x2: Math.max(snappedX + currentPanel.width, other.x + other.width), y2: other.y + other.height / 2, orientation: 'horizontal' });
            }
            if (Math.abs(snappedX - other.x) < SNAP_THRESHOLD) snappedX = other.x;
            if (Math.abs((snappedX + currentPanel.width) - (other.x + other.width)) < SNAP_THRESHOLD) snappedX = other.x + other.width - currentPanel.width;
            if (Math.abs(snappedY - other.y) < SNAP_THRESHOLD) snappedY = other.y;
            if (Math.abs((snappedY + currentPanel.height) - (other.y + other.height)) < SNAP_THRESHOLD) snappedY = other.y + other.height - currentPanel.height;
        }

        const distTop = snappedY;
        const distLeft = snappedX;
        const distBottom = canvasHeight - (snappedY + currentPanel.height);
        const distRight = canvasWidth - (snappedX + currentPanel.width);

        if (distTop > 0 && distTop < DISTANCE_INDICATOR_THRESHOLD) { newIndicators.push({ id: 'top', value: `${distTop.toFixed(0)}px`, style: { top: `${distTop / 2}px`, left: `${snappedX + currentPanel.width / 2}px`, transform: 'translateX(-50%)' }}); }
        if (distBottom > 0 && distBottom < DISTANCE_INDICATOR_THRESHOLD) { newIndicators.push({ id: 'bottom', value: `${distBottom.toFixed(0)}px`, style: { bottom: `${distBottom / 2}px`, left: `${snappedX + currentPanel.width / 2}px`, transform: 'translateX(-50%)' }}); }
        if (distLeft > 0 && distLeft < DISTANCE_INDICATOR_THRESHOLD) { newIndicators.push({ id: 'left', value: `${distLeft.toFixed(0)}px`, style: { left: `${distLeft / 2}px`, top: `${snappedY + currentPanel.height / 2}px`, transform: 'translateY(-50%)' }}); }
        if (distRight > 0 && distRight < DISTANCE_INDICATOR_THRESHOLD) { newIndicators.push({ id: 'right', value: `${distRight.toFixed(0)}px`, style: { right: `${distRight / 2}px`, top: `${snappedY + currentPanel.height / 2}px`, transform: 'translateY(-50%)' }}); }
        
        dispatch({ type: 'UPDATE_PANEL_POSITION', payload: { id: currentPanelId, x: snappedX, y: snappedY } });

    } else if (resizingPanelIdRef.current) {
      let snappedWidth = startPanelWidthRef.current + dx;
      let snappedHeight = startPanelHeightRef.current + dy;
      snappedWidth = Math.max(snappedWidth, 20);
      snappedHeight = Math.max(snappedHeight, 20);
      dispatch({ type: 'UPDATE_PANEL_DIMENSIONS', payload: { id: currentPanelId, width: snappedWidth, height: snappedHeight } });
    }
    
    setGuideLines(newGuides);
    setDistanceIndicators(newIndicators);

  }, [panels, canvasWidth, canvasHeight, dispatch]);

  useEffect(() => {
    handleGlobalMouseMoveRef.current = internalHandleGlobalMouseMove;
  }, [internalHandleGlobalMouseMove]);

  const handleCanvasResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    e.stopPropagation(); if (!canvasRef.current) return;
    isResizingCanvasRef.current = true;
    canvasResizeDirectionRef.current = direction;
    startMouseXRef.current = e.clientX;
    startMouseYRef.current = e.clientY;
    startCanvasWidthRef.current = canvasWidth;
    startCanvasHeightRef.current = canvasHeight;
    if (handleGlobalMouseMoveRef.current) document.addEventListener('mousemove', handleGlobalMouseMoveRef.current);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.body.style.cursor = getCursorStyle(direction);
  }, [canvasWidth, canvasHeight, handleGlobalMouseUp]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); dispatch({ type: 'UNDO' }); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); dispatch({ type: 'REDO' }); }
      if (!isTyping) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') { event.preventDefault(); onCopySelectedPanels(); }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') { event.preventDefault(); onPastePanels(); }
        if (event.key === 'Delete' || event.key === 'Backspace') { if (selectedPanels.length > 0) { event.preventDefault(); onRemoveSelectedPanels(); } }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [dispatch, onCopySelectedPanels, onPastePanels, onRemoveSelectedPanels, selectedPanels]);

  const isUndoDisabled = historyIndex === 0;
  const isRedoDisabled = historyIndex === history.length - 1;
  const isDeleteDisabled = selectedPanels.length === 0;
  const isCopyDisabled = selectedPanels.length === 0;
  const isPasteDisabled = state.copiedPanels.length === 0;

  const handleImportConfig = useCallback((event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { importCanvasConfig(file, dispatch); event.target.value = ''; setSelectedPanels([]); setHasUnsavedChanges(false); } }, [dispatch]);
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => { if (event.target === canvasRef.current) { setSelectedPanels([]); } handleCloseContextMenu}, [handleCloseContextMenu]);

  const handlePanelInteractionStart = useCallback((panelId: string, event: React.MouseEvent, type: 'drag' | 'resize') => {
    event.stopPropagation();
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    startMouseXRef.current = event.clientX;
    startMouseYRef.current = event.clientY;
    if (type === 'drag') {
      draggingPanelIdRef.current = panelId;
      startPanelXRef.current = panel.x;
      startPanelYRef.current = panel.y;
      document.body.style.cursor = 'grab';
    } else if (type === 'resize') {
      resizingPanelIdRef.current = panelId;
      startPanelWidthRef.current = panel.width;
      startPanelHeightRef.current = panel.height;
      document.body.style.cursor = 'nwse-resize';
    }
    if (handleGlobalMouseMoveRef.current) document.addEventListener('mousemove', handleGlobalMouseMoveRef.current);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  }, [panels, handleGlobalMouseUp]);


  const handlePanelClick = useCallback((panelId: string, event: React.MouseEvent) => { event.stopPropagation(); if (event.ctrlKey || event.metaKey) { setSelectedPanels(prevSelected => prevSelected.includes(panelId) ? prevSelected.filter(id => id !== panelId) : [...prevSelected, panelId]); } else { setSelectedPanels([panelId]); } }, []);

  const canvasClasses = useMemo(() => {
    const base = `relative overflow-hidden shadow-lg border-2 transition-all duration-300`;
    const themeBorders = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';
    return `${base} ${themeBorders}`;
  }, [theme]);

  console.log('DrawingCanvas is rendering. ContextMenu state is:', contextMenu);
  return (
    <div className={`min-h-screen flex flex-col items-center p-4 md:p-6 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-300`}>
        <h1 className={`text-2xl font-bold my-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'} text-center`}>
            Layout Designer
        </h1>
        

        <Ribbon
            theme={theme}
            onAddPanel={onAddPanel}
            onUndo={() => dispatch({ type: 'UNDO' })}
            onRedo={() => dispatch({ type: 'REDO' })}
            onExportConfig={() => { exportCanvasConfigAsJSON(config, dispatch); setHasUnsavedChanges(false); }}
            onImportConfig={handleImportConfig}
            onExportPNG={() => { if (canvasRef.current) exportCanvasAsPNG(canvasRef.current, canvasBgColor, dispatch); }}
            onRemoveSelectedPanels={onRemoveSelectedPanels}
            onToggleTheme={onToggleTheme}
            onCopySelectedPanels={onCopySelectedPanels}
            onPastePanels={onPastePanels}
            isUndoDisabled={isUndoDisabled}
            isRedoDisabled={isRedoDisabled}
            isDeleteDisabled={isDeleteDisabled}
            isCopyDisabled={isCopyDisabled}
            isPasteDisabled={isPasteDisabled}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            canvasBgColor={canvasBgColor}
            canvasFgColor={canvasFgColor}
            canvasBorderRadius={canvasBorderRadius}
            showGrid={showGrid}
            onUpdateCanvasDimensions={onUpdateCanvasDimensions}
            onUpdateCanvasColors={onUpdateCanvasColors}
            onSetCanvasBorderRadius={onSetCanvasBorderRadius}
            onToggleGrid={onToggleGrid}
        />

        <div 
            ref={canvasRef} 
            className={canvasClasses} 
            style={{ 
                width: canvasWidth, height: canvasHeight, 
                backgroundColor: showGrid ? undefined : canvasBgColor, 
                borderColor: canvasFgColor, borderRadius: `${canvasBorderRadius}px`, 
                backgroundImage: showGrid ? `linear-gradient(${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px), linear-gradient(90deg, ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 1px, transparent 1px)` : 'none', 
                backgroundSize: showGrid ? '20px 20px' : 'auto' 
            }} 
            onClick={handleCanvasClick}
            onContextMenu={(e) => {
              e.preventDefault();
              handleCloseContextMenu();
            }}
        >
            {panels.map((panel) => (
                <Panel key={panel.id} panel={panel} isSelected={selectedPanels.includes(panel.id)}
                    onSelect={handlePanelClick} onUpdatePosition={onUpdatePanelPosition}
                    onUpdateDimensions={onUpdatePanelDimensions} onUpdateText={onUpdatePanelText}
                    onUpdateStyle={onUpdatePanelStyle} canvasWidth={canvasWidth} canvasHeight={canvasHeight}
                    canvasFgColor={canvasFgColor} panelRoundedCorners={panelRoundedCorners} theme={theme}
                    onInteractionStart={handlePanelInteractionStart}
                    onEdit={() => { console.warn('Edit not implemented'); }}
                    onContextMenu={handleContextMenu}
                />
            ))}
            
            {guideLines.map((line) => (
                <div key={line.id} className="absolute bg-pink-500 z-[9999]" style={{
                    left: `${line.x1}px`, top: `${line.y1}px`,
                    width: line.orientation === 'vertical' ? '1px' : `${Math.abs(line.x2 - line.x1)}px`,
                    height: line.orientation === 'horizontal' ? '1px' : `${Math.abs(line.y2 - line.y1)}px`,
                }} />
            ))}

            {distanceIndicators.map(indicator => (
                <div key={indicator.id} className="absolute z-[9999] bg-pink-500 text-white text-xs px-1 py-0.5 rounded-sm pointer-events-none" style={indicator.style}>
                    {indicator.value}
                </div>
            ))}

            {contextMenu && (
            <ContextMenu
                x={contextMenu.x}
                y={contextMenu.y}
                theme={theme}
                onClose={handleCloseContextMenu}
                onCopy={() => { onCopySelectedPanels(); handleCloseContextMenu(); }}
                onPaste={() => { onPastePanels(); handleCloseContextMenu(); }}
                onDelete={handleDeleteFromMenu}
                onBringToFront={handleBringToFront}
                onSendToBack={handleSendToBack}
            />
            )}

            <div className={`absolute bottom-0 left-0 w-full h-2 cursor-ns-resize z-50`} onMouseDown={(e) => handleCanvasResizeStart(e, 's')} />
            <div className={`absolute top-0 right-0 h-full w-2 cursor-ew-resize z-50`} onMouseDown={(e) => handleCanvasResizeStart(e, 'e')} />
            <div className={`absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50`} onMouseDown={(e) => handleCanvasResizeStart(e, 'se')} />
        </div>
    </div>
  );
};

export default DrawingCanvas;