import { useTranscriptionStore } from '../store/useTranscriptionStore';
import { selectIsProcessing, TranscriptionState } from '../store/transcriptionState';
import { useStateSelector } from '../hooks/useStateManager';
import { useCallback } from 'react';

export const useIsProcessing = () => {
  const store = useTranscriptionStore();
  const stableSelector = useCallback(selectIsProcessing, []);
  return useStateSelector<TranscriptionState, boolean>(store, stableSelector);
}; 