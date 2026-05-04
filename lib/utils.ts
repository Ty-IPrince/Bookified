import { TextSegment } from "@/types"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { DEFAULT_VOICE, voiceOptions } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const genrateslug = (text : string) : string => {
    return text
      .replace(/\.[^/.]+$/, '') // Remove file extension (.pdf, .txt, etc.)
      .toLowerCase() // Convert to lowercase
      .trim() // Remove whitespace from both ends
      .replace(/[^\w\s-]/g, '') // Remove special characters (keep letters, numbers, spaces, hyphens)
      .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const serializedata = <T>(data : T) : T=> {
    return JSON.parse(JSON.stringify(data));
}

export const splitIntoSegments = (text: string, segmentSize : number = 500 , overlapSize : number = 50): TextSegment[] => {

  if( segmentSize<= 0 ){
    throw new Error("Segment size must be greater then 0");
  }
  if (overlapSize < 0 || overlapSize >= segmentSize){
    throw new Error("Overlap Size must be > 0 and >= segmentsize");
  }

  const segment : TextSegment[] = [];
  const words = text.split(/\s+/).filter((word) => word.length >0);

  let segmentIndex = 0 ;
  let startIndex = 0;

  while (startIndex < words.length){
    const endIndex = Math.min(startIndex + segmentSize , words.length);
    const segmentWords = words.slice(startIndex , endIndex);
    const segmentText = segmentWords.join(" ");
    const wordCount = segmentWords.length;

    segment.push({
      text : segmentText,
      segmentIndex,
      wordCount
    })

    segmentIndex++;
    if(segmentIndex >= words.length) break;
    startIndex += (segmentSize - overlapSize);
  }

  return segment;
};

export const parsePDFFile = async (file : File)=> {
  try{
    const pdfjsLib = await import('pdfjs-dist');

    if (typeof window !== 'undefined') {
      // Avoid bundler-specific file:// URLs (Next.js/Vite issues) by using a CDN worker.
      const VERSION = '5.6.205'
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${VERSION}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({data : arrayBuffer});
    const pdfDocument = await loadingTask.promise;

    const firstpage = await pdfDocument.getPage(1)
    const viewPort = firstpage.getViewport({scale : 2})

    const canvas = document.createElement('canvas');
    canvas.width = viewPort.width;
    canvas.height = viewPort.height;
    const context = canvas.getContext('2d');

    if(!context){
      throw new Error("Could not get canvas context");
    }

    const renderContext = {
      canvas,
      canvasContext: context,
      viewport: viewPort,
    } as any;

    await firstpage.render(renderContext).promise;

    const coverDataUrl = canvas.toDataURL('image/png');

    let fullText = '';
    for(let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++){
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.filter((item)=> 'str' in item).map((item : any) => item.str).join(' ');

      fullText += pageText + '\n';
    }

    const segments = splitIntoSegments(fullText);

    await pdfDocument.destroy();

    return({
      content : segments,
      cover : coverDataUrl,
    })

  }catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : String(error)}`);
  }

}

export const getVoice = (persona?: string) =>{
  if(!persona) return voiceOptions[DEFAULT_VOICE]

  const voiceEntry = Object.values(voiceOptions).find((v) => v.id === persona)
  if(voiceEntry) return voiceEntry;

  const voiceById = voiceOptions[persona as keyof typeof voiceOptions]
  if(voiceById) return voiceById;

  return voiceOptions[DEFAULT_VOICE]
}

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};