'use client';

import { useState } from 'react';
import BookSearch from './bookSearch';
import BookCard from './bookCard';

interface Book {
  _id: string;
  title: string;
  author: string;
  slug: string;
  coverURL?: string;
}

interface HomePageClientProps {
  initialBooks: Book[];
}

export default function HomePageClient({ initialBooks }: HomePageClientProps) {
  const [searchResults, setSearchResults] = useState<Book[] | null>(null);
  const [displayBooks, setDisplayBooks] = useState<Book[]>(initialBooks);

  const handleSearchResults = (books: Book[]) => {
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
          displayBooks.map((book) => (
            <BookCard
              key={book._id}
              title={book.title}
              author={book.author}
              coverURL={book.coverURL ?? ''}
              slug={book.slug}
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
