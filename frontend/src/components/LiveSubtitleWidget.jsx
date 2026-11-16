import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Radio, 
  Square, 
  Play, 
  Pause, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Layers, 
  Sparkles, 
  Download, 
  Trash2, 
  Move, 
  ChevronDown, 
  ChevronUp,
  Monitor,
  Mic,
  Video,
  Settings2,
  Copy,
  Check,
  AlertTriangle,
  Info,
  HelpCircle,
  CheckCircle2,
  Zap,
  Target,
  X
} from 'lucide-react';
import { liveTranslateChunk } from '../services/api';
import { encodeWAV } from '../utils/audioEncoder';

function formatSecondsToMmSs(totalSec) {
  const safeSec = Math.max(0, Math.floor(totalSec || 0));
  const mins = String(Math.floor(safeSec / 60)).padStart(2, '0');
  const secs = String(safeSec % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function formatSecondsToSrtTime(totalSec) {
  const safeSec = Math.max(0, totalSec || 0);
  const hrs = String(Math.floor(safeSec / 3600)).padStart(2, '0');
  const mins = String(Math.floor((safeSec % 3600) / 60)).padStart(2, '0');
  const secs = String(Math.floor(safeSec % 60)).padStart(2, '0');
  const ms = String(Math.floor((safeSec % 1) * 1000)).padStart(3, '0');
  return `${hrs}:${mins}:${secs},${ms}`;
}

export default function LiveSubtitleWidget({
  sourceLang = 'auto',
  targetLang = 'vi',
  translationStyle = 'cinematic',
  apiKey = '',
  externalVideoStream = null,
  videoElementRef = null,
  localVideoLoaded = false,
  externalHistory = null,
  setExternalHistory = null,
  onSpeechStatusChange = null,
  onListeningChange = null
}) {
  // Capture states
  const [isListening, setIsListening] = useState(false);
  const [captureSource, setCaptureSource] = useState(localVideoLoaded ? 'video' : 'display'); // 'video', 'display', 'mic'
  const [whisperModel, setWhisperModel] = useState('tiny'); // Default 'tiny' for lightning speed (~0.3s) and tight video sync
  const [currentOriginal, setCurrentOriginal] = useState('');
  const [currentTranslated, setCurrentTranslated] = useState('Đang chờ phát hiện âm thanh từ video...');
  const [detectedLang, setDetectedLang] = useState('');
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 - 100 for visualizer

  // Widget display settings
  const [isBilingual, setIsBilingual] = useState(true);
  const [fontSize, setFontSize] = useState(20);
  const [fontColor, setFontColor] = useState('#FDE047'); // Default vibrant yellow for high readability
  const [bgOpacity, setBgOpacity] = useState(40); // Default 40% for translucent unobtrusive look
  const [widgetPosition, setWidgetPosition] = useState('bottom'); // 'bottom', 'floating', 'pip'
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAudioHelpModal, setShowAudioHelpModal] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Audio Device Enumeration (Microphone / Stereo Mix)
  const [availableMics, setAvailableMics] = useState([]);
  const [selectedMicId, setSelectedMicId] = useState('');

  // History of spoken lines (supports parent state lifting)
  const [internalHistory, setInternalHistory] = useState([]);
  const liveHistory = externalHistory !== null ? externalHistory : internalHistory;
  const setLiveHistory = setExternalHistory !== null ? setExternalHistory : setInternalHistory;

  // Media & Audio Context references
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const pcmBufferRef = useRef([]);
  const accumulatedSamplesRef = useRef(0);
  const chunkQueueRef = useRef([]);
  const isWorkingRef = useRef(false);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const pipWindowRef = useRef(null);
  const pipContainerRef = useRef(null);
  const sessionStartTimeRef = useRef(null);

  // Helper to obtain current high-precision timestamp
  const getCurrentTimePos = useCallback(() => {
    if (videoElementRef?.current && !isNaN(videoElementRef.current.currentTime)) {
      return videoElementRef.current.currentTime;
    }
    if (sessionStartTimeRef.current) {
      return (Date.now() - sessionStartTimeRef.current) / 1000;
    }
    return 0;
  }, [videoElementRef]);

  // Enumerate audio input devices (e.g. Stereo Mix, External Mic, Headset)
  useEffect(() => {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const audioInputs = devices.filter((d) => d.kind === 'audioinput');
          setAvailableMics(audioInputs);
          if (audioInputs.length > 0 && !selectedMicId) {
            setSelectedMicId(audioInputs[0].deviceId);
          }
        })
        .catch(() => {});
    }
  }, [selectedMicId]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (pipWindowRef.current && !pipWindowRef.current.closed) {
        pipWindowRef.current.close();
      }
    };
  }, []);

  // Audio Level visualizer loop
  const startAudioVisualizer = (stream) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.warn('Audio visualizer could not start:', err);
    }
  };

  const stopAudioVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  // Start Capturing Audio with Adaptive Speech & Silence VAD Slicing
  const startListening = async (overrideSource) => {
    const activeSource = overrideSource || captureSource;
    try {
      let rawStream = null;
      let audioTracks = [];

      if (activeSource === 'video') {
        const vid = videoElementRef?.current;
        if (!vid) {
          alert('Vui lòng mở một video trong trình phát trước khi chọn nguồn này.');
          return;
        }

        try {
          if (typeof vid.captureStream === 'function') {
            rawStream = vid.captureStream();
          } else if (typeof vid.mozCaptureStream === 'function') {
            rawStream = vid.mozCaptureStream();
          }
          if (rawStream) {
            audioTracks = rawStream.getAudioTracks();
          }
        } catch (e) {
          console.warn('captureStream on video element failed:', e);
        }

        if (audioTracks.length === 0) {
          try {
            rawStream = await navigator.mediaDevices.getDisplayMedia({
              video: { displaySurface: 'monitor' },
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                systemAudio: 'include'
              },
              systemAudio: 'include',
              selfBrowserSurface: 'exclude',
              surfaceSwitching: 'include'
            });
            audioTracks = rawStream.getAudioTracks();
          } catch (e) {
            if (e.name === 'NotAllowedError') return;
            throw e;
          }
        }
      } else if (activeSource === 'display') {
        try {
          rawStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'monitor',
            },
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              systemAudio: 'include',
            },
            systemAudio: 'include',
            selfBrowserSurface: 'exclude',
            surfaceSwitching: 'include'
          });
        } catch (e) {
          if (e.name === 'NotAllowedError') return;
          throw e;
        }

        audioTracks = rawStream.getAudioTracks();

        if (audioTracks.length === 0) {
          setShowAudioHelpModal(true);
          rawStream.getTracks().forEach((t) => t.stop());
          return;
        }
      } else if (activeSource === 'mic') {
        const audioConstraints = {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        };
        if (selectedMicId) {
          audioConstraints.deviceId = { exact: selectedMicId };
        }
        rawStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints
        });
        audioTracks = rawStream.getAudioTracks();
      }

      if (!rawStream || audioTracks.length === 0) {
        setShowAudioHelpModal(true);
        return;
      }

      mediaStreamRef.current = rawStream;

      rawStream.getVideoTracks().forEach((track) => {
        track.onended = () => stopListening();
      });
      audioTracks.forEach((track) => {
        track.onended = () => stopListening();
      });

      const audioOnlyStream = new MediaStream(audioTracks);
      startAudioVisualizer(audioOnlyStream);

      // Web Audio PCM Engine with Ultra-Fast Speech Pause Detection (16kHz WAV slices)
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const pcmCtx = new AudioCtx();
        audioContextRef.current = pcmCtx;

        const sourceNode = pcmCtx.createMediaStreamSource(audioOnlyStream);
        const bufferSize = 4096;
        const processor = pcmCtx.createScriptProcessor(bufferSize, 1, 1);
        processorRef.current = processor;

        pcmBufferRef.current = [];
        accumulatedSamplesRef.current = 0;
        let hasSpeechInSlice = false;
        let silenceConsecutiveFrames = 0;
        let sliceStartSec = getCurrentTimePos();

        // Optimized parameters for ultra-low latency & video sync:
        // 0.65s minimum speech before slicing on natural pause
        const minSpeechSamples = Math.round(pcmCtx.sampleRate * 0.65);
        // 1.8s maximum slice cap to ensure subtitles appear immediately
        const maxSliceSamples = Math.round(pcmCtx.sampleRate * 1.8);

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);

          // Real-time RMS calculation
          let sumSquares = 0;
          for (let i = 0; i < inputData.length; i++) {
            sumSquares += inputData[i] * inputData[i];
          }
          const frameRms = Math.sqrt(sumSquares / inputData.length);

          if (frameRms > 0.005) {
            hasSpeechInSlice = true;
            silenceConsecutiveFrames = 0;
          } else if (hasSpeechInSlice) {
            silenceConsecutiveFrames++;
          }

          pcmBufferRef.current.push(new Float32Array(inputData));
          accumulatedSamplesRef.current += inputData.length;

          const currentSamples = accumulatedSamplesRef.current;
          let shouldFlush = false;

          // 1. Natural sentence pause: speaker paused for ~160ms (2 frames) after speech
          if (hasSpeechInSlice && currentSamples >= minSpeechSamples && silenceConsecutiveFrames >= 2) {
            shouldFlush = true;
          }
          // 2. Max speech duration limit reached (1.8s)
          else if (currentSamples >= maxSliceSamples) {
            shouldFlush = true;
          }
          // 3. Continuous silence: discard buffer after 1.5s of no speech to prevent lag
          else if (!hasSpeechInSlice && currentSamples >= pcmCtx.sampleRate * 1.5) {
            pcmBufferRef.current = [];
            accumulatedSamplesRef.current = 0;
            sliceStartSec = getCurrentTimePos();
          }

          if (shouldFlush && pcmBufferRef.current.length > 0) {
            const sliceEndSec = getCurrentTimePos();
            const total = accumulatedSamplesRef.current;
            const merged = new Float32Array(total);
            let offset = 0;
            for (const chunk of pcmBufferRef.current) {
              merged.set(chunk, offset);
              offset += chunk.length;
            }

            // Reset accumulator for next slice
            pcmBufferRef.current = [];
            accumulatedSamplesRef.current = 0;
            const hadVoice = hasSpeechInSlice;
            hasSpeechInSlice = false;
            silenceConsecutiveFrames = 0;

            const curStart = sliceStartSec;
            sliceStartSec = sliceEndSec;

            if (hadVoice) {
              const wavBlob = encodeWAV(merged, pcmCtx.sampleRate);
              enqueueChunk(wavBlob, curStart, sliceEndSec);
            }
          }
        };

        const silentGain = pcmCtx.createGain();
        silentGain.gain.value = 0;
        sourceNode.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(pcmCtx.destination);
      } catch (pcmErr) {
        console.warn('Web Audio PCM init failed:', pcmErr);
      }

      sessionStartTimeRef.current = Date.now();
      setIsListening(true);
      if (onListeningChange) onListeningChange(true);
      setCurrentTranslated('Đang lắng nghe và phát hiện âm thanh từ video...');
    } catch (err) {
      console.error('Error starting live capture:', err);
      if (err.name !== 'NotAllowedError') {
        alert('Không thể bắt đầu thu âm: ' + (err.message || err.name));
      }
      stopListening();
    }
  };

  // Non-blocking FIFO audio chunk queue
  const enqueueChunk = (blob, sliceStartSec, sliceEndSec) => {
    // Keep max 2 chunks in flight to ensure real-time video sync without lagging backlog
    if (chunkQueueRef.current.length >= 2) {
      chunkQueueRef.current.shift();
    }
    chunkQueueRef.current.push({ blob, sliceStartSec, sliceEndSec });
    drainQueue();
  };

  const drainQueue = async () => {
    if (isWorkingRef.current || chunkQueueRef.current.length === 0) return;
    isWorkingRef.current = true;

    while (chunkQueueRef.current.length > 0) {
      const item = chunkQueueRef.current.shift();
      try {
        await processAudioChunk(item.blob, item.sliceStartSec, item.sliceEndSec);
      } catch (err) {
        console.warn('Queue processing error:', err);
      }
    }

    isWorkingRef.current = false;
  };

  // Process incoming audio chunk with exact boundary alignment
  const processAudioChunk = async (blob, sliceStartSec, sliceEndSec) => {
    try {
      // Build sliding context window from last 2 entries
      const contextWindow = liveHistory.slice(0, 2).map((e) => e.original).reverse().join(' ');

      const result = await liveTranslateChunk({
        audioBlob: blob,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang,
        translationStyle: translationStyle,
        whisperModel: whisperModel,
        prevContext: contextWindow,
        apiKey: apiKey
      });

      if (result.is_speech && result.original_text) {
        setIsSpeechActive(true);
        setCurrentOriginal(result.original_text);
        setCurrentTranslated(result.translated_text || result.original_text);
        setDetectedLang(result.detected_language);

        const chunkDuration = Math.max(0.3, sliceEndSec - sliceStartSec);
        // Exact video timestamp alignment down to milliseconds using Whisper speech boundaries
        const exactSpeechStart = Math.max(0, sliceStartSec + (result.speech_start || 0));
        const exactSpeechEnd = Math.max(
          exactSpeechStart + 0.3,
          sliceStartSec + (result.speech_end || chunkDuration)
        );

        const timestampDisplay = `${formatSecondsToMmSs(exactSpeechStart)} ➔ ${formatSecondsToMmSs(exactSpeechEnd)}`;
        const startSrt = formatSecondsToSrtTime(exactSpeechStart);
        const endSrt = formatSecondsToSrtTime(exactSpeechEnd);

        // Push to live history
        const newEntry = {
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          timestamp: timestampDisplay,
          startSec: exactSpeechStart,
          endSec: exactSpeechEnd,
          startSrt,
          endSrt,
          original: result.original_text,
          translated: result.translated_text || result.original_text,
          lang: result.detected_language
        };
        setLiveHistory((prev) => [newEntry, ...prev.slice(0, 199)]);
        if (onSpeechStatusChange) {
          onSpeechStatusChange(true, newEntry);
        }
      } else {
        setIsSpeechActive(false);
        if (onSpeechStatusChange) {
          onSpeechStatusChange(false, null);
        }
      }
    } catch (err) {
      console.warn('Chunk translation error:', err);
    }
  };

  // Stop Capturing
  const stopListening = () => {
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {}
      processorRef.current = null;
    }
    pcmBufferRef.current = [];
    accumulatedSamplesRef.current = 0;
    chunkQueueRef.current = [];
    isWorkingRef.current = false;

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    stopAudioVisualizer();
    setIsListening(false);
    setIsSpeechActive(false);
    if (onListeningChange) onListeningChange(false);
    if (onSpeechStatusChange) onSpeechStatusChange(false, null);
    setCurrentTranslated('Đã tạm dừng dịch trực tiếp.');
  };

  // Synchronize Subtitles to Picture-in-Picture window instantaneously (Small & Semi-Transparent)
  const renderPipContent = useCallback(() => {
    if (!pipWindowRef.current || pipWindowRef.current.closed || !pipContainerRef.current) return;
    const c = pipContainerRef.current;
    
    // Ensure transparent root and body
    try {
      if (pipWindowRef.current.document) {
        pipWindowRef.current.document.body.style.backgroundColor = 'transparent';
        pipWindowRef.current.document.body.style.margin = '0';
        pipWindowRef.current.document.body.style.overflow = 'hidden';
        pipWindowRef.current.document.documentElement.style.backgroundColor = 'transparent';
      }
    } catch (e) {}

    c.style.backgroundColor = 'transparent';
    c.style.padding = '2px 8px';

    const transAlpha = Math.max(0.2, (bgOpacity / 100) * 0.55);

    c.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; box-sizing: border-box;">
        <div style="
          background: rgba(10, 15, 29, ${transAlpha});
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 5px 14px;
          max-width: 98%;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
          text-align: center;
          transition: all 0.12s ease;
        ">
          <!-- Subtle top status line -->
          <div style="font-size: 10px; font-weight: 700; color: #94a3b8; margin-bottom: 2px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${isListening ? (isSpeechActive ? '#10b981' : '#ef4444') : '#64748b'}; box-shadow: 0 0 6px ${isListening ? (isSpeechActive ? '#10b981' : '#ef4444') : 'transparent'};"></span>
            <span style="letter-spacing: 0.04em;">${detectedLang ? detectedLang.toUpperCase() : 'LIVE'}</span>
            ${isSpeechActive ? '<span style="color: #10b981; font-weight: 700;">●</span>' : ''}
          </div>

          <!-- Bilingual Original Line -->
          ${isBilingual && currentOriginal ? `
            <div style="font-size: ${Math.max(11, fontSize - 8)}px; color: #cbd5e1; margin-bottom: 2px; font-style: italic; line-height: 1.2; text-shadow: 0 1px 3px rgba(0,0,0,0.95);">
              "${currentOriginal}"
            </div>
          ` : ''}

          <!-- Main Translated Subtitle -->
          <div style="
            font-size: ${Math.max(14, fontSize - 3)}px;
            font-weight: 800;
            color: ${fontColor};
            line-height: 1.25;
            text-shadow: 0 1px 3px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.95), 1px 1px 2px #000;
          ">
            ${currentTranslated}
          </div>
        </div>
      </div>
    `;
  }, [isListening, isSpeechActive, detectedLang, isBilingual, currentOriginal, fontSize, fontColor, currentTranslated, bgOpacity]);

  // Reactive effect: update PiP window immediately upon new translation
  useEffect(() => {
    renderPipContent();
  }, [renderPipContent]);

  // Pop-out into Always-on-top Picture-in-Picture window (Document PiP API: Small & Transparent)
  const togglePictureInPictureWindow = async () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      pipContainerRef.current = null;
      setWidgetPosition('bottom');
      return;
    }

    if (!('documentPictureInPicture' in window)) {
      alert('Trình duyệt của bạn hiện chưa hỗ trợ Document Picture-in-Picture. Bạn có thể sử dụng chế độ "Thanh nổi" (Floating Overlay) trực tiếp trên trang.');
      setWidgetPosition(widgetPosition === 'floating' ? 'bottom' : 'floating');
      return;
    }

    try {
      // Small, compact window size (480 x 74) so it won't block the video
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 480,
        height: 74,
      });
      pipWindowRef.current = pipWindow;
      setWidgetPosition('pip');

      // Make background completely transparent
      pipWindow.document.body.style.backgroundColor = 'transparent';
      pipWindow.document.body.style.margin = '0';
      pipWindow.document.body.style.overflow = 'hidden';
      pipWindow.document.documentElement.style.backgroundColor = 'transparent';

      // Copy stylesheets to PiP window
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.type = styleSheet.type;
          link.media = styleSheet.media;
          link.href = styleSheet.href;
          pipWindow.document.head.appendChild(link);
        }
      });

      // Render Subtitle inside PiP Window
      const container = pipWindow.document.createElement('div');
      container.id = 'pip-subtitle-root';
      container.style.width = '100vw';
      container.style.height = '100vh';
      container.style.backgroundColor = 'transparent';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.boxSizing = 'border-box';
      container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      pipWindow.document.body.appendChild(container);
      pipContainerRef.current = container;

      pipWindow.addEventListener('pagehide', () => {
        pipWindowRef.current = null;
        pipContainerRef.current = null;
        setWidgetPosition('bottom');
      });

      renderPipContent();
    } catch (err) {
      console.error('Failed to open PiP window:', err);
      setWidgetPosition('floating');
    }
  };

  // Export collected live subtitles to SRT file
  const exportLiveSrt = () => {
    if (liveHistory.length === 0) {
      alert('Chưa có câu thoại nào được dịch để xuất file.');
      return;
    }

    let srtText = '';
    const reversed = [...liveHistory].reverse();
    reversed.forEach((item, index) => {
      const idx = index + 1;
      const start = item.startSrt || '00:00:00,000';
      const end = item.endSrt || '00:00:03,000';
      srtText += `${idx}\n${start} --> ${end}\n${item.translated}\n\n`;
    });

    const blob = new Blob([srtText], { type: 'application/x-subrip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `live_subtitles_${new Date().toISOString().slice(0, 10)}.srt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyText = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Controls Toolbar */}
      <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-800 backdrop-blur-md shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Source selector & Start button */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="flex items-center bg-dark-950 p-1 rounded-xl border border-dark-800">
            {localVideoLoaded && (
              <button
                onClick={() => { setCaptureSource('video'); if (isListening) startListening('video'); }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  captureSource === 'video'
                    ? 'bg-accent-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Thu âm trực tiếp từ Video đang phát trong trình phát này"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video Player</span>
              </button>
            )}

            <button
              onClick={() => { setCaptureSource('display'); if (isListening) startListening('display'); }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                captureSource === 'display'
                  ? 'bg-accent-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Phát hiện và dịch trực tiếp âm thanh từ bất kỳ Tab (YouTube, Netflix) hoặc Màn hình máy tính"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Tab / Màn hình</span>
            </button>

            <button
              onClick={() => { setCaptureSource('mic'); if (isListening) startListening('mic'); }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                captureSource === 'mic'
                  ? 'bg-accent-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Thu âm trực tiếp từ Microphone hoặc Stereo Mix"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Microphone / Stereo Mix</span>
            </button>
          </div>

          {/* Model Speed vs Accuracy Switch */}
          <button
            onClick={() => setWhisperModel(whisperModel === 'tiny' ? 'base' : 'tiny')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              whisperModel === 'tiny'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10'
            }`}
            title={
              whisperModel === 'tiny'
                ? 'Chế độ Siêu Tốc (Tiny): Phản hồi sau ~0.4s, khớp video nhất'
                : 'Chế độ Chính Xác Cao (Base): Chuẩn từng từ, phân biệt tên riêng'
            }
          >
            {whisperModel === 'tiny' ? (
              <>
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                <span>⚡ Siêu tốc & Khớp video (Tiny)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                <span>🎯 Chuẩn từng chữ (Base)</span>
              </>
            )}
          </button>

          {/* Mic Device Selector dropdown if 'mic' source selected */}
          {captureSource === 'mic' && availableMics.length > 1 && (
            <select
              value={selectedMicId}
              onChange={(e) => {
                setSelectedMicId(e.target.value);
                if (isListening) {
                  stopListening();
                  setTimeout(() => startListening('mic'), 200);
                }
              }}
              className="px-2.5 py-1.5 bg-dark-950 border border-dark-700 rounded-xl text-xs text-white max-w-[180px] truncate focus:outline-none focus:border-accent-500"
              title="Chọn thiết bị thu âm thanh (Microphone hoặc Stereo Mix)"
            >
              {availableMics.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `Thiết bị ${mic.deviceId.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          )}

          {/* Main Action Button */}
          {!isListening ? (
            <button
              onClick={() => startListening()}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Bật Dịch Trực Tiếp (Live)</span>
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-bold shadow-lg shadow-rose-500/20 active:scale-95 transition-all animate-pulse"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Dừng Dịch</span>
            </button>
          )}

          {/* Audio Visualizer Level Bar */}
          {isListening && (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-dark-950 border border-dark-800">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((bar) => {
                  const active = audioLevel > bar * 16;
                  return (
                    <div
                      key={bar}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        active ? 'bg-emerald-400 h-4' : 'bg-dark-700 h-1.5'
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {audioLevel > 15 ? 'Đang nhận âm thanh' : 'Đang lắng nghe...'}
              </span>
            </div>
          )}
        </div>

        {/* Right Settings & Mode Tools */}
        <div className="flex items-center space-x-2">
          {/* PiP Pop-out Button */}
          <button
            onClick={togglePictureInPictureWindow}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition-all ${
              widgetPosition === 'pip'
                ? 'bg-purple-600 text-white border-purple-500 ring-2 ring-purple-400/30'
                : 'bg-dark-950 border-dark-800 text-slate-300 hover:text-white hover:border-dark-700'
            }`}
            title="Tách thanh phụ đề thành Cửa sổ Nổi Mini Trong Suốt (Always-on-top PiP) để xem cùng lúc với Zoom, VLC, game"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cửa sổ nổi PiP (Trong suốt)</span>
          </button>

          {/* Floating mode toggle */}
          <button
            onClick={() => setWidgetPosition(widgetPosition === 'floating' ? 'bottom' : 'floating')}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition-all ${
              widgetPosition === 'floating'
                ? 'bg-accent-600 text-white border-accent-500'
                : 'bg-dark-950 border-dark-800 text-slate-300 hover:text-white hover:border-dark-700'
            }`}
            title="Chuyển đổi giữa chế độ Gắn dưới video hoặc Nổi trên màn hình"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{widgetPosition === 'floating' ? 'Đang nổi' : 'Gắn dưới'}</span>
          </button>

          {/* Quick Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl border text-xs transition-all ${
              showSettings
                ? 'bg-dark-800 text-white border-accent-500'
                : 'bg-dark-950 border-dark-800 text-slate-400 hover:text-white'
            }`}
            title="Tùy chỉnh độ trong suốt & kiểu chữ"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* History list toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-xl bg-dark-950 border border-dark-800 text-slate-400 hover:text-white text-xs flex items-center space-x-1.5"
            title="Xem lại lịch sử các câu thoại đã dịch"
          >
            <span>Lịch sử ({liveHistory.length})</span>
            {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Helpful banner for parallel app usage */}
      <div className="px-4 py-2.5 rounded-xl bg-dark-950/70 border border-dark-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            <b>Cửa sổ nổi PiP:</b> Đã được thu nhỏ gọn gàng và làm trong suốt để không che khuất khung hình xem phim!
          </span>
        </div>
        <button
          onClick={() => setShowAudioHelpModal(true)}
          className="text-xs text-accent-400 hover:text-accent-300 font-medium underline underline-offset-2 shrink-0 ml-2"
        >
          Hướng dẫn chia sẻ âm thanh
        </button>
      </div>

      {/* Floating Widget Customization Bar (Expandable) */}
      {showSettings && (
        <div className="p-4 rounded-2xl bg-dark-900/80 border border-dark-800 flex flex-wrap items-center gap-6 text-xs text-slate-300 animate-fadeIn">
          {/* Bilingual Toggle */}
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400 uppercase text-[10px]">Hiển thị:</span>
            <button
              onClick={() => setIsBilingual(!isBilingual)}
              className={`px-3 py-1 rounded-lg border font-bold text-xs transition-all ${
                isBilingual
                  ? 'bg-accent-500/20 text-accent-300 border-accent-500/40'
                  : 'bg-dark-950 border-dark-800 text-slate-400'
              }`}
            >
              {isBilingual ? 'Song ngữ (Gốc + Dịch)' : 'Chỉ tiếng Việt'}
            </button>
          </div>

          {/* Font Size */}
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400 uppercase text-[10px]">Cỡ chữ:</span>
            {[16, 18, 20, 24].map((sz) => (
              <button
                key={sz}
                onClick={() => setFontSize(sz)}
                className={`px-2.5 py-1 rounded-lg border font-mono text-xs transition-all ${
                  fontSize === sz
                    ? 'bg-accent-600 text-white border-accent-500'
                    : 'bg-dark-950 border-dark-800 text-slate-400 hover:text-white'
                }`}
              >
                {sz}px
              </button>
            ))}
          </div>

          {/* Font Color */}
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400 uppercase text-[10px]">Màu chữ:</span>
            {[
              { label: 'Vàng rực', value: '#FDE047' },
              { label: 'Trắng', value: '#FFFFFF' },
              { label: 'Xanh Neon', value: '#34D399' },
              { label: 'Cam', value: '#FB923C' }
            ].map((col) => (
              <button
                key={col.value}
                onClick={() => setFontColor(col.value)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  fontColor === col.value ? 'scale-125 border-white shadow-md' : 'border-dark-700 opacity-60'
                }`}
                style={{ backgroundColor: col.value }}
                title={col.label}
              />
            ))}
          </div>

          {/* Background Opacity */}
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400 uppercase text-[10px]">Độ trong suốt nền:</span>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={bgOpacity}
              onChange={(e) => setBgOpacity(Number(e.target.value))}
              className="w-24 accent-accent-500 cursor-pointer"
            />
            <span className="font-mono text-xs text-slate-400">{bgOpacity}%</span>
          </div>
        </div>
      )}

      {/* THE ACTUAL LIVE SUBTITLE OVERLAY CONTAINER */}
      <div
        className={`w-full transition-all duration-300 ${
          widgetPosition === 'floating'
            ? 'fixed bottom-8 left-1/2 -translate-x-1/2 z-50 max-w-3xl w-[90%] shadow-2xl'
            : 'relative'
        }`}
      >
        <div
          className="rounded-2xl p-4 border shadow-2xl transition-all duration-200 backdrop-blur-md"
          style={{
            backgroundColor: `rgba(11, 15, 25, ${bgOpacity / 100})`,
            borderColor: isSpeechActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(30, 41, 59, 0.8)',
            boxShadow: isSpeechActive ? '0 0 25px rgba(16, 185, 129, 0.15)' : 'none'
          }}
        >
          {/* Status Header inside widget */}
          <div className="flex items-center justify-between text-xs pb-1 border-b border-dark-800/50 mb-1.5">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isListening
                    ? isSpeechActive ? 'bg-emerald-400 animate-ping' : 'bg-red-500 animate-pulse'
                    : 'bg-slate-600'
                }`}
              />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {isListening
                  ? isSpeechActive ? '🎙️ Đang nói...' : 'Đang lắng nghe'
                  : 'Sẵn sàng'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-dark-800 text-emerald-300 font-mono font-bold">
                {whisperModel === 'tiny' ? '⚡ SIÊU TỐC' : '🎯 BASE'}
              </span>
              {detectedLang && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-dark-800 text-slate-300 font-mono uppercase">
                  {detectedLang}
                </span>
              )}
            </div>

            {widgetPosition === 'floating' && (
              <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                <Move className="w-3 h-3" />
                <span>Thanh Widget Nổi</span>
              </span>
            )}
          </div>

          {/* Subtitle Content Display Area */}
          <div className="py-1 min-h-[60px] flex flex-col justify-center items-center text-center space-y-1">
            {/* Original Spoken Text (Bilingual Mode) */}
            {isBilingual && currentOriginal && (
              <p
                className="text-slate-400/90 font-medium italic transition-opacity duration-200"
                style={{ fontSize: `${Math.max(12, fontSize - 7)}px` }}
              >
                "{currentOriginal}"
              </p>
            )}

            {/* Translated Live Subtitle (Vietnamese Main Line) */}
            <h2
              className="font-bold tracking-wide transition-all duration-200 drop-shadow-md select-text"
              style={{
                fontSize: `${fontSize}px`,
                color: fontColor,
                lineHeight: 1.3,
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.95), 0 0 20px rgba(0,0,0,0.5)'
              }}
            >
              {currentTranslated}
            </h2>
          </div>
        </div>
      </div>

      {/* Live History Drawer */}
      {showHistory && (
        <div className="p-4 rounded-2xl bg-dark-900/95 border border-dark-800 shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-dark-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Lịch sử phụ đề trực tiếp ({liveHistory.length})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportLiveSrt}
                disabled={liveHistory.length === 0}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-accent-600/20 hover:bg-accent-600/30 text-accent-300 border border-accent-500/30 text-xs font-semibold disabled:opacity-40 transition-all"
                title="Tải toàn bộ phụ đề đã dịch thành file .SRT"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất file .SRT</span>
              </button>
              <button
                onClick={() => setLiveHistory([])}
                disabled={liveHistory.length === 0}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 text-xs transition-colors"
                title="Xóa lịch sử"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {liveHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Chưa có câu thoại nào. Hãy bấm "Bật Dịch Trực Tiếp" và phát video để xem phụ đề xuất hiện tại đây!
              </p>
            ) : (
              liveHistory.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl bg-dark-950/70 border border-dark-800/80 hover:border-dark-700 transition-all flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
                      <span className="text-cyan-400 font-bold">{item.timestamp}</span>
                      <span>({item.time})</span>
                      {item.lang && <span className="uppercase text-slate-400">[{item.lang}]</span>}
                    </div>
                    {item.original && (
                      <p className="text-slate-400 italic text-[11px]">"{item.original}"</p>
                    )}
                    <p className="text-white font-semibold text-xs text-amber-200/90">{item.translated}</p>
                  </div>

                  <button
                    onClick={() => copyText(item.translated, idx)}
                    className="p-1 text-slate-500 hover:text-slate-300 shrink-0"
                    title="Sao chép câu dịch"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* AUDIO HELP MODAL: Step-by-step guidance to capture system audio in Windows */}
      {showAudioHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-dark-900 border border-dark-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowAudioHelpModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-dark-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Chưa Nhận Được Luồng Âm Thanh</h3>
                <p className="text-xs text-slate-400">Cách bật âm thanh khi dùng cùng lúc với các ứng dụng khác</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="p-3.5 rounded-2xl bg-dark-950 border border-dark-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-accent-600 text-white flex items-center justify-center text-[11px]">1</span>
                  Nếu dịch Video trên Web (YouTube, Netflix, Coursera):
                </div>
                <p className="text-slate-400 pl-6 leading-relaxed">
                  Khi hộp thoại chia sẻ màn hình hiện ra, hãy bấm vào tab <b>"Thẻ Chrome / Edge" (Tab)</b> và chọn tab YouTube đang phát. Đảm bảo ô <b>"Chia sẻ âm thanh của thẻ"</b> (Share tab audio) được tick chọn.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-dark-950 border border-dark-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-accent-600 text-white flex items-center justify-center text-[11px]">2</span>
                  Nếu dịch App máy tính (Zoom, Teams, VLC, PotPlayer, Game):
                </div>
                <p className="text-slate-400 pl-6 leading-relaxed">
                  Bấm chọn tab <b>"Toàn bộ màn hình" (Entire Screen)</b> và <b>BẮT BUỘC GẠT BẬT</b> công tắc <b>"Chia sẻ âm thanh hệ thống" (Share system audio)</b> ở góc dưới bên trái!
                </p>
                <p className="text-amber-400/90 pl-6 text-[11px] font-medium">
                  ⚠️ Lưu ý: Windows không hỗ trợ chia sẻ âm thanh cho tab "Cửa sổ" (Window), vì vậy bạn cần chọn "Toàn bộ màn hình".
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-dark-950 border border-dark-800 space-y-2">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px]">3</span>
                  Để vừa dùng app khác vừa đọc được phụ đề:
                </div>
                <p className="text-slate-400 pl-6 leading-relaxed">
                  Bấm nút <b>"Cửa sổ nổi PiP (Trong suốt)"</b>: Thanh phụ đề sẽ tách ra thành một cửa sổ mini mờ trong suốt luôn ghim trên cùng màn hình máy tính của bạn (đè lên trên Zoom, VLC, game mà không che khuất màn hình).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowAudioHelpModal(false)}
                className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-semibold transition-all"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setShowAudioHelpModal(false);
                  startListening('display');
                }}
                className="px-5 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-bold shadow-lg shadow-accent-600/20 transition-all"
              >
                Thử Bật Lại Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
