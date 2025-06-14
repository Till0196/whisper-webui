import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Button,
  Collapse,
  Alert,
  AlertTitle,
  IconButton,
  Paper,
  Tooltip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import InfoIcon from '@mui/icons-material/Info';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { 
  useApiStatus,
  useServerConfig,
  useServerConfigUpdater
} from '../store/useAppStore';
import { useConfig } from '../hooks/useConfig';

const ServerSettings: React.FC = () => {
  const { t } = useTranslation();
  
  // 設定を取得（認証情報表示制御とプロキシモード制御を含む）
  const { config, forceProxyDisabled, canEditCredentials } = useConfig();
  
  // 状態を購読（変更時のみ再レンダリング）
  const apiStatus = useApiStatus();
  const serverConfig = useServerConfig();
  
  // 状態更新用のディスパッチャー（再レンダリングなし）
  const updateServerConfig = useServerConfigUpdater();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showApiToken, setShowApiToken] = useState(false);
  
  // プロキシの制約状況を計算
  const proxyLocked = config.hideCredentials || !config.allowCredentialEdit;
  
  // 実際のプロキシ状態を計算（制約を考慮）
  const effectiveUseServerProxy = proxyLocked ? true : (forceProxyDisabled ? false : serverConfig.useServerProxy);
  
  // 一時設定（ユーザーが編集中の値）
  const [tempSettings, setTempSettings] = useState({
    apiUrl: serverConfig.apiUrl,
    apiToken: serverConfig.apiToken,
    useAuth: serverConfig.useAuth,
    useServerProxy: effectiveUseServerProxy
  });
  
  // 認証情報の編集可能性
  // allowCredentialEdit=trueかつプロキシオフの場合は編集可能
  const credentialsAreEditable = config.allowCredentialEdit && !tempSettings.useServerProxy;
  
  // 初期状態の設定
  const defaultSettings = {
    apiUrl: import.meta.env.VITE_WHISPER_API_URL || 'http://localhost:9000',
    apiToken: import.meta.env.VITE_WHISPER_API_TOKEN || '',
    useAuth: !!import.meta.env.VITE_WHISPER_API_TOKEN,
    useServerProxy: config.useServerProxy
  };
  
  // 初期設定が未設定の場合は自動的に設定パネルを開く
  useEffect(() => {
    if (!serverConfig.apiUrl || serverConfig.apiUrl === 'http://localhost:9000') {
      setIsExpanded(true);
    }
  }, [serverConfig.apiUrl]);

  // 親コンポーネントの設定が変更されたら一時設定も更新
  useEffect(() => {
    setTempSettings({
      apiUrl: serverConfig.apiUrl,
      apiToken: serverConfig.apiToken,
      useAuth: serverConfig.useAuth,
      useServerProxy: serverConfig.useServerProxy // 制約適用前の実際の値を使用
    });
  }, [serverConfig.apiUrl, serverConfig.apiToken, serverConfig.useAuth, serverConfig.useServerProxy]);

  // 設定に変更があるかどうかを確認（現在の設定と初期状態の両方と比較）
  const hasChanges = 
    tempSettings.apiUrl !== serverConfig.apiUrl ||
    tempSettings.apiToken !== serverConfig.apiToken ||
    tempSettings.useAuth !== serverConfig.useAuth ||
    tempSettings.useServerProxy !== serverConfig.useServerProxy ||
    tempSettings.apiUrl !== defaultSettings.apiUrl ||
    tempSettings.apiToken !== defaultSettings.apiToken ||
    tempSettings.useAuth !== defaultSettings.useAuth ||
    tempSettings.useServerProxy !== defaultSettings.useServerProxy;

  // 設定を適用
  const handleApply = () => {
    // プロキシモード制約に基づいて最終的な値を決定
    const finalUseServerProxy = proxyLocked 
      ? true 
      : (forceProxyDisabled ? false : tempSettings.useServerProxy);
      
    // 設定を更新（useServerConfigUpdaterが制約を適用してくれる）
    updateServerConfig({
      apiUrl: tempSettings.apiUrl,
      apiToken: tempSettings.apiToken,
      useAuth: tempSettings.useAuth,
      useServerProxy: finalUseServerProxy
    });
    
    // tempSettingsを制約適用後の値に更新
    setTempSettings(prev => ({
      ...prev,
      useServerProxy: finalUseServerProxy
    }));
  };

  // 設定を初期値にリセット
  const handleReset = () => {
    setTempSettings({
      ...defaultSettings,
      useServerProxy: defaultSettings.useServerProxy // 制約適用前の値を使用
    });
  };

  // APIエンドポイント欄に表示する値を決定
  const getApiUrlDisplayValue = () => {
    if (config.hideCredentials && tempSettings.useServerProxy) {
      return '********';
    }
    return tempSettings.apiUrl;
  };

  // APIトークン欄に表示する値を決定
  const getApiTokenDisplayValue = () => {
    if (config.hideCredentials && tempSettings.useServerProxy) {
      return '********';
    }
    return tempSettings.apiToken;
  };

  // プロキシ使用状態の変更をハンドル
  const handleProxyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // プロキシロックの場合は変更不可（forceProxyDisabledは編集時は制限しない）
    if (proxyLocked) return;

    const newProxyState = e.target.checked;
    setTempSettings(prev => ({ ...prev, useServerProxy: newProxyState }));
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" component="h2">
          {t('serverSettings.title')}
        </Typography>
        <IconButton onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 設定が未設定の場合の警告 */}
          {!serverConfig.apiUrl && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>{t('serverSettings.initialSetup')}</AlertTitle>
              {t('serverSettings.initialSetupMessage')}
            </Alert>
          )}
          
          {/* 認証情報非表示設定の警告表示 */}
          {config.hideCredentials && tempSettings.useServerProxy && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>{t('serverSettings.credentialsHidden')}</AlertTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LockIcon sx={{ mr: 1 }} />
                {t('serverSettings.credentialsHiddenMessage')}
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {t('serverSettings.disableProxyToEdit')}
                </Typography>
              </Box>
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label={t('serverSettings.apiUrl')}
              value={getApiUrlDisplayValue()}
              onChange={(e) => setTempSettings(prev => ({ ...prev, apiUrl: e.target.value }))}
              fullWidth
              margin="normal"
              disabled={!credentialsAreEditable}
            />
            <Tooltip title={t('serverSettings.apiUrlInfo')}>
              <InfoIcon color="action" sx={{ ml: 1 }} />
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label={t('serverSettings.apiToken')}
              value={getApiTokenDisplayValue()}
              onChange={(e) => setTempSettings(prev => ({ ...prev, apiToken: e.target.value }))}
              fullWidth
              margin="normal"
              type={showApiToken ? "text" : "password"}
              disabled={!credentialsAreEditable}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowApiToken(!showApiToken)}
                    edge="end"
                    disabled={!credentialsAreEditable}
                    aria-label={showApiToken ? t('serverSettings.hideApiToken') : t('serverSettings.showApiToken')}
                  >
                    {showApiToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                ),
              }}
            />
            <Tooltip title={t('serverSettings.apiTokenInfo')}>
              <InfoIcon color="action" sx={{ ml: 1 }} />
            </Tooltip>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={tempSettings.useAuth}
                onChange={(e) => setTempSettings(prev => ({ ...prev, useAuth: e.target.checked }))}
                disabled={!credentialsAreEditable}
              />
            }
            label={t('serverSettings.useAuth')}
          />

          <FormControlLabel
            control={
              <Switch
                checked={tempSettings.useServerProxy}
                onChange={handleProxyChange}
                disabled={proxyLocked}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {t('serverSettings.useServerProxy')}
                <Tooltip title={
                  proxyLocked 
                    ? t('serverSettings.proxyModeLocked')
                    : (forceProxyDisabled 
                      ? t('serverSettings.proxyModeDisabled') 
                      : t('serverSettings.proxyModeInfo'))
                }>
                  <InfoIcon fontSize="small" color="action" sx={{ ml: 1 }} />
                </Tooltip>
                {proxyLocked && (
                  <LockIcon fontSize="small" color="action" sx={{ ml: 1 }} />
                )}
                {forceProxyDisabled && !proxyLocked && (
                  <Typography variant="caption" color="warning.main" sx={{ ml: 1 }}>
                    ({t('serverSettings.willBeDisabledOnApply')})
                  </Typography>
                )}
              </Box>
            }
          />
          
          {/* プロキシモードが強制的に無効化されている場合の警告 */}
          {forceProxyDisabled && !proxyLocked && (
            <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
              <AlertTitle>{t('serverSettings.proxyDisabledTitle')}</AlertTitle>
              {t('serverSettings.proxyDisabledMessage')}
            </Alert>
          )}
          
          {/* 認証情報保護やモードでプロキシが強制的に有効化されている場合の説明 */}
          {proxyLocked && (
            <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
              <AlertTitle>{t('serverSettings.proxyLockedTitle')}</AlertTitle>
              {config.hideCredentials 
                ? t('serverSettings.proxyLockedHideCredentials')
                : t('serverSettings.proxyLockedEditDisabled')}
            </Alert>
          )}
          
          {/* プロキシモードが有効で認証情報編集が可能な場合の警告 */}
          {tempSettings.useServerProxy && config.hideCredentials && (
            <Alert severity="warning" sx={{ mt: 1, mb: 1 }}>
              <AlertTitle>{t('serverSettings.disableProxyToEdit')}</AlertTitle>
              {t('serverSettings.disableProxyToEditDetailed')}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleApply}
              disabled={!hasChanges}
            >
              {t('common.apply')}
            </Button>
            <Button
              variant="outlined"
              onClick={handleReset}
              disabled={!hasChanges}
            >
              {t('common.reset')}
            </Button>
          </Box>

          {apiStatus.status !== 'unknown' && (
            <Alert severity={apiStatus.status === 'healthy' ? 'success' : 'error'} sx={{ mt: 2 }}>
              <AlertTitle>{t(`apiStatus.${apiStatus.status}`)}</AlertTitle>
              <Box sx={{ mb: 1 }}>{t(`apiStatus.message.${apiStatus.status === 'healthy' ? 'success' : 'error'}`)}</Box>
              {apiStatus.details && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">{t('apiStatus.details')}:</Typography>
                  <Box
                    sx={{
                      mt: 1,
                      p: 1,
                      bgcolor: 'rgba(0,0,0,0.04)',
                      borderRadius: 1,
                      maxHeight: '120px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: '0.875rem'
                    }}
                  >
                    {apiStatus.details}
                  </Box>
                </Box>
              )}
            </Alert>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ServerSettings;