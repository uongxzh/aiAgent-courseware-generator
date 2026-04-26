import { useState, useCallback, useRef, useEffect } from 'react';

export type SpeechState = 'idle' | 'generating' | 'playing' | 'paused';
export type SpeechMode = 'browser' | 'senseaudio';

export function useSpeech() {
  const [state, setState] = useState<SpeechState>('idle');
  const [currentText, setCurrentText] = useState('');
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<SpeechMode>('browser');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [voiceId, setVoiceId] = useState('vc-mkGfL6PMUwBDW5HE3HxnX4');

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthRef = useRef<typeof window.speechSynthesis | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Browser native TTS
  const playBrowser = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

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
        setProgress(Math.min((event.charIndex / text.length) * 100, 100));
      }
    };

    utteranceRef.current = utterance;
    setCurrentText(text);
    synthRef.current.speak(utterance);
  }, []);

  // SenseAudio TTS via API proxy
  const playSenseAudio = useCallback(
    async (text: string) => {
      if (!apiEndpoint) {
        alert('请先配置 SenseAudio API 地址');
        setState('idle');
        return;
      }
      setState('generating');
      setCurrentText(text);
      try {
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice_id: voiceId, speed: 1.0 }),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setState('idle');
          setProgress(100);
          URL.revokeObjectURL(url);
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        };
        audio.onpause = () => setState('paused');
        audio.onplay = () => setState('playing');
        audio.onerror = () => {
          setState('idle');
          URL.revokeObjectURL(url);
        };

        await audio.play();
        progressIntervalRef.current = setInterval(() => {
          if (audio.duration) {
            setProgress((audio.currentTime / audio.duration) * 100);
          }
        }, 100);
      } catch (e: any) {
        console.error('SenseAudio TTS error:', e);
        alert('语音生成失败: ' + e.message);
        setState('idle');
      }
    },
    [apiEndpoint, voiceId]
  );

  const play = useCallback(
    (text: string) => {
      if (mode === 'browser') {
        playBrowser(text);
      } else {
        playSenseAudio(text);
      }
    },
    [mode, playBrowser, playSenseAudio]
  );

  const pause = useCallback(() => {
    if (mode === 'browser') {
      if (synthRef.current && state === 'playing') {
        synthRef.current.pause();
        setState('paused');
      }
    } else {
      if (audioRef.current && state === 'playing') {
        audioRef.current.pause();
      }
    }
  }, [mode, state]);

  const resume = useCallback(() => {
    if (mode === 'browser') {
      if (synthRef.current && state === 'paused') {
        synthRef.current.resume();
        setState('playing');
      }
    } else {
      if (audioRef.current && state === 'paused') {
        audioRef.current.play();
      }
    }
  }, [mode, state]);

  const stop = useCallback(() => {
    if (mode === 'browser') {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.src = '';
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
    setState('idle');
    setProgress(0);
  }, [mode]);

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

  const isSupported =
    mode === 'browser'
      ? typeof window !== 'undefined' && 'speechSynthesis' in window
      : true;

  return {
    state,
    progress,
    currentText,
    isSupported,
    mode,
    setMode,
    apiEndpoint,
    setApiEndpoint,
    voiceId,
    setVoiceId,
    play,
    pause,
    resume,
    stop,
    toggle,
  };
}
