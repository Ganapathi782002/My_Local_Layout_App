import { useReducer, useEffect } from 'react';
import { canvasReducer, initialState } from '../state/canvasReducer';
import { CanvasConfig, CanvasState, CanvasAction } from '../types';

export const useCanvasState = () => {
  const [state, dispatch] = useReducer(canvasReducer, initialState);

  return { state, dispatch };
};