import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  ButtonGroup,
  Tooltip
} from '@mui/material';
import { 
  ContentCopy as CopyIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { TranscriptionSegment } from '../types';
import { useTranslation } from 'react-i18next';

interface TranscriptionResultProps {
  segments: TranscriptionSegment[];
  onCopy: () => void;
  originalFileName: string;
}

export const TranscriptionResult: React.FC<TranscriptionResultProps> = ({
  segments,
  onCopy,
  originalFileName
}) => {
  const { t } = useTranslation();

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
  };

  const generateVTT = (): string => {
    let vtt = 'WEBVTT\n\n';
    segments.forEach((segment, index) => {
      vtt += `${index + 1}\n`;
      vtt += `${formatTime(segment.start)} --> ${formatTime(segment.end)}\n`;
      vtt += `${segment.text}\n\n`;
    });
    return vtt;
  };

  const generateSRT = (): string => {
    let srt = '';
    segments.forEach((segment, index) => {
      srt += `${index + 1}\n`;
      srt += `${formatTime(segment.start).replace('.', ',')} --> ${formatTime(segment.end).replace('.', ',')}\n`;
      srt += `${segment.text}\n\n`;
    });
    return srt;
  };

  const generateJSON = (): string => {
    return JSON.stringify({
      segments: segments,
      originalFileName,
      generatedAt: new Date().toISOString()
    }, null, 2);
  };

  const generateText = (): string => {
    return segments.map(segment => segment.text).join('\n');
  };

  const getBaseFileName = () => {
    return originalFileName.replace(/\.[^/.]+$/, '');
  };

  const handleDownloadVTT = () => {
    downloadFile(generateVTT(), `${getBaseFileName()}.vtt`, 'text/vtt');
  };

  const handleDownloadSRT = () => {
    downloadFile(generateSRT(), `${getBaseFileName()}.srt`, 'text/srt');
  };

  const handleDownloadJSON = () => {
    downloadFile(generateJSON(), `${getBaseFileName()}.json`, 'application/json');
  };

  const handleDownloadText = () => {
    downloadFile(generateText(), `${getBaseFileName()}.txt`, 'text/plain');
  };



  // セグメントが0個でも、処理中であることを示すためにコンポーネントを表示
  const showComponent = segments.length > 0 || originalFileName;

  if (!showComponent) {
    return null;
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {t('result.title')}
        </Typography>
        {segments.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <ButtonGroup variant="contained" aria-label="transcription download options">
              <Tooltip title={t('result.download.vtt')}>
                <Button
                  onClick={handleDownloadVTT}
                  startIcon={<DownloadIcon />}
                >
                  VTT
                </Button>
              </Tooltip>
              <Tooltip title={t('result.download.srt')}>
                <Button
                  onClick={handleDownloadSRT}
                  startIcon={<DownloadIcon />}
                >
                  SRT
                </Button>
              </Tooltip>
              <Tooltip title={t('result.download.json')}>
                <Button
                  onClick={handleDownloadJSON}
                  startIcon={<DownloadIcon />}
                >
                  JSON
                </Button>
              </Tooltip>
              <Tooltip title={t('result.download.text')}>
                <Button
                  onClick={handleDownloadText}
                  startIcon={<DownloadIcon />}
                >
                  TXT
                </Button>
              </Tooltip>
            </ButtonGroup>
            <Button
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={onCopy}
              sx={{ ml: 2 }}
            >
              {t('common.copy')}
            </Button>
          </Box>
        )}
      </Box>
      <Box sx={{ maxHeight: '400px', overflow: 'auto' }}>
        {segments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('result.waitingForResults')}
          </Typography>
        ) : (
          segments.map((segment, index) => (
            <Box key={`${segment.start}-${segment.end}-${index}`} sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                [{formatTime(segment.start)} - {formatTime(segment.end)}]
              </Typography>
              <Typography variant="body1">{segment.text}</Typography>
            </Box>
          ))
        )}
      </Box>
    </Paper>
  );
}; 