import { useReducer } from 'react';
import { canvasReducer, initialState } from '../state/canvasReducer';

export const useCanvasState = () => {
  const [state, dispatch] = useReducer(canvasReducer, initialState);

  return { state, dispatch };
};