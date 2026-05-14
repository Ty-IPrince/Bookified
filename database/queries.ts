import { connectToDatabase } from '@/database/mongoose';
import Book from '@/database/models/book.model';
import VoiceSession from '@/database/models/voiceSession.model'; // create this model if missing

export async function getUserBooksCount(userId: string): Promise<number> {
  await connectToDatabase();
  return Book.countDocuments({ clerkId: userId });
}

export async function getMonthlySessionCount(userId: string): Promise<number> {
  await connectToDatabase();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return VoiceSession.countDocuments({
    clerkId : userId,
    createdAt: { $gte: startOfMonth }
  });
}