import { useState, useCallback, useRef } from 'react';

function serializeLayers(layers) {
  if (!layers?.length) return [];
  return layers.map((l) => ({
    ...l,
    mask: l.mask ? new Uint8Array(l.mask) : null,
    paintData: l.paintData ? new Uint8ClampedArray(l.paintData) : null,
  }));
}

export function cloneEditorState(state) {
  if (!state) return null;
  return {
    imageUrl: state.imageUrl,
    dimensions: state.dimensions ? { ...state.dimensions } : null,
    originalImageData: state.originalImageData
      ? new ImageData(
          new Uint8ClampedArray(state.originalImageData.data),
          state.originalImageData.width,
          state.originalImageData.height
        )
      : null,
    layers: serializeLayers(state.layers),
  };
}

const MAX_HISTORY = 30;

export function useHistory() {
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [, forceUpdate] = useState(0);

  const push = useCallback((state) => {
    const snapshot = cloneEditorState(state);
    if (!snapshot) return;
    pastRef.current = [...pastRef.current, snapshot].slice(-MAX_HISTORY);
    futureRef.current = [];
    forceUpdate((v) => v + 1);
  }, []);

  const undo = useCallback((currentState) => {
    const past = pastRef.current;
    if (past.length === 0) return null;
    const toRestore = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    if (currentState) {
      futureRef.current = [...futureRef.current, cloneEditorState(currentState)];
    }
    forceUpdate((v) => v + 1);
    return cloneEditorState(toRestore);
  }, []);

  const redo = useCallback((currentState) => {
    const future = futureRef.current;
    if (future.length === 0) return null;
    const toRestore = future[future.length - 1];
    futureRef.current = future.slice(0, -1);
    if (currentState) {
      pastRef.current = [...pastRef.current, cloneEditorState(currentState)];
    }
    forceUpdate((v) => v + 1);
    return cloneEditorState(toRestore);
  }, []);

  const clear = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    forceUpdate((v) => v + 1);
  }, []);

  return {
    push,
    undo,
    redo,
    get canUndo() { return pastRef.current.length > 0; },
    get canRedo() { return futureRef.current.length > 0; },
    clear,
  };
}
