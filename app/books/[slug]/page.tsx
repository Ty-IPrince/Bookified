import React from 'react';
import { getbookbyslug } from '@/lib/actions/book.actions';
import { redirect } from 'next/navigation';
import {auth} from '@clerk/nextjs/server'
import VapiControls from '@/components/ui/vapiControls';

type Props = {
  params: Promise<{
    slug?: string | string[];
  }>;
};

export default async function Page({ params }: Props) {

  const { userId } = await auth()


  // ✅ Then resolve params
  const { slug: rawSlug } = await params;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug ?? '';

  // Resolve signed-in user (centralized)

 console.log(`UserId : ${userId}`)
  if (!userId) {
    redirect('/');
  }

  // ✅ Fetch data
  const res = await getbookbyslug(slug);

  if (!res.success) {
    return (
      <main className="book-page-container">
        <div className="wrapper">
          <div className="mt-20 text-center">Book not found</div>
        </div>
      </main>
    );
  }
  
    const book: any = res.data;

  return (
   <VapiControls book={book}/>
  );
}
