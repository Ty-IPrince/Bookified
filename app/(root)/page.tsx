import React from 'react'
import HeroSection from '@/components/ui/heroSection'
import { sampleBooks } from '@/lib/constants'
import BookCard from '@/components/ui/bookCard'
import { getAllbooks } from '@/lib/actions/book.actions'

const page = async () => {

  const bookresult = await getAllbooks();
  console.log(bookresult)
  const books = bookresult.success ? bookresult.data ?? []: [];
  console.log(books)

  return (
    <div >
      <HeroSection />

      <div className='library-books-grid w-full px-5 md:px-7 lg:px-40'>
        {books.map((book) =>
          <BookCard key={book._id} title={book.title} author={book.author} coverURL={book.coverURL} slug={book.slug} />
        )}
      </div>
    </div>
  )
}

export default page
