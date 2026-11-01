import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { playProctorWarningSound } from '../utils/audioAlert';

export type FaceStatus = 'normal' | 'no_face' | 'multiple_faces' | 'looking_away' | 'initializing';
export type VoiceStatus = 'silent' | 'talking' | 'noise';

export interface MalpracticeViolation {
  id: string;
  type: 'voice' | 'no_face' | 'multiple_faces' | 'looking_away' | 'tab_switch' | 'fullscreen_exit';
  title: string;
  reason: string;
  strikeNumber: number;
  timestamp: number;
}

export interface UseAIProctorProps {
  attemptId?: string | null;
  submissionToken?: string | null;
  enabled?: boolean;
  maxStrikes?: number;
  onAutoSubmit?: (reason: string) => void;
}

export interface UseAIProctorReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  bindVideoElement: (el: HTMLVideoElement | null) => void;
  isReady: boolean;
  hasPermissions: boolean;
  permissionError: string | null;
  faceStatus: FaceStatus;
  voiceStatus: VoiceStatus;
  faceCount: number;
  audioLevel: number; // 0 to 100
  motionLevel: number; // 0 to 100 for movement tracking
  faceCenter: { x: number; y: number }; // 0 to 1 normalized
  warningCount: number;
  maxStrikes: number;
  violations: MalpracticeViolation[];
  activeWarning: MalpracticeViolation | null;
  isSubmittingTerminated: boolean;
  dismissWarning: () => void;
  triggerManualViolation: (
    type: MalpracticeViolation['type'],
    title: string,
    reason: string
  ) => void;
  startProctoring: () => Promise<boolean>;
  stopProctoring: () => void;
}

export const useAIProctor = ({
  attemptId,
  submissionToken,
  enabled = true,
  maxStrikes = 3,
  onAutoSubmit,
}: UseAIProctorProps): UseAIProctorReturn => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);

  // Store params in refs so they NEVER cause re-renders or stream restarts
  const onAutoSubmitRef = useRef(onAutoSubmit);
  onAutoSubmitRef.current = onAutoSubmit;

  const attemptIdRef = useRef(attemptId);
  attemptIdRef.current = attemptId;

  const submissionTokenRef = useRef(submissionToken);
  submissionTokenRef.current = submissionToken;

  const maxStrikesRef = useRef(maxStrikes);
  maxStrikesRef.current = maxStrikes;

  const [isReady, setIsReady] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const [faceStatus, setFaceStatus] = useState<FaceStatus>('normal');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('silent');
  const [faceCount, setFaceCount] = useState<number>(1);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [motionLevel, setMotionLevel] = useState<number>(0);
  const [faceCenter, setFaceCenter] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  const [warningCount, setWarningCount] = useState<number>(() => {
    if (!attemptId) return 0;
    const stored = sessionStorage.getItem(`evaltech_strikes_${attemptId}`);
    return stored ? parseInt(stored, 10) || 0 : 0;
  });

  const [violations, setViolations] = useState<MalpracticeViolation[]>(() => {
    if (!attemptId) return [];
    try {
      const stored = sessionStorage.getItem(`evaltech_violations_${attemptId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeWarning, setActiveWarning] = useState<MalpracticeViolation | null>(null);
  const activeWarningRef = useRef<MalpracticeViolation | null>(null);
  activeWarningRef.current = activeWarning;

  const [isSubmittingTerminated, setIsSubmittingTerminated] = useState(false);

  // Tracking counters
  const noFaceTicksRef = useRef(0);
  const multipleFaceTicksRef = useRef(0);
  const lookingAwayTicksRef = useRef(0);
  const highMotionTicksRef = useRef(0);
  const voiceTicksRef = useRef(0);
  const lastViolationTimeRef = useRef(0);
  const lastSpeechTimeRef = useRef(0);
  const ambientNoiseFloorRef = useRef(14);
  const recentLevelsRef = useRef<number[]>([]);
  const nativeFaceDetectorRef = useRef<any>(null);
  const isStartingRef = useRef(false);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevFramePixelsRef = useRef<Uint8ClampedArray | null>(null);

  // Reliable callback to bind the HTMLVideoElement
  const bindVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      if (el.srcObject !== streamRef.current) {
        el.srcObject = streamRef.current;
        el.play().catch(() => {});
      }
    }
  }, []);

  // Dispatch violation strike
  const issueViolationStrike = useCallback(
    (type: MalpracticeViolation['type'], title: string, reason: string) => {
      // If modal is currently displayed, PAUSE strikes until candidate acknowledges!
      if (activeWarningRef.current !== null) {
        return;
      }

      const now = Date.now();
      // Minimum 20-second grace window between strikes
      if (now - lastViolationTimeRef.current < 20000) {
        return;
      }
      lastViolationTimeRef.current = now;

      // Reset trigger counters
      noFaceTicksRef.current = 0;
      multipleFaceTicksRef.current = 0;
      lookingAwayTicksRef.current = 0;
      highMotionTicksRef.current = 0;
      voiceTicksRef.current = 0;

      setWarningCount((prevCount) => {
        const nextStrike = prevCount + 1;
        const currentMax = maxStrikesRef.current;
        const curAttemptId = attemptIdRef.current;
        const curToken = submissionTokenRef.current;

        const violation: MalpracticeViolation = {
          id: `${type}_${now}`,
          type,
          title,
          reason,
          strikeNumber: nextStrike,
          timestamp: now,
        };

        // Play alert audio
        const soundLevel = Math.min(3, Math.max(1, nextStrike)) as 1 | 2 | 3;
        playProctorWarningSound(soundLevel);

        if (curAttemptId) {
          sessionStorage.setItem(`evaltech_strikes_${curAttemptId}`, String(nextStrike));
          setViolations((prevV) => {
            const updated = [...prevV, violation];
            sessionStorage.setItem(`evaltech_violations_${curAttemptId}`, JSON.stringify(updated));
            return updated;
          });
        }

        // Show warning popup
        setActiveWarning(violation);
        activeWarningRef.current = violation;

        // Record telemetry to server
        if (curAttemptId && curToken) {
          api
            .post(`/attempts/${curAttemptId}/event`, {
              submissionToken: curToken,
              event: nextStrike >= currentMax ? 'malpractice_auto_submit' : 'ai_malpractice_warning',
              details: `Strike ${nextStrike}/${currentMax} [${type.toUpperCase()}]: ${reason}`,
            })
            .catch(() => {});
        }

        // Automatic 3-strike exam termination
        if (nextStrike >= currentMax) {
          setIsSubmittingTerminated(true);
          sessionStorage.setItem(
            'evaltech_malpractice_status',
            JSON.stringify({
              terminated: true,
              totalStrikes: nextStrike,
              finalReason: reason,
              violations: [violation],
            })
          );

          setTimeout(() => {
            if (onAutoSubmitRef.current) {
              onAutoSubmitRef.current(
                `Malpractice limit exceeded (${nextStrike}/${currentMax} warnings: ${reason})`
              );
            }
          }, 3200);
        }

        return nextStrike;
      });
    },
    []
  );

  const triggerManualViolation = useCallback(
    (type: MalpracticeViolation['type'], title: string, reason: string) => {
      issueViolationStrike(type, title, reason);
    },
    [issueViolationStrike]
  );

  // Student acknowledges warning and resumes exam
  const dismissWarning = useCallback(() => {
    if (!isSubmittingTerminated) {
      setActiveWarning(null);
      activeWarningRef.current = null;
      lastViolationTimeRef.current = Date.now();
      noFaceTicksRef.current = 0;
      multipleFaceTicksRef.current = 0;
      lookingAwayTicksRef.current = 0;
      highMotionTicksRef.current = 0;
      voiceTicksRef.current = 0;
    }
  }, [isSubmittingTerminated]);

  // Stop media stream tracks on unmount
  const stopProctoring = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {}
      audioContextRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsReady(false);
  }, []);

  // Start proctoring media devices (runs once on mount)
  const startProctoring = useCallback(async (): Promise<boolean> => {
    if (isStartingRef.current || streamRef.current) return true;
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPermissionError('Camera and Microphone are not supported in this browser.');
      return false;
    }

    isStartingRef.current = true;
    try {
      setPermissionError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setHasPermissions(true);

      // Bind to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Initialize Web Audio API
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const resumeAudio = () => {
            if (audioCtx.state === 'suspended') {
              audioCtx.resume().catch(() => {});
            }
          };
          ['click', 'keydown', 'pointerdown', 'touchstart', 'mousemove'].forEach((ev) => {
            window.addEventListener(ev, resumeAudio, { once: true });
          });
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }

          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.2;
          source.connect(analyser);

          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;
        }
      } catch (audioErr) {
        console.warn('AudioContext init warning:', audioErr);
      }

      // Initialize Web Speech Recognition
      try {
        const SpeechRecognitionClass =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognitionClass) {
          const recognition = new SpeechRecognitionClass();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = navigator.language || 'en-US';

          recognition.onresult = (event: any) => {
            const results = event.results;
            for (let i = event.resultIndex; i < results.length; i++) {
              const transcript = results[i][0]?.transcript?.trim();
              if (transcript && transcript.length >= 2) {
                setVoiceStatus('talking');
                lastSpeechTimeRef.current = Date.now();
                issueViolationStrike(
                  'voice',
                  'Voice / Talking Detected',
                  `Candidate spoke during exam: "${transcript.slice(0, 50)}". Absolute silence is mandatory.`
                );
              }
            }
          };

          recognition.onerror = () => {};
          recognition.onend = () => {
            if (streamRef.current) {
              setTimeout(() => {
                try {
                  recognition.start();
                } catch {}
              }, 400);
            }
          };

          try {
            recognition.start();
            recognitionRef.current = recognition;
          } catch {}
        }
      } catch (recErr) {
        console.warn('SpeechRecognition unavailable:', recErr);
      }

      setIsReady(true);
      return true;
    } catch (err: any) {
      console.error('Media access error:', err);
      let msg = 'Failed to access camera/microphone. Please allow browser permissions.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera & Microphone access was denied. You must grant access to sit for this exam.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera or microphone found. Please connect your hardware.';
      }
      setPermissionError(msg);
      setHasPermissions(false);
      return false;
    } finally {
      isStartingRef.current = false;
    }
  }, [issueViolationStrike]);

  // Mount effect: Starts proctoring once and NEVER restarts on state changes
  useEffect(() => {
    if (enabled) {
      startProctoring();
    }
    return () => {
      stopProctoring();
    };
  }, [enabled]);

  // Initialize native Shape Detection FaceDetector if available (Chrome / Edge)
  useEffect(() => {
    try {
      if (typeof (window as any).FaceDetector !== 'undefined') {
        nativeFaceDetectorRef.current = new (window as any).FaceDetector({
          fastMode: true,
          maxDetectedFaces: 3,
        });
      }
    } catch {}
  }, []);

  // 1. DYNAMIC NOISE-FILTERED AUDIO MONITORING (every 100ms)
  useEffect(() => {
    if (!isReady) return;

    let isActive = true;
    const audioInterval = setInterval(() => {
      if (!isActive || !analyserRef.current) return;

      // Ensure AudioContext is actively processing
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }

      const analyser = analyserRef.current;
      const bufferLength = analyser.frequencyBinCount;

      // 1. Time-Domain Amplitude & Peak Calculation
      const timeData = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(timeData);

      let sumSquares = 0;
      let peakDelta = 0;
      for (let i = 0; i < timeData.length; i++) {
        const delta = Math.abs(timeData[i] - 128);
        if (delta > peakDelta) peakDelta = delta;
        const val = delta / 128;
        sumSquares += val * val;
      }
      const rms = Math.sqrt(sumSquares / timeData.length);

      // 2. Frequency-Domain Vocal Energy Calculation (Voice Bins ~180Hz - 3400Hz)
      const freqData = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(freqData);
      let voiceFreqSum = 0;
      const binStart = 2;
      const binEnd = Math.min(bufferLength - 1, 38);
      for (let i = binStart; i <= binEnd; i++) {
        voiceFreqSum += freqData[i];
      }
      const avgVoiceFreq = voiceFreqSum / (binEnd - binStart + 1);

      // 3. Composite Real-Time Audio Level (0 to 100)
      const levelFromRms = Math.min(100, Math.round(rms * 600));
      const levelFromFreq = Math.min(100, Math.round((avgVoiceFreq / 255) * 100));
      const currentLevel = Math.max(levelFromRms, levelFromFreq);
      setAudioLevel(currentLevel);

      // 4. Track Ambient Room Noise Floor (auto-calibrates to fan, AC, PC hum)
      recentLevelsRef.current.push(currentLevel);
      if (recentLevelsRef.current.length > 15) {
        recentLevelsRef.current.shift();
      }
      const minRecent = Math.min(...recentLevelsRef.current);
      // Steadily adjust noise floor to room baseline
      ambientNoiseFloorRef.current = ambientNoiseFloorRef.current * 0.96 + minRecent * 0.04;
      ambientNoiseFloorRef.current = Math.max(6, Math.min(32, ambientNoiseFloorRef.current));
      const noiseFloor = ambientNoiseFloorRef.current;

      // 5. Intelligent Speech Detection (Filters out fans, PC hum, room noise)
      // Must be significantly above the room baseline AND have speech acoustic characteristics
      const hasSpeechVolume = currentLevel >= noiseFloor + 18 && currentLevel >= 28;
      const hasVoiceFormants = avgVoiceFreq >= noiseFloor + 16 && avgVoiceFreq >= 28;
      const hasAcousticPulse = peakDelta >= 16;

      const isSpeakingNow = (hasSpeechVolume || hasVoiceFormants) && hasAcousticPulse;

      if (isSpeakingNow) {
        // Accumulate 1 tick per 100ms when human voice is active
        voiceTicksRef.current = Math.min(30, voiceTicksRef.current + 1);
        setVoiceStatus('talking');
        lastSpeechTimeRef.current = Date.now();

        // Must sustain talking for ~1.8 seconds (18 ticks at 100ms) to trigger strike
        // Transient noises (door, fan, mouse click) will NEVER reach 18!
        if (voiceTicksRef.current >= 18) {
          issueViolationStrike(
            'voice',
            'Voice / Talking Detected',
            'Candidate spoke during the examination. Absolute silence is mandatory.'
          );
          voiceTicksRef.current = 0;
        }
      } else {
        // Decay gently when quiet
        voiceTicksRef.current = Math.max(0, voiceTicksRef.current - 1);
        if (Date.now() - lastSpeechTimeRef.current > 1200) {
          setVoiceStatus(currentLevel > noiseFloor + 12 ? 'noise' : 'silent');
        }
      }
    }, 100);

    return () => {
      isActive = false;
      clearInterval(audioInterval);
    };
  }, [isReady, issueViolationStrike]);

  // 2. REAL-TIME COMPUTER VISION FACE & MOTION MONITORING (every 300ms)
  useEffect(() => {
    if (!isReady) return;

    let isActive = true;
    const visionInterval = setInterval(async () => {
      if (!isActive) return;

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused) return;

      try {
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
          offscreenCanvasRef.current.width = 160;
          offscreenCanvasRef.current.height = 120;
        }

        const canvas = offscreenCanvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, 160, 120);
        const imgData = ctx.getImageData(0, 0, 160, 120);
        const pixels = imgData.data;

        // A. Motion Analysis (Frame Differencing on Luminance)
        let movedPixels = 0;
        const prev = prevFramePixelsRef.current;
        const sampleStep = 8;
        let sampleCount = 0;

        if (prev && prev.length === pixels.length) {
          for (let i = 0; i < pixels.length; i += sampleStep) {
            sampleCount++;
            const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
            const prevLum = 0.299 * prev[i] + 0.587 * prev[i + 1] + 0.114 * prev[i + 2];
            if (Math.abs(lum - prevLum) > 16) {
              movedPixels++;
            }
          }
        }
        prevFramePixelsRef.current = new Uint8ClampedArray(pixels);

        const motionRatio = sampleCount > 0 ? movedPixels / sampleCount : 0;
        const currentMotion = Math.min(100, Math.round(motionRatio * 380));
        setMotionLevel(currentMotion);

        // Movement Strike Accumulator (sustained motion > 32 for ~1.5s)
        if (currentMotion > 32) {
          highMotionTicksRef.current += currentMotion > 55 ? 2 : 1;
          if (highMotionTicksRef.current >= 5) {
            issueViolationStrike(
              'looking_away',
              'Suspicious Movement Detected',
              'Excessive physical movement and head turning detected. Please stay centered facing your screen.'
            );
            highMotionTicksRef.current = 0;
          }
        } else {
          highMotionTicksRef.current = Math.max(0, highMotionTicksRef.current - 1);
        }

        // B. Face Detection & Orientation Analysis
        let detectedFaces = 1;
        let isCentered = true;
        let usedNativeDetector = false;

        // B1. Try Native Chrome/Edge Shape Detection FaceDetector API
        if (nativeFaceDetectorRef.current) {
          try {
            const faces = await nativeFaceDetectorRef.current.detect(video);
            if (Array.isArray(faces)) {
              usedNativeDetector = true;
              detectedFaces = faces.length;
              if (faces.length > 0) {
                const primaryBox = faces[0].boundingBox;
                const vW = video.videoWidth || 640;
                const vH = video.videoHeight || 480;
                const normX = (primaryBox.x + primaryBox.width / 2) / vW;
                const normY = (primaryBox.y + primaryBox.height / 2) / vH;
                setFaceCenter({ x: normX, y: normY });

                if (normX < 0.28 || normX > 0.72 || normY > 0.75 || normY < 0.16) {
                  isCentered = false;
                }
              }
            }
          } catch {
            usedNativeDetector = false;
          }
        }

        // B2. Robust Adaptive Fallback: Multi-Spectral Skin & Centroid Tracker
        if (!usedNativeDetector) {
          let skinCount = 0;
          let sumX = 0;
          let sumY = 0;
          let leftSkin = 0;   // x < 52
          let centerSkin = 0; // 52 <= x <= 108
          let rightSkin = 0;  // x > 108

          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            // YCbCr Calculation
            const Y = 0.299 * r + 0.587 * g + 0.114 * b;
            const Cb = -0.1687 * r - 0.3313 * g + 0.5 * b + 128;
            const Cr = 0.5 * r - 0.4187 * g - 0.0813 * b + 128;

            // Adaptive YCbCr (works for diverse skin tones, warm and cool lighting)
            const isYCbCr = Y >= 22 && Cr >= 118 && Cr <= 190 && Cb >= 68 && Cb <= 150;

            // RGB Chrominance (allows cool fluorescent lighting / monitor reflections)
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const isRGB =
              r > 38 &&
              g > 24 &&
              b > 18 &&
              r - b >= 4 &&
              r - g >= -10 &&
              maxC - minC >= 8;

            if (isYCbCr && isRGB) {
              const pixelIdx = i / 4;
              const px = pixelIdx % 160;
              const py = Math.floor(pixelIdx / 160);

              if (py < 112) {
                skinCount++;
                sumX += px;
                sumY += py;
                if (px < 52) leftSkin++;
                else if (px <= 108) centerSkin++;
                else rightSkin++;
              }
            }
          }

          const totalPixels = 160 * 112;
          const skinRatio = skinCount / totalPixels;

          if (skinRatio < 0.010) {
            // Less than 1% skin = Candidate left webcam
            detectedFaces = 0;
          } else if (
            leftSkin > totalPixels * 0.04 &&
            rightSkin > totalPixels * 0.04 &&
            centerSkin < (leftSkin + rightSkin) * 0.25
          ) {
            // 2 separate people on left and right sides
            detectedFaces = 2;
          } else {
            detectedFaces = 1;
            const avgX = sumX / (skinCount || 1);
            const avgY = sumY / (skinCount || 1);
            const normX = avgX / 160;
            const normY = avgY / 120;

            setFaceCenter({ x: normX, y: normY });

            // Looking away bounds:
            if (normX < 0.30 || normX > 0.70 || normY > 0.74 || normY < 0.18) {
              isCentered = false;
            }
          }
        }

        setFaceCount(detectedFaces);

        // C. Strike Triggers for Face Status (Generous tick requirements to avoid false alarms)
        if (detectedFaces === 0) {
          noFaceTicksRef.current += 1;
          lookingAwayTicksRef.current = 0;
          multipleFaceTicksRef.current = 0;
          setFaceStatus('no_face');

          // Absent for 7 ticks (~2.1 seconds)
          if (noFaceTicksRef.current >= 7) {
            issueViolationStrike(
              'no_face',
              'No Face Detected in Camera',
              'Candidate is not visible in camera frame. You must remain in front of the camera.'
            );
            noFaceTicksRef.current = 0;
          }
        } else if (detectedFaces >= 2) {
          multipleFaceTicksRef.current += 1;
          noFaceTicksRef.current = 0;
          lookingAwayTicksRef.current = 0;
          setFaceStatus('multiple_faces');

          // Multiple people for 5 ticks (~1.5 seconds)
          if (multipleFaceTicksRef.current >= 5) {
            issueViolationStrike(
              'multiple_faces',
              'Multiple Faces Detected',
              'More than one person detected in the camera frame. Unauthorized assistance is strictly prohibited.'
            );
            multipleFaceTicksRef.current = 0;
          }
        } else if (!isCentered) {
          lookingAwayTicksRef.current += 1;
          noFaceTicksRef.current = 0;
          multipleFaceTicksRef.current = 0;
          setFaceStatus('looking_away');

          // Looking away for 7 ticks (~2.1 seconds)
          if (lookingAwayTicksRef.current >= 7) {
            issueViolationStrike(
              'looking_away',
              'Looking Away from Screen',
              'Head turned away from the examination window. Please look directly at the screen.'
            );
            lookingAwayTicksRef.current = 0;
          }
        } else {
          noFaceTicksRef.current = Math.max(0, noFaceTicksRef.current - 1);
          lookingAwayTicksRef.current = Math.max(0, lookingAwayTicksRef.current - 1);
          multipleFaceTicksRef.current = Math.max(0, multipleFaceTicksRef.current - 1);
          setFaceStatus('normal');
        }
      } catch (cvErr) {
        console.warn('Vision loop error:', cvErr);
      }
    }, 300);

    return () => {
      isActive = false;
      clearInterval(visionInterval);
    };
  }, [isReady, issueViolationStrike]);

  return {
    videoRef,
    bindVideoElement,
    isReady,
    hasPermissions,
    permissionError,
    faceStatus,
    voiceStatus,
    faceCount,
    audioLevel,
    motionLevel,
    faceCenter,
    warningCount,
    maxStrikes,
    violations,
    activeWarning,
    isSubmittingTerminated,
    dismissWarning,
    triggerManualViolation,
    startProctoring,
    stopProctoring,
  };
};
