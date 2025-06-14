import React from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { LogEntry } from '../types';
import { useTranslation } from 'react-i18next';

interface LogsProps {
  logs: LogEntry[];
  onClear: () => void;
}

const Logs: React.FC<LogsProps> = ({ logs, onClear }) => {
  const { t } = useTranslation();

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      case 'debug':
        return '🔍';
      default:
        return 'ℹ️';
    }
  };

  return (
    <Paper elevation={2} sx={{ maxHeight: '300px', display: 'flex', flexDirection: 'column' }}>
      {/* 固定ヘッダー */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          backgroundColor: 'background.paper'
        }}
      >
        <Typography variant="h6">{t('logs.title')}</Typography>
        <IconButton 
          onClick={onClear} 
          size="small" 
          title={t('logs.clear')}
          disabled={logs.length === 0}
        >
          <DeleteIcon />
        </IconButton>
      </Box>
      
      {/* スクロール可能なコンテンツエリア */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {logs.length === 0 ? (
          <Typography color="text.secondary" align="center">
            {t('logs.noLogs')}
          </Typography>
        ) : (
          <Box>
            {logs.map((log, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  mb: 1,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: log.type === 'error' ? 'error.light' : 'background.paper'
                }}
              >
                <Box component="span" sx={{ mr: 1 }}>
                  {getLogIcon(log.type)}
                </Box>
                <Typography
                  variant="body2"
                  sx={{
                    color: log.type === 'error' ? 'error.main' : 'text.primary',
                    wordBreak: 'break-word'
                  }}
                >
                  {log.translationKey 
                    ? t(log.translationKey, log.translationParams)
                    : log.message
                  }
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default Logs; 