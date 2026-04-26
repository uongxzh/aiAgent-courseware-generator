import { useState, useCallback } from 'react';
import type { CourseInfo, Slide, CoursewareData } from '@/types';
import { parseLectureContent, sectionsToSlides } from '@/lib/contentParser';

/**
 * Build a prompt that sends the teacher's lecture content to the AI,
 * asking it to generate a structured courseware based strictly on the provided material.
 */
const buildAIPrompt = (info: CourseInfo): string => {
  return `你是一位资深教育专家。请根据老师提供的授课讲义，生成一份精美的课件。

重要规则：
1. 必须严格基于老师提供的讲义内容生成课件，不要脱离原文编造内容
2. 讲义中的每个知识点都应在课件中有所体现
3. 保持原文的准确性和专业性

课程信息：
- 课件主题：${info.topic || '未指定'}
- 授课班级：${info.grade || '未指定'}
- 授课时长：${info.duration || '45分钟'}

老师的授课讲义如下：
---
${info.lectureContent}
---

请按以下JSON格式输出课件（注意：content字段中请用<li>标签包裹每个要点）：

{
  "slides": [
    {
      "type": "cover",
      "title": "课件标题",
      "subtitle": "副标题",
      "content": "封面说明（简短）",
      "note": ""
    },
    {
      "type": "catalog",
      "title": "目录",
      "content": "",
      "note": "播放讲解时的开场白",
      "bullets": ["知识点1", "知识点2", "知识点3"]
    },
    {
      "type": "content",
      "title": "页面标题（基于讲义小节标题）",
      "content": "核心内容（用<li><strong>标题</strong>：详细内容</li>格式）",
      "note": "这一页的口语化讲解词，基于该页内容改写"
    },
    {
      "type": "summary",
      "title": "课堂总结",
      "content": "总结要点（<li>标签）",
      "note": "总结页的讲解词"
    }
  ],
  "fullScript": "将所有note串联成一篇完整的讲解稿"
}

要求：
- cover 和 catalog 各1页
- content 页数根据讲义结构而定，至少3页，每页对应讲义中的一个主要部分
- 每个 content 页的 content 要提炼讲义原文，用要点呈现
- 每个 content 页的 note 是老师面对学生讲解这段内容时说的话，口语化、自然流畅
- 不要编造讲义中没有的知识点`;
};

/**
 * Deep parse: if AI call fails or no API key, use local parser.
 */
const buildLocalCourseware = (info: CourseInfo): CoursewareData => {
  const sections = parseLectureContent(info.lectureContent);
  let slides: Slide[];

  if (sections.length === 0) {
    // Fallback: lecture content is empty or unparseable → one big content slide
    slides = [
      {
        id: 'cover',
        type: 'cover',
        title: info.topic || '课程课件',
        subtitle: info.grade ? `—— ${info.grade}` : undefined,
        content: '',
        note: '',
        rawText: '',
      },
      {
        id: 'catalog',
        type: 'catalog',
        title: '本课导览',
        content: '',
        note: `同学们好，今天我们要学习${info.topic || '本节课'}的内容，请大家认真听讲。`,
        bullets: ['课程导入', '知识讲解', '课堂练习', '总结回顾'],
        rawText: '',
      },
      {
        id: 'content-0',
        type: 'content',
        title: '知识讲解',
        content: `<p>${info.lectureContent.replace(/\n/g, '</p><p>')}</p>`,
        note: `请大家认真理解以上内容，这是我们今天学习的核心内容。`,
        rawText: info.lectureContent,
      },
      {
        id: 'summary',
        type: 'summary',
        title: '课堂总结',
        content: `<li><strong>核心内容：</strong>今天我们学习了${info.topic || '本课'}的核心知识</li><li><strong>课后任务：</strong>请同学们整理笔记，完成相关练习</li>`,
        note: `今天的课程就到这里，请大家课后及时复习。`,
        rawText: '',
      },
    ];
  } else {
    slides = sectionsToSlides(sections, info.topic || '课程课件', info.grade || '', info.duration || '45分钟');
  }

  const fullScript = slides
    .filter((s) => s.note)
    .map((s) => s.note)
    .join('\n\n');

  return { courseInfo: info, slides, fullScript };
};

export function useCourseware() {
  const [courseware, setCourseware] = useState<CoursewareData | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (info: CourseInfo) => {
    setProgress(0);
    setError(null);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return p + Math.random() * 12;
        });
      }, 350);

      let data: CoursewareData;

      const hasApiKey = info.apiKey && info.apiKey.trim().length > 10;

      if (hasApiKey) {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${info.apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content:
                  '你是课件生成专家。请严格基于用户提供的讲义内容生成课件，绝不编造讲义以外的内容。输出必须是合法的JSON。',
              },
              { role: 'user', content: buildAIPrompt(info) },
            ],
            temperature: 0.5,
            max_tokens: 4000,
          }),
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          throw new Error(`API 请求失败 (${response.status})，请检查 API Key 是否有效`);
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || '';

        // Extract JSON from response
        let parsed: any = null;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // ignore parse error, fallback to local
        }

        if (parsed && parsed.slides && Array.isArray(parsed.slides)) {
          const slides: Slide[] = parsed.slides.map((s: any, idx: number) => ({
            id: s.type === 'cover' ? 'cover' : s.type === 'catalog' ? 'catalog' : s.type === 'summary' ? 'summary' : `content-${idx}`,
            type: s.type || 'content',
            title: s.title || '',
            subtitle: s.subtitle,
            content: s.content || '',
            note: s.note || '',
            bullets: s.bullets,
            rawText: s.content || '',
          }));
          data = { courseInfo: info, slides, fullScript: parsed.fullScript || '' };
        } else {
          // AI didn't return valid JSON → fallback to local parser
          data = buildLocalCourseware(info);
        }
      } else {
        // No API key → use local parser
        await new Promise((r) => setTimeout(r, 1200)); // slight delay for UX
        clearInterval(progressInterval);
        data = buildLocalCourseware(info);
      }

      setProgress(100);
      setCourseware(data);
      return data;
    } catch (err: any) {
      setError(err.message || '生成失败');
      setProgress(0);
      return null;
    }
  }, []);

  const updateSlide = useCallback((slideId: string, patch: Partial<Slide>) => {
    setCourseware((prev) => {
      if (!prev) return prev;
      const slides = prev.slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s));
      // Rebuild script from notes
      const fullScript = slides.filter((s) => s.note).map((s) => s.note).join('\n\n');
      return { ...prev, slides, fullScript };
    });
  }, []);

  return { courseware, progress, error, generate, updateSlide };
}
