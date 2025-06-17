import { useEffect } from 'react';
import { preInitializeFFmpeg, getFFmpegInitializationStatus } from '../lib';
import { useFFmpegPreInitStatusUpdater } from '../store';

export const useFFmpegInitialization = () => {
  const updateFFmpegPreInitStatus = useFFmpegPreInitStatusUpdater();

  useEffect(() => {
    const initializeFFmpeg = async () => {
      const status = getFFmpegInitializationStatus();
      
      // 既に初期化済みまたは初期化中の場合はスキップ
      if (status.isInitialized || status.isInitializing) {
        updateFFmpegPreInitStatus({
          isInitializing: status.isInitializing,
          isInitialized: status.isInitialized,
          initError: null
        });
        return;
      }

      updateFFmpegPreInitStatus({
        isInitializing: true,
        isInitialized: false,
        initError: null
      });

      try {
        await preInitializeFFmpeg(
          undefined, // onLog - ここではログを出力しない
          (message) => {
            // プログレスメッセージはコンソールに出力
            console.info(`[FFmpeg Pre-init] ${message}`);
          }
        );
        
        updateFFmpegPreInitStatus({
          isInitializing: false,
          isInitialized: true,
          initError: null
        });
      } catch (error) {
        console.warn('FFmpeg pre-initialization failed:', error);
        updateFFmpegPreInitStatus({
          isInitializing: false,
          isInitialized: false,
          initError: error instanceof Error ? error.message : String(error)
        });
      }
    };

    // ページ読み込み後に少し遅延してから初期化を開始
    const timer = setTimeout(initializeFFmpeg, 500);
    
    return () => clearTimeout(timer);
  }, [updateFFmpegPreInitStatus]);
};
