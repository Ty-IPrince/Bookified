import React from 'react'
import HeroSection from '@/components/ui/heroSection'
import HomePageClient from '@/components/ui/homePageClient'
import { getAllbooks } from '@/lib/actions/book.actions'

export const dynamic = 'force-dynamic'

const page = async () => {

  const bookresult: Awaited<ReturnType<typeof getAllbooks>> = await getAllbooks();
  const books = bookresult.success ? bookresult.data ?? []: [];

  return (
    <div >
      <HeroSection />

      <div className='w-full px-5 md:px-7 lg:px-40'>
        <HomePageClient initialBooks={books} />
      </div>
    </div>
  )
}

export default page
