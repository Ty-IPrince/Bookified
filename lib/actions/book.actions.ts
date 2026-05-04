'use server'

import { connectToDatabase } from "@/database/mongoose";
import { CreateBook, TextSegment } from "@/types";
import { escapeRegex, genrateslug, serializedata } from "@/lib/utils";
import Book from "@/database/models/book.model";
import BookSegment from "@/database/models/bookSegment.model";
import mongoose from "mongoose";


export const getAllbooks = async()=>{
    try {
        await connectToDatabase();

        const books = await Book.find().sort({ createdAt: -1 }).lean();
        return serializedata({ success: true, data: books.map(serializedata) });
        
    }catch(e){
        console.error("Error fetching books:", e);
        return serializedata({ success: false, data : [],error: e });
    }
}

export const checkBookExists = async (title: string) => {
    try {
        await connectToDatabase();

        const slug = genrateslug(title);
        const existingBook = await Book.findOne({ slug });

        if (existingBook) {
            return serializedata({
                exist: true,
                data: serializedata(existingBook)
            })
        }
        else {
            return {
                exist: false,
                data: null
            }
        }
    } catch (e) {
        console.error("Error checking book exist:", e);
        return serializedata({ exist: false, error: e , data: null});
    }
}

export const createbook = async (data: CreateBook) => {
    try {
        await connectToDatabase();

        const slug = genrateslug(data.title);

        const existingBook = await Book.findOne({ slug }).lean();

        if (existingBook) {
            return serializedata({
                success: true,
                data: serializedata(existingBook),
                alreadyExists: true,
            })
        }

        // Todo : check subscription limits before creating book

        const book = await Book.create({ ...data, slug, totalSegments: 0 });

        return serializedata({
            success: true,
            data: serializedata(book),
            alreadyExists: false,
        })

    } catch (error) {
        console.error("Database connection error:", error);
        return serializedata({ success: false, message: "Database connection failed" , alreadyExists : false , data: ''});

    }


};

export const saveBookSegments = async (bookId: string, clerkId: string, segments: TextSegment[]) => {
    try {

        await connectToDatabase();

        const segmentToInsert = segments.map((segment) => ({
            clerkId,
            bookId,
            content: segment.text,
            segmentIndex: segment.segmentIndex,
            pageNumber: (segment as any).pageNumber,
            wordCount: segment.wordCount,
        }));

        await BookSegment.insertMany(segmentToInsert);
        await Book.findByIdAndUpdate(bookId, { totalSegments: segments.length });

        console.log('Book segments saved successfully')

        return serializedata({ success: true, data: { SegmentCreated: segments.length } });
    } catch (error) {
        console.error("Error saving book segments:", error);

        await BookSegment.deleteMany({ bookId })
        await Book.findByIdAndDelete(bookId);

        return serializedata({ success: false, message: "Failed to save book segments" });
    }

};

export const getbookbyslug = async (slug: string) => {
    try {
        await connectToDatabase();

        const book = await Book.findOne({ slug }).lean();

        if (!book) {
            return serializedata({ success: false, error: "Book not found" ,data : '' });
        }

        return { success: true, data: serializedata(book) };
    } catch (e) {
        console.error("Error fetching book by slug:", e);
        return serializedata({ success: false, error: e ,data : ''});
    }
};

export const searchBookSegment = async (bookId: string, query: string, numSegments: number = 3) => {
    try {
        await connectToDatabase();

        if (!bookId || !query) {
            return serializedata({ success: false, error: 'Missing bookId or query' , data: [] });
        }

        const bookObjectId = new mongoose.Types.ObjectId(bookId);

        let segments : Record<string, any>[] = [];
        try{
        segments = await BookSegment.find(
            { bookId : bookObjectId, $text: { $search: query } },
            { score: { $meta: 'textScore' }, content: 1 }
        )
        
            .select('_id bookId content segmentIndex pageNumber wordCount')
            .sort({ score: { $meta: 'textScore' } })
            .limit(Number(numSegments) || 3)
            .lean();
    }catch(e){
        segments = [];
    }
        if (segments.length === 0) {
            const keywords = query.split(/\s+/).filter((k) => k.length > 2)
            const pattens = keywords.map(escapeRegex).join('|')

            segments = await BookSegment.find(
            { bookId : bookObjectId,
             content : { $regex: pattens , $options : 'i' } },
        )
        
            .select('_id bookId content segmentIndex pageNumber wordCount')
            .sort({segmentIndex : 1})
            .limit(Number(numSegments) || 3)
            .lean();   

        }
        
        console.log(`Search complete. Found ${segments.length} results`);

        return serializedata({ success: true, data: segments});
    } catch (e) {
        console.error('Error searching segments:', e);
        return {
            success: false,
            error: (e as Error).message,
            data: [],
        };
    }
}
