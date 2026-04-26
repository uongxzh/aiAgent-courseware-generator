import type { Slide } from '@/types';

export interface ParsedSection {
  title: string;
  lines: string[];
}

/**
 * Parse raw lecture content into structured sections.
 * Detects headings, bullet points, and body paragraphs.
 */
export function parseLectureContent(raw: string): ParsedSection[] {
  if (!raw.trim()) return [];

  const lines = raw.split(/\n/).map((l) => l.trim());
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  const isHeading = (line: string, nextLine?: string): boolean => {
    if (!line) return false;
    // Markdown heading
    if (/^#{1,3}\s/.test(line)) return true;
    // Numbered chapter/section: 一、 1. 第一节 etc.
    if (/^[一二三四五六七八九十零]+[、.]/.test(line)) return true;
    if (/^\d+[\.、]\s*[^\d]/.test(line) && line.length < 40) return true;
    if (/^[（(]\d+[)）]/.test(line) && line.length < 40) return true;
    // Short bold line often used as heading
    if (line.length < 25 && /^\*\*[^*]+\*\*$/.test(line)) return true;
    // Short line followed by underline-style separator
    if (nextLine && /^[-=]{3,}$/.test(nextLine) && line.length < 40) return true;
    // Short all-bold-looking line (contains mostly strong markers)
    if (line.length < 25 && !/[，。！？,.!?;；]/.test(line)) {
      const isCommonHeading = /^(教学目标|重点难点|导入|新课|小结|总结|作业|练习|例题|案例|引入|拓展|回顾)/.test(line);
      if (isCommonHeading) return true;
    }
    return false;
  };

  const cleanHeading = (line: string): string => {
    return line
      .replace(/^#{1,3}\s*/, '')
      .replace(/^[一二三四五六七八九十零]+[、.]/, '')
      .replace(/^\d+[\.、]\s*/, '')
      .replace(/^[（(]\d+[)）]\s*/, '')
      .replace(/^\*\*/, '')
      .replace(/\*\*$/, '')
      .trim();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    if (!line) continue;

    if (isHeading(line, nextLine)) {
      if (current && current.lines.length > 0) {
        sections.push(current);
      }
      current = { title: cleanHeading(line), lines: [] };
      // Skip underline separator if present
      if (nextLine && /^[-=]{3,}$/.test(nextLine)) {
        i++;
      }
    } else if (current) {
      current.lines.push(line);
    } else {
      // Content before first heading becomes intro section
      current = { title: '导言', lines: [line] };
    }
  }

  if (current && current.lines.length > 0) {
    sections.push(current);
  }

  // If no headings detected, treat every N lines as a section
  if (sections.length === 0 && lines.filter((l) => l).length > 0) {
    const chunks: string[][] = [];
    let chunk: string[] = [];
    for (const line of lines) {
      if (!line) {
        if (chunk.length >= 3) {
          chunks.push(chunk);
          chunk = [];
        }
      } else {
        chunk.push(line);
      }
    }
    if (chunk.length > 0) chunks.push(chunk);
    for (let i = 0; i < chunks.length; i++) {
      sections.push({ title: `第${i + 1}部分`, lines: chunks[i] });
    }
  }

  return sections;
}

/**
 * Convert parsed sections into slides.
 */
export function sectionsToSlides(
  sections: ParsedSection[],
  topic: string,
  grade: string,
  duration: string
): Slide[] {
  const slides: Slide[] = [];

  // Cover
  slides.push({
    id: 'cover',
    type: 'cover',
    title: topic,
    subtitle: grade ? `—— ${grade}` : undefined,
    content: ``,
    note: '',
    rawText: '',
  });

  // Catalog
  const catalogItems = sections.map((s) => s.title).filter((t) => t !== '导言');
  if (catalogItems.length > 0) {
    slides.push({
      id: 'catalog',
      type: 'catalog',
      title: '本课导览',
      content: '',
      note: `同学们好，今天我们要学习的主题是${topic}。本节课我们将围绕${catalogItems.slice(0, 3).join('、')}等内容展开，${duration ? '用时约' + duration : '接下来'}请大家认真听讲，积极思考。`,
      bullets: catalogItems,
      rawText: '',
    });
  }

  // Content slides from sections
  sections.forEach((sec, idx) => {
    const bodyHtml = linesToHtml(sec.lines);
    const note = generateNoteFromLines(sec.lines, sec.title);
    slides.push({
      id: `content-${idx}`,
      type: 'content',
      title: sec.title,
      content: bodyHtml,
      note,
      rawText: sec.lines.join('\n'),
    });
  });

  // Summary
  const keyPoints = sections
    .slice(0, 3)
    .map((s) => s.title)
    .join('、');
  slides.push({
    id: 'summary',
    type: 'summary',
    title: '课堂总结',
    content: `<li><strong>核心内容回顾：</strong>本节课我们学习了${keyPoints || topic}等核心内容</li><li><strong>重点梳理：</strong>请同学们课后整理笔记，加深理解</li><li><strong>课后任务：</strong>完成相关练习，预习下节课内容</li>`,
    note: `课程接近尾声，让我们来回顾一下今天的主要内容。${keyPoints ? '今天我们重点学习了' + keyPoints + '。' : ''}希望大家能把这些知识内化为自己的能力，课后及时复习巩固。`,
    rawText: '',
  });

  return slides;
}

function linesToHtml(lines: string[]): string {
  const out: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Detect list items: starts with number, -, *, or bullet characters
    const listMatch = line.match(/^(\d+[\.、)\]]\s*|[-*•·]\s+|\[?[xX\s]\]?\s+)(.*)$/);
    if (listMatch) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      const text = formatInline(listMatch[2] || line);
      out.push(`<li>${text}</li>`);
      continue;
    }

    // If we were in a list and now it's a normal line, close list
    if (inList) {
      out.push('</ul>');
      inList = false;
    }

    // Paragraph with inline formatting
    out.push(`<p>${formatInline(line)}</p>`);
  }

  if (inList) out.push('</ul>');
  return out.join('');
}

function formatInline(text: string): string {
  // Bold: **text** or __text__
  let s = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic: *text* or _text_
  s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  // Highlight / mark: ==text==
  s = s.replace(/==(.+?)==/g, '<mark>$1</mark>');
  return s;
}

function generateNoteFromLines(lines: string[], title: string): string {
  // Build a short narration from the first few meaningful sentences
  const sentences: string[] = [];
  for (const line of lines) {
    const clean = line.trim().replace(/^[-*•·\d\.、)\]]+\s*/, '');
    if (clean.length > 10 && clean.length < 120) {
      sentences.push(clean);
    }
    if (sentences.length >= 3) break;
  }

  if (sentences.length === 0) {
    return `接下来我们进入${title}部分，请大家认真听讲，做好笔记。`;
  }

  const joined = sentences.join('；');
  return `同学们，我们现在进入${title}。${joined}。请大家仔细理解这部分内容，有不明白的地方可以随时提问。`;
}
