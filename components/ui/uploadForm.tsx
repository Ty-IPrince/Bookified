"use client"

import * as React from 'react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UploadCloud, ImageIcon } from 'lucide-react'
import { voiceOptions as VOICE_OPTIONS_CONST, voiceCategories, DEFAULT_VOICE } from '@/lib/constants'
import { Button } from './button'
import { uploadSchema } from '@/lib/zod'
import { toast } from 'sonner'
import { useAuth, useUser } from "@clerk/nextjs";
import { checkBookExists, createbook, saveBookSegments } from '@/lib/actions/book.actions'
import { useRouter } from 'next/navigation'
import { parsePDFFile } from '@/lib/utils'
import { upload } from '@vercel/blob/client'
import Loading from './loading'

type UploadFormInput = z.input<typeof uploadSchema>
type UploadFormOutput = z.output<typeof uploadSchema>

const voiceOptions = Object.entries(VOICE_OPTIONS_CONST).map(([key, info]) => {
  const group = voiceCategories?.male?.includes(key)
    ? 'Male Voices'
    : voiceCategories?.female?.includes(key)
      ? 'Female Voices'
      : 'Voices'

  return {
    value: key,
    label: info.name,
    description: info.description,
    group,
  }
})

const formatSelectedFile = (fileList?: FileList | null) => {
  if (!fileList || fileList.length === 0) return null
  return fileList[0].name
}

const UploadForm = () => {
  const { userId } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UploadFormInput, any, UploadFormOutput>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: '',
      author: '',
      voice: '',
      pdfFile: undefined,
      coverImage: undefined,
    },
  })

  const pdfFile = watch('pdfFile') as FileList | undefined
  const coverImage = watch('coverImage') as FileList | undefined
  const selectedpdfFile = formatSelectedFile(pdfFile)
  const selectedCoverImage = formatSelectedFile(coverImage)

  const getErrorMessage = (error: unknown) => {
    if (!error || typeof error !== 'object') {
      return undefined
    }

    if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return (error as { message: string }).message
    }

    return undefined
  }

  const bookFileError = getErrorMessage(errors.pdfFile)
  const coverImageError = getErrorMessage(errors.coverImage)

  const onSubmit = async (data: UploadFormOutput) => {
    if (!userId) {
      return toast.error("You must be signed in to upload a book.")
    }
    if (userId) {
      try {

        const existCheck = await checkBookExists(data.title)

        if (existCheck.exist && existCheck.data) {
          toast.info("A book with this title already exists. Please choose a different title.")
          reset()
          router.push(`/books/${existCheck.data.slug}`)
          return;
        }

        const filetitle = data.title.replace(/\s+/g, "-").toLowerCase();
        const pdfFile = data.pdfFile;
        const parsePDF = await parsePDFFile(pdfFile)

        if (parsePDF.content.length === 0) {
          toast.error("Failed to parse PDF content. Please ensure the file is a valid PDF and try again.")
          return;
        }

        const uploadedPDFBlob = await upload(filetitle, pdfFile, {
          access: 'public',
          handleUploadUrl: '/api/uploads',
          contentType: 'application/pdf'
        })

        let coverUrl: string;

        if (data.coverImage) {
          const uploadedcoverBlob = await upload(`${filetitle}_cover.png`, data.coverImage, {
            access: 'public',
            handleUploadUrl: '/api/uploads',
            contentType: 'image/png'
          })
          coverUrl = uploadedcoverBlob.url;
        } else {
          const response = await fetch(parsePDF.cover)
          const blob = await response.blob();

          const uploadedcoverBlob = await upload(`${filetitle}_cover.png`, blob, {
            access: 'public',
            handleUploadUrl: '/api/uploads',
            contentType: 'image/png'
          })
          coverUrl = uploadedcoverBlob.url;
        }
        const book = await createbook({
          clerkId: userId,
          title: data.title,
          author: data.author,
          persona: data.voice,
          fileBlobKey: uploadedPDFBlob.pathname,
          fileURL: uploadedPDFBlob.url,
          coverURL: coverUrl,
          fileSize: pdfFile.size,
        })
        console.log(book)
        if(book.success === false) {
          toast.error(book.error || "Failed to create book record in database.");
          return;
        }
        if(book.alreadyExists){
          toast.info("Book already exists.");
          reset();
          router.push(`/books/${book.data.slug}`);
          return;
        }

        const segments = await saveBookSegments(book.data._id, userId, parsePDF.content)

        if(!segments.success) {
          toast.error("Failed to save book segments. Please try again.")
          throw new Error("Failed to save book segments in database.")
        };

        reset();
        router.push("/")

      } catch (e) {
        console.error('Error during upload:', e)
        toast.error("An error occurred during upload. Please try again.")
      }
    }
  }

  return (
    <section className="mx-auto mt-10 max-w-4xl rounded-[12px] bg-white/90 border border-[rgba(33,42,59,0.08)] p-8 shadow-soft-md">
      {isSubmitting && <Loading message="Uploading book — this may take a few moments." />}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
        <div className="space-y-8">
          <div>
            <label className="text-base font-medium text-(--text-primary)">Book PDF File</label>
            <label
              htmlFor="pdfFile"
              className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[12px] border border-[rgba(33,42,59,0.12)] bg-[#fcf6ed] px-6 py-12 text-center transform transition-transform duration-150 ease-in-out hover:-translate-y-1 hover:scale-100 hover:shadow-soft-lg"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#e9dcc8] text-(--text-primary)">
                <UploadCloud size={28} />
              </div>
              <p className="text-lg font-semibold text-(--text-primary)">Click to upload PDF</p>
              <p className="text-sm text-(--text-secondary)">PDF file (max 50MB)</p>
              {selectedpdfFile ? (
                <p className="mt-2 text-sm text-(--text-primary)">Selected: {selectedpdfFile}</p>
              ) : (
                <p className="mt-2 text-sm text-(--text-secondary)">Drag & drop or browse files</p>
              )}
            </label>
            <input
              id="pdfFile"
              type="file"
              accept="application/pdf"
              className="sr-only"
              {...register('pdfFile')}
            />
            {bookFileError && (
              <p className="mt-2 text-sm text-red-600">{bookFileError}</p>
            )}
          </div>

          <div>
            <label className="text-base font-medium text-(--text-primary)">Cover Image (Optional)</label>
            <label
              htmlFor="coverImage"
              className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[12px] border border-[rgba(33,42,59,0.12)] bg-[#fcf6ed] px-6 py-12 text-center transform transition-transform duration-150 ease-in-out hover:-translate-y-1 hover:scale-100 hover:shadow-soft-lg"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#e9dcc8] text-(--text-primary)">
                <ImageIcon size={26} />
              </div>
              <p className="text-lg font-semibold text-(--text-primary)">Click to upload cover image</p>
              <p className="text-sm text-(--text-secondary)">Leave empty to auto-generate from PDF</p>
              {selectedCoverImage ? (
                <p className="mt-2 text-sm text-(--text-primary)">Selected: {selectedCoverImage}</p>
              ) : (
                <p className="mt-2 text-sm text-(--text-secondary)">Supported formats: JPG, PNG</p>
              )}
            </label>
            <input
              id="coverImage"
              type="file"
              accept="image/*"
              className="sr-only"
              {...register('coverImage')}
            />
            {coverImageError && (
              <p className="mt-2 text-sm text-red-600">{coverImageError}</p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="title" className="label">Title</label>
              <input
                id="title"
                placeholder="ex: Rich Dad Poor Dad"
                className="input-reset rounded-3xl w-full border border-[rgba(33,42,59,0.12)] bg-[#fffdf8] px-4 py-4 text-base text-(--text-primary) shadow-sm"
                {...register('title')}
              />
              {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="author" className="label">Author Name</label>
              <input
                id="author"
                placeholder="ex: Robert Kiyosaki"
                className="input-reset rounded-3xl w-full border border-[rgba(33,42,59,0.12)] bg-[#fffdf8] px-4 py-4 text-base text-(--text-primary) shadow-sm"
                {...register('author')}
              />
              {errors.author && <p className="text-sm text-red-600">{errors.author.message}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-base font-semibold text-(--text-primary)">Choose Assistant Voice</p>
            </div>
            <div className='pb-6 space-y-2'>
              <p className='text-gray-600 mt-2'>Male Voice</p>
              <div className="grid gap-4 md:grid-cols-3">
                {voiceOptions
                  .filter((option) => option.group === 'Male Voices')
                  .map((option) => (
                    <label
                      key={option.value}
                      className="has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 rounded-[22px] border border-[rgba(33,42,59,0.12)] bg-[#fffdf8] p-4 transform transition-transform duration-150 ease-in-out hover:scale-105 hover:shadow-soft-lg"
                    >
                      <input
                        type="radio"
                        value={option.value}
                        className="mr-3 accent-(--color-brand)"
                        {...register('voice')}
                      />
                      <span className="font-semibold text-(--text-primary)">{option.label}</span>
                      <p className="mt-2 text-sm text-(--text-secondary)">{option.description}</p>
                    </label>
                  ))}
              </div>
            </div>
            <div className='pb-6 space-y-2'>
              <p className='text-gray-600 mt-2'>Female Voice</p>
              <div className="grid gap-4 md:grid-cols-2">
                {voiceOptions
                  .filter((option) => option.group === 'Female Voices')
                  .map((option) => (
                    <label
                      key={option.value}
                      className="has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50 rounded-[22px] border border-[rgba(33,42,59,0.12)] bg-[#fffdf8] p-4 transform transition-transform duration-150 ease-in-out hover:scale-105 hover:shadow-soft-lg"
                    >
                      <input
                        type="radio"
                        value={option.value}
                        className="mr-3 accent-(--color-brand)"
                        {...register('voice')}
                      />
                      <span className="font-semibold text-(--text-primary)">{option.label}</span>
                      <p className="mt-2 text-sm text-(--text-secondary)">{option.description}</p>
                    </label>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full rounded-[18px] bg-[#663820] px-6 py-5 text-lg font-semibold text-white shadow-soft transform transition-transform duration-150 ease-in-out hover:bg-[#7a4528] hover:-translate-y-1 hover:shadow-soft-lg"
            disabled={isSubmitting}
          >
            Begin Synthesis
          </Button>
        </div>
      </form>
    </section>
  )
}

export default UploadForm