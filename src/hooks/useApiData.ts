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
import { useActiveApiUrl, useActiveApiToken, useServerProxy, useConfigStore } from '../store/useConfigStore';
import { selectActiveApiUrl, selectActiveApiToken, selectUseServerProxy } from '../store/configState';

export const useApiData = () => {
  const { config, forceProxyDisabled } = useConfig();
  const [lastConfigHash, setLastConfigHash] = useState('');

  // 分離されたエンドポイント/トークンからアクティブな値を取得
  const activeApiUrl = useActiveApiUrl();
  const activeApiToken = useActiveApiToken();
  const { useServerProxy: effectiveUseServerProxy } = useServerProxy();

  // 設定ストアへの直接アクセス
  const store = useConfigStore();

  // API状態を購読
  const apiStatus = useApiStatus();
  const selectedModel = useSelectedModel();

  // 状態更新用のディスパッチャー
  const updateApiStatus = useApiStatusUpdater();
  const updateApiOptions = useApiOptionsUpdater();
  const updateSelectedModel = useSelectedModelUpdater();
  const setApiOptionsLoading = useApiOptionsLoadingUpdater();

  // API設定を動的に生成（分離されたエンドポイント構成に対応）
  const apiConfig = useMemo(() => ({
    baseUrl: effectiveUseServerProxy ? '/whisper' : (activeApiUrl || undefined),
    token: activeApiToken || undefined,
    useServerProxy: effectiveUseServerProxy
  }), [effectiveUseServerProxy, activeApiUrl, activeApiToken]);

  // プロキシURLの取得（分離されたエンドポイント構成に対応）
  const getProxyUrl = useCallback(() => {
    if (forceProxyDisabled || !effectiveUseServerProxy) {
      return activeApiUrl || '';
    }
    return '/whisper';
  }, [effectiveUseServerProxy, activeApiUrl, forceProxyDisabled]);

  // APIオプションとステータスの取得
  const fetchApiData = useCallback(async () => {
    // 最新の状態を直接取得して使用（Reactフックの更新タイミング問題を回避）
    const currentState = store.getState();
    const currentActiveApiUrl = selectActiveApiUrl(currentState);
    const currentActiveApiToken = selectActiveApiToken(currentState);
    const currentEffectiveUseServerProxy = selectUseServerProxy(currentState);

    try {
      setApiOptionsLoading(true);
      
      // 最新の状態に基づいてプロキシURLを計算
      let proxyUrl;
      if (forceProxyDisabled || !currentEffectiveUseServerProxy) {
        proxyUrl = currentActiveApiUrl || '';
      } else {
        proxyUrl = '/whisper';
      }
      
      const useProxyMode = !forceProxyDisabled && currentEffectiveUseServerProxy;
      const url = getApiEndpoint(proxyUrl, API_ENDPOINTS.OPTIONS, useProxyMode);
      
      const apiToken = currentActiveApiToken || undefined;
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
  }, [store, forceProxyDisabled, updateApiStatus, updateApiOptions, updateSelectedModel, selectedModel, setApiOptionsLoading]);

  // 設定変更時にAPIフェッチをトリガー（分離されたエンドポイント構成に対応）
  const handleServerSettingsChange = useCallback(() => {
    const newConfigHash = JSON.stringify({
      url: activeApiUrl,
      token: activeApiToken,
      proxy: effectiveUseServerProxy
    });
    
    if (newConfigHash !== lastConfigHash) {
      setLastConfigHash(newConfigHash);
      if (activeApiUrl || effectiveUseServerProxy) {
        fetchApiData();
      }
    }
  }, [activeApiUrl, activeApiToken, effectiveUseServerProxy, lastConfigHash, fetchApiData]);

  return {
    apiStatus,
    apiConfig,
    lastConfigHash,
    setLastConfigHash,
    fetchApiData,
    handleServerSettingsChange
  };
};
