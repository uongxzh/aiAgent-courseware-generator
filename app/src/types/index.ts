export interface CourseInfo {
  topic: string;
  grade: string;
  duration: string;
  lectureContent: string;
  apiKey: string;
}

export interface Slide {
  id: string;
  type: 'cover' | 'catalog' | 'content' | 'summary';
  title: string;
  subtitle?: string;
  content: string;        // HTML body
  note: string;          // narration script for this slide
  rawText?: string;      // editable raw text
  bullets?: string[];    // for catalog slides
}

export interface CoursewareData {
  courseInfo: CourseInfo;
  slides: Slide[];
  fullScript: string;
}

export type AppView = 'form' | 'generating' | 'preview';
