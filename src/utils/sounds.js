class SoundGenerator {
    constructor() { }
    initCtx() { }
    playDialTone() { console.log("Dial tone suppressed"); }
    stopDialTone() { }
    playRingTone() { console.log("Ring tone suppressed"); }
    stopRingTone() { }
}

export const sounds = new SoundGenerator();
