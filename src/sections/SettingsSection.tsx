import React, { memo, useMemo } from 'react';
import { Box } from '@mui/material';
import { ServerSettings, TranscriptionSettings } from '../components';
import { ApiStatus } from '../types';

interface SettingsSectionProps {
  apiStatus: ApiStatus;
  onServerSettingsChange: () => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = memo((props) => {
  const { apiStatus, onServerSettingsChange } = props;

  // スタイルをメモ化
  const containerStyles = useMemo(() => ({
    marginBottom: 4
  }), []);

  return (
    <>
      <Box sx={containerStyles}>
        <ServerSettings 
          apiStatus={apiStatus}
          onSettingsChange={onServerSettingsChange}
        />
      </Box>

      <Box sx={containerStyles}>
        <TranscriptionSettings />
      </Box>
    </>
  );
});

SettingsSection.displayName = 'SettingsSection';
