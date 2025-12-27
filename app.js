const { createApp } = Vue;

const DEGREE_OFFSET = {
    do: 0,
    re: 2,
    mi: 4,
    fa: 5,
    sol: 7,
    la: 9,
    si: 11
};

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];


createApp({
    data() {
        return {
            audioCtx: null,
            pianoBuffer: null,
            keys: [],
            audioContextResumed: false,

            tones: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
            currentKey: 'C',

            noteCount: 5,

            exerciseNotes: [],
            currentIndex: 0,
            finished: false
        };
    },


    mounted() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.generateKeys();
        this.loadPianoSample();

        this.createNewExercise();
        
        // Resume AudioContext on first user interaction (required for iOS)
        const resumeAudio = () => {
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().then(() => {
                    this.audioContextResumed = true;
                });
            }
        };
        
        document.addEventListener('touchstart', resumeAudio, { once: true });
        document.addEventListener('mousedown', resumeAudio, { once: true });
    },


    methods: {

        changeNoteCount(delta) {
            const next = this.noteCount + delta;

            if (next < 2 || next > 10) return;

            this.noteCount = next;
            this.createNewExercise();
        },

        createNewExercise() {
            const degrees = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
            const keyIndex = CHROMATIC.indexOf(this.currentKey);

            this.exerciseNotes = Array.from({ length: this.noteCount }, () => {
                const d = degrees[Math.floor(Math.random() * degrees.length)];
                const noteIndex = (keyIndex + DEGREE_OFFSET[d]) % 12;

                return {
                    label: d,
                    note: CHROMATIC[noteIndex],
                    status: 'pending'
                };
            });

            this.currentIndex = 0;
            this.finished = false;
        },

        resetExercise() {
            this.exerciseNotes.forEach(n => n.status = 'pending');
            this.currentIndex = 0;
            this.finished = false;
        },

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

            for (let octave = 3; octave <= 4; octave++) {
                for (const n of notes) {
                    const noteName = n.name + octave;
                    const freq = this.noteToFrequency(noteName);

                    if (!n.black) {
                        this.keys.push({
                            note: noteName,
                            freq,
                            isBlack: false,
                            isPressed: false
                        });
                        whiteIndex++;
                    } else {
                        this.keys.push({
                            note: noteName,
                            freq,
                            isBlack: true,
                            left: whiteIndex * 60 - 17,
                            isPressed: false
                        });
                    }
                }
            }
        },

        async ensureAudioContext() {
            if (this.audioCtx.state === 'suspended') {
                await this.audioCtx.resume();
            }
        },

        handleTouchStart(key, event) {
            event.preventDefault();
            this.playKey(key);
        },

        handleTouchEnd(key, event) {
            event.preventDefault();
            key.isPressed = false;
        },

        handleMouseDown(key, event) {
            event.preventDefault();
            this.playKey(key);
        },

        handleMouseUp(key, event) {
            event.preventDefault();
            key.isPressed = false;
        },

        async playKey(key) {
            if (!this.pianoBuffer || this.finished) return;

            // Cập nhật visual feedback ngay lập tức
            key.isPressed = true;

            // Đảm bảo AudioContext được resume (quan trọng cho iOS)
            await this.ensureAudioContext();

            const pressedNote = key.note.replace(/[0-9]/g, '');
            console.log(pressedNote);

            // xử lý bài tập
            const target = this.exerciseNotes[this.currentIndex];
            if (!target) return;

            if (pressedNote === target.note) {
                target.status = 'correct';
                this.currentIndex++;

                if (this.currentIndex >= this.exerciseNotes.length) {
                    this.finished = true;
                }
            } else {
                target.status = 'wrong';
                this.finished = true;
            }

            // phần audio giữ nguyên
            const src = this.audioCtx.createBufferSource();
            const gain = this.audioCtx.createGain();

            src.buffer = this.pianoBuffer;
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
