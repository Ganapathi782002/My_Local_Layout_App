import React, { useRef, useState, useCallback, useMemo } from 'react';
import { PanelInterface, ShapeType } from '../types';
import { FiEdit, FiX } from 'react-icons/fi';

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
  onEdit: (panelId: string) => void;
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
  onEdit,
  onUpdateStyle,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [editingText, setEditingText] = useState(false);
  const [showEditOverlay, setShowEditOverlay] = useState(false);

  const {
    id, x, y, width, height, zIndex, text, shapeType,
    backgroundColor, borderColor, borderWidth, borderStyle,
    textColor, // Assuming textColor is part of PanelInterface
    borderRadius // Assuming borderRadius is part of PanelInterface
  } = panel;

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
        // Apply directStrokeThickness for consistent border width
        return (<svg width="100%" height="100%" viewBox={heartViewBox} preserveAspectRatio="xMidYMid meet"><path d={heartPathData} fill={currentFillColor} stroke={strokeColor} strokeWidth={directStrokeThickness} strokeLinejoin={svgStrokeLinejoin} /></svg>);
      case 'cloud':
        const cloudPathData = "M15 50 C5 50 5 30 15 30 A10 10 0 0 1 25 20 A15 15 0 0 1 50 20 Q60 5 70 20 A15 15 0 0 1 85 35 Q95 35 85 50 Z";
        const cloudViewBox = "0 0 100 60";
        // Apply directStrokeThickness for consistent border width
        return (<svg width="100%" height="100%" viewBox={cloudViewBox} preserveAspectRatio="xMidYMid meet"><path d={cloudPathData} fill={currentFillColor} stroke={strokeColor} strokeWidth={directStrokeThickness} strokeLinejoin={svgStrokeLinejoin} strokeLinecap={svgStrokeLinecap} /></svg>);
      case 'rectangle':
      case 'textBlock':
      default:
        return null;
    }
  }, [shapeType, width, height, backgroundColor, borderColor, borderWidth]);

  const panelClasses = useMemo(() => {
    let classes = `absolute group flex items-center justify-center cursor-move transition-all duration-100 ease-out`;

    // panelRoundedCorners prop is used here for rectangle/textBlock
    if (shapeType === 'rectangle' || shapeType === 'textBlock') {
      if (panelRoundedCorners) {
        classes += ' rounded-lg'; // This is a general rounding applied by Tailwind
      }
    }

    if (isSelected) {
      classes += ` z-50 ${theme === 'dark' ? 'ring-2 ring-blue-400' : 'ring-2 ring-blue-500'}`;
    } else {
      classes += ` z-20`;
    }
    return classes;
  }, [shapeType, isSelected, panelRoundedCorners, theme]);

  const panelInlineStyles = useMemo(() => {
    const styles: React.CSSProperties = {
      left: x, top: y, width: width, height: height,
      zIndex: isSelected ? 50 : zIndex,
    };
    // Apply div styling ONLY for shapes that are handled by CSS (rectangle, textBlock)
    if (shapeType === 'rectangle' || shapeType === 'textBlock') {
      styles.backgroundColor = backgroundColor;
      styles.borderColor = borderColor;
      styles.borderWidth = borderWidth;
      styles.borderStyle = borderStyle as React.CSSProperties['borderStyle'];
      // Apply borderRadius only for rectangles
      if (shapeType === 'rectangle' && typeof borderRadius === 'number') {
        styles.borderRadius = `${borderRadius}px`;
      }
    }
    return styles;
  }, [x, y, width, height, zIndex, isSelected, backgroundColor, borderColor, borderWidth, borderStyle, shapeType, borderRadius]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (e.target instanceof HTMLTextAreaElement) { return; }
    const target = e.target as HTMLElement;
    if (target.dataset.resizer) {
      onInteractionStart(id, e, 'resize');
    } else if (target.dataset.editIcon) {
      return;
    } else {
      onInteractionStart(id, e, 'drag');
    }
  }, [id, onInteractionStart]);

  const handlePanelClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.resizer || target.dataset.editIcon) {
      return;
    }
    onSelect(id, e);
  }, [id, onSelect]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => { onUpdateText(id, e.target.value); }, [id, onUpdateText]);
  const handleTextareaFocus = useCallback(() => setEditingText(true), []);
  const handleTextareaBlur = useCallback(() => setEditingText(false), []);

  const innerContentStyle: React.CSSProperties = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%',
      position: 'absolute', top: 0, left: 0, pointerEvents: 'none',
      boxSizing: 'border-box',
    };

    if (shapeType === 'textBlock') {
      return { ...baseStyle, padding: '0.5rem' };
    }
    return { ...baseStyle, padding: '0px' };
  }, [shapeType]);

  const textAreaPointerEvents = useMemo(() => {
    return isSelected || editingText ? 'auto' : 'none';
  }, [isSelected, editingText]);

  const showTextArea = useMemo(() => {
    return shapeType === 'textBlock';
  }, [shapeType]);

  const handleEditClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setShowEditOverlay(true);
    onEdit(id);
  }, [id, onEdit]);

  const handleCloseEditOverlay = useCallback(() => {
    setShowEditOverlay(false);
  }, []);

  const editIconPositionClasses = useMemo(() => {
    if (shapeType === 'line') {
      return '-top-3 -left-3';
    }
    return '-top-3 -right-3';
  }, [shapeType]);

  const handleBorderColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateStyle(id, { borderColor: e.target.value });
  }, [id, onUpdateStyle]);

  const handleFillColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateStyle(id, { backgroundColor: e.target.value });
  }, [id, onUpdateStyle]);

  const handleFontColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateStyle(id, { textColor: e.target.value });
  }, [id, onUpdateStyle]);

  const handleBorderRadiusChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    onUpdateStyle(id, { borderRadius: isNaN(value) ? undefined : value });
  }, [id, onUpdateStyle]);

  return (
    <>
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
                color: textColor || canvasFgColor,
                pointerEvents: textAreaPointerEvents,
                boxSizing: 'border-box',
              }}
              value={text}
              onChange={handleTextChange}
              onFocus={handleTextareaFocus}
              onBlur={handleTextareaBlur}
              placeholder={'Click to type'}
              aria-label={`Panel text for ${shapeType} with ID ${id}`}
            />
          </div>
        )}

        {isSelected && (
          <>
            <div
              data-resizer="true"
              className={`absolute -bottom-3 -right-3 w-6 h-6 rounded-full cursor-nwse-resize
                ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-500'}
              `}
            />
            <div
              data-edit-icon="true"
              className={`absolute w-6 h-6 flex items-center justify-center rounded-full cursor-pointer
                ${theme === 'dark' ? 'bg-blue-400 text-white' : 'bg-blue-500 text-white'} z-50
                ${editIconPositionClasses}
              `}
              onClick={handleEditClick}
              title="Edit Panel Properties"
            >
              <FiEdit size={14} />
            </div>
          </>
        )}
      </div>

      {showEditOverlay && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[100]"
          onClick={handleCloseEditOverlay}
        >
          <div
            className={`p-6 rounded-lg shadow-xl w-80 max-w-[90vw] relative
              ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Edit Panel</h3>
            <button
              onClick={handleCloseEditOverlay}
              className={`absolute top-2 right-2 p-1 rounded-full
                ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="Close"
            >
              <FiX size={20} />
            </button>

            <div className="space-y-4">
              {/* Border Color */}
              <div>
                <label htmlFor={`borderColor-${id}`} className="block text-sm font-medium mb-1">
                  Border Color:
                </label>
                <input
                  type="color"
                  id={`borderColor-${id}`}
                  value={borderColor || '#000000'}
                  onChange={handleBorderColorChange}
                  className="w-full h-8"
                />
              </div>

              {/* Fill Color */}
              {(shapeType !== 'line' && shapeType !== 'polyline') && (
                <div>
                  <label htmlFor={`fillColor-${id}`} className="block text-sm font-medium mb-1">
                    Fill Color:
                  </label>
                  <input
                    type="color"
                    id={`fillColor-${id}`}
                    value={backgroundColor || '#FFFFFF'}
                    onChange={handleFillColorChange}
                    className="w-full h-8"
                  />
                </div>
              )}

              {/* Text Content */}
              {showTextArea && (
                <div>
                  <label htmlFor={`textContent-${id}`} className="block text-sm font-medium mb-1">
                    Text Content:
                  </label>
                  <textarea
                    id={`textContent-${id}`}
                    value={text}
                    onChange={handleTextChange}
                    rows={3}
                    className={`w-full p-2 border rounded-md text-sm resize-y
                      ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}
                    `}
                  />
                </div>
              )}

              {/* Font Color */}
              {showTextArea && (
                <div>
                  <label htmlFor={`fontColor-${id}`} className="block text-sm font-medium mb-1">
                    Font Color:
                  </label>
                  <input
                    type="color"
                    id={`fontColor-${id}`}
                    value={textColor || canvasFgColor || '#000000'}
                    onChange={handleFontColorChange}
                    className="w-full h-8"
                  />
                </div>
              )}

              {/* Border Radius for Rectangle */}
              {shapeType === 'rectangle' && (
                <div>
                  <label htmlFor={`borderRadius-${id}`} className="block text-sm font-medium mb-1">
                    Border Radius (px):
                  </label>
                  <input
                    type="number"
                    id={`borderRadius-${id}`}
                    value={borderRadius || 0}
                    onChange={handleBorderRadiusChange}
                    min="0"
                    className={`w-full p-2 border rounded-md text-sm
                      ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}
                    `}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};