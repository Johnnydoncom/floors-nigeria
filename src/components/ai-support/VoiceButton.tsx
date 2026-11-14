"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Send, X } from "lucide-react";
import { transcribeAudio } from "@/lib/ai-support/chat-client";
import { cn } from "@/lib/utils";

const MAX_SECONDS = 120;

/** Opus in WebM (Chrome, Firefox, Android) or AAC in MP4 (Safari, iOS). */
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"].find(
    (type) => MediaRecorder.isTypeSupported(type),
  );
}

export function canRecordVoice(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

type State = "idle" | "recording" | "transcribing";

/**
 * Tap to record a voice note, tap again to send it.
 *
 * The recording is transcribed on the server and handed back as text, which
 * the widget sends like a typed message — so the customer sees exactly what
 * was heard. Recording stops on its own after two minutes.
 */
export function VoiceButton({
  onTranscript,
  onRecordingChange,
  disabled,
}: {
  onTranscript: (text: string) => void;
  onRecordingChange: (recording: boolean) => void;
  disabled: boolean;
}) {
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTracks = () => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  // Release the microphone if the widget closes mid-recording.
  useEffect(
    () => () => {
      cancelledRef.current = true;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      stopTracks();
    },
    [],
  );

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        stopTracks();
        onRecordingChange(false);
        if (cancelledRef.current) {
          setState("idle");
          return;
        }

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        setState("transcribing");
        try {
          const text = await transcribeAudio(blob);
          onTranscript(text);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not understand that recording.");
        } finally {
          setState("idle");
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setSeconds(0);
      setState("recording");
      onRecordingChange(true);
      timerRef.current = setInterval(() => {
        setSeconds((value) => {
          if (value + 1 >= MAX_SECONDS && recorder.state === "recording") recorder.stop();
          return value + 1;
        });
      }, 1000);
    } catch (err) {
      const denied = err instanceof DOMException && err.name === "NotAllowedError";
      setError(
        denied
          ? "Allow microphone access in your browser to send a voice note."
          : "Your microphone could not be started.",
      );
    }
  };

  const stop = (cancel: boolean) => {
    cancelledRef.current = cancel;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  if (state === "recording") {
    return (
      <div className="flex flex-1 items-center gap-2">
        <button
          type="button"
          onClick={() => stop(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Cancel voice note"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex h-9 flex-1 items-center gap-2 rounded-lg bg-red-50 px-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden />
          Recording {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </div>
        <button
          type="button"
          onClick={() => stop(false)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label="Send voice note"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={start}
        disabled={disabled || state === "transcribing"}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-foreground transition-colors hover:bg-muted disabled:opacity-50",
        )}
        aria-label={state === "transcribing" ? "Transcribing voice note" : "Record a voice note"}
        title="Record a voice note"
      >
        {state === "transcribing" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
      {error && (
        <p
          role="alert"
          className="absolute bottom-11 right-0 w-56 rounded-md border bg-background p-2 text-xs text-red-700 shadow"
        >
          {error}
        </p>
      )}
    </div>
  );
}
