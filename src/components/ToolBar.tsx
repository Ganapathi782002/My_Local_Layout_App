import React, { useState, useRef, useEffect } from "react";
import {
  Trash2,
  Download,
  Upload,
  Save,
  RotateCcw,
  RotateCw,
  Moon,
  Sun,
  Copy,
  ClipboardPaste,
  Square,
  Circle,
  Triangle,
  ArrowRight,
  Minus as LineIcon,
  Star as StarIcon,
  Heart as HeartIcon,
  Cloud as CloudIcon,
  Hexagon as HexagonIcon,
  Type as TypeIcon,
  Spline as PolylineIcon,
  Pentagon as PolygonIcon,
  ChevronDown,
} from "lucide-react";
import type { ShapeType } from "../types";

interface ToolbarProps {
  theme: "light" | "dark";
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
}

// Define the shapes for the dropdown menu
// Ensure 'type' matches your ShapeType values from types.ts
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
  { type: "polygon", label: "Polygon", Icon: PolygonIcon }, // This will add a specific polygon (e.g. pentagon), customize as needed
  { type: "polyline", label: "Polyline", Icon: PolylineIcon },
  { type: "heart", label: "Heart", Icon: HeartIcon },
  { type: "cloud", label: "Cloud", Icon: CloudIcon },
  { type: "hexagon", label: "Hexagon", Icon: HexagonIcon },
];

const Toolbar: React.FC<ToolbarProps> = ({
  theme,
  onAddPanel,
  onUndo,
  onRedo,
  onExportConfig,
  onImportConfig,
  onExportPNG,
  onRemoveSelectedPanels,
  onToggleTheme,
  onCopySelectedPanels,
  onPastePanels,
  isUndoDisabled,
  isRedoDisabled,
  isCopyDisabled,
  isPasteDisabled,
  isDeleteDisabled,
}) => {
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
  const [isShapesDropdownOpen, setIsShapesDropdownOpen] = useState(false);
  const shapesButtonRef = useRef<HTMLButtonElement>(null);
  const shapesDropdownRef = useRef<HTMLDivElement>(null);

  const handleCopyClick = () => {
    if (isCopyDisabled) return;
    onCopySelectedPanels();
    setShowCopiedTooltip(true);
    setTimeout(() => {
      setShowCopiedTooltip(false);
    }, 1500);
  };

  // Effect to handle clicks outside the shapes dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isShapesDropdownOpen &&
        shapesButtonRef.current &&
        !shapesButtonRef.current.contains(event.target as Node) &&
        shapesDropdownRef.current &&
        !shapesDropdownRef.current.contains(event.target as Node)
      ) {
        setIsShapesDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isShapesDropdownOpen]);

  return (
    <div className="flex flex-col items-center mb-8 w-full">
      <h1
        className={`text-2xl font-bold mb-4 ${
          theme === "dark" ? "text-white" : "text-gray-900"
        } text-center`}
      >
        Layout Designer
      </h1>

      <div className="flex flex-wrap gap-2 md:gap-3 justify-center items-center"> {/* Reduced gap slightly */}
        {/* Shapes Dropdown Button */}
        <div className="relative">
          <button
            ref={shapesButtonRef}
            onClick={() => setIsShapesDropdownOpen(!isShapesDropdownOpen)}
            className={`flex items-center p-2 rounded-lg ${
              theme === "dark"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-green-500 hover:bg-green-600"
            } text-white transition-colors`}
            title="Add Shape"
          >
            {/* You can use a dedicated Shapes icon from Lucide if available, or an SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/></svg>
            <span className="ml-2 mr-1 text-sm">Shapes</span>
            <ChevronDown size={16} className={`transition-transform duration-200 ${isShapesDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isShapesDropdownOpen && (
            <div
              ref={shapesDropdownRef}
              className={`absolute top-full left-0 mt-2 w-72 max-h-96 overflow-y-auto p-2 rounded-md shadow-xl z-50 ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700" // Darker background for dropdown
                  : "bg-white border-gray-300"
              } border grid grid-cols-3 gap-2`} // Using 3 columns for a more compact grid
            >
              {shapeMenuItems.map(({ type, label, Icon }) => (
                <button
                  key={type}
                  onClick={() => {
                    onAddPanel(type);
                    setIsShapesDropdownOpen(false);
                  }}
                  title={label}
                  className={`flex flex-col items-center justify-center p-3 rounded transition-colors h-20 ${ // Fixed height for items
                    theme === "dark"
                      ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                      : "text-gray-700 hover:bg-gray-200 hover:text-blue-600"
                  }`}
                >
                  <Icon size={28} className="mb-1" /> {/* Slightly larger icon */}
                  <span className="text-xs text-center block truncate w-full">{label}</span> {/* Ensure text doesn't overflow too much */}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Undo Button */}
        <button
          onClick={onUndo}
          disabled={isUndoDisabled}
          className={`p-2 rounded-lg ${
            theme === "dark"
              ? "bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800"
              : "bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300"
          } text-white transition-colors disabled:cursor-not-allowed`}
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw size={20} />
        </button>

        {/* Redo Button */}
        <button
          onClick={onRedo}
          disabled={isRedoDisabled}
          className={`p-2 rounded-lg ${
            theme === "dark"
              ? "bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800"
              : "bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300"
          } text-white transition-colors disabled:cursor-not-allowed`}
          title="Redo (Ctrl+Y)"
        >
          <RotateCw size={20} />
        </button>

        {/* Copy button */}
        <div className="relative">
          <button
            onClick={handleCopyClick}
            disabled={isCopyDisabled}
            className={`p-2 rounded-lg ${
              theme === "dark"
                ? "bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800"
                : "bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300"
            } text-white transition-colors disabled:cursor-not-allowed`}
            title="Copy selected panel(s) (Ctrl+C)"
          >
            <Copy size={20} />
          </button>
          {showCopiedTooltip && (
            <div
              className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded-md shadow-lg ${
                theme === "dark" ? "bg-gray-200 text-gray-900" : "bg-gray-700 text-white"
              }`}
              role="status"
            >
              Copied!
            </div>
          )}
        </div>

        {/* Paste Button */}
        <button
          onClick={onPastePanels}
          disabled={isPasteDisabled}
          className={`p-2 rounded-lg ${
            theme === "dark"
              ? "bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800"
              : "bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300"
          } text-white transition-colors disabled:cursor-not-allowed`}
          title="Paste panel(s) (Ctrl+V)"
        >
          <ClipboardPaste size={20} />
        </button>

        {/* Save Config Button (Export JSON) */}
        <button
          onClick={onExportConfig}
          className={`p-2 rounded-lg ${
            theme === "dark"
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white transition-colors`}
          title="Save Layout (JSON)"
        >
          <Save size={20} />
        </button>

        {/* Import Config Button (Load JSON) */}
        <label
          className={`p-2 rounded-lg ${
            theme === "dark"
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white transition-colors cursor-pointer`}
          title="Load Layout (JSON)"
        >
          <Upload size={20} />
          <input
            type="file"
            accept=".json"
            onChange={onImportConfig}
            className="hidden"
          />
        </label>

        {/* Export to PNG Button */}
        <button
          onClick={onExportPNG}
          className={`p-2 rounded-lg ${
            theme === "dark"
              ? "bg-purple-600 hover:bg-purple-700"
              : "bg-purple-500 hover:bg-purple-600"
          } text-white transition-colors`}
          title="Export as PNG"
        >
          <Download size={20} />
        </button>

        {/* Delete Selected Panels Button */}
        <button
          onClick={onRemoveSelectedPanels}
          disabled={isDeleteDisabled}
          className={`p-2 rounded-lg ${
            theme === "dark"
              ? "bg-red-600 hover:bg-red-700 disabled:bg-red-800"
              : "bg-red-500 hover:bg-red-600 disabled:bg-red-300"
          } text-white transition-colors disabled:cursor-not-allowed`}
          title={
            isDeleteDisabled ? "No panel selected" : "Delete selected panel"
          }
        >
          <Trash2 size={20} />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className={`p-2 rounded-lg ${
            theme === "dark"
              ? "bg-yellow-600 hover:bg-yellow-700"
              : "bg-indigo-500 hover:bg-indigo-600" // Changed light theme toggle to indigo for better contrast with green 'Shapes'
          } text-white transition-colors`}
          title="Toggle Theme"
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;