import { TranscriptionSegment } from '../types';

export const parseResponse = (response: any): TranscriptionSegment[] => {
  if (!response || !response.segments) {
    return [];
  }

  return response.segments.map((segment: any) => ({
    id: segment.id,
    start: segment.start,
    end: segment.end,
    text: segment.text
  }));
};

export const downloadTranscription = (segments: TranscriptionSegment[], fileName: string) => {
  const text = segments.map(segment => segment.text).join('\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const formatTime = (seconds: number, format: 'vtt' | 'srt' = 'vtt'): string => {
  // Handle invalid inputs
  if (!isFinite(seconds) || seconds < 0) {
    seconds = 0;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  if (format === 'srt') {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}; 