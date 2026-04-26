import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen, Play, Pause, Square, Volume2, Download, ChevronLeft, ChevronRight,
  Sparkles, GraduationCap, Clock, Target, AlertCircle, Mic, FileText, Printer,
  PenLine, Type, BookText, Pencil, MonitorPlay,
} from 'lucide-react';
import { useCourseware } from '@/hooks/useCourseware';
import { useSpeech } from '@/hooks/useSpeech';
import type { CourseInfo, AppView, Slide } from '@/types';
import './App.css';

function App() {
  const [view, setView] = useState<AppView>('form');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showEditor, setShowEditor] = useState(true);
  const [courseInfo, setCourseInfo] = useState<CourseInfo>({
    topic: '',
    grade: '',
    duration: '45分钟',
    lectureContent: '',
    apiKey: '',
  });

  const { courseware, progress, error, generate, updateSlide } = useCourseware();
  const speech = useSpeech();
  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Auto-extract topic from first heading in lecture content
  useEffect(() => {
    if (!courseInfo.topic.trim() && courseInfo.lectureContent.trim()) {
      const lines = courseInfo.lectureContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        // Look for markdown heading or short bold line at top
        if (/^#{1,2}\s+(.+)/.test(trimmed)) {
          const match = trimmed.match(/^#{1,2}\s+(.+)/);
          if (match) {
            setCourseInfo((prev) => ({ ...prev, topic: match[1].trim() }));
            break;
          }
        }
        // First non-empty line if it's short (likely a title)
        if (trimmed.length < 40 && trimmed.length > 2 && !/^\d/.test(trimmed)) {
          setCourseInfo((prev) => ({ ...prev, topic: trimmed.replace(/^[\s#*]+/, '').replace(/[*#]+$/, '') }));
          break;
        }
      }
    }
  }, [courseInfo.lectureContent, courseInfo.topic]);

  const handleSubmit = async () => {
    if (!courseInfo.lectureContent.trim()) return;
    setView('generating');
    const data = await generate(courseInfo);
    if (data) {
      setView('preview');
      setCurrentSlide(0);
    } else {
      setView('form');
    }
  };

  const handleExportHTML = useCallback(() => {
    if (!courseware) return;
    const htmlContent = previewRef.current?.innerHTML || '';
    const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${courseware.courseInfo.topic || '课件'}</title>
<style>
body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;margin:0;padding:0;background:#f5f5f5;color:#333;}
.slide{max-width:900px;margin:40px auto;background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:48px;page-break-after:always;}
.slide-cover{text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;}
.slide-catalog{background:#fafbfc;}
.slide-content{border-left:6px solid #667eea;}
.slide-summary{background:linear-gradient(135deg,#f5f7fa 0%,#e4e8ec 100%);}
h1{font-size:36px;margin-bottom:16px;font-weight:700;}
h2{font-size:28px;margin-bottom:20px;color:#2d3748;}
h3{font-size:22px;margin-bottom:12px;color:#4a5568;}
p,li{font-size:18px;line-height:1.8;color:#4a5568;}
ul{list-style:none;padding:0;}
ul li{padding:12px 0;padding-left:32px;position:relative;}
ul li:before{content:'';position:absolute;left:0;top:20px;width:8px;height:8px;border-radius:50%;background:#667eea;}
.subtitle{font-size:20px;opacity:0.9;margin-top:8px;}
.meta{font-size:16px;opacity:0.8;margin-top:24px;}
.note-box{margin-top:32px;padding:20px 24px;background:linear-gradient(135deg,#fff9e6 0%,#fff5d6 100%);border-radius:12px;border-left:4px solid #f6ad55;}
.note-label{font-size:13px;font-weight:600;color:#c05621;margin-bottom:8px;}
.note-text{font-size:15px;color:#744210;line-height:1.7;font-style:italic;}
@media print{.slide{box-shadow:none;margin:0;border-radius:0;page-break-after:always;}}
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${courseware.courseInfo.topic || '课件'}_课件.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [courseware]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const slide = courseware?.slides[currentSlide];

  const renderSlide = (s: Slide) => {
    const slideClass = {
      cover: 'slide-cover',
      catalog: 'slide-catalog',
      content: 'slide-content',
      summary: 'slide-summary',
    }[s.type];

    return (
      <div className={`courseware-slide ${slideClass}`} key={s.id}>
        {s.type === 'cover' && (
          <div className="cover-inner">
            <div className="cover-icon"><GraduationCap size={64} /></div>
            <h1>{s.title}</h1>
            {s.subtitle && <div className="subtitle">{s.subtitle}</div>}
            <div className="meta">
              {courseware && (
                <>
                  <div>授课班级：{courseware.courseInfo.grade || '——'}</div>
                  <div>授课时长：{courseware.courseInfo.duration || '45分钟'}</div>
                </>
              )}
            </div>
          </div>
        )}

        {s.type === 'catalog' && (
          <div className="catalog-inner">
            <h2>{s.title}</h2>
            <ul className="catalog-list">
              {(s.bullets || []).map((b: string, i: number) => (
                <li key={i}>
                  <span className="catalog-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="catalog-text">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(s.type === 'content' || s.type === 'summary') && (
          <div className="content-inner">
            <h2>{s.title}</h2>
            <div className="slide-body" dangerouslySetInnerHTML={{ __html: s.content }} />
            {s.note && (
              <div className="note-box">
                <div className="note-label"><Mic size={14} /> 讲解备注</div>
                <div className="note-text">{s.note}</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-wrapper">
      {view === 'form' && (
        <div className="form-view">
          <div className="form-hero">
            <div className="form-hero-icon"><MonitorPlay size={40} /></div>
            <h1 className="form-hero-title">智能课件生成器</h1>
            <p className="form-hero-desc">
              粘贴你的授课讲义，AI 自动提取知识点、生成精美课件与语音讲解稿
            </p>
          </div>

          <Card className="form-card">
            <CardHeader>
              <CardTitle className="form-card-title">
                <BookText size={20} />
                授课内容（核心）
              </CardTitle>
            </CardHeader>
            <CardContent className="form-grid">
              {/* ====== LECTURE CONTENT - HERO INPUT ====== */}
              <div className="form-field full-width lecture-field">
                <Label>
                  <PenLine size={14} />
                  授课讲义 / 授课内容 *
                </Label>
                <Textarea
                  className="lecture-textarea"
                  placeholder={
                    "请在此处粘贴你的授课讲义或备课笔记…\n\n" +
                    "支持格式：\n" +
                    "• 直接粘贴讲义全文\n" +
                    "• 使用 # 或 ## 标记小节标题\n" +
                    "• 用 1. / - / * 标记列表要点\n" +
                    "• 用 **粗体** 标记重点\n\n" +
                    "示例：\n" +
                    "## 一、课程导入\n" +
                    "**学习目标**：理解二次函数的基本概念\n" +
                    "1. 什么是二次函数？\n" +
                    "2. 二次函数的一般形式：y = ax² + bx + c\n" +
                    "- a ≠ 0 时才称为二次函数"
                  }
                  value={courseInfo.lectureContent}
                  onChange={(e) => setCourseInfo({ ...courseInfo, lectureContent: e.target.value })}
                  rows={14}
                />
                <p className="field-hint">
                  {courseInfo.lectureContent.length > 0
                    ? `已输入 ${courseInfo.lectureContent.length} 字符 · 系统将基于这些内容生成课件`
                    : '这是最重要的输入，系统会据此分析课程结构、提炼知识点、生成讲解稿'}
                </p>
              </div>

              <Separator className="full-width sep" />

              {/* ====== META FIELDS ====== */}
              <div className="form-field">
                <Label><Target size={14} /> 课件主题</Label>
                <Input
                  placeholder="自动识别或手动填写"
                  value={courseInfo.topic}
                  onChange={(e) => setCourseInfo({ ...courseInfo, topic: e.target.value })}
                />
              </div>

              <div className="form-field">
                <Label><GraduationCap size={14} /> 授课班级</Label>
                <Input
                  placeholder="例如：九年级二班"
                  value={courseInfo.grade}
                  onChange={(e) => setCourseInfo({ ...courseInfo, grade: e.target.value })}
                />
              </div>

              <div className="form-field">
                <Label><Clock size={14} /> 授课时长</Label>
                <Input
                  placeholder="例如：45分钟"
                  value={courseInfo.duration}
                  onChange={(e) => setCourseInfo({ ...courseInfo, duration: e.target.value })}
                />
              </div>

              <Separator className="full-width sep" />

              <div className="form-field full-width">
                <Label><Sparkles size={14} /> DeepSeek API Key（可选，用于 AI 增强生成）</Label>
                <Input
                  type="password"
                  placeholder="填入后 AI 将基于讲义深度优化课件结构与讲解词"
                  value={courseInfo.apiKey}
                  onChange={(e) => setCourseInfo({ ...courseInfo, apiKey: e.target.value })}
                />
                <p className="field-hint">
                  不填也能用。系统内置智能解析引擎，可直接从讲义中提取结构并生成课件。
                </p>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="error-bar">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <Button
            className="generate-btn"
            size="lg"
            onClick={handleSubmit}
            disabled={!courseInfo.lectureContent.trim()}
          >
            <Sparkles size={20} />
            一键生成课件
          </Button>
        </div>
      )}

      {view === 'generating' && (
        <div className="generating-view">
          <div className="generating-box">
            <div className="generating-spinner">
              <div className="spinner-ring" />
              <Sparkles size={28} className="spinner-icon" />
            </div>
            <h2>正在解析讲义内容…</h2>
            <p>
              {progress < 40
                ? '正在分析讲义结构，提取知识点…'
                : progress < 75
                ? '正在排版课件页面，生成讲解备注…'
                : '正在合成语音讲解稿，即将完成…'}
            </p>
            <div className="progress-wrap">
              <Progress value={progress} className="progress-bar" />
              <span className="progress-text">{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      )}

      {view === 'preview' && courseware && (
        <div className="preview-view">
          {/* Toolbar */}
          <div className="preview-toolbar">
            <div className="toolbar-left">
              <Button variant="ghost" size="sm" onClick={() => setView('form')}>
                <ChevronLeft size={16} /> 返回
              </Button>
              <span className="toolbar-title">
                <FileText size={16} />
                {courseware.courseInfo.topic || '课件预览'}
              </span>
            </div>
            <div className="toolbar-right">
              <div className="speech-controls">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => speech.toggle(courseware.fullScript)}
                  disabled={!speech.isSupported}
                >
                  {speech.state === 'playing' ? <Pause size={16} /> : <Play size={16} />}
                  {speech.state === 'playing' ? '暂停讲解' : '播放完整讲解'}
                </Button>
                {speech.state !== 'idle' && (
                  <Button variant="ghost" size="sm" onClick={speech.stop}>
                    <Square size={14} />
                  </Button>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowEditor((v) => !v)}>
                <Pencil size={14} />
                {showEditor ? '收起编辑' : '编辑内容'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportHTML}>
                <Download size={16} /> 导出 HTML
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer size={16} /> 打印
              </Button>
            </div>
          </div>

          {/* Speech status bar */}
          {speech.state !== 'idle' && (
            <div className="speech-bar">
              <Volume2 size={16} className="speech-pulse" />
              <span>{speech.state === 'playing' ? '正在播放语音讲解…' : '语音讲解已暂停'}</span>
              <div className="speech-progress">
                <Progress value={speech.progress} className="progress-bar" />
              </div>
            </div>
          )}

          {/* Slide navigation */}
          <div className="slide-nav">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
              disabled={currentSlide === 0}
            >
              <ChevronLeft size={18} />
            </Button>
            <span className="slide-counter">
              {currentSlide + 1} / {courseware.slides.length}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentSlide((s) => Math.min(courseware.slides.length - 1, s + 1))}
              disabled={currentSlide === courseware.slides.length - 1}
            >
              <ChevronRight size={18} />
            </Button>
          </div>

          {/* Main preview area */}
          <div className="preview-main">
            <div className="preview-stage" ref={previewRef}>
              {slide && renderSlide(slide)}
            </div>

            {/* Editor Panel */}
            {showEditor && slide && (
              <div className="editor-panel" ref={editorRef}>
                <div className="editor-header">
                  <Pencil size={16} />
                  <span>编辑当前页面</span>
                  <span className="editor-slide-tag">{slide.type === 'cover' ? '封面' : slide.type === 'catalog' ? '目录' : slide.type === 'summary' ? '总结' : '内容'}</span>
                </div>

                <div className="editor-fields">
                  <div className="editor-field">
                    <Label><Type size={12} /> 页面标题</Label>
                    <Input
                      value={slide.title}
                      onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                    />
                  </div>

                  {slide.type !== 'cover' && slide.type !== 'catalog' && (
                    <div className="editor-field">
                      <Label><BookOpen size={12} /> 页面内容（支持 HTML）</Label>
                      <Textarea
                        value={slide.rawText || slide.content}
                        onChange={(e) => {
                          const raw = e.target.value;
                          // Simple line-to-html conversion for raw editing
                          const html = raw
                            .split('\n')
                            .filter((l) => l.trim())
                            .map((l) => {
                              const clean = l.trim();
                              if (/^\d+[\.、)\]]\s*|[-*•·]\s+/.test(clean)) {
                                return `<li>${clean.replace(/^\d+[\.、)\]]\s*|[-*•·]\s+/, '')}</li>`;
                              }
                              return `<p>${clean}</p>`;
                            })
                            .join('');
                          updateSlide(slide.id, { rawText: raw, content: html });
                        }}
                        rows={6}
                      />
                      <p className="editor-hint">直接修改要点文字，系统将自动更新课件排版</p>
                    </div>
                  )}

                  {slide.type !== 'cover' && (
                    <div className="editor-field">
                      <Label><Mic size={12} /> 讲解备注（语音讲解词）</Label>
                      <Textarea
                        value={slide.note}
                        onChange={(e) => updateSlide(slide.id, { note: e.target.value })}
                        rows={4}
                      />
                      <p className="editor-hint">修改后点击「播放完整讲解」即可听到更新后的语音</p>
                    </div>
                  )}
                </div>

                {/* Thumbnail strip for quick navigation */}
                <div className="thumb-strip">
                  {courseware.slides.map((s, idx) => (
                    <button
                      key={s.id}
                      className={`thumb-item ${idx === currentSlide ? 'active' : ''}`}
                      onClick={() => setCurrentSlide(idx)}
                    >
                      <span className="thumb-num">{idx + 1}</span>
                      <span className="thumb-title">{s.title.slice(0, 8)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
