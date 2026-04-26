import { useState, useCallback, useRef, useEffect } from 'react';

export type SpeechState = 'idle' | 'playing' | 'paused';

export function useSpeech() {
  const [state, setState] = useState<SpeechState>('idle');
  const [currentText, setCurrentText] = useState('');
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<typeof window.speechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const play = useCallback(
    (text: string) => {
      if (!synthRef.current) return;

      // 取消之前的
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // 尝试选择一个中文语音
      const voices = synthRef.current.getVoices();
      const zhVoice = voices.find((v) => v.lang.includes('zh') || v.lang.includes('cmn'));
      if (zhVoice) utterance.voice = zhVoice;

      utterance.onstart = () => {
        setState('playing');
        setProgress(0);
      };

      utterance.onend = () => {
        setState('idle');
        setProgress(100);
      };

      utterance.onerror = () => {
        setState('idle');
      };

      utterance.onboundary = (event) => {
        if (event.charLength > 0) {
          const pct = (event.charIndex / text.length) * 100;
          setProgress(Math.min(pct, 100));
        }
      };

      utteranceRef.current = utterance;
      setCurrentText(text);
      synthRef.current.speak(utterance);
    },
    []
  );

  const pause = useCallback(() => {
    if (synthRef.current && state === 'playing') {
      synthRef.current.pause();
      setState('paused');
    }
  }, [state]);

  const resume = useCallback(() => {
    if (synthRef.current && state === 'paused') {
      synthRef.current.resume();
      setState('playing');
    }
  }, [state]);

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setState('idle');
    setProgress(0);
  }, []);

  const toggle = useCallback(
    (text: string) => {
      if (state === 'playing') {
        pause();
      } else if (state === 'paused') {
        resume();
      } else {
        play(text);
      }
    },
    [state, play, pause, resume]
  );

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return {
    state,
    progress,
    currentText,
    isSupported,
    play,
    pause,
    resume,
    stop,
    toggle,
  };
}
