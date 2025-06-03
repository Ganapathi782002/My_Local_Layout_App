import React, { useRef, useState, useCallback, useMemo } from 'react';
import { PanelInterface } from '../types';

interface PanelProps {
  panel: PanelInterface;
  isSelected: boolean;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateDimensions: (id: string, width: number, height: number) => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdateStyle: (id: string, styles: Partial<Omit<PanelInterface, 'id' | 'x' | 'y' | 'width' | 'height' | 'zIndex' | 'text' | 'shapeType'>>) => void;
  canvasWidth: number;
  canvasHeight: number;
  canvasFgColor: string;
  panelRoundedCorners: boolean; // RENAMED: from roundedCorners to panelRoundedCorners
  theme: 'light' | 'dark';
  onInteractionStart: (panelId: string, event: React.MouseEvent, type: 'drag' | 'resize') => void;
}

export const Panel: React.FC<PanelProps> = ({
  panel,
  isSelected,
  onSelect,
  onUpdatePosition,
  onUpdateDimensions,
  onUpdateText,
  onUpdateStyle,
  canvasWidth,
  canvasHeight,
  canvasFgColor,
  panelRoundedCorners, // RENAMED PROP
  theme,
  onInteractionStart,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [editingText, setEditingText] = useState(false);

  const panelClasses = useMemo(() => {
    let classes = `absolute group flex items-center justify-center cursor-move transition-all duration-100 ease-out`;

    switch (panel.shapeType) {
      case 'circle':
        classes += ' rounded-full';
        break;
      case 'rectangle':
      default:
        // Use panelRoundedCorners here for rectangles/text blocks
        if (panelRoundedCorners) {
          classes += ' rounded-lg';
        }
        break;
    }

    if (isSelected) {
      classes += ` z-50 ${theme === 'dark' ? 'ring-2 ring-blue-400' : 'ring-2 ring-blue-500'}`;
    } else {
      classes += ' z-20';
    }

    return classes;
  }, [panel.shapeType, isSelected, panelRoundedCorners, theme]); // DEPENDENCY UPDATED

  const panelInlineStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      left: panel.x,
      top: panel.y,
      width: panel.width,
      height: panel.height,
      zIndex: isSelected ? 50 : panel.zIndex,
      backgroundColor: panel.backgroundColor,
      borderColor: panel.borderColor,
      borderWidth: panel.borderWidth,
      borderStyle: panel.borderStyle,
      color: canvasFgColor,
    };

    return styles;
  }, [panel, isSelected, canvasFgColor]);


  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;

    if (e.target instanceof HTMLTextAreaElement) {
        setEditingText(true);
        return;
    }

    // Delegate interaction start to DrawingCanvas
    const target = e.target as HTMLElement;
    if (target.dataset.resizer) {
        onInteractionStart(panel.id, e, 'resize');
    } else {
        onInteractionStart(panel.id, e, 'drag');
    }
  }, [panel.id, onInteractionStart]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateText(panel.id, e.target.value);
  }, [panel.id, onUpdateText]);

  const handleTextareaFocus = useCallback(() => {
    setEditingText(true);
  }, []);

  const handleTextareaBlur = useCallback(() => {
    setEditingText(false);
    // You might want to save/update text on blur if not already handled by onUpdateText
    // If the text is empty after blur and it's not a new panel, you could revert to placeholder or default
    // onUpdateText(panel.id, panel.text); // This line is likely redundant if onChange handles updates
  }, []); // Removed panel.id, panel.text, onUpdateText, panel.shapeType as they are not used in blur logic itself, only in change

  const innerContentStyle: React.CSSProperties = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      padding: panel.shapeType === 'circle' ? '10%' : '0px',
    };

    return baseStyle;
  }, [panel.shapeType]);


  return (
    <div
      ref={panelRef}
      className={panelClasses}
      style={panelInlineStyles}
      onMouseDown={handleMouseDown}
      data-panel-id={panel.id}
    >
      <div style={innerContentStyle}>
        <textarea
          className={`w-full h-full text-center p-2 outline-none resize-none font-mono text-sm leading-tight
            ${theme === 'dark' ? 'bg-transparent text-white' : 'bg-transparent text-gray-900'}
            ${isSelected || editingText ? 'pointer-events-auto' : 'pointer-events-none'}
            ${!isSelected && !editingText && panel.text.trim() === '' ? 'text-transparent' : ''}
          `}
          style={{
            color: canvasFgColor,
            overflowY: 'auto',
            cursor: 'text',
            // Apply border radius for rectangles based on panelRoundedCorners
            borderRadius: panelRoundedCorners && (panel.shapeType === 'rectangle' || panel.shapeType === 'textBlock') ? '0.5rem' : '0',
            padding: panel.shapeType === 'circle' ? '10%' : '0.5rem',
            opacity: 1,
          }}
          value={panel.text}
          onChange={handleTextChange}
          onFocus={handleTextareaFocus}
          onBlur={handleTextareaBlur}
          placeholder={'Click to type'}
        />
      </div>

      {isSelected && (
        <div
          data-resizer="true"
          className={`absolute -bottom-3 -right-3 w-6 h-6 rounded-full cursor-nwse-resize
            ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}
          `}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
};