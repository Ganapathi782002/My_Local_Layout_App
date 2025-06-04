import { PanelInterface, CanvasConfig, CanvasState, CanvasAction, ShapeType } from '../types';
import { generateUniqueId } from '../utils/idGenerator';

export const initialCanvasConfig: CanvasConfig = {
  panels: [],
  canvasWidth: 1280,
  canvasHeight: 720,
  canvasBgColor: '#ffffff',
  canvasFgColor: '#000000',
  canvasBorderRadius: 8, // Default to a small border radius for the canvas
  showGrid: false,
  theme: 'light',
};

export const initialState: CanvasState = {
  config: initialCanvasConfig,
  hasUnsavedChanges: false,
  history: [initialCanvasConfig],
  historyIndex: 0,
  copiedPanels: [],
};

const HISTORY_LIMIT = 100;
const PASTE_OFFSET = 40;

export function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  let newConfig: CanvasConfig | null = null;
  let newCopiedPanels: PanelInterface[] | null = null;

  switch (action.type) {
    case 'ADD_PANEL':
      newConfig = {
        ...state.config,
        panels: [...state.config.panels, action.payload],
      };
      break;
    case 'UPDATE_PANEL_POSITION':
      newConfig = {
        ...state.config,
        panels: state.config.panels.map(p =>
          p.id === action.payload.id ? { ...p, x: action.payload.x, y: action.payload.y } : p
        ),
      };
      break;
    case 'UPDATE_PANEL_DIMENSIONS':
      newConfig = {
        ...state.config,
        panels: state.config.panels.map(p =>
          p.id === action.payload.id ? { ...p, width: action.payload.width, height: action.payload.height } : p
        ),
      };
      break;
    case 'UPDATE_PANEL_TEXT':
      newConfig = {
        ...state.config,
        panels: state.config.panels.map(p =>
          p.id === action.payload.id ? { ...p, text: action.payload.text } : p
        ),
      };
      break;
    case 'UPDATE_PANEL_STYLE':
      newConfig = {
        ...state.config,
        panels: state.config.panels.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.styles } : p
        ),
      };
      break;
    case 'DELETE_PANELS':
      newConfig = {
        ...state.config,
        panels: state.config.panels.filter(panel => !action.payload.ids.includes(panel.id)),
      };
      break;
    case 'SET_CANVAS_DIMENSIONS':
      newConfig = {
        ...state.config,
        canvasWidth: action.payload.width,
        canvasHeight: action.payload.height,
      };
      break;
    case 'SET_CANVAS_COLORS':
      newConfig = {
        ...state.config,
        canvasBgColor: action.payload.bgColor,
        canvasFgColor: action.payload.fgColor,
      };
      break;
    case 'SET_CANVAS_BORDER_RADIUS':
      newConfig = {
        ...state.config,
        canvasBorderRadius: Math.max(0, action.payload.radius), // Ensure radius is not negative
      };
      break;
    case 'TOGGLE_GRID':
      newConfig = {
        ...state.config,
        showGrid: !state.config.showGrid,
      };
      break;
    case 'TOGGLE_THEME':
      newConfig = {
        ...state.config,
        theme: state.config.theme === 'light' ? 'dark' : 'light',
      };
      break;

    case 'COPY_PANELS':
      const panelsToCopy = state.config.panels.filter(p => action.payload.ids.includes(p.id));
      newCopiedPanels = panelsToCopy;
      break;

    case 'PASTE_PANELS':
      if (state.copiedPanels.length === 0) {
        return state;
      }
      const offset = action.payload?.offset ?? PASTE_OFFSET;
      const currentMaxZIndex = state.config.panels.length > 0
        ? Math.max(...state.config.panels.map(p => p.zIndex))
        : 0;

      const pastedPanels: PanelInterface[] = state.copiedPanels.map((panel, index) => ({
        ...panel,
        id: generateUniqueId(),
        x: panel.x + offset,
        y: panel.y + offset,
        zIndex: currentMaxZIndex + 1 + index,
      }));

      newConfig = {
        ...state.config,
        panels: [...state.config.panels, ...pastedPanels],
      };
      break;

    case 'LOAD_CONFIG':
      const loadedPanels: PanelInterface[] = action.payload.panels.map(p => ({
        ...p,
        shapeType: p.shapeType || 'textBlock' as ShapeType, 
        backgroundColor: p.backgroundColor || '#ffffff',    
        borderColor: p.borderColor || '#000000',          
        borderWidth: p.borderWidth ?? 2,
        borderStyle: p.borderStyle || 'solid',            
        text: p.text || '',
      }));

      return {
        config: {
          ...action.payload,
          panels: loadedPanels,
          theme: action.payload.theme || 'light',
          canvasBorderRadius: action.payload.canvasBorderRadius ?? 8, // Default to 8 if not in payload
        },
        hasUnsavedChanges: false,
        history: [{ 
            ...action.payload, 
            panels: loadedPanels,
            canvasBorderRadius: action.payload.canvasBorderRadius ?? 8,
        }],
        historyIndex: 0,
        copiedPanels: [],
      };
    case 'MARK_AS_SAVED':
      return {
        ...state,
        hasUnsavedChanges: false,
        history: [state.config],
        historyIndex: 0,
      };
    case 'UNDO':
      const newHistoryIndexUndo = Math.max(0, state.historyIndex - 1);
      return {
        ...state,
        config: state.history[newHistoryIndexUndo],
        historyIndex: newHistoryIndexUndo,
        // hasUnsavedChanges should be true if not at the very first state
        hasUnsavedChanges: newHistoryIndexUndo !== 0,
      };
    case 'REDO':
      const newHistoryIndexRedo = Math.min(state.history.length - 1, state.historyIndex + 1);
      return {
        ...state,
        config: state.history[newHistoryIndexRedo],
        historyIndex: newHistoryIndexRedo,
        // hasUnsavedChanges should be true if not at the very first state (after an undo)
        hasUnsavedChanges: newHistoryIndexRedo !== 0,
      };
    default:
      console.warn("Unhandled action type:", action);
      return state;
  }

  // Common logic for state updates that involve history (most cases)
  if (newConfig && JSON.stringify(newConfig) !== JSON.stringify(state.config)) {
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(newConfig);

    if (newHistory.length > HISTORY_LIMIT) {
      newHistory.splice(0, newHistory.length - HISTORY_LIMIT);
    }

    return {
      ...state,
      config: newConfig,
      hasUnsavedChanges: true,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      copiedPanels: newCopiedPanels !== null ? newCopiedPanels : state.copiedPanels,
    };
  } else if (newCopiedPanels !== null && JSON.stringify(newCopiedPanels) !== JSON.stringify(state.copiedPanels)) {
    // This case only handles copiedPanels update without config change (e.g., just copying)
    return {
      ...state,
      copiedPanels: newCopiedPanels,
    };
  } else {
    return state;
  }
}