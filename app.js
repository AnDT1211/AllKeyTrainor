const { createApp } = Vue;

createApp({
    data() {
        return {
            audioCtx: null,
            pianoBuffer: null,
            keys: []
        };
    },

    mounted() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.generateKeys();
        this.loadPianoSample();
    },
    

    methods: {
        async loadPianoSample() {
            const res = await fetch('https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@master/MusyngKite/acoustic_grand_piano-mp3/C4.mp3');
            const arrayBuffer = await res.arrayBuffer();
            this.pianoBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        },

        generateKeys() {
            const notes = [
                { name: 'C', black: false },
                { name: 'C#', black: true },
                { name: 'D', black: false },
                { name: 'D#', black: true },
                { name: 'E', black: false },
                { name: 'F', black: false },
                { name: 'F#', black: true },
                { name: 'G', black: false },
                { name: 'G#', black: true },
                { name: 'A', black: false },
                { name: 'A#', black: true },
                { name: 'B', black: false }
            ];

            let whiteIndex = 0;

            for (let octave = 3; octave <= 5; octave++) {
                for (const n of notes) {
                    const noteName = n.name + octave;
                    const freq = this.noteToFrequency(noteName);

                    if (!n.black) {
                        this.keys.push({
                            note: noteName,
                            freq,
                            isBlack: false
                        });
                        whiteIndex++;
                    } else {
                        this.keys.push({
                            note: noteName,
                            freq,
                            isBlack: true,
                            left: whiteIndex * 50 - 15
                        });
                    }
                }
            }
        },

        play(key) {
            if (!this.pianoBuffer) return;

            console.log(key.note);

            const src = this.audioCtx.createBufferSource();
            const gain = this.audioCtx.createGain();

            src.buffer = this.pianoBuffer;

            // C4 là sample gốc → tính tỉ lệ
            const baseFreq = this.noteToFrequency('C4');
            src.playbackRate.value = key.freq / baseFreq;

            gain.gain.setValueAtTime(2.5, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 3.0);

            src.connect(gain);
            gain.connect(this.audioCtx.destination);

            src.start();
        },

        noteToFrequency(note) {
            const A4 = 440;
            const notes = {
                C: -9, 'C#': -8, D: -7, 'D#': -6,
                E: -5, F: -4, 'F#': -3, G: -2,
                'G#': -1, A: 0, 'A#': 1, B: 2
            };

            const pitch = note.slice(0, -1);
            const octave = parseInt(note.slice(-1));

            const n = notes[pitch] + (octave - 4) * 12;
            return A4 * Math.pow(2, n / 12);
        }
    }
}).mount('#app');