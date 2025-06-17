import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useConfig } from '../hooks/useConfig';
import { useApiData } from '../hooks/useApiData';
import { 
  useWhisperApiUrl, 
  useWhisperApiToken, 
  useWhisperProxyApiUrl, 
  useWhisperProxyApiToken, 
  useServerProxy, 
  useRawServerProxy,
  useConfigUpdater 
} from '../store/useConfigStore';
import { ApiStatus } from '../types';
import { getConfigValue, getRuntimeConfig, getProxyModeValues, getDirectModeValues } from '../store/configState';

interface ServerSettingsProps {
  apiStatus?: ApiStatus;
  onSettingsChange?: () => void;
}

const ServerSettings: React.FC<ServerSettingsProps> = ({ apiStatus, onSettingsChange }) => {
  const { t } = useTranslation();
  
  // 分離されたフィールドから値を取得
  const directApiUrl = useWhisperApiUrl();
  const directApiToken = useWhisperApiToken();
  const proxyApiUrl = useWhisperProxyApiUrl();
  const proxyApiToken = useWhisperProxyApiToken();
  const { useServerProxy: effectiveUseProxy } = useServerProxy(); // 制約適用済み（実際の動作用）
  const currentUseProxy = useRawServerProxy(); // 制約なしの生の値（UI表示・編集用）
  
  // 従来のconfig hook（制約情報とリセット機能のため）
  const { config, forceProxyDisabled, proxyLocked, canEditCredentials, resetConfig } = useConfig();
  const updateConfig = useConfigUpdater();
  
  // API データ取得フック
  const { fetchApiData } = useApiData();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showApiToken, setShowApiToken] = useState(false);
  
  // 実際のプロキシ状態を計算（制約を考慮）
  const effectiveUseServerProxy = effectiveUseProxy; // 既に制約が適用済み
  
  // ローカル編集状態（分離されたフィールドに対応）
  const [editingDirectUrl, setEditingDirectUrl] = useState(directApiUrl || '');
  const [editingDirectToken, setEditingDirectToken] = useState(directApiToken || '');
  const [editingProxyUrl, setEditingProxyUrl] = useState(proxyApiUrl || '');
  const [editingProxyToken, setEditingProxyToken] = useState(proxyApiToken || '');
  const [editingUseProxy, setEditingUseProxy] = useState(currentUseProxy); // 制約なしの生の値を使用
  
  // 現在のモードに基づいてアクティブな編集値を取得
  const currentApiUrl = editingUseProxy ? editingProxyUrl : editingDirectUrl;
  const currentApiToken = editingUseProxy ? editingProxyToken : editingDirectToken;
  const [editingUseAuth, setEditingUseAuth] = useState(!!currentApiToken);

  // 設定が変更された際に編集状態を同期
  useEffect(() => {
    setEditingDirectUrl(directApiUrl || '');
    setEditingDirectToken(directApiToken || '');
    setEditingProxyUrl(proxyApiUrl || '');
    setEditingProxyToken(proxyApiToken || '');
    setEditingUseProxy(currentUseProxy); // 制約なしの生の値を使用
    setEditingUseAuth(!!(currentUseProxy ? proxyApiToken : directApiToken));
  }, [directApiUrl, directApiToken, proxyApiUrl, proxyApiToken, currentUseProxy]); // editingUseProxyを依存配列から除外
  
  // 設定パネルの自動展開判定
  useEffect(() => {
    if (!directApiUrl && !proxyApiUrl && !isExpanded) {
      setIsExpanded(true);
    }
  }, [directApiUrl, proxyApiUrl, isExpanded]);

  // 設定を適用
  const handleApply = useCallback(async () => {
    const configUpdate = {
      whisperApiUrl: editingDirectUrl,
      whisperApiToken: editingUseAuth ? editingDirectToken : '',
      whisperProxyApiUrl: editingProxyUrl,
      whisperProxyApiToken: editingUseAuth ? editingProxyToken : '',
      useServerProxy: editingUseProxy
    };
    
    console.log('設定を適用中:', configUpdate);
    
    // 設定を更新
    updateConfig(configUpdate);

    // 設定更新の反映を確実にするため、小さな遅延を追加
    await new Promise(resolve => setTimeout(resolve, 100));

    // 設定適用後、即座にAPIデータを再取得
    try {
      console.log('設定更新後にAPIデータを再取得中...');
      await fetchApiData();
      console.log('APIデータの再取得が正常に完了しました');
    } catch (error) {
      console.error('設定更新後のAPIデータ再取得に失敗しました:', error);
    }

    // 設定変更を親コンポーネントに通知
    if (onSettingsChange) {
      onSettingsChange();
    }
  }, [editingDirectUrl, editingDirectToken, editingProxyUrl, editingProxyToken, editingUseAuth, editingUseProxy, updateConfig, fetchApiData, onSettingsChange]);

  // 設定をデフォルト値にリセット（UI状態のみ、適用までは実際の設定変更なし）
  const handleReset = useCallback(() => {
    console.log('UI状態を環境/config.jsのデフォルト値にリセット中');
    
    // 環境/config.jsのデフォルト値を取得
    const proxyValues = getProxyModeValues();
    const directValues = getDirectModeValues();
    const defaultUseProxy = getRuntimeConfig().USE_SERVER_PROXY === 'true';
    
    // UI編集状態をデフォルト値にリセット（実際の設定変更は行わない）
    setEditingDirectUrl(directValues.apiUrl);
    setEditingDirectToken(directValues.apiToken || '');
    setEditingProxyUrl(proxyValues.apiUrl);
    setEditingProxyToken(proxyValues.apiToken || '');
    setEditingUseProxy(defaultUseProxy);
    setEditingUseAuth(!!(defaultUseProxy ? proxyValues.apiToken : directValues.apiToken));
    
    console.log('UI状態のリセット完了:', {
      directUrl: directValues.apiUrl,
      directToken: directValues.apiToken || '',
      proxyUrl: proxyValues.apiUrl,
      proxyToken: proxyValues.apiToken || '',
      useProxy: defaultUseProxy
    });
  }, []);

  // 表示値の決定
  const apiUrlDisplayValue = useMemo(() => {
    if (config.hideCredentials) {
      return '********';
    }
    return currentApiUrl;
  }, [config.hideCredentials, currentApiUrl]);

  const apiTokenDisplayValue = useMemo(() => {
    if (config.hideCredentials) {
      return '********';
    }
    return currentApiToken;
  }, [config.hideCredentials, currentApiToken]);

  // 設定に変更があるかどうかを確認
  const hasChanges = useMemo(() => {
    return (
      editingDirectUrl !== (directApiUrl || '') ||
      editingDirectToken !== (directApiToken || '') ||
      editingProxyUrl !== (proxyApiUrl || '') ||
      editingProxyToken !== (proxyApiToken || '') ||
      editingUseProxy !== currentUseProxy
    );
  }, [
    editingDirectUrl, editingDirectToken, editingProxyUrl, editingProxyToken, editingUseProxy,
    directApiUrl, directApiToken, proxyApiUrl, proxyApiToken, currentUseProxy
  ]);

  // 現在のモードに応じてURL/トークンを更新する関数
  const updateCurrentUrl = useCallback((newUrl: string) => {
    if (editingUseProxy) {
      setEditingProxyUrl(newUrl);
    } else {
      setEditingDirectUrl(newUrl);
    }
  }, [editingUseProxy]);

  const updateCurrentToken = useCallback((newToken: string) => {
    if (editingUseProxy) {
      setEditingProxyToken(newToken);
    } else {
      setEditingDirectToken(newToken);
    }
  }, [editingUseProxy]);

  // プロキシ使用状態の変更をハンドル
  const handleProxyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleProxyChange called:', {
      proxyLocked,
      currentChecked: e.target.checked,
      editingUseProxy
    });
    
    if (proxyLocked) {
      console.log('Proxy change blocked: proxyLocked is true');
      return;
    }

    const newProxyState = e.target.checked;
    console.log('Proxy mode changed to:', newProxyState);
    
    setEditingUseProxy(newProxyState);
    
    // プロキシモード変更時に適切なデフォルト値を設定
    if (newProxyState) {
      // プロキシモードに変更: プロキシ専用の設定値を使用
      const proxyValues = getProxyModeValues();
      if (!editingProxyUrl || editingProxyUrl === 'http://localhost:9000') {
        setEditingProxyUrl(proxyValues.apiUrl);
      }
      // プロキシトークンが設定されている場合は自動で適用
      if (proxyValues.apiToken && !editingProxyToken) {
        setEditingProxyToken(proxyValues.apiToken);
        setEditingUseAuth(true);
      } else {
        setEditingUseAuth(!!editingProxyToken);
      }
    } else {
      // ダイレクトモードに変更: ダイレクト専用の設定値を使用
      const directValues = getDirectModeValues();
      if (!editingDirectUrl || editingDirectUrl === '/api/transcribe') {
        setEditingDirectUrl(directValues.apiUrl);
      }
      // ダイレクトトークンが設定されている場合は自動で適用
      if (directValues.apiToken && !editingDirectToken) {
        setEditingDirectToken(directValues.apiToken);
        setEditingUseAuth(true);
      } else {
        setEditingUseAuth(!!editingDirectToken);
      }
    }
  }, [proxyLocked, editingProxyUrl, editingProxyToken, editingDirectUrl, editingDirectToken]);

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
          {!directApiUrl && !proxyApiUrl && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>{t('serverSettings.initialSetup')}</AlertTitle>
              {t('serverSettings.initialSetupMessage')}
            </Alert>
          )}
          
          {/* 認証情報非表示設定の警告表示 */}
          {config.hideCredentials && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>{t('serverSettings.credentialsHidden')}</AlertTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LockIcon sx={{ mr: 1 }} />
                {t('serverSettings.credentialsHiddenMessage')}
              </Box>
            </Alert>
          )}
          
          {/* プロキシモード時の説明 */}
          {editingUseProxy && !config.hideCredentials && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <AlertTitle>{t('serverSettings.proxyModeInfo')}</AlertTitle>
              {t('serverSettings.proxyModeTokenInfo')}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label={editingUseProxy ? t('serverSettings.proxyUrl') : t('serverSettings.apiUrl')}
              value={apiUrlDisplayValue}
              onChange={(e) => updateCurrentUrl(e.target.value)}
              fullWidth
              margin="normal"
              disabled={!canEditCredentials}
            />
            <Tooltip title={editingUseProxy ? t('serverSettings.proxyUrlInfo') : t('serverSettings.apiUrlInfo')}>
              <InfoIcon color="action" sx={{ ml: 1 }} />
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              label={editingUseProxy ? t('serverSettings.proxyToken') : t('serverSettings.apiToken')}
              value={apiTokenDisplayValue}
              onChange={(e) => updateCurrentToken(e.target.value)}
              fullWidth
              margin="normal"
              type={showApiToken ? "text" : "password"}
              disabled={!canEditCredentials}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowApiToken(!showApiToken)}
                    edge="end"
                    disabled={!canEditCredentials}
                    aria-label={showApiToken ? t('serverSettings.hideApiToken') : t('serverSettings.showApiToken')}
                  >
                    {showApiToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                ),
              }}
            />
            <Tooltip title={editingUseProxy ? t('serverSettings.proxyTokenInfo') : t('serverSettings.apiTokenInfo')}>
              <InfoIcon color="action" sx={{ ml: 1 }} />
            </Tooltip>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={editingUseAuth}
                onChange={(e) => setEditingUseAuth(e.target.checked)}
                disabled={!canEditCredentials}
              />
            }
            label={t('serverSettings.useAuth')}
          />

          <FormControlLabel
            control={
              <Switch
                checked={editingUseProxy}
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
            >
              {t('common.reset')}
            </Button>
          </Box>

          {apiStatus && apiStatus.status !== 'unknown' && (
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