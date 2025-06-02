export interface PanelInterface {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  text: string;
}

export interface CanvasConfig {
  panels: PanelInterface[];
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string;
  canvasFgColor: string;
  roundedCorners: boolean;
  showGrid: boolean;
  theme: 'light' | 'dark';
}


export interface CanvasState {
  config: CanvasConfig;
  hasUnsavedChanges: boolean;
  history: CanvasConfig[];
  historyIndex: number;
  copiedPanels: PanelInterface[];
}

export type CanvasAction =
  | { type: 'ADD_PANEL'; payload: PanelInterface }
  | { type: 'UPDATE_PANEL_POSITION'; payload: { id: string; x: number; y: number } }
  | { type: 'UPDATE_PANEL_DIMENSIONS'; payload: { id: string; width: number; height: number } }
  | { type: 'UPDATE_PANEL_TEXT'; payload: { id: string; text: string } }
  | { type: 'DELETE_PANELS'; payload: { ids: string[] } } // Payloads should match the reducer's expectations
  | { type: 'SET_CANVAS_DIMENSIONS'; payload: { width: number; height: number } }
  | { type: 'SET_CANVAS_COLORS'; payload: { bgColor: string; fgColor: string } }
  | { type: 'TOGGLE_ROUNDED_CORNERS' }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_THEME' } // Add this action if you're managing theme via reducer
  | { type: 'LOAD_CONFIG'; payload: CanvasConfig }
  | { type: 'MARK_AS_SAVED' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'COPY_PANELS'; payload: { ids: string[] } }
  | { type: 'PASTE_PANELS'; payload?: { offset?: number; zIndex?: number } };