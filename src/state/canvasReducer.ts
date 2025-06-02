import { PanelInterface, CanvasConfig, CanvasState, CanvasAction } from '../types';
import { generateUniqueId } from '../utils/idGenerator';

export const initialCanvasConfig: CanvasConfig = {
  panels: [],
  canvasWidth: 1280,
  canvasHeight: 720,
  canvasBgColor: '#ffffff',
  canvasFgColor: '#000000',
  roundedCorners: true,
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
const PASTE_OFFSET = 20;

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
    case 'TOGGLE_ROUNDED_CORNERS':
      newConfig = {
        ...state.config,
        roundedCorners: !state.config.roundedCorners,
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
      return {
        config: action.payload,
        hasUnsavedChanges: false,
        history: [action.payload],
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
        hasUnsavedChanges: newHistoryIndexUndo !== 0,
      };
    case 'REDO':
      const newHistoryIndexRedo = Math.min(state.history.length - 1, state.historyIndex + 1);
      return {
        ...state,
        config: state.history[newHistoryIndexRedo],
        historyIndex: newHistoryIndexRedo,
        hasUnsavedChanges: newHistoryIndexRedo !== 0,
      };
    default:
      console.warn("Unhandled action type:", action);
      return state;
  }

  // Common logic for actions that modify config and history
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
      return {
          ...state,
          copiedPanels: newCopiedPanels,
      };
  } else {
    return state;
  }
}