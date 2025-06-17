import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  PlayArrow as PlayArrowIcon,
  SkipNext as SkipNextIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import type { ProcessingStep, ProcessingSteps } from '../types';
import { useTranscriptionStore } from '../store/useTranscriptionStore';
import { useStateSelector } from '../hooks/useStateManager';
import { selectProcessingSteps, selectIsProcessing, TranscriptionState } from '../store/transcriptionState';

interface ProcessingStepItemProps {
  step: ProcessingStep;
  totalChunks?: number;
}

const ProcessingStepItem: React.FC<ProcessingStepItemProps> = ({ step, totalChunks }) => {
  const { t } = useTranslation();

  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'inProgress':
        return <PlayArrowIcon color="primary" />;
      case 'skipped':
        return <SkipNextIcon color="disabled" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const getStatusText = () => {
    switch (step.status) {
      case 'completed':
        return t('stepStatus.completed');
      case 'error':
        return step.error || t('stepStatus.error');
      case 'inProgress':
        if (step.type === 'chunk' && totalChunks && totalChunks <= 1) {
          return t('stepStatus.transcribing');
        }
        return t('stepStatus.inProgress');
      case 'skipped':
        return step.skipReason || t('stepStatus.skipped');
      default:
        return t('stepStatus.pending');
    }
  };

  const hasError = step.status === 'error';
  const errorDetails = hasError ? step.error : null;

  const getStepTitle = () => {
    if (step.type === 'chunk' && totalChunks && totalChunks <= 1) {
      return t('steps.transcription');
    }
    return t(step.titleKey, step.titleParams);
  };

  return (
    <ListItem>
      <ListItemIcon>
        {getStatusIcon()}
      </ListItemIcon>
      <ListItemText
        primary={getStepTitle()}
        secondary={
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                variant="body2" 
                color={hasError ? "error.main" : "text.secondary"}
                sx={{ fontWeight: hasError ? 'medium' : 'normal' }}
              >
                {getStatusText()}
              </Typography>
              {step.status === 'inProgress' && typeof step.progress === 'number' && (
                <Typography variant="body2" color="text.secondary">
                  {Math.round(step.progress)}%
                </Typography>
              )}
            </Box>
            {errorDetails && (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'error.light', borderRadius: 1, borderLeft: 3, borderColor: 'error.main' }}>
                <Typography 
                  variant="caption" 
                  color="error.dark"
                  sx={{ fontFamily: 'monospace', fontSize: '0.75rem', lineHeight: 1.4 }}
                >
                  {errorDetails}
                </Typography>
              </Box>
            )}
            {step.status === 'inProgress' && typeof step.progress === 'number' && (
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={step.progress} 
                  sx={{ height: 4, borderRadius: 1 }}
                />
              </Box>
            )}
          </Box>
        }
      />
    </ListItem>
  );
};

const ProcessingSteps: React.FC = () => {
  const { t } = useTranslation();
  const store = useTranscriptionStore();
  const steps = useStateSelector<TranscriptionState, ProcessingSteps>(store, selectProcessingSteps);

  // すべてのステップを順序立てて表示
  const allSteps: ProcessingStep[] = [
    steps.ffmpegInit,
    steps.fileValidation,
    steps.audioConversion,
    steps.audioSplitting,
    ...steps.chunks,
    steps.finalizing
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('processing.status')}
      </Typography>
      
      <List dense>
        {allSteps.map((step) => (
          <ProcessingStepItem
            key={step.id}
            step={step}
            totalChunks={steps.chunks.length}
          />
        ))}
      </List>
    </Box>
  );
};

export default ProcessingSteps;
