import React, { memo, useMemo } from 'react';
import { Box } from '@mui/material';
import { 
  FileUpload, 
  ProcessingStatus, 
  TranscriptionResult, 
  Logs 
} from '../components';
import { TranscriptionSegment, ProcessingState, LogEntry } from '../types';

interface ProcessingSectionProps {
  onFileSelect: (file: File) => Promise<void>;
  processingState: ProcessingState;
  processingTime: number | undefined;
  transcription: TranscriptionSegment[];
  originalFileName: string;
  onCopy: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const ProcessingSection: React.FC<ProcessingSectionProps> = memo((props) => {
  const {
    onFileSelect,
    processingState,
    processingTime,
    transcription,
    originalFileName,
    onCopy,
    logs,
    onClearLogs
  } = props;

  // スタイルをメモ化
  const containerStyles = useMemo(() => ({
    marginBottom: 4
  }), []);

  // 処理状態の表示条件をメモ化
  const shouldShowProcessingStatus = useMemo(() => {
    return (
      processingState.isProcessing || 
      processingState.currentStep || 
      processingState.status || 
      processingTime !== undefined
    );
  }, [
    processingState.isProcessing,
    processingState.currentStep,
    processingState.status,
    processingTime
  ]);

  // 転写結果の表示条件をメモ化
  const shouldShowTranscriptionResult = useMemo(() => {
    return (
      transcription.length > 0 || 
      (processingState.isProcessing && originalFileName)
    );
  }, [transcription.length, processingState.isProcessing, originalFileName]);

  // ProcessingStatusのpropsをメモ化（型変換を含む）
  const processingStatusProps = useMemo(() => ({
    isProcessing: processingState.isProcessing,
    progress: processingState.progress,
    status: processingState.status,
    currentStep: processingState.currentStep,
    stepProgress: processingState.stepProgress,
    currentChunk: processingState.currentChunk,
    totalChunks: processingState.totalChunks,
    processingTime: processingTime, // undefined のまま
    isFFmpegInitializing: processingState.isFFmpegInitializing
  }), [
    processingState.isProcessing,
    processingState.progress,
    processingState.status,
    processingState.currentStep,
    processingState.stepProgress,
    processingState.currentChunk,
    processingState.totalChunks,
    processingTime,
    processingState.isFFmpegInitializing
  ]);

  // TranscriptionResultのpropsをメモ化
  const transcriptionResultProps = useMemo(() => ({
    segments: transcription,
    onCopy,
    originalFileName
  }), [transcription, onCopy, originalFileName]);

  return (
    <>
      <Box sx={containerStyles}>
        <FileUpload onFileSelect={onFileSelect} />
      </Box>

      {shouldShowProcessingStatus && (
        <Box sx={containerStyles}>
          <ProcessingStatus {...processingStatusProps} />
        </Box>
      )}

      {shouldShowTranscriptionResult && (
        <Box sx={containerStyles}>
          <TranscriptionResult {...transcriptionResultProps} />
        </Box>
      )}

      <Box sx={containerStyles}>
        <Logs logs={logs} onClear={onClearLogs} />
      </Box>
    </>
  );
});

ProcessingSection.displayName = 'ProcessingSection';
