import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2, Download, Upload, Save, RotateCcw, RotateCw, Moon, Sun, Copy,
  ClipboardPaste, Square, Circle, Triangle, ArrowRight, Minus as LineIcon,
  Star as StarIcon, Hexagon as HexagonIcon, Type as TypeIcon, Diamond as DiamondIcon,
  ChevronRight as ChevronIcon, Spline as PolylineIcon, Pentagon as PolygonIcon, ChevronDown,
} from 'lucide-react';
import type { ShapeType, PageBackground } from '../types';

interface RibbonProps {
  theme: 'light' | 'dark';
  onAddPanel: (shapeType: ShapeType) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExportConfig: () => void;
  onImportConfig: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPNG: () => void;
  onRemoveSelectedPanels: () => void;
  onToggleTheme: () => void;
  onCopySelectedPanels: () => void;
  onPastePanels: () => void;
  isUndoDisabled: boolean;
  isRedoDisabled: boolean;
  isDeleteDisabled: boolean;
  isCopyDisabled: boolean;
  isPasteDisabled: boolean;
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string;
  canvasFgColor: string;
  canvasBorderRadius: number;
  showGrid: boolean;
  onUpdateCanvasDimensions: (width: number, height: number) => void;
  onUpdateCanvasColors: (bgColor: string, fgColor: string) => void;
  onSetCanvasBorderRadius: (radius: number) => void;
  onToggleGrid: () => void;
  pageBackground: PageBackground;
  onUpdatePageBackground: (settings: Partial<PageBackground>) => void;
}

// Helper component for a single toolbar button
const ActionButton: React.FC<{
  onClick?: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  theme: 'light' | 'dark';
  color?: 'gray' | 'orange' | 'blue' | 'purple' | 'red' | 'yellow' | 'indigo';
  isCopy?: boolean;
  showCopiedTooltip?: boolean;
}> = ({ onClick, disabled, title, children, theme, color = 'gray', isCopy = false, showCopiedTooltip = false }) => {
  const colorStyles = {
    gray: 'bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800',
    orange: 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-800',
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    red: 'bg-red-600 hover:bg-red-700 disabled:bg-red-800',
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    indigo: 'bg-indigo-500 hover:bg-indigo-600',
  };
  const lightColorStyles = {
    gray: 'bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400',
    orange: 'bg-orange-400 hover:bg-orange-500 disabled:bg-orange-200',
    blue: 'bg-blue-500 hover:bg-blue-600',
    purple: 'bg-purple-500 hover:bg-purple-600',
    red: 'bg-red-500 hover:bg-red-600 disabled:bg-red-200',
    yellow: 'bg-yellow-400 hover:bg-yellow-500',
    indigo: 'bg-indigo-500 hover:bg-indigo-600',
  };

  const baseClasses = `p-2 rounded-md transition-colors disabled:cursor-not-allowed relative`;
  const themeClasses = theme === 'dark'
    ? `${colorStyles[color]} text-white`
    : `${lightColorStyles[color]} text-gray-800 disabled:text-gray-400`;

  return (
    <div className="relative">
      <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${themeClasses}`} title={title}>
        {children}
      </button>
      {isCopy && showCopiedTooltip && (
        <div
          className={`absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded-md shadow-lg pointer-events-none ${
            theme === 'dark' ? 'bg-gray-200 text-gray-900' : 'bg-gray-700 text-white'
          }`}
          role="status"
        >
          Copied!
        </div>
      )}
    </div>
  );
};


// Main Ribbon Component
const Ribbon: React.FC<RibbonProps> = (props) => {
  const {
    theme, onAddPanel, onUndo, onRedo, onExportConfig, onImportConfig,
    onExportPNG, onRemoveSelectedPanels, onToggleTheme, onCopySelectedPanels,
    onPastePanels, isUndoDisabled, isRedoDisabled, isDeleteDisabled, isCopyDisabled,
    isPasteDisabled, canvasWidth, canvasHeight, canvasBgColor, canvasFgColor,
    canvasBorderRadius, showGrid, onUpdateCanvasDimensions, onUpdateCanvasColors,
    onSetCanvasBorderRadius, onToggleGrid, pageBackground, onUpdatePageBackground
  } = props;
  
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
  const [isShapesDropdownOpen, setIsShapesDropdownOpen] = useState(false);
  const shapesButtonRef = useRef<HTMLButtonElement>(null);
  const shapesDropdownRef = useRef<HTMLDivElement>(null);

  const handleCopyClick = () => {
    if (isCopyDisabled) return;
    onCopySelectedPanels();
    setShowCopiedTooltip(true);
    setTimeout(() => setShowCopiedTooltip(false), 1500);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isShapesDropdownOpen &&
        shapesButtonRef.current && !shapesButtonRef.current.contains(event.target as Node) &&
        shapesDropdownRef.current && !shapesDropdownRef.current.contains(event.target as Node)
      ) {
        setIsShapesDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isShapesDropdownOpen]);
  
  const shapeMenuItems: Array<{
    type: ShapeType;
    label: string;
    Icon: React.ElementType;
  }> = [
    { type: "rectangle", label: "Rectangle", Icon: Square },
    { type: "circle", label: "Circle", Icon: Circle },
    { type: "textBlock", label: "Text", Icon: TypeIcon },
    { type: "triangle", label: "Triangle", Icon: Triangle },
    { type: "line", label: "Line", Icon: LineIcon },
    { type: "arrow", label: "Arrow", Icon: ArrowRight },
    { type: "star", label: "Star", Icon: StarIcon },
    { type: "polygon", label: "Polygon", Icon: PolygonIcon },
    { type: "polyline", label: "Polyline", Icon: PolylineIcon },
    { type: "hexagon", label: "Hexagon", Icon: HexagonIcon },
    { type: "diamond", label: "Diamond", Icon: DiamondIcon },
    { type: "chevron", label: "Chevron", Icon: ChevronIcon },
  ];

  const mainBg = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const mainBorder = theme === 'dark' ? 'border-gray-700' : 'border-gray-600';
  const groupLabelText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const labelText = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const inputBg = theme === 'dark' ? 'bg-gray-900' : 'bg-white';
  const inputBorder = theme === 'dark' ? 'border-gray-700' : 'border-gray-300';
  const inputText = theme === 'dark' ? 'text-gray-200' : 'text-gray-900'; // Define text color for inputs
  const focusRing = 'focus:ring-2 focus:ring-blue-500';

  const Separator = () => <div className={`h-12 self-center border-l ${mainBorder}`}></div>;

  return (
    <div className={`w-full max-w-7xl mx-auto p-2 rounded-lg shadow-md mb-6 ${mainBg} border ${mainBorder}`}>
        <div className="flex flex-wrap items-start gap-4">
            
            {/* --- Group 1: Shapes Pane --- */}
            <div className="flex flex-col items-center">
              <div className="relative">
                  <button
                      ref={shapesButtonRef}
                      onClick={() => setIsShapesDropdownOpen(!isShapesDropdownOpen)}
                      className={`flex items-center p-2  rounded-md transition-colors text-white ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}
                      title="Add Shape"
                  >
                      <Square size={18} />
                      <span className="ml-2 mr-1 text-sm font-semibold">Insert</span>
                      <ChevronDown size={16} className={`transition-transform duration-200 ${isShapesDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isShapesDropdownOpen && (
                      <div
                          ref={shapesDropdownRef}
                          className={`absolute top-full left-0 mt-2 w-72 max-h-96 overflow-y-auto p-2 rounded-md shadow-xl z-[80] border ${mainBg} ${mainBorder} grid grid-cols-3 gap-2`}
                      >
                          {shapeMenuItems.map(({ type, label, Icon }) => (
                              <button
                                  key={type}
                                  onClick={() => { onAddPanel(type); setIsShapesDropdownOpen(false); }}
                                  title={label}
                                  className={`flex flex-col items-center justify-center p-3 rounded transition-colors h-20 ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-200 hover:text-blue-600'}`}
                              >
                                  <Icon size={28} className="mb-1" />
                                  <span className="text-xs text-center block truncate w-full">{label}</span>
                              </button>
                          ))}
                      </div>
                  )}
              </div>
              <span className={`text-xs mt-2 ${groupLabelText}`}>Shapes Pane</span>
            </div>

            <Separator />
            
            {/* --- Group 2: Canvas Pane --- */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                      <label className={`text-xs ${labelText}`}>W:</label>
                      <input type="number" value={canvasWidth} onChange={(e) => onUpdateCanvasDimensions(parseInt(e.target.value, 10) || 0, canvasHeight)} className={`w-16 p-1 text-sm rounded border ${inputBorder} ${inputBg} ${inputText} ${focusRing} outline-none`} title="Canvas Width" />
                      <label className={`text-xs ${labelText} ml-1`}>H:</label>
                      <input type="number" value={canvasHeight} onChange={(e) => onUpdateCanvasDimensions(canvasWidth, parseInt(e.target.value, 10) || 0)} className={`w-16 p-1 text-sm rounded border ${inputBorder} ${inputBg} ${inputText} ${focusRing} outline-none`} title="Canvas Height" />
                  </div>
                  <div className="flex items-center gap-2">
                      <input type="color" value={canvasBgColor} onChange={(e) => onUpdateCanvasColors(e.target.value, canvasFgColor)} className="w-6 h-6 p-0 border-none rounded cursor-pointer" title="Background Color" />
                      <input type="color" value={canvasFgColor} onChange={(e) => onUpdateCanvasColors(canvasBgColor, e.target.value)} className="w-6 h-6 p-0 border-none rounded cursor-pointer" title="Border Color" />
                  </div>
                  <div className="flex items-center gap-1">
                      <label className={`text-xs ${labelText}`}>Radius:</label>
                      <input type="number" value={canvasBorderRadius} onChange={(e) => onSetCanvasBorderRadius(parseInt(e.target.value, 10) || 0)} className={`w-14 p-1 text-sm rounded border ${inputBorder} ${inputBg} ${inputText} ${focusRing} outline-none`} title="Canvas Border Radius" min="0" max="100" />
                  </div>
                  <div className="flex items-center gap-2">
                      <label className={`text-sm ${labelText}`}>Grid</label>
                      <label className="inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={showGrid} onChange={onToggleGrid} />
                          <div className={`relative w-9 h-5 rounded-full peer-focus:outline-none ${focusRing} ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${theme === 'dark' ? 'peer-checked:bg-blue-600' : 'peer-checked:bg-blue-600'}`}></div>
                      </label>
                  </div>
              </div>
              <span className={`text-xs mt-2 ${groupLabelText}`}>Canvas Pane</span>
            </div>

            <Separator />

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-4">
                  {/* Type Selector */}
                  <div className="flex flex-col">
                      <label className={`text-xs mb-1 ${labelText}`}>Type</label>
                      <select 
                        value={pageBackground.type} 
                        onChange={(e) => onUpdatePageBackground({ type: e.target.value as 'solid' | 'gradient' })}
                        className={`p-1 text-sm rounded border ${inputBorder} ${inputBg} ${inputText} ${focusRing} outline-none`}
                      >
                          <option value="solid">Solid</option>
                          <option value="gradient">Gradient</option>
                      </select>
                  </div>
                  {/* Color Pickers */}
                  <div className="flex flex-col">
                      <label className={`text-xs mb-1 ${labelText}`}>
                        {pageBackground.type === 'solid' ? 'Color' : 'Color 1'}
                      </label>
                      <input type="color" value={pageBackground.color1} onChange={(e) => onUpdatePageBackground({ color1: e.target.value })} className="w-6 h-6 p-0 border-none rounded cursor-pointer" title="Background Color 1" />
                  </div>
                  {pageBackground.type === 'gradient' && (
                    <>
                      <div className="flex flex-col">
                        <label className={`text-xs mb-1 ${labelText}`}>Color 2</label>
                        <input type="color" value={pageBackground.color2} onChange={(e) => onUpdatePageBackground({ color2: e.target.value })} className="w-6 h-6 p-0 border-none rounded cursor-pointer" title="Background Color 2" />
                      </div>
                      <div className="flex flex-col">
                        <label className={`text-xs mb-1 ${labelText}`}>Angle</label>
                        <input type="number" value={pageBackground.angle} onChange={(e) => onUpdatePageBackground({ angle: parseInt(e.target.value, 10) || 0 })} className={`w-16 p-1 text-sm rounded border ${inputBorder} ${inputBg} ${inputText} ${focusRing} outline-none`} title="Gradient Angle" />
                      </div>
                    </>
                  )}
              </div>
              <span className={`text-xs mt-2 ${groupLabelText}`}>Page Background</span>
            </div>

            <Separator />

            {/* --- Group 3: Quick Access toolbar --- */}
            <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                    <ActionButton onClick={onUndo} disabled={isUndoDisabled} title="Undo (Ctrl+Z)" theme={theme}><RotateCcw size={18} /></ActionButton>
                    <ActionButton onClick={onRedo} disabled={isRedoDisabled} title="Redo (Ctrl+Y)" theme={theme}><RotateCw size={18} /></ActionButton>
                    <ActionButton onClick={handleCopyClick} disabled={isCopyDisabled} title="Copy (Ctrl+C)" theme={theme} color="orange" isCopy={true} showCopiedTooltip={showCopiedTooltip}><Copy size={18} /></ActionButton>
                    <ActionButton onClick={onPastePanels} disabled={isPasteDisabled} title="Paste (Ctrl+V)" theme={theme} color="orange"><ClipboardPaste size={18} /></ActionButton>
                    <ActionButton onClick={onRemoveSelectedPanels} disabled={isDeleteDisabled} title="Delete" theme={theme} color="red"><Trash2 size={18} /></ActionButton>
                </div>
                <span className={`text-xs mt-2 ${groupLabelText}`}>Quick Access</span>
            </div>
            
            <div className="flex-grow"></div>

            {/* --- Group 4: File & View --- */}
            <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                    <ActionButton onClick={onExportConfig} title="Save Layout (JSON)" theme={theme} color="blue"><Save size={18} /></ActionButton>
                    <label className={`p-2 rounded-md transition-colors cursor-pointer ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`} title="Load Layout (JSON)">
                        <Upload size={18} />
                        <input type="file" accept=".json" onChange={onImportConfig} className="hidden" />
                    </label>
                    <ActionButton onClick={onExportPNG} title="Export as PNG" theme={theme} color="purple"><Download size={18} /></ActionButton>
                    <ActionButton onClick={onToggleTheme} title="Toggle Theme" theme={theme} color={theme === 'dark' ? 'yellow' : 'indigo'}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </ActionButton>
                </div>
                <span className={`text-xs mt-2 ${groupLabelText}`}>File & View</span>
            </div>
        </div>
    </div>
  );
};

export default Ribbon;