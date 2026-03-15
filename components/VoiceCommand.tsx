'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Volume2, AlertCircle, PauseCircle, PlayCircle, CheckCircle2 } from 'lucide-react';
import {
  executeVoiceCommandApi,
  type OrderStats,
} from '../lib/orderStore';

interface VoiceCommandProps {
  onCommand: (command: string) => void;
  onStatsUpdate: (stats: OrderStats) => void;
}

interface CommandHistoryItem {
  id: string;
  command: string;
  response: string;
  createdAt: number;
}

function openTrustedShoppingUrl(url: string | null | undefined) {
  if (!url) {
    return;
  }

  try {
    const parsed = new URL(url);
    const allowedHosts = new Set(['www.amazon.in', 'www.flipkart.com']);

    if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) {
      return;
    }

    const popup = window.open(parsed.toString(), '_blank', 'noopener,noreferrer');

    // Fallback for browsers that block async popups in speech callbacks.
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.assign(parsed.toString());
    }
  } catch {
    // Ignore malformed URLs.
  }
}

export default function VoiceCommand({ onCommand, onStatsUpdate }: VoiceCommandProps) {
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [assistantResponse, setAssistantResponse] = useState('Click Resume and allow microphone access to start voice commands.');
  const [commandHistory, setCommandHistory] = useState<CommandHistoryItem[]>([]);
  const recognitionRef = useRef<any>(null);
  const recognitionActiveRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const microphonePermissionRef = useRef<'unknown' | 'granted' | 'denied'>('unknown');
  const shouldKeepListeningRef = useRef(true);
  const lastProcessedRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  useEffect(() => {
    microphonePermissionRef.current = microphonePermission;
  }, [microphonePermission]);

  const createHistoryId = (command: string) => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    const normalizedCommand = command.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 24);
    return `${Date.now()}-${normalizedCommand || 'voice'}`;
  };

  const requestMicrophoneAccessAndStart = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone API is not available in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophonePermission('granted');
      shouldKeepListeningRef.current = true;
      setError(null);
      startListening();
    } catch {
      shouldKeepListeningRef.current = false;
      setMicrophonePermission('denied');
      setIsListening(false);
      setAssistantResponse('Microphone access is required for voice commands.');
      setError('Microphone permission denied. Allow microphone access in your browser settings and click Enable Mic.');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const SpeechRecognitionApi =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    recognitionRef.current = new SpeechRecognitionApi();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      recognitionActiveRef.current = true;
      setIsListening(true);
      setError(null);
      setAssistantResponse('Listening for command...');
    };

    recognitionRef.current.onresult = async (event: any) => {
      const current = event.resultIndex;
      const spokenText = event.results[current][0].transcript;
      setTranscript(spokenText);

      if (event.results[current].isFinal) {
        const normalized = spokenText.trim().toLowerCase();
        const now = Date.now();

        // Browsers can emit duplicate final events; suppress near-duplicate replays.
        if (
          normalized === lastProcessedRef.current.text &&
          now - lastProcessedRef.current.time < 1500
        ) {
          return;
        }

        lastProcessedRef.current = { text: normalized, time: now };
        await processCommand(spokenText);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      const errorCode = event?.error;
      const permissionDenied = errorCode === 'not-allowed' || errorCode === 'service-not-allowed';

      const message =
        permissionDenied
          ? 'Microphone permission denied. Please allow microphone access.'
          : errorCode === 'audio-capture'
            ? 'No microphone device detected. Connect a microphone and try again.'
            : errorCode === 'network'
              ? 'Speech recognition network issue. Please try again.'
              : errorCode === 'no-speech'
                ? 'No speech detected. Try speaking clearly near the microphone.'
                : 'Microphone access denied or not available';

      if (permissionDenied) {
        shouldKeepListeningRef.current = false;
        setMicrophonePermission('denied');
      }

      if (errorCode === 'audio-capture') {
        shouldKeepListeningRef.current = false;
      }

      if (errorCode === 'aborted') {
        return;
      }

      setError(message);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      recognitionActiveRef.current = false;
      setIsListening(false);

      if (shouldKeepListeningRef.current && microphonePermissionRef.current !== 'denied') {
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
        }

        restartTimerRef.current = setTimeout(() => {
          if (shouldKeepListeningRef.current) {
            startListening();
          }
        }, 450);
      }
    };

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as PermissionName })
        .then((status) => {
          if (status.state === 'granted') {
            setMicrophonePermission('granted');
          } else if (status.state === 'denied') {
            setMicrophonePermission('denied');
          }

          status.onchange = () => {
            if (status.state === 'granted') {
              setMicrophonePermission('granted');
            } else if (status.state === 'denied') {
              setMicrophonePermission('denied');
            } else {
              setMicrophonePermission('unknown');
            }
          };
        })
        .catch(() => {
          // Permission query unsupported in some browsers.
        });
    }

    return () => {
      shouldKeepListeningRef.current = false;
      recognitionActiveRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current || recognitionActiveRef.current) {
      return;
    }

    shouldKeepListeningRef.current = true;
    setError(null);

    try {
      recognitionRef.current.start();
      setMicrophonePermission('granted');
    } catch {
      setError('Unable to start microphone listening. Click Enable Mic and try again.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    shouldKeepListeningRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    recognitionActiveRef.current = false;
    setIsListening(false);
    setAssistantResponse('Voice assistant paused. Click resume to continue.');
  };

  const processCommand = async (command: string) => {
    setIsProcessing(true);
    onCommand(command);

    try {
      const result = await executeVoiceCommand(command);

      if (result.stats) {
        onStatsUpdate(result.stats);
      }

      openTrustedShoppingUrl(result.openUrl);

      setError(null);
      setAssistantResponse(result.spokenResponse);
      setCommandHistory((previous) => {
        const nextItem: CommandHistoryItem = {
          id: createHistoryId(command),
          command,
          response: result.spokenResponse,
          createdAt: Date.now(),
        };

        return [nextItem, ...previous].slice(0, 5);
      });
      speakResponse(result.spokenResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to process command');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center text-lg font-semibold text-slate-800">
          <Mic className="w-5 h-5 text-blue-600 mr-2" />
          Voice Command Center
        </h3>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isListening ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isListening ? 'Listening' : 'Paused'}
          </span>
          <button
            type="button"
            onClick={isListening ? stopListening : requestMicrophoneAccessAndStart}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {isListening ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
            {isListening ? 'Pause' : microphonePermission === 'denied' ? 'Enable Mic' : 'Resume'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {transcript && (
          <motion.div
            key="transcript"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-4 bg-blue-50 rounded-lg"
          >
            <p className="text-blue-800">
              <span className="font-semibold">You said:</span> {transcript}
            </p>
          </motion.div>
        )}

        {assistantResponse && (
          <motion.div
            key="assistant-response"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4"
          >
            <p className="flex items-start gap-2 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{assistantResponse}</span>
            </p>
          </motion.div>
        )}

        {isProcessing && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2 text-gray-600"
          >
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Processing your command...</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center space-x-2 text-red-600"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 rounded-lg border border-dashed border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
        <p className="font-semibold">Try commands:</p>
        <p>"Order a laptop from Amazon"</p>
        <p>"Buy shoes from Flipkart"</p>
        <p>"Cancel order number 2"</p>
        <p>"Track my order" or "Update order to headphones"</p>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-700">Recent Voice Commands</p>
        {commandHistory.length === 0 ? (
          <p className="text-sm text-slate-500">No commands yet. Speak any supported command to see history.</p>
        ) : (
          <div className="space-y-2">
            {commandHistory.map((item) => (
              <div key={`${item.id}-${item.createdAt}`} className="rounded-md border border-slate-200 bg-white p-2">
                <p className="text-sm font-medium text-slate-800">{item.command}</p>
                <p className="text-xs text-slate-600">{item.response}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {new Date(item.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center">
          <Volume2 className="w-4 h-4 mr-1" />
          <span>Voice feedback enabled</span>
        </div>
        <span>
          {isListening
            ? 'Listening...'
            : microphonePermission === 'denied'
              ? 'Microphone blocked'
              : 'Microphone idle'}
        </span>
      </div>
    </motion.div>
  );
}

async function executeVoiceCommand(command: string): Promise<{
  spokenResponse: string;
  stats?: OrderStats;
  openUrl?: string | null;
}> {
  return executeVoiceCommandApi(command);
}