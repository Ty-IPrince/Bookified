import { NextResponse } from "next/server";
import { searchBookSegment } from "@/lib/actions/book.actions";

async function processBookSearch(bookId: unknown, query: unknown) {
  if (bookId == null || query == null || query === '') {
    return { success: false, error: 'Missing bookId or query' };
  }
  const bookIdStr = String(bookId)
  const queryStr = String(query).trim();

  if (!bookIdStr || bookIdStr === 'null' || bookIdStr === 'undefined' || !queryStr) {
    return { success: false, error: 'Invalid bookId or query' };
  }

  const searchResult = await searchBookSegment(bookIdStr, queryStr, 3);

  if (!searchResult.success) {
    return { result: 'No information found about this topic in the book.' };
  }

  const combinedText = searchResult.data.map((segment) => (segment as { content: string }).content).join('\n\n');

  return { result: combinedText };
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

function parseArgs(args: unknown): Record<string, unknown> {
  if (!args) return {};
  if (typeof args === 'string') {
    try { return JSON.parse(args); } catch { return {}; }
  }
  return args as Record<string, unknown>;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();


    const functionCall = body?.message?.functionCall;
    const toolCallList = body?.message?.toolCallList || body?.message?.toolCalls;

    if (functionCall) {
      const { name, parameters } = functionCall;
      const parsed = parseArgs(parameters);

      if (name === 'search_book') {
        const result = await processBookSearch(parsed.bookId, parsed.query);
        return NextResponse.json( result );
      }

      return NextResponse.json({ result: `Unknown function: ${name}` });
    }

    if (!toolCallList || toolCallList.length === 0) {
      return NextResponse.json({
        results: [{ result: 'No tool calls found' }],
      });
    }

    const results = [];
    for (const toolCall of toolCallList) {
            const { id, function: func } = toolCall;
            const name = func?.name;
            const args = parseArgs(func?.arguments);
      if (name === 'searchBook') {
        const searchResults = await processBookSearch(args.bookId, args.query);
        results.push({ toolCallId: id, ...searchResults });
      } else {
        results.push({ toolCallId: id, result: `Unknown function: ${name}` });
      }
    }

    return NextResponse.json({ results });
  } catch (e) {
    console.error('Vapi search-book error:', e);
    return NextResponse.json({
      results: [{ result: 'Error processing request' }],
    });
  }
}
