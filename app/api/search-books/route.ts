import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/database/mongoose";
import Book from "@/database/models/book.model";
import { auth } from "@clerk/nextjs/server";
import { serializedata } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Query is required" },
        { status: 400 }
      );
    }

    // Search by title or author (case-insensitive)
    const regex = new RegExp(query, "i");
    const books = await Book.find({
      clerkId: userId,
      $or: [{ title: regex }, { author: regex }],
    })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      data: books.map(serializedata),
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search books" },
      { status: 500 }
    );
  }
}
