class SoundGenerator {
    constructor() {
        this.ctx = null;
        this.dialingOscillators = [];
        this.ringingOscillators = [];
        this.dialingInterval = null;
        this.ringingInterval = null;
    }

    initCtx() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Play "Dial Tone" (The sound you hear while waiting for the other person to pick up)
    // US standard: 440Hz + 480Hz, 2s on, 4s off
    playDialTone() {
        this.stopDialTone();
        this.initCtx();

        const playPulse = () => {
            const g = this.ctx.createGain();
            g.connect(this.ctx.destination);
            g.gain.setValueAtTime(0, this.ctx.currentTime);
            g.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.1);
            g.gain.setValueAtTime(0.1, this.ctx.currentTime + 1.9);
            g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2.0);

            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            osc1.frequency.value = 440;
            osc2.frequency.value = 480;
            osc1.connect(g);
            osc2.connect(g);

            osc1.start(this.ctx.currentTime);
            osc2.start(this.ctx.currentTime);

            osc1.stop(this.ctx.currentTime + 2.0);
            osc2.stop(this.ctx.currentTime + 2.0);

            this.dialingOscillators.push(osc1, osc2, g);
        };

        playPulse();
        this.dialingInterval = setInterval(playPulse, 6000); // 2s on + 4s off
    }

    stopDialTone() {
        clearInterval(this.dialingInterval);
        this.dialingOscillators.forEach(n => {
            if (n.stop) { try { n.stop(); } catch (e) { } }
            if (n.disconnect) { try { n.disconnect(); } catch (e) { } }
        });
        this.dialingOscillators = [];
    }

    // Play "Ring Tone" (The sound you hear when someone is calling you)
    // Double ring (UK/European style): 400Hz + 450Hz, 0.4s on, 0.2s off, 0.4s on, 2s off
    playRingTone() {
        this.stopRingTone();
        this.initCtx();

        const createPulse = (startTime, duration) => {
            const g = this.ctx.createGain();
            g.connect(this.ctx.destination);
            g.gain.setValueAtTime(0, startTime);
            g.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
            g.gain.setValueAtTime(0.15, startTime + duration - 0.05);
            g.gain.linearRampToValueAtTime(0, startTime + duration);

            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            osc1.frequency.value = 400;
            osc2.frequency.value = 450;
            osc1.connect(g);
            osc2.connect(g);

            osc1.start(startTime);
            osc2.start(startTime);

            osc1.stop(startTime + duration);
            osc2.stop(startTime + duration);

            this.ringingOscillators.push(osc1, osc2, g);
        };

        const playDoubleRing = () => {
            const now = this.ctx.currentTime;
            createPulse(now, 0.4);            // First ring
            createPulse(now + 0.6, 0.4);      // Second ring
        };

        playDoubleRing();
        this.ringingInterval = setInterval(playDoubleRing, 3000); // 1s rings + 2s silence = 3s
    }

    stopRingTone() {
        clearInterval(this.ringingInterval);
        this.ringingOscillators.forEach(n => {
            if (n.stop) { try { n.stop(); } catch (e) { } }
            if (n.disconnect) { try { n.disconnect(); } catch (e) { } }
        });
        this.ringingOscillators = [];
    }
}

export const sounds = new SoundGenerator();
