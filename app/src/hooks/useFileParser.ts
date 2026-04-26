import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface ParseResult {
  text: string;
  images: string[];
  fileName: string;
  fileType: string;
}

export interface FileParseState {
  parsing: boolean;
  parseError: string | null;
  lastResult: ParseResult | null;
}

/**
 * Parse a Word (.docx) file using mammoth in the browser.
 */
async function parseDocx(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();

  // Dynamically import mammoth (browser build)
  const mammoth = await import('mammoth');

  const images: string[] = [];

  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const buffer = await image.read('base64');
        const src = `data:${image.contentType};base64,${buffer}`;
        images.push(src);
        return { src };
      }),
    }
  );

  // Convert HTML back to a readable markdown-like text
  let text = result.value
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '## $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<ul[^>]*>|<\/ul>/gi, '')
    .replace(/<ol[^>]*>|<\/ol>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

  // Deduplicate excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n');

  return { text, images, fileName: file.name, fileType: 'docx' };
}

/**
 * Parse a PDF file using pdfjs-dist.
 */
async function parsePdf(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  const images: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) {
      fullText += `\n\n--- 第 ${i} 页 ---\n${pageText}`;
    }

    // Try to extract images from PDF (simplified approach)
    try {
      const ops = await page.getOperatorList();
      for (let j = 0; j < ops.fnArray.length; j++) {
        if (ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
          const imgName = ops.argsArray[j][0];
          const imgObj = (page as any).objs.get(imgName);
          if (imgObj && imgObj.data) {
            const canvas = document.createElement('canvas');
            canvas.width = imgObj.width;
            canvas.height = imgObj.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const imgData = ctx.createImageData(imgObj.width, imgObj.height);
              imgData.data.set(imgObj.data);
              ctx.putImageData(imgData, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              images.push(dataUrl);
            }
          }
        }
      }
    } catch {
      // Image extraction may fail silently
    }
  }

  // Clean up excessive whitespace
  fullText = fullText.replace(/\n{3,}/g, '\n\n').trim();

  return { text: fullText, images, fileName: file.name, fileType: 'pdf' };
}

/**
 * Parse a plain text or markdown file.
 */
async function parseText(file: File): Promise<ParseResult> {
  const text = await file.text();
  return { text, images: [], fileName: file.name, fileType: 'text' };
}

export function useFileParser() {
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ParseResult | null>(null);

  const parseFile = useCallback(async (file: File): Promise<ParseResult | null> => {
    setParsing(true);
    setParseError(null);
    setLastResult(null);

    try {
      const fileName = file.name.toLowerCase();
      let result: ParseResult;

      if (fileName.endsWith('.docx')) {
        result = await parseDocx(file);
      } else if (fileName.endsWith('.pdf')) {
        result = await parsePdf(file);
      } else if (fileName.endsWith('.md') || fileName.endsWith('.txt')) {
        result = await parseText(file);
      } else {
        throw new Error('不支持的文件格式，请上传 .docx, .pdf, .md 或 .txt 文件');
      }

      setLastResult(result);
      setParsing(false);
      return result;
    } catch (err: any) {
      const msg = err?.message || '文件解析失败';
      setParseError(msg);
      setParsing(false);
      return null;
    }
  }, []);

  return { parsing, parseError, lastResult, parseFile };
}
