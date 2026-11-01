import React, { useState } from 'react';
import {
  Camera,
  CameraOff,
  Mic,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Maximize2,
  UserCheck,
  UserX,
  Users,
  Volume2,
  Activity,
} from 'lucide-react';
import { FaceStatus, VoiceStatus } from '../../hooks/useAIProctor';

interface AIProctorHUDProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  bindVideoElement?: (el: HTMLVideoElement | null) => void;
  isReady: boolean;
  hasPermissions: boolean;
  permissionError: string | null;
  faceStatus: FaceStatus;
  voiceStatus: VoiceStatus;
  faceCount: number;
  audioLevel: number;
  motionLevel?: number;
  faceCenter?: { x: number; y: number };
  warningCount: number;
  maxStrikes: number;
  onRetryPermissions?: () => void;
}

export const AIProctorHUD: React.FC<AIProctorHUDProps> = ({
  videoRef,
  bindVideoElement,
  isReady,
  hasPermissions,
  permissionError,
  faceStatus,
  voiceStatus,
  faceCount,
  audioLevel,
  motionLevel = 0,
  faceCenter = { x: 0.5, y: 0.5 },
  warningCount,
  maxStrikes,
  onRetryPermissions,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dockPosition, setDockPosition] = useState<'bottom-right' | 'top-right'>('bottom-right');

  // Determine border and status glow colors based on face & voice state
  const isDanger = faceStatus === 'multiple_faces' || faceStatus === 'no_face' || warningCount >= 2;
  const isWarning = faceStatus === 'looking_away' || voiceStatus === 'talking' || motionLevel > 30 || warningCount === 1;

  const borderColor = isDanger
    ? 'border-rose-500 shadow-rose-500/30 ring-1 ring-rose-500/30'
    : isWarning
    ? 'border-amber-500 shadow-amber-500/30 ring-1 ring-amber-500/30'
    : 'border-emerald-500/80 shadow-emerald-500/20';

  const positionClasses =
    dockPosition === 'bottom-right'
      ? 'bottom-4 right-4'
      : 'top-16 right-4';

  // Dynamic face reticle position following candidate head
  const reticleLeft = Math.max(6, Math.min(64, (1 - faceCenter.x) * 100 - 16));
  const reticleTop = Math.max(6, Math.min(52, faceCenter.y * 100 - 20));

  return (
    <div
      className={`fixed ${positionClasses} z-40 transition-all duration-300 select-none ${
        isCollapsed ? 'w-auto' : 'w-64 sm:w-72'
      }`}
    >
      <div
        className={`bg-midnight-950/95 backdrop-blur-md rounded-2xl border ${borderColor} shadow-2xl overflow-hidden transition-all text-white`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-midnight-900/90 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  warningCount > 0 ? 'bg-rose-400' : 'bg-emerald-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  warningCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
              />
            </span>
            <span className="text-[11px] font-extrabold tracking-wide uppercase text-pearl-100 flex items-center gap-1">
              AI Proctor
            </span>
          </div>

          {/* Strike Indicators */}
          <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
            <span className="text-[10px] font-bold text-pearl-300 mr-0.5">Strikes:</span>
            {Array.from({ length: maxStrikes }).map((_, i) => {
              const isFilled = i < warningCount;
              return (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${
                    isFilled
                      ? i === maxStrikes - 1
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-amber-500 text-midnight-950 font-black'
                      : 'bg-white/10 text-white/30'
                  }`}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 text-pearl-400">
            <button
              type="button"
              onClick={() =>
                setDockPosition((pos) => (pos === 'bottom-right' ? 'top-right' : 'bottom-right'))
              }
              className="p-1 hover:text-white rounded hover:bg-white/10"
              title="Toggle HUD Position (Top/Bottom)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:text-white rounded hover:bg-white/10"
              title={isCollapsed ? 'Expand Camera' : 'Minimize Camera'}
            >
              {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Video & Telemetry Body - Video is ALWAYS kept in DOM to prevent tearing down video stream! */}
        <div className={isCollapsed ? 'hidden' : 'block'}>
          {/* Live Camera Viewport */}
          <div className="relative aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
            <video
              ref={(el) => {
                if (bindVideoElement) {
                  bindVideoElement(el);
                } else if (videoRef) {
                  (videoRef as any).current = el;
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100"
            />

            {/* Dynamic Tracking Reticle Following Candidate Head */}
            {isReady && hasPermissions && (
              <div
                className={`absolute rounded-xl border-2 pointer-events-none transition-all duration-150 ${
                  faceStatus === 'normal'
                    ? 'border-emerald-400/80 shadow-[inset_0_0_15px_rgba(52,211,153,0.3)]'
                    : faceStatus === 'looking_away'
                    ? 'border-amber-400 shadow-[inset_0_0_20px_rgba(251,191,36,0.5)] animate-pulse'
                    : 'border-rose-500 shadow-[inset_0_0_25px_rgba(244,63,94,0.6)] animate-pulse'
                }`}
                style={{
                  left: `${reticleLeft}%`,
                  top: `${reticleTop}%`,
                  width: '32%',
                  height: '42%',
                }}
              >
                {/* Target Corners */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-current" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-current" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-current" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-current" />
              </div>
            )}

            {/* Status Badge floating on camera */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
              {faceStatus === 'normal' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/85 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 backdrop-blur-xs shadow-sm">
                  <UserCheck className="w-3 h-3 text-emerald-400" /> Face Centered
                </span>
              )}
              {faceStatus === 'looking_away' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-500/60 flex items-center gap-1 backdrop-blur-xs animate-bounce shadow-sm">
                  <AlertTriangle className="w-3 h-3 text-amber-400" /> Looking Away!
                </span>
              )}
              {faceStatus === 'no_face' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-500/60 flex items-center gap-1 backdrop-blur-xs animate-pulse shadow-sm">
                  <UserX className="w-3 h-3 text-rose-400" /> No Face Visible!
                </span>
              )}
              {faceStatus === 'multiple_faces' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-500/60 flex items-center gap-1 backdrop-blur-xs animate-pulse shadow-sm">
                  <Users className="w-3 h-3 text-rose-400" /> Multiple Faces!
                </span>
              )}

              {/* Movement indicator if moving */}
              {motionLevel > 25 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1 backdrop-blur-xs animate-pulse">
                  <Activity className="w-2.5 h-2.5 text-amber-400" /> Motion ({motionLevel}%)
                </span>
              )}
            </div>

            {/* Voice Status Alert floating on camera */}
            {voiceStatus === 'talking' && (
              <div className="absolute bottom-2 left-2 right-2 z-10">
                <div className="bg-rose-950/95 border border-rose-500 text-rose-200 px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 backdrop-blur-xs animate-pulse shadow-lg">
                  <Volume2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Talking Detected! Absolute Silence Required</span>
                </div>
              </div>
            )}

            {/* Permission Error Overlay */}
            {!hasPermissions && (
              <div className="absolute inset-0 bg-midnight-950/95 p-3 flex flex-col items-center justify-center text-center">
                <CameraOff className="w-7 h-7 text-rose-400 mb-2" />
                <p className="text-[11px] font-bold text-rose-300 mb-1 leading-snug">
                  Camera / Mic Access Needed
                </p>
                <p className="text-[10px] text-pearl-400 mb-2 leading-tight">
                  {permissionError || 'Enable camera and microphone to continue.'}
                </p>
                {onRetryPermissions && (
                  <button
                    type="button"
                    onClick={onRetryPermissions}
                    className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded-lg"
                  >
                    Allow Access
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom Audio & AI Telemetry Bar */}
          <div className="p-2.5 bg-midnight-900/95 border-t border-white/5 space-y-1.5">
            {/* Mic Audio Visualizer Bar */}
            <div className="flex items-center justify-between text-[10px] text-pearl-300">
              <div className="flex items-center gap-1.5">
                <Mic className={`w-3.5 h-3.5 ${voiceStatus === 'talking' ? 'text-rose-400 animate-pulse' : 'text-indigo-400'}`} />
                <span>Mic Level ({audioLevel}%)</span>
              </div>
              <span
                className={`font-mono text-[9px] font-bold ${
                  voiceStatus === 'talking'
                    ? 'text-rose-400 animate-pulse'
                    : audioLevel > 14
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}
              >
                {voiceStatus === 'talking'
                  ? '🎤 TALKING DETECTED'
                  : audioLevel > 14
                  ? '🔊 SOUND DETECTED'
                  : '🟢 SILENT (OK)'}
              </span>
            </div>

            {/* Live Audio Meter & Equalizer */}
            <div className="flex items-center gap-1.5">
              {/* Equalizer frequency bars */}
              <div className="flex items-end gap-0.5 h-3 shrink-0">
                {[0.4, 0.8, 1.0, 0.7, 0.5].map((multiplier, barIdx) => {
                  const barHeight = Math.max(3, Math.min(12, (audioLevel * multiplier) / 6));
                  return (
                    <div
                      key={barIdx}
                      className={`w-1 rounded-xs transition-all duration-75 ${
                        voiceStatus === 'talking'
                          ? 'bg-rose-500'
                          : audioLevel > 20
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                      style={{ height: `${barHeight}px` }}
                    />
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="flex-1 bg-black/60 h-2 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-75 rounded-full ${
                    voiceStatus === 'talking'
                      ? 'bg-rose-500'
                      : audioLevel > 25
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(4, audioLevel * 1.5))}%` }}
                />
              </div>
            </div>

            {/* Rules reminder snippet */}
            <div className="pt-1 flex items-center justify-between text-[9px] text-pearl-400">
              <span>Rule: 3 strikes = Auto-Submit</span>
              <span className="font-semibold text-pearl-200">
                {maxStrikes - warningCount} strike{maxStrikes - warningCount === 1 ? '' : 's'} remaining
              </span>
            </div>
          </div>
        </div>

        {/* Minimized pill view */}
        {isCollapsed && (
          <div className="p-2.5 flex items-center justify-between gap-3 bg-midnight-950">
            <div className="flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              <div className="text-left">
                <span className="text-[10px] font-bold block text-pearl-200">
                  {faceStatus === 'normal' ? '🟢 Monitored' : '⚠️ Alert'}
                </span>
              </div>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                warningCount > 0 ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'
              }`}
            >
              {warningCount}/{maxStrikes} Strikes
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
