'use client';

import { useState } from 'react';
import BookSearch from './bookSearch';
import BookCard from './bookCard';
import { IBook } from '@/types';

interface HomePageClientProps {
  initialBooks: Partial<IBook>[];
}

export default function HomePageClient({ initialBooks }: HomePageClientProps) {
  const [searchResults, setSearchResults] = useState<Partial<IBook>[] | null>(null);
  const [displayBooks, setDisplayBooks] = useState<Partial<IBook>[]>(initialBooks);

  const handleSearchResults = (books: Partial<IBook>[]) => {
    setSearchResults(books);
    setDisplayBooks(books);
  };

  const handleClearSearch = () => {
    setSearchResults(null);
    setDisplayBooks(initialBooks);
  };

  return (
    <>
      <div className='w-full h-auto my-2.5'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold mb-6'>Recent Book</h1>
          <BookSearch onSearchResults={handleSearchResults} onClearSearch={handleClearSearch} />
        </div>
      </div>
      <div className='library-books-grid w-full'>
        {displayBooks.length > 0 ? (
          displayBooks
            .filter((book) => book.title && book.author && book.slug)
            .map((book) => (
              <BookCard
                key={book._id}
                title={book.title!}
                author={book.author!}
                coverURL={book.coverURL ?? ''}
                slug={book.slug!}
              />
            ))
        ) : (
          <p className='text-gray-500 col-span-full text-center py-8'>
            {searchResults !== null ? 'No books found matching your search.' : 'No books available.'}
          </p>
        )}
      </div>
    </>
  );
}
