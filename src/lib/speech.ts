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

  constructor(
    onTranscriptUpdate: (text: string, isFinal: boolean) => void,
    onErrorCallback: (error: string, permissionDenied: boolean) => void,
    onEndCallback: () => void
  ) {
    this.onTranscriptUpdate = onTranscriptUpdate;
    this.onErrorCallback = onErrorCallback;
    this.onEndCallback = onEndCallback;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          const combined = (final || interim).trim();
          this.onTranscriptUpdate(combined, Boolean(final));
        };

        this.recognition.onerror = (event: any) => {
          console.warn('Speech recognition event error:', event.error);
          let userMsg = 'An error occurred during voice recognition.';
          let permDenied = false;

          if (event.error === 'not-allowed') {
            userMsg = 'Microphone permission was denied. Please allow microphone access in your browser settings, or use text input.';
            permDenied = true;
          } else if (event.error === 'no-speech') {
            userMsg = 'No speech was detected. Please try speaking closer to your microphone.';
          } else if (event.error === 'audio-capture') {
            userMsg = 'No microphone was found or microphone is in use by another app.';
          } else if (event.error === 'network') {
            userMsg = 'Network connection issue with speech recognition service.';
          }

          this.onErrorCallback(userMsg, permDenied);
          this.isListeningInternal = false;
        };

        this.recognition.onend = () => {
          this.isListeningInternal = false;
          this.onEndCallback();
        };
      } catch (e) {
        console.error('Failed to initialize SpeechRecognition:', e);
      }
    }
  }

  public static isAvailable(): boolean {
    return Boolean(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));
  }

  public async start(): Promise<boolean> {
    if (!this.recognition) {
      this.onErrorCallback('Speech recognition is not supported in this browser. Please use text input instead.', false);
      return false;
    }

    try {
      // First explicitly test mic permission if navigator.mediaDevices exists
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop the test stream immediately
          stream.getTracks().forEach((track) => track.stop());
        } catch (permErr: any) {
          console.warn('Mic permission error:', permErr);
          this.onErrorCallback('Microphone permission was denied. Please allow microphone access to talk to NEXT5.', true);
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
        return true;
      }
      this.onErrorCallback(err.message || 'Could not start voice recognition.', false);
      return false;
    }
  }

  public stop() {
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
