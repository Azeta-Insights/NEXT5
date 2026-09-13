// Speech Recognition Hook and Utility
// Supports standard Web Speech API (webkitSpeechRecognition and SpeechRecognition)

export interface SpeechRecognitionState {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  permissionDenied: boolean;
}

// Window interface augmentation for browser speech recognition
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export class SpeechEngine {
  private recognition: any = null;
  private onTranscriptUpdate: (text: string, isFinal: boolean) => void;
  private onErrorCallback: (error: string, permissionDenied: boolean) => void;
  private onEndCallback: () => void;
  private isListeningInternal = false;
  private isExplicitlyStopped = true;
  private baseTranscript = '';
  private currentSessionFinal = '';
  private restartTimeout: any = null;

  constructor(
    onTranscriptUpdate: (text: string, isFinal: boolean) => void,
    onErrorCallback: (error: string, permissionDenied: boolean) => void,
    onEndCallback: () => void,
    initialBaseTranscript = ''
  ) {
    this.onTranscriptUpdate = onTranscriptUpdate;
    this.onErrorCallback = onErrorCallback;
    this.onEndCallback = onEndCallback;
    this.baseTranscript = initialBaseTranscript.trim();

    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (SpeechRecognitionClass) {
      try {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          let sessionFinal = '';
          let sessionInterim = '';

          // Iterate across all results in this recognition session to preserve previously finalized phrases after pauses
          for (let i = 0; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result && result[0]) {
              if (result.isFinal) {
                sessionFinal += result[0].transcript + ' ';
              } else {
                sessionInterim += result[0].transcript;
              }
            }
          }

          this.currentSessionFinal = sessionFinal.trim();

          const finalizedPortion = [this.baseTranscript, this.currentSessionFinal]
            .filter(Boolean)
            .join(' ');
          const fullTranscript = [finalizedPortion, sessionInterim.trim()]
            .filter(Boolean)
            .join(' ');

          this.onTranscriptUpdate(fullTranscript, Boolean(this.currentSessionFinal && !sessionInterim));
        };

        this.recognition.onerror = (event: any) => {
          // 'no-speech' is a normal speech pause or silence timeout - do NOT treat it as a fatal error or kill session
          if (event.error === 'no-speech') {
            return;
          }

          console.warn('Speech recognition event error:', event.error);
          let userMsg = 'An error occurred during voice recognition.';
          let permDenied = false;

          if (event.error === 'not-allowed') {
            userMsg = 'Microphone permission was denied. Please allow microphone access in your browser settings, or use text input.';
            permDenied = true;
            this.isListeningInternal = false;
            this.isExplicitlyStopped = true;
          } else if (event.error === 'audio-capture') {
            userMsg = 'No microphone was found or microphone is in use by another app.';
            this.isListeningInternal = false;
            this.isExplicitlyStopped = true;
          } else if (event.error === 'network') {
            userMsg = 'Network connection issue with speech recognition service.';
          }

          if (permDenied || this.isExplicitlyStopped) {
            this.onErrorCallback(userMsg, permDenied);
          }
        };

        this.recognition.onend = () => {
          // Commit current session's finalized text to base transcript so nothing is lost
          if (this.currentSessionFinal) {
            this.baseTranscript = [this.baseTranscript, this.currentSessionFinal].filter(Boolean).join(' ');
            this.currentSessionFinal = '';
          }

          // If the user paused and the browser timed out, auto-restart smoothly unless explicitly stopped
          if (this.isListeningInternal && !this.isExplicitlyStopped) {
            if (this.restartTimeout) clearTimeout(this.restartTimeout);
            this.restartTimeout = setTimeout(() => {
              if (this.isListeningInternal && !this.isExplicitlyStopped && this.recognition) {
                try {
                  this.recognition.start();
                } catch (e: any) {
                  if (e?.name !== 'InvalidStateError') {
                    this.isListeningInternal = false;
                    this.onEndCallback();
                  }
                }
              }
            }, 100);
            return;
          }

          this.isListeningInternal = false;
          this.onEndCallback();
        };
      } catch (e) {
        console.error('Failed to initialize SpeechRecognition:', e);
      }
    }
  }

  public setBaseTranscript(text: string) {
    this.baseTranscript = text.trim();
    this.currentSessionFinal = '';
  }

  public resetTranscript() {
    this.baseTranscript = '';
    this.currentSessionFinal = '';
  }

  public static isAvailable(): boolean {
    return Boolean(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));
  }

  public async start(): Promise<boolean> {
    if (!this.recognition) {
      this.onErrorCallback('Speech recognition is not supported in this browser. Please use text input instead.', false);
      return false;
    }

    this.isExplicitlyStopped = false;
    if (this.restartTimeout) clearTimeout(this.restartTimeout);

    try {
      // First explicitly test mic permission if navigator.mediaDevices exists
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (permErr: any) {
          console.warn('Mic permission error:', permErr);
          this.onErrorCallback('Microphone permission was denied. Please allow microphone access to talk to NEXT5.', true);
          this.isExplicitlyStopped = true;
          return false;
        }
      }

      this.recognition.start();
      this.isListeningInternal = true;
      return true;
    } catch (err: any) {
      console.warn('Error starting speech recognition:', err);
      if (err.name === 'InvalidStateError') {
        // already started
        this.isListeningInternal = true;
        return true;
      }
      this.onErrorCallback(err.message || 'Could not start voice recognition.', false);
      this.isListeningInternal = false;
      this.isExplicitlyStopped = true;
      return false;
    }
  }

  public stop() {
    this.isExplicitlyStopped = true;
    if (this.restartTimeout) clearTimeout(this.restartTimeout);

    if (this.recognition && this.isListeningInternal) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
      this.isListeningInternal = false;
    }
  }
}
