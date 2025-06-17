import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkApiHealth } from '../lib/whisperApi';

describe('Simple API Test', () => {
  const mockFetch = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  it('should call fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"status":"healthy"}')
    });

    await checkApiHealth('http://localhost:8000');
    
    console.log('Mock fetch calls:', mockFetch.mock.calls.length);
    expect(mockFetch).toHaveBeenCalled();
  });
});
