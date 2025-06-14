import { useTranscriptionStore } from '../store/useTranscriptionStore';
import { selectProcessingSteps, TranscriptionState } from '../store/transcriptionState';
import { useStateSelector } from '../hooks/useStateManager';
import { useCallback } from 'react';
import { ProcessingSteps } from '../types';

export const useProcessingSteps = () => {
  const store = useTranscriptionStore();
  const stableSelector = useCallback(selectProcessingSteps, []);
  return useStateSelector<TranscriptionState, ProcessingSteps>(store, stableSelector);
}; 