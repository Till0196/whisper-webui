import React from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  LinearProgress,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTranscriptionStore } from '../store/useTranscriptionStore';
import { useStateSelector } from '../hooks/useStateManager';
import { selectProcessingSteps } from '../store/transcriptionState';
import { ProcessingStep, ProcessingStepStatus } from '../types';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PendingIcon from '@mui/icons-material/Pending';

interface ProcessingStatusProps {
  isProcessing: boolean;
  progress: number;
  status?: string;
  currentStep?: string;
  stepProgress?: number;
  currentChunk?: number;
  totalChunks?: number;
  processingTime?: number;
  isFFmpegInitializing?: boolean;
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  isProcessing,
  processingTime
}) => {
  const { t } = useTranslation();
  const store = useTranscriptionStore();
  // リアルタイムでステップデータを取得
  const steps = useStateSelector(store, selectProcessingSteps);

  if (!isProcessing && !processingTime) {
    return null;
  }

  const getStepIcon = (status: ProcessingStepStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'skipped':
        return <SkipNextIcon color="disabled" />;
      case 'inProgress':
        return <PendingIcon color="primary" />;
      default:
        return <RadioButtonUncheckedIcon color="disabled" />;
    }
  };

  const renderStep = (step: ProcessingStep | undefined) => {
    // stepがundefinedの場合は何も表示しない
    if (!step) {
      return null;
    }

    // 進行中ステップの進捗バーを常に表示
    const showProgress = step.status === 'inProgress' && typeof step.progress === 'number';
    const progressValue = step.progress || 0;

    // チャンクステップの場合、タイトルキーを動的に生成
    const titleKey = step.id.startsWith('chunk_') 
      ? (steps.chunks && steps.chunks.length > 1 ? 'steps.chunk' : 'steps.transcription')
      : step.titleKey;

    // チャンクステップの場合、パラメータを設定
    const titleParams = step.id.startsWith('chunk_') && steps.chunks && steps.chunks.length > 1
      ? {
          current: parseInt(step.id.split('_')[1]) + 1,
          total: steps.chunks.length
        }
      : step.titleParams;

    return (
      <ListItem key={step.id}>
        <ListItemIcon>
          {getStepIcon(step.status)}
        </ListItemIcon>
        <ListItemText
          primary={
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t(titleKey, titleParams)}
                {step.details && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ({step.details})
                  </Typography>
                )}
                {step.error && (
                  <Typography component="span" variant="caption" color="error" sx={{ ml: 1 }}>
                    {step.error}
                  </Typography>
                )}
                {step.skipReason && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ({t('steps.skipped', { reason: step.skipReason })})
                  </Typography>
                )}
              </Typography>
              {showProgress && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress 
                    variant="determinate"
                    value={progressValue}
                    sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: '3em' }}>
                    {progressValue.toFixed(1)}%
                  </Typography>
                </Box>
              )}
            </Box>
          }
        />
      </ListItem>
    );
  };

  return (
    <Paper elevation={1} sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6" component="h2">
          {t('processing.status')}
        </Typography>

        {/* ステップのリスト表示 */}
        <List>
          {renderStep(steps.ffmpegInit)}
          {renderStep(steps.fileValidation)}
          {renderStep(steps.audioConversion)}
          {renderStep(steps.audioSplitting)}
          {steps.chunks && steps.chunks.length > 1
            ? steps.chunks.map(renderStep)
            : steps.chunks && steps.chunks.length === 1
            ? renderStep(steps.chunks[0])
            : null}
          {renderStep(steps.finalizing)}
        </List>

        <Divider />

        {/* 処理時間の表示（完了時） */}
        {processingTime !== undefined && (
          <Typography variant="body2" color="text.secondary">
            {t('processing.time', { time: processingTime.toFixed(2) })}
          </Typography>
        )}

        {/* エラー時の表示 */}
        {(() => {
          const allSteps = [
            steps.ffmpegInit,
            steps.fileValidation,
            steps.audioConversion,
            steps.audioSplitting,
            steps.finalizing,
            ...(steps.chunks || [])
          ].filter(Boolean);
          
          const errorStep = allSteps.find(step => step?.status === 'error');
          
          return errorStep && (
            <Typography variant="body2" color="error">
              {t('errors.processingFailed', { error: errorStep.error || t('errors.unknown') })}
            </Typography>
          );
        })()}
      </Stack>
    </Paper>
  );
};

export default ProcessingStatus;