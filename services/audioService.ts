
export class AudioService {
  private ctx: AudioContext | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    } catch (e) {
      console.error("Audio not supported", e);
    }
  }

  public async init() {
    if (!this.ctx) return;
    
    // Resume if suspended (browser policy)
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Prevent multiple initializations causing overlapping sounds
    if (this.isInitialized) return;
    
    this.createEngineSound();
    this.isInitialized = true;
  }

  private createEngineSound() {
    if (!this.ctx) return;
    
    // Ensure we don't have an old one running
    this.stopEngine();

    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60; // Idle Hz
    
    this.engineGain.gain.value = 0; // Start silent
    
    this.engineOsc.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
  }

  private stopEngine() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch (e) {}
      this.engineOsc = null;
    }
    if (this.engineGain) {
      this.engineGain.disconnect();
      this.engineGain = null;
    }
  }

  public updateEngine(speedRatio: number) {
    if (!this.engineOsc || !this.engineGain || this.isMuted || !this.ctx) return;
    
    // Sanitize input to prevent audio glitches
    const ratio = Math.max(0, Math.min(1, speedRatio || 0));
    
    // Pitch rises with speed
    const baseFreq = 60;
    const maxFreq = 220;
    const freq = baseFreq + (maxFreq - baseFreq) * ratio;
    
    // Volume based on speed + base idle
    const vol = Math.max(0.05, Math.min(0.2, ratio * 0.2));

    // Use safer time constant
    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(freq, now, 0.1);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.1);
  }

  public playCrash() {
    if (!this.ctx || this.isMuted) return;
    
    const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter to make it sound like a thud/crunch
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start();
  }

  public playPass() {
    if (!this.ctx || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  public playVictory() {
    if (!this.ctx || this.isMuted) return;
    
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C major arpeggio
    
    notes.forEach((note, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        
        osc.type = 'square';
        osc.frequency.value = note;
        
        const time = now + i * 0.15;
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
        
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(time);
        osc.stop(time + 0.4);
    });
  }

  public stop() {
    if (this.engineGain) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx?.currentTime || 0, 0.1);
    }
  }
}

export const audioService = new AudioService();
