import React, { useRef, useState, useCallback, useMemo } from 'react';
import { PanelInterface, ShapeType } from '../types';

interface PanelProps {
  panel: PanelInterface;
  isSelected: boolean;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onUpdatePosition: (id: string, x: number, y: number) => void;
  onUpdateDimensions: (id: string, width: number, height: number) => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdateStyle: (
    id: string,
    styles: Partial<Omit<PanelInterface, 'id' | 'x' | 'y' | 'width' | 'height' | 'zIndex' | 'text' | 'shapeType'>>
  ) => void;
  canvasWidth: number;
  canvasHeight: number;
  canvasFgColor: string;
  panelRoundedCorners: boolean;
  theme: 'light' | 'dark';
  onInteractionStart: (panelId: string, event: React.MouseEvent, type: 'drag' | 'resize') => void;
}

export const Panel: React.FC<PanelProps> = ({
  panel,
  isSelected,
  onSelect,
  onUpdateText,
  canvasFgColor,
  panelRoundedCorners,
  theme,
  onInteractionStart,
  // canvasWidth, // Not used directly in this component's logic body
  // canvasHeight, // Not used directly in this component's logic body
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [editingText, setEditingText] = useState(false);

  const {
    id, x, y, width, height, zIndex, text, shapeType,
    backgroundColor, borderColor, borderWidth, borderStyle
  } = panel;

  // 1. Define renderShape FIRST
  const renderShape = useCallback(() => {
    if (width <= 0 || height <= 0) { return null; }

    const svgStrokeLinejoin: "miter" | "round" | "bevel" = "round";
    const svgStrokeLinecap: "butt" | "round" | "square" = "round";
    const strokeColor = borderColor;
    const currentFillColor = backgroundColor;
    const directStrokeThickness = borderWidth;

    switch (shapeType) {
      case 'triangle':
        const halfBorderTri = directStrokeThickness > 0 ? directStrokeThickness / 2 : 0;
        const pointsTri = `${width / 2},${halfBorderTri} ${halfBorderTri},${height - halfBorderTri} ${width - halfBorderTri},${height - halfBorderTri}`;
        return (<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><polygon points={pointsTri} fill={currentFillColor} stroke={strokeColor} strokeWidth={directStrokeThickness} strokeLinejoin={svgStrokeLinejoin} /></svg>);
      case 'line':
        const yPositionLine = height / 2;
        return (<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><line x1={0} y1={yPositionLine} x2={width} y2={yPositionLine} stroke={strokeColor} strokeWidth={directStrokeThickness} /></svg>);
      case 'circle':
        const cxCircle = width / 2; const cyCircle = height / 2; const radiusCircle = Math.max(0, (Math.min(width, height) / 2) - (directStrokeThickness > 0 ? directStrokeThickness / 2 : 0)); if (radiusCircle <= 0) return null;
        return (<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"><circle cx={cxCircle} cy={cyCircle} r={radiusCircle} fill={currentFillColor} stroke={strokeColor} strokeWidth={directStrokeThickness} /></svg>);
      case 'polygon': // Pentagon
        const numSidesPentagon = 5; const centerXPentagon = width / 2; const centerYPentagon = height / 2; const RPentagon = Math.max(0, (Math.min(width, height) / 2) - (directStrokeThickness > 0 ? directStrokeThickness / 2 : 0)); if (RPentagon <= 0) return null; const angleOffsetPentagon = -Math.PI / 2; let polygonPointsPentagon = ""; for (let i = 0; i < numSidesPentagon; i++) { const angle = (i / numSidesPentagon) * 2 * Math.PI + angleOffsetPentagon; polygonPointsPentagon += `${centerXPentagon + RPentagon * Math.cos(angle)},${centerYPentagon + RPentagon * Math.sin(angle)} `; }
        return (<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"><polygon points={polygonPointsPentagon.trim()} fill={currentFillColor} stroke={strokeColor} strokeWidth={directStrokeThickness} strokeLinejoin={svgStrokeLinejoin} /></svg>);
      case 'hexagon':
        const numSidesHexagon = 6; const centerXHexagon = width / 2; const centerYHexagon = height / 2; const RHexagon = Math.max(0, (Math.min(width, height) / 2) - (directStrokeThickness > 0 ? directStrokeThickness / 2 : 0)); if (RHexagon <= 0) return null; let polygonPointsHexagon = ""; for (let i = 0; i < numSidesHexagon; i++) { const angle = (i / numSidesHexagon) * 2 * Math.PI; polygonPointsHexagon += `${centerXHexagon + RHexagon * Math.cos(angle)},${centerYHexagon + RHexagon * Math.sin(angle)} `; }
        return (<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"><polygon points={polygonPointsHexagon.trim()} fill={currentFillColor} stroke={strokeColor} strokeWidth={directStrokeThickness} strokeLinejoin={svgStrokeLinejoin} /></svg>);
      case 'star':
        const numPointsStar = 5; const totalVerticesStar = numPointsStar * 2; const starcenterX = width / 2; const starcenterY = height / 2; const outerRStar = Math.max(0, (Math.min(width, height) / 2) - (directStrokeThickness > 0 ? directStrokeThickness / 2 : 0)); const innerRStar = outerRStar * 0.5; if (outerRStar <= 0) return null; const starangleOffset = -Math.PI / 2; let starPoints = ""; for (let i = 0; i < totalVerticesStar; i++) { const currentRadius = (i % 2 === 0) ? outerRStar : innerRStar; const angle = (i / totalVerticesStar) * 2 * Math.PI + starangleOffset; starPoints += `${starcenterX + currentRadius * Math.cos(angle)},${starcenterY + currentRadius * Math.sin(angle)} `; }
        return (<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"><polygon points={starPoints.trim()} fill={currentFillColor} stroke={strokeColor} strokeWidth={directStrokeThickness} strokeLinejoin={svgStrokeLinejoin} /></svg>);
      case 'arrow':
        const arrowHeadWidth = Math.min(width * 0.3, height * 0.6, 20); const arrowHeadLength = Math.min(width * 0.25, 25); if (width - arrowHeadLength <= 0) return null; const shaftStrokeThickness = Math.max(1, Math.min(directStrokeThickness, height * 0.3, 8)); const lineYArrow = height / 2; const arrowPoints = `${width - (directStrokeThickness / 2)},${height / 2} ${width - arrowHeadLength},${(height / 2) - (arrowHeadWidth / 2)} ${width - arrowHeadLength},${(height / 2) + (arrowHeadWidth / 2)}`;
        return (<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><line x1={directStrokeThickness / 2} y1={lineYArrow} x2={width - arrowHeadLength} y2={lineYArrow} stroke={strokeColor} strokeWidth={shaftStrokeThickness} /><polygon points={arrowPoints.trim()} fill={strokeColor} stroke={strokeColor} strokeWidth={1} strokeLinejoin={svgStrokeLinejoin} /></svg>);
      case 'polyline':
        const insetPoly = directStrokeThickness > 0 ? directStrokeThickness / 2 : 0; const poly_line_points = `${insetPoly},${insetPoly} ${width / 3},${height - insetPoly} ${(width / 3) * 2},${insetPoly} ${width - insetPoly},${height - insetPoly}`;
        return (<svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><polyline points={poly_line_points.trim()} fill="none" stroke={strokeColor} strokeWidth={directStrokeThickness} strokeLinecap={svgStrokeLinecap} strokeLinejoin={svgStrokeLinejoin} /></svg>);
      case 'heart':
        const heartPathData = "M16,28.261C7.623,21.934,0,15.528,0,8.354A8.354,8.354,0,0,1,8.354,0C12.9,0,16,3.758,16,3.758S19.1,0,23.646,0A8.354,8.354,0,0,1,32,8.354C32,15.528,24.377,21.934,16,28.261Z";
        const heartViewBox = "0 0 32 29";
        return (<svg width="100%" height="100%" viewBox={heartViewBox} preserveAspectRatio="xMidYMid meet"><path d={heartPathData} fill={currentFillColor} stroke={strokeColor} strokeWidth={directStrokeThickness > 0 ? "1" : "0"} strokeLinejoin={svgStrokeLinejoin} /></svg>);
      case 'cloud':
        const cloudPathData = "M15 50 C5 50 5 30 15 30 A10 10 0 0 1 25 20 A15 15 0 0 1 50 20 Q60 5 70 20 A15 15 0 0 1 85 35 Q95 35 85 50 Z";
        const cloudViewBox = "0 0 100 60";
        return (<svg width="100%" height="100%" viewBox={cloudViewBox} preserveAspectRatio="xMidYMid meet"><path d={cloudPathData} fill={currentFillColor} stroke={strokeColor} strokeWidth={directStrokeThickness > 0 ? "1.5" : "0"} strokeLinejoin={svgStrokeLinejoin} strokeLinecap={svgStrokeLinecap} /></svg>);
      // 'rectangle' and 'textBlock' are styled by the main div, so renderShape returns null for them.
      case 'rectangle':
      case 'textBlock':
      default:
        return null;
    }
  }, [shapeType, width, height, backgroundColor, borderColor, borderWidth]);

  // panelClasses defined AFTER renderShape
  const panelClasses = useMemo(() => {
    let classes = `absolute group flex items-center justify-center cursor-move transition-all duration-100 ease-out`;
    
    if (shapeType === 'rectangle' || shapeType === 'textBlock') {
      if (panelRoundedCorners) { // panelRoundedCorners prop is used here
        classes += ' rounded-lg';
      }
    }
    // No special class for SVG 'circle' like 'rounded-full' on the main div

    if (isSelected) {
      classes += ` z-50 ${theme === 'dark' ? 'ring-2 ring-blue-400' : 'ring-2 ring-blue-500'}`;
    } else {
      classes += ` z-20`;
    }
    return classes;
  }, [shapeType, isSelected, panelRoundedCorners, theme]); // panelRoundedCorners is a dependency

  // panelInlineStyles defined AFTER renderShape
  const panelInlineStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      left: x, top: y, width: width, height: height,
      zIndex: isSelected ? 50 : zIndex,
    };
    // Apply div styling ONLY for shapes that renderShape returns null for (rectangle, textBlock)
    if (renderShape() === null) { 
      styles.backgroundColor = backgroundColor;
      styles.borderColor = borderColor;
      styles.borderWidth = borderWidth;
      styles.borderStyle = borderStyle as React.CSSProperties['borderStyle'];
    }
    // For SVG shapes, the main div can be transparent or have no explicit background/border from here
    return styles;
  }, [x, y, width, height, zIndex, isSelected, backgroundColor, borderColor, borderWidth, borderStyle, shapeType, renderShape]); // Added renderShape & shapeType

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.target instanceof HTMLTextAreaElement) { return; }
    const target = e.target as HTMLElement;
    if (target.dataset.resizer) {
      onInteractionStart(id, e, 'resize');
    } else {
      onInteractionStart(id, e, 'drag');
    }
  }, [id, onInteractionStart]);

  const handlePanelClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.resizer) { return; }
    onSelect(id, e);
  }, [id, onSelect]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => { onUpdateText(id, e.target.value); }, [id, onUpdateText]);
  const handleTextareaFocus = useCallback(() => setEditingText(true), []);
  const handleTextareaBlur = useCallback(() => setEditingText(false), []);
  
  const innerContentStyle: React.CSSProperties = useMemo(() => {
    let paddingConfig: string | { paddingTop?: string, paddingRight?: string, paddingBottom?: string, paddingLeft?: string } = '0px'; // Default to 0px padding

    // Only apply specific padding if it's a textBlock, as other shapes won't show text area
    if (shapeType === 'textBlock') {
      paddingConfig = '0.5rem'; // Standard padding for textBlock
    }
    // For other shapes where showTextArea is false, this padding won't be visually relevant
    // for the textarea, but the div will still exist if showTextArea was true.
    // Since showTextArea is now strictly for textBlock, other cases are less critical here.

    const baseStyle: React.CSSProperties = {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%',
      position: 'absolute', top: 0, left: 0, pointerEvents: 'none',
      boxSizing: 'border-box',
    };

    if (typeof paddingConfig === 'string') {
      return { ...baseStyle, padding: paddingConfig };
    } else { // Should not be hit if only textBlock gets non-string padding & others are 0px string
      return {
        ...baseStyle,
      };
    }
  }, [shapeType, width, height, borderWidth]); // Keep deps for potential future text on other shapes

  const textAreaPointerEvents = useMemo(() => {
    return isSelected || editingText ? 'auto' : 'none';
  }, [isSelected, editingText]);

  // Text only shown for 'textBlock'
  const showTextArea = useMemo(() => {
    return shapeType === 'textBlock';
  }, [shapeType]);

  return (
    <div
      ref={panelRef}
      className={panelClasses}
      style={panelInlineStyles}
      onMouseDown={handleMouseDown}
      onClick={handlePanelClick}
      data-panel-id={id}
    >
      <div style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, pointerEvents: 'none' }}>
        {renderShape()}
      </div>

      {showTextArea && (
        <div style={{...innerContentStyle, pointerEvents: 'none' }}>
          <textarea
            className={`w-full h-full text-center outline-none resize-none font-mono text-sm leading-tight bg-transparent
              ${!isSelected && !editingText && text.trim() === '' ? 'placeholder-gray-500 dark:placeholder-gray-400' : ''}
            `}
            style={{
              color: canvasFgColor,
              pointerEvents: textAreaPointerEvents,
              boxSizing: 'border-box',
            }}
            value={text}
            onChange={handleTextChange}
            onFocus={handleTextareaFocus}
            onBlur={handleTextareaBlur}
            placeholder={'Click to type'}
          />
        </div>
      )}

      {isSelected && (
        <div
          data-resizer="true"
          className={`absolute -bottom-3 -right-3 w-6 h-6 rounded-full cursor-nwse-resize
            ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}
          `}
        />
      )}
    </div>
  );
};