import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioUploader } from '@/components/audio/AudioUploader';

// Mock the confirm hook
vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => ({
    confirm: vi.fn().mockResolvedValue(true),
    ConfirmDialogComponent: null,
  }),
}));

// Mock the audio API
vi.mock('@/services/audioAPI', () => ({
  audioAPI: {
    uploadAudio: vi.fn().mockResolvedValue('https://cdn.example.com/audio/test.mp3'),
    deleteAudio: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock getAuthToken
vi.mock('@/services/api', () => ({
  API_BASE_URL: 'http://localhost:8787',
  getAuthToken: vi.fn().mockResolvedValue('test-token'),
}));

describe('AudioUploader', () => {
  const defaultProps = {
    lessonId: 'lesson-123',
    context: 'test_context',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render upload zone when no audio', () => {
    render(<AudioUploader {...defaultProps} />);
    
    expect(screen.getByText(/Drop MP3 here or click to upload/i)).toBeInTheDocument();
  });

  it('should show audio controls when audioUrl is provided', () => {
    render(
      <AudioUploader 
        {...defaultProps} 
        audioUrl="https://cdn.example.com/test.mp3" 
      />
    );
    
    expect(screen.getByText(/Audio uploaded/i)).toBeInTheDocument();
  });

  it('should validate file type', async () => {
    render(<AudioUploader {...defaultProps} />);
    
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = document.querySelector('input[type="file"]');
    
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }
    
    await waitFor(() => {
      expect(screen.getByText(/Only MP3 files are allowed/i)).toBeInTheDocument();
    });
  });

  it('should validate file size', async () => {
    render(<AudioUploader {...defaultProps} />);
    
    // Create a file larger than 5MB
    const largeContent = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeContent], 'large.mp3', { type: 'audio/mpeg' });
    const input = document.querySelector('input[type="file"]');
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        configurable: true,
      });
      fireEvent.change(input);
    }
    
    await waitFor(() => {
      expect(screen.getByText(/File too large/i)).toBeInTheDocument();
    });
  });

  it('should render mini version', () => {
    render(<AudioUploader {...defaultProps} mini />);
    
    // Mini version should have smaller elements
    const uploadIcon = document.querySelector('svg');
    expect(uploadIcon).toBeInTheDocument();
  });

  it('should handle drag events', () => {
    render(<AudioUploader {...defaultProps} />);
    
    const dropZone = screen.getByText(/Drop MP3 here/i).closest('label');
    
    if (dropZone) {
      fireEvent.dragEnter(dropZone);
      expect(dropZone).toHaveClass('border-primary');
      
      fireEvent.dragLeave(dropZone);
      expect(dropZone).not.toHaveClass('border-primary');
    }
  });
});

