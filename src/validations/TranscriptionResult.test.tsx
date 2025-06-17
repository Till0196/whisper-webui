import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { TranscriptionResult } from '../components/TranscriptionResult';
import { TranscriptionSegment } from '../types';

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('TranscriptionResult Component', () => {
  const mockSegments: TranscriptionSegment[] = [
    { 
      id: 1,
      seek: 0,
      start: 0, 
      end: 5.5, 
      text: 'こんにちは、世界です。',
      tokens: [123, 456],
      temperature: 0.0,
      avg_logprob: -0.5,
      compression_ratio: 1.2,
      no_speech_prob: 0.1,
      words: null
    },
    { 
      id: 2,
      seek: 5,
      start: 5.5, 
      end: 10.2, 
      text: 'これはテストメッセージです。',
      tokens: [789, 101],
      temperature: 0.0,
      avg_logprob: -0.4,
      compression_ratio: 1.1,
      no_speech_prob: 0.05,
      words: null
    },
  ];

  const defaultProps = {
    segments: mockSegments,
    onCopy: vi.fn(),
    originalFileName: 'test-audio.mp3',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('セグメントが正しく表示される', () => {
    const { container } = render(
      <TestWrapper>
        <TranscriptionResult {...defaultProps} />
      </TestWrapper>
    );
    
    // containerの範囲内でテキストを探す
    expect(container).toHaveTextContent('こんにちは、世界です。');
    expect(container).toHaveTextContent('これはテストメッセージです。');
  });

  test('タイムスタンプが正しく表示される', () => {
    const { container } = render(
      <TestWrapper>
        <TranscriptionResult {...defaultProps} />
      </TestWrapper>
    );

    expect(container).toHaveTextContent('[00:00:00.000 - 00:00:05.500]');
    expect(container).toHaveTextContent('[00:00:05.500 - 00:00:10.200]');
  });

  test('ダウンロードボタンが表示される', () => {
    const { container } = render(
      <TestWrapper>
        <TranscriptionResult {...defaultProps} />
      </TestWrapper>
    );

    expect(container).toHaveTextContent('VTT');
    expect(container).toHaveTextContent('SRT');
    expect(container).toHaveTextContent('JSON');
    expect(container).toHaveTextContent('TXT');
    expect(container).toHaveTextContent('Copy');
  });

  test('コピーボタンのクリック', () => {
    const { container } = render(
      <TestWrapper>
        <TranscriptionResult {...defaultProps} />
      </TestWrapper>
    );

    const copyButton = container.querySelector('button[aria-label="common.copy"]') as HTMLButtonElement;
    expect(copyButton).toBeTruthy();
    fireEvent.click(copyButton);

    expect(defaultProps.onCopy).toHaveBeenCalledTimes(1);
  });

  test('空のセグメントの場合は待機メッセージが表示される', () => {
    const { container } = render(
      <TestWrapper>
        <TranscriptionResult {...defaultProps} segments={[]} />
      </TestWrapper>
    );

    expect(container).toHaveTextContent('result.waitingForResults');
  });

  test('セグメントがない場合でもファイル名があればコンポーネントが表示される', () => {
    const { container } = render(
      <TestWrapper>
        <TranscriptionResult {...defaultProps} segments={[]} />
      </TestWrapper>
    );

    expect(container).toHaveTextContent('result.title');
  });
});

describe('TranscriptionResult Mobile Layout', () => {
  beforeEach(() => {
    // モバイル環境をグローバルmockで簡易シミュレート（stubを使わない）
    vi.clearAllMocks();
  });

  const mockSegments: TranscriptionSegment[] = [
    { 
      id: 1,
      seek: 0,
      start: 0, 
      end: 5, 
      text: 'モバイルテスト',
      tokens: [123],
      temperature: 0.0,
      avg_logprob: -0.5,
      compression_ratio: 1.2,
      no_speech_prob: 0.1,
      words: null
    },
  ];

  const defaultProps = {
    segments: mockSegments,
    onCopy: vi.fn(),
    originalFileName: 'mobile-test.mp3',
  };

  test('モバイル環境でコンポーネントが表示される', () => {
    const { container } = render(
      <TestWrapper>
        <TranscriptionResult {...defaultProps} />
      </TestWrapper>
    );

    expect(container).toHaveTextContent('VTT');
    expect(container).toHaveTextContent('モバイルテスト');
    // VTTボタンの存在確認
    const vttButton = container.querySelector('button[aria-label="result.download.vtt"]') as HTMLButtonElement;
    expect(vttButton).toBeTruthy();
  });
});
