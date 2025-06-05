export type ShapeType = 'rectangle' | 'circle' | 'textBlock' | 'triangle' | 'line' | 'arrow' |  'star' | 'polygon' | 'polyline' | 'heart' | 'cloud' | 'hexagon' | 'chevron' | 'diamond';;

export interface PanelInterface {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  text: string;
  shapeType: ShapeType; 
  backgroundColor: string;
  borderRadius?: number;
  borderColor: string;
  borderWidth: number;
  borderStyle: string;
  textColor?: string;
}

export interface CanvasConfig {
  panels: PanelInterface[];
  canvasWidth: number;
  canvasHeight: number;
  canvasBgColor: string;
  canvasFgColor: string;
  panelRoundedCorners: boolean;
  canvasBorderRadius: number; 
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
  | { type: 'DELETE_PANELS'; payload: { ids: string[] } }
  | { type: 'SET_CANVAS_DIMENSIONS'; payload: { width: number; height: number } }
  | { type: 'SET_CANVAS_COLORS'; payload: { bgColor: string; fgColor: string } }
  | { type: 'TOGGLE_PANEL_ROUNDED_CORNERS' }
  | { type: 'SET_CANVAS_BORDER_RADIUS'; payload: { radius: number } }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_THEME' }
  | { type: 'LOAD_CONFIG'; payload: CanvasConfig }
  | { type: 'MARK_AS_SAVED' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'COPY_PANELS'; payload: { ids: string[] } }
  | { type: 'PASTE_PANELS'; payload?: { offset?: number; zIndex?: number } }
  | { type: 'UPDATE_PANEL_STYLE'; payload: { id: string; styles: Partial<Omit<PanelInterface, 'id' | 'x' | 'y' | 'width' | 'height' | 'zIndex' | 'text' | 'shapeType'>> } };