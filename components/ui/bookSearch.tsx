'use client';

import { useState, useCallback } from 'react';
import { debounce } from '@/lib/utils';
import { Search } from 'lucide-react';

interface Book {
  _id: string;
  title: string;
  author: string;
  slug: string;
  coverURL?: string;
}

interface BookSearchProps {
  onSearchResults: (books: Book[]) => void;
  onClearSearch: () => void;
}

export default function BookSearch({ onSearchResults, onClearSearch }: BookSearchProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        onClearSearch();
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/search-books?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();

        if (data.success) {
          onSearchResults(data.data);
        } else {
          onSearchResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        onSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500),
    [onSearchResults, onClearSearch]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    performSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onClearSearch();
  };

  return (
    <div className=' mb-6'>
      <div className='relative w-full max-w-md'>
        <div className='flex gap-2 w-full pl-2 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white'>
          <Search/>
        <input
          type='text'
          placeholder='Search by book name or author...'
          value={query}
          onChange={handleInputChange}
          className='outline-0  border-0'
          />
        {query && (
          <button
            onClick={handleClear}
            className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          >
            ✕
          </button>
        )}
        {isLoading && (
          <span className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500'>
            ⏳
          </span>
        )}
      </div>
          </div>
    </div>
  );
}
