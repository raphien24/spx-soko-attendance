# Audio Files for SPX Soko Attendance

## Required Files

Place the following MP3 audio files in this folder:

### 1. `sukses.mp3`
- **Purpose:** Success sound for attendance recorded
- **Duration:** 1-2 seconds
- **Suggested:** Pleasant "ding" or notification chime
- **Volume:** Moderate (system will use 70% volume)

### 2. `gagal.mp3`
- **Purpose:** Error/warning sound for GPS validation failure
- **Duration:** 1-2 seconds
- **Suggested:** Warning "beep" or error buzzer
- **Volume:** Louder (system will use 80% volume)

## Where to Get Audio Files

### Option 1: Free Sound Libraries
- [Freesound.org](https://freesound.org/)
- [Zapsplat.com](https://www.zapsplat.com/)
- [Pixabay Sounds](https://pixabay.com/sound-effects/)

### Option 2: Create Your Own
Use audio editing software like:
- Audacity (free)
- Adobe Audition
- Online tools: [TwistedWave](https://twistedwave.com/online)

### Option 3: Text-to-Speech (for testing)
You can temporarily use browser TTS for testing until you get proper audio files.

## Audio Specifications

- **Format:** MP3
- **Sample Rate:** 44.1 kHz or 48 kHz
- **Bit Rate:** 128 kbps or higher
- **Channels:** Mono or Stereo
- **Max File Size:** 100 KB each

## Testing

After adding the files, test in browser:
1. Open scanner page (index.html)
2. Check browser Console for audio loading messages
3. Test attendance scan (should play sukses.mp3)
4. Test GPS failure (should play gagal.mp3)

## Notes

- Files must be named exactly: `sukses.mp3` and `gagal.mp3`
- Files must be in this folder: `frontend/audio/`
- Browser autoplay policy: User interaction required on page first
