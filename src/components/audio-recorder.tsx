'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AudioRecorderProps {
  onTranscription: (text: string) => void;
}

export function AudioRecorder({ onTranscription }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          try {
            // We'll call an API route or direct Gemini call here
            const response = await fetch('/api/transcribe', {
              method: 'POST',
              body: JSON.stringify({ audio: base64Audio }),
              headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            onTranscription(data.transcription);
          } catch (error) {
            console.error('Transcription error:', error);
          } finally {
            setIsProcessing(false);
          }
        };
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-10 bg-[#080808] rounded-[2rem] border border-[#1F1F1F] shadow-inner">
      <div className="flex items-center gap-3 text-xs font-bold text-neutral-500 uppercase tracking-[0.2em]">
        <Languages className="w-4 h-4 text-[#00A388]" />
        <span>Sinhala & English Supported</span>
      </div>
      
      <div className="relative">
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0.1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 bg-red-500 rounded-full"
            />
          )}
        </AnimatePresence>
        
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white ring-4 ring-red-500/20' 
              : 'bg-[#00A388] hover:bg-[#008F76] text-white ring-4 ring-[#00A388]/20'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isProcessing ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : isRecording ? (
            <Square className="w-10 h-10" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </button>
      </div>

      <p className="text-sm text-neutral-400 font-bold uppercase tracking-widest">
        {isProcessing ? 'Processing audio...' : isRecording ? 'Recording... Click to stop' : 'Click to record feedback'}
      </p>
    </div>
  );
}
