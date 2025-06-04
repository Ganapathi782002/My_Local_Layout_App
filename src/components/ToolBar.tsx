import React, { useState } from "react";
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
  // REMOVED: onToggleCanvasSettings is no longer needed
  // onToggleCanvasSettings: () => void;
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

const Toolbar: React.FC<ToolbarProps> = ({
  theme,
  onAddPanel,
  onUndo,
  onRedo,
  onExportConfig,
  onImportConfig,
  onExportPNG,
  // REMOVED: Destructuring for onToggleCanvasSettings
  // onToggleCanvasSettings,
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
  const handleCopyClick = () => {
    if (isCopyDisabled) return;
    onCopySelectedPanels();
    setShowCopiedTooltip(true);
    setTimeout(() => {
      setShowCopiedTooltip(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center mb-8 w-full">
      <h1
        className={`text-2xl font-bold mb-4 ${
          theme === "dark" ? "text-white" : "text-gray-900"
        } text-center`}
      >
        Layout Designer
      </h1>

      <div className="flex flex-wrap gap-4 justify-center">
        {/* Add Square */}
        <button
          onClick={() => onAddPanel("rectangle")}
          className={`p-2 rounded-lg ${
            theme === "dark"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-green-500 hover:bg-green-600"
          } text-white transition-colors`}
          title="Add Square"
        >
          <Square size={20} />
        </button>
        {/* Add Circle */}
        <button
          onClick={() => onAddPanel("circle")}
          className={`p-2 rounded-lg ${
            theme === "dark"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-green-500 hover:bg-green-600"
          } text-white transition-colors`}
          title="Add Circle"
        >
          <Circle size={20} />
        </button>
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
              : "bg-blue-500 hover:bg-blue-600"
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