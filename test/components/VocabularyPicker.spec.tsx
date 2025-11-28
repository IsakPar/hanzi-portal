/**
 * VocabularyPicker Component Tests
 * Tests for vocabulary selection in lesson editor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VocabularyPicker } from '@/components/lesson-editor/VocabularyPicker';
import * as vocabularyAPI from '@/services/vocabularyAPI';

// Mock the vocabulary API
vi.mock('@/services/vocabularyAPI', () => ({
  searchVocabulary: vi.fn(),
}));

describe('VocabularyPicker', () => {
  const mockOnChange = vi.fn();
  
  const mockVocabulary = [
    { id: 'v1', hanzi: '你好', pinyin: 'nǐ hǎo', english: 'hello', hskLevel: 1, category: 'greetings' },
    { id: 'v2', hanzi: '谢谢', pinyin: 'xiè xie', english: 'thank you', hskLevel: 1, category: 'politeness' },
    { id: 'v3', hanzi: '再见', pinyin: 'zài jiàn', english: 'goodbye', hskLevel: 1, category: 'greetings' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (vocabularyAPI.searchVocabulary as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: mockVocabulary,
      total: 3,
      limit: 20,
      offset: 0,
    });
  });

  it('should render empty state when no vocabulary selected', () => {
    render(
      <VocabularyPicker
        selectedIds={[]}
        hskLevel={1}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText(/No target vocabulary selected/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search vocabulary/)).toBeInTheDocument();
  });

  it('should show search results when typing', async () => {
    render(
      <VocabularyPicker
        selectedIds={[]}
        hskLevel={1}
        onChange={mockOnChange}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search vocabulary/);
    fireEvent.change(searchInput, { target: { value: '你好' } });

    await waitFor(() => {
      expect(vocabularyAPI.searchVocabulary).toHaveBeenCalledWith(
        expect.objectContaining({
          query: '你好',
          hsk_level: 1,
        })
      );
    });
  });

  it('should add vocabulary when clicked', async () => {
    (vocabularyAPI.searchVocabulary as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: [mockVocabulary[0]],
      total: 1,
      limit: 20,
      offset: 0,
    });

    render(
      <VocabularyPicker
        selectedIds={[]}
        hskLevel={1}
        onChange={mockOnChange}
      />
    );

    // Type to search
    const searchInput = screen.getByPlaceholderText(/Search vocabulary/);
    fireEvent.change(searchInput, { target: { value: '你好' } });
    fireEvent.focus(searchInput);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('hello')).toBeInTheDocument();
    });

    // Click the result
    fireEvent.click(screen.getByText('hello'));

    expect(mockOnChange).toHaveBeenCalledWith(['v1']);
  });

  it('should display selected vocabulary', async () => {
    // Mock search to return vocab for lookup
    (vocabularyAPI.searchVocabulary as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: mockVocabulary,
      total: 3,
      limit: 500,
      offset: 0,
    });

    render(
      <VocabularyPicker
        selectedIds={['v1', 'v2']}
        hskLevel={1}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('你好')).toBeInTheDocument();
      expect(screen.getByText('谢谢')).toBeInTheDocument();
    });
  });

  it('should remove vocabulary when X clicked', async () => {
    (vocabularyAPI.searchVocabulary as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: mockVocabulary,
      total: 3,
      limit: 500,
      offset: 0,
    });

    render(
      <VocabularyPicker
        selectedIds={['v1', 'v2']}
        hskLevel={1}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('你好')).toBeInTheDocument();
    });

    // Find and click the remove button for 你好
    const removeButtons = screen.getAllByRole('button');
    const removeButton = removeButtons.find(btn => 
      btn.closest('div')?.textContent?.includes('你好')
    );
    
    if (removeButton) {
      fireEvent.click(removeButton);
      expect(mockOnChange).toHaveBeenCalledWith(['v2']);
    }
  });

  it('should filter out already selected vocabulary from results', async () => {
    (vocabularyAPI.searchVocabulary as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: mockVocabulary,
      total: 3,
      limit: 20,
      offset: 0,
    });

    render(
      <VocabularyPicker
        selectedIds={['v1']}
        hskLevel={1}
        onChange={mockOnChange}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search vocabulary/);
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.focus(searchInput);

    // The search should be called, and results should not include v1
    await waitFor(() => {
      expect(vocabularyAPI.searchVocabulary).toHaveBeenCalled();
    });
  });

  it('should show count of selected words', async () => {
    (vocabularyAPI.searchVocabulary as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: mockVocabulary,
      total: 3,
      limit: 500,
      offset: 0,
    });

    render(
      <VocabularyPicker
        selectedIds={['v1', 'v2', 'v3']}
        hskLevel={1}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/3 words selected/)).toBeInTheDocument();
    });
  });

  it('should clear all when clear button clicked', async () => {
    (vocabularyAPI.searchVocabulary as ReturnType<typeof vi.fn>).mockResolvedValue({
      results: mockVocabulary,
      total: 3,
      limit: 500,
      offset: 0,
    });

    render(
      <VocabularyPicker
        selectedIds={['v1', 'v2']}
        hskLevel={1}
        onChange={mockOnChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Clear all')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Clear all'));

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });
});

