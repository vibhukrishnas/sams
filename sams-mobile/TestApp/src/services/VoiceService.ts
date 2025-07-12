import Voice from '@react-native-voice/voice';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { store } from '../store/index';
import { 
  setVoiceRecording, 
  setVoiceTranscript, 
  setVoiceProcessing,
  processVoiceCommand 
} from '../store/slices/enhancedAlertSlice';
import { showToast } from '../store/slices/uiSlice';

interface VoiceCommand {
  action: 'acknowledge' | 'resolve' | 'snooze' | 'escalate' | 'note' | 'search' | 'filter';
  parameters?: {
    duration?: number;
    level?: number;
    note?: string;
    query?: string;
    filters?: any;
  };
  confidence: number;
}

class VoiceService {
  private isInitialized = false;
  private isListening = false;
  private currentLanguage = 'en-US';
  private commandPatterns: Array<{ pattern: RegExp; action: string; extract?: (match: RegExpMatchArray) => any }> = [];

  constructor() {
    this.initializeCommandPatterns();
  }

  /**
   * Initialize voice service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Request microphone permission
      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) {
        console.warn('🎤 Microphone permission denied');
        return false;
      }

      // Setup voice recognition callbacks
      this.setupVoiceCallbacks();

      // Check if voice recognition is available
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        console.warn('🎤 Voice recognition not available');
        return false;
      }

      this.isInitialized = true;
      console.log('✅ Voice service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing voice service:', error);
      return false;
    }
  }

  /**
   * Request microphone permission
   */
  private async requestMicrophonePermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'SAMS needs access to your microphone for voice commands',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('❌ Error requesting microphone permission:', error);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  }

  /**
   * Setup voice recognition callbacks
   */
  private setupVoiceCallbacks(): void {
    Voice.onSpeechStart = this.onSpeechStart.bind(this);
    Voice.onSpeechEnd = this.onSpeechEnd.bind(this);
    Voice.onSpeechResults = this.onSpeechResults.bind(this);
    Voice.onSpeechPartialResults = this.onSpeechPartialResults.bind(this);
    Voice.onSpeechError = this.onSpeechError.bind(this);
    Voice.onSpeechRecognized = this.onSpeechRecognized.bind(this);
  }

  /**
   * Initialize command patterns for NLP
   */
  private initializeCommandPatterns(): void {
    this.commandPatterns = [
      // Acknowledge commands
      {
        pattern: /(?:acknowledge|ack|accept|confirm)(?:\s+(?:this\s+)?alert)?/i,
        action: 'acknowledge',
      },
      
      // Resolve commands
      {
        pattern: /(?:resolve|fix|close|complete)(?:\s+(?:this\s+)?alert)?/i,
        action: 'resolve',
      },
      
      // Snooze commands with duration
      {
        pattern: /(?:snooze|postpone|delay)(?:\s+(?:this\s+)?alert)?(?:\s+for\s+)?(\d+)\s*(minute|minutes|hour|hours)?/i,
        action: 'snooze',
        extract: (match) => {
          const duration = parseInt(match[1]);
          const unit = match[2] || 'minutes';
          const multiplier = unit.startsWith('hour') ? 60 * 60 * 1000 : 60 * 1000;
          return { duration: duration * multiplier };
        },
      },
      
      // Default snooze (15 minutes)
      {
        pattern: /(?:snooze|postpone|delay)(?:\s+(?:this\s+)?alert)?/i,
        action: 'snooze',
        extract: () => ({ duration: 15 * 60 * 1000 }),
      },
      
      // Escalate commands
      {
        pattern: /(?:escalate|urgent|priority|critical)(?:\s+(?:this\s+)?alert)?(?:\s+to\s+level\s+(\d+))?/i,
        action: 'escalate',
        extract: (match) => ({ level: match[1] ? parseInt(match[1]) : 2 }),
      },
      
      // Add note commands
      {
        pattern: /(?:add\s+note|note|comment)(?:\s*:)?\s*(.+)/i,
        action: 'note',
        extract: (match) => ({ note: match[1].trim() }),
      },
      
      // Search commands
      {
        pattern: /(?:search|find|show)(?:\s+(?:alerts?\s+)?(?:for|with))?\s+(.+)/i,
        action: 'search',
        extract: (match) => ({ query: match[1].trim() }),
      },
      
      // Filter commands
      {
        pattern: /(?:filter|show\s+only)\s+(.+)\s+alerts?/i,
        action: 'filter',
        extract: (match) => {
          const filterType = match[1].toLowerCase();
          const filters: any = {};
          
          if (filterType.includes('critical')) {
            filters.severity = ['critical'];
          } else if (filterType.includes('warning')) {
            filters.severity = ['warning'];
          } else if (filterType.includes('info')) {
            filters.severity = ['info'];
          } else if (filterType.includes('unacknowledged')) {
            filters.status = ['unacknowledged'];
          } else if (filterType.includes('acknowledged')) {
            filters.status = ['acknowledged'];
          } else if (filterType.includes('resolved')) {
            filters.status = ['resolved'];
          }
          
          return { filters };
        },
      },
    ];
  }

  /**
   * Start voice recognition
   */
  async startListening(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    if (this.isListening) {
      console.warn('🎤 Already listening');
      return false;
    }

    try {
      await Voice.start(this.currentLanguage);
      this.isListening = true;
      store.dispatch(setVoiceRecording(true));
      
      console.log('🎤 Started voice recognition');
      return true;
    } catch (error) {
      console.error('❌ Error starting voice recognition:', error);
      store.dispatch(showToast({
        message: 'Failed to start voice recognition',
        type: 'error',
        duration: 3000,
      }));
      return false;
    }
  }

  /**
   * Stop voice recognition
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    try {
      await Voice.stop();
      this.isListening = false;
      store.dispatch(setVoiceRecording(false));
      
      console.log('🎤 Stopped voice recognition');
    } catch (error) {
      console.error('❌ Error stopping voice recognition:', error);
    }
  }

  /**
   * Cancel voice recognition
   */
  async cancelListening(): Promise<void> {
    if (!this.isListening) return;

    try {
      await Voice.cancel();
      this.isListening = false;
      store.dispatch(setVoiceRecording(false));
      store.dispatch(setVoiceTranscript(''));
      
      console.log('🎤 Cancelled voice recognition');
    } catch (error) {
      console.error('❌ Error cancelling voice recognition:', error);
    }
  }

  /**
   * Process voice command using NLP
   */
  private processVoiceCommand(transcript: string): VoiceCommand | null {
    const cleanTranscript = transcript.toLowerCase().trim();
    
    for (const pattern of this.commandPatterns) {
      const match = cleanTranscript.match(pattern.pattern);
      if (match) {
        const parameters = pattern.extract ? pattern.extract(match) : {};
        return {
          action: pattern.action as any,
          parameters,
          confidence: this.calculateConfidence(match, cleanTranscript),
        };
      }
    }
    
    return null;
  }

  /**
   * Calculate confidence score for voice command
   */
  private calculateConfidence(match: RegExpMatchArray, transcript: string): number {
    const matchLength = match[0].length;
    const transcriptLength = transcript.length;
    const coverage = matchLength / transcriptLength;
    
    // Base confidence on coverage and match quality
    let confidence = Math.min(coverage * 1.5, 1.0);
    
    // Boost confidence for exact keyword matches
    const keywords = ['acknowledge', 'resolve', 'snooze', 'escalate'];
    for (const keyword of keywords) {
      if (transcript.includes(keyword)) {
        confidence = Math.min(confidence + 0.2, 1.0);
        break;
      }
    }
    
    return Math.round(confidence * 100) / 100;
  }

  /**
   * Voice recognition callbacks
   */
  private onSpeechStart(): void {
    console.log('🎤 Speech started');
    store.dispatch(setVoiceRecording(true));
  }

  private onSpeechEnd(): void {
    console.log('🎤 Speech ended');
    store.dispatch(setVoiceRecording(false));
    this.isListening = false;
  }

  private onSpeechResults(event: any): void {
    const results = event.value;
    if (results && results.length > 0) {
      const transcript = results[0];
      console.log('🎤 Speech results:', transcript);
      
      store.dispatch(setVoiceTranscript(transcript));
      store.dispatch(setVoiceProcessing(true));
      
      // Process the command
      const command = this.processVoiceCommand(transcript);
      if (command) {
        console.log('🎤 Processed command:', command);
        
        // Dispatch the command to the store
        store.dispatch(processVoiceCommand({
          transcript,
          alertId: undefined, // Will be handled by the component
        }));
        
        store.dispatch(showToast({
          message: `Voice command recognized: ${command.action}`,
          type: 'success',
          duration: 2000,
        }));
      } else {
        console.log('🎤 No command recognized');
        store.dispatch(showToast({
          message: 'Voice command not recognized',
          type: 'warning',
          duration: 2000,
        }));
      }
      
      store.dispatch(setVoiceProcessing(false));
    }
  }

  private onSpeechPartialResults(event: any): void {
    const results = event.value;
    if (results && results.length > 0) {
      const partialTranscript = results[0];
      store.dispatch(setVoiceTranscript(partialTranscript));
    }
  }

  private onSpeechError(event: any): void {
    console.error('🎤 Speech error:', event.error);
    this.isListening = false;
    store.dispatch(setVoiceRecording(false));
    store.dispatch(setVoiceProcessing(false));
    
    let errorMessage = 'Voice recognition error';
    switch (event.error?.code) {
      case '7': // ERROR_NO_MATCH
        errorMessage = 'No speech detected. Please try again.';
        break;
      case '6': // ERROR_SPEECH_TIMEOUT
        errorMessage = 'Speech timeout. Please speak more clearly.';
        break;
      case '5': // ERROR_CLIENT
        errorMessage = 'Voice recognition client error.';
        break;
      case '8': // ERROR_RECOGNIZER_BUSY
        errorMessage = 'Voice recognizer is busy. Please wait.';
        break;
      default:
        errorMessage = `Voice error: ${event.error?.message || 'Unknown error'}`;
    }
    
    store.dispatch(showToast({
      message: errorMessage,
      type: 'error',
      duration: 3000,
    }));
  }

  private onSpeechRecognized(): void {
    console.log('🎤 Speech recognized');
  }

  /**
   * Set language for voice recognition
   */
  setLanguage(language: string): void {
    this.currentLanguage = language;
    console.log(`🎤 Language set to: ${language}`);
  }

  /**
   * Get available languages
   */
  async getAvailableLanguages(): Promise<string[]> {
    try {
      return await Voice.getSpeechRecognitionServices();
    } catch (error) {
      console.error('❌ Error getting available languages:', error);
      return ['en-US'];
    }
  }

  /**
   * Check if voice recognition is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await Voice.isAvailable();
    } catch (error) {
      console.error('❌ Error checking voice availability:', error);
      return false;
    }
  }

  /**
   * Destroy voice service
   */
  async destroy(): Promise<void> {
    try {
      if (this.isListening) {
        await this.stopListening();
      }
      
      await Voice.destroy();
      this.isInitialized = false;
      
      console.log('🎤 Voice service destroyed');
    } catch (error) {
      console.error('❌ Error destroying voice service:', error);
    }
  }
}

export default new VoiceService();
