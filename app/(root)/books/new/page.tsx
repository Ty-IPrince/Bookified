"use client"

import React from 'react'
import UploadForm from '@/components/ui/uploadForm'

const page = () => {
  return (
    <main className='pt-20 mx-auto px-5 md:px-7 lg:px-40'>
      <div>
      <h1 className='text-2xl font-bold'>Add New Book</h1>
      <p className='text-gray-600 mt-2'>Upload PDF to Generate intaractive interview</p>
      </div>

      <UploadForm />

    </main>
  )
}

export default page
