import { useCallback, useMemo, useState } from 'react';
import { getApiEndpoint, fetchApiOptions, checkApiHealth, API_ENDPOINTS } from '../lib';
import {
  useApiStatus,
  useApiStatusUpdater,
  useSelectedModel,
  useApiOptionsUpdater,
  useSelectedModelUpdater,
  useApiOptionsLoadingUpdater,
} from '../store';
import { useConfig } from './useConfig';

export const useApiData = () => {
  const { config, forceProxyDisabled } = useConfig();
  const [lastConfigHash, setLastConfigHash] = useState('');

  // API状態を購読
  const apiStatus = useApiStatus();
  const selectedModel = useSelectedModel();

  // 状態更新用のディスパッチャー
  const updateApiStatus = useApiStatusUpdater();
  const updateApiOptions = useApiOptionsUpdater();
  const updateSelectedModel = useSelectedModelUpdater();
  const setApiOptionsLoading = useApiOptionsLoadingUpdater();

  // API設定を動的に生成
  const apiConfig = useMemo(() => ({
    baseUrl: config.useServerProxy ? '/whisper' : (config.whisperApiUrl || undefined),
    token: config.whisperApiToken || undefined,
    useServerProxy: config.useServerProxy
  }), [config.useServerProxy, config.whisperApiUrl, config.whisperApiToken]);

  // プロキシURLの取得
  const getProxyUrl = useCallback(() => {
    if (forceProxyDisabled || !config.useServerProxy) {
      return config.whisperApiUrl || '';
    }
    return '/whisper';
  }, [config.useServerProxy, config.whisperApiUrl, forceProxyDisabled]);

  // APIオプションとステータスの取得
  const fetchApiData = useCallback(async () => {
    try {
      setApiOptionsLoading(true);
      
      const proxyUrl = getProxyUrl();
      const useProxyMode = !forceProxyDisabled && config.useServerProxy;
      const url = getApiEndpoint(proxyUrl, API_ENDPOINTS.OPTIONS, useProxyMode);
      
      const apiToken = config.whisperApiToken || undefined;
      const options = await fetchApiOptions(url, apiToken);
      
      updateApiOptions(options);
      
      const healthStatus = await checkApiHealth(proxyUrl, apiToken);
      updateApiStatus(healthStatus);

      // ヘルスチェックが成功し、モデルが未選択の場合は最初のモデルを選択
      if (healthStatus.status === 'healthy' && !selectedModel && options.models.length > 0) {
        const firstModel = options.models[0];
        updateSelectedModel(firstModel.id);
      }
    } catch (error) {
      updateApiStatus({
        status: 'error',
        message: 'Connection to API server failed',
        details: error instanceof Error ? error.stack || error.message : String(error)
      });
      updateApiOptions({ models: [], responseFormats: [], timestampGranularities: [], languages: [] });
    } finally {
      setApiOptionsLoading(false);
    }
  }, [getProxyUrl, config.useServerProxy, config.whisperApiToken, updateApiStatus, updateApiOptions, updateSelectedModel, selectedModel, forceProxyDisabled, setApiOptionsLoading]);

  // 設定変更時にAPIフェッチをトリガー
  const handleServerSettingsChange = useCallback(() => {
    const newConfigHash = JSON.stringify({
      url: config.whisperApiUrl,
      token: config.whisperApiToken,
      proxy: config.useServerProxy
    });
    
    if (newConfigHash !== lastConfigHash) {
      setLastConfigHash(newConfigHash);
      if (config.whisperApiUrl || config.useServerProxy) {
        fetchApiData();
      }
    }
  }, [config.whisperApiUrl, config.whisperApiToken, config.useServerProxy, lastConfigHash, fetchApiData]);

  return {
    apiStatus,
    apiConfig,
    lastConfigHash,
    setLastConfigHash,
    fetchApiData,
    handleServerSettingsChange
  };
};
