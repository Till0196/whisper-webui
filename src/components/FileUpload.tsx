import React, { useCallback } from 'react';
import { Typography, Paper } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const { t } = useTranslation();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
      'video/*': ['.mp4', '.webm', '.mov']
    },
    multiple: false
  });

  return (
    <Paper
      {...getRootProps()}
      elevation={3}
      sx={{
        p: 3,
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
        border: '2px dashed',
        borderColor: isDragActive ? 'primary.main' : 'divider',
        '&:hover': {
          backgroundColor: 'action.hover'
        }
      }}
    >
      <input {...getInputProps()} />
      <Typography variant="h6" gutterBottom>
        {t('fileUpload.title')}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {isDragActive ? t('fileUpload.dragActive') : t('fileUpload.description')}
      </Typography>
    </Paper>
  );
}; 