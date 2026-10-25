# Dynamic ROTK background music

- Start at `/Music/backmusic1.mp3`.
- On the **shared game turn counter** advancing, change tracks after a random interval of **3, 4, or 5 turns**.
- Choose a different random number from 1 to 20 (no immediate repeat).
- All tracks loop continuously until the next turn-triggered switch.
- Switching works with music muted; when enabled it resumes the currently selected track.
- A browser may require a user click on **Music ON** before audio starts.
- Place your 20 actual MP3 files in `Music/` beside `server.js` before running `npm start`.
- Each browser independently randomizes the soundtrack. This does not alter game state or AI.
- If a turn jump happens due to reconnect, switch once on observation and reschedule.
- If you need identical music for all players, the selected track and next-change turn must instead be stored in server room state.

## Check
`node --check server.js`
Open the game, click Music ON, and check the Network tab for `/Music/backmusic1.mp3` (HTTP 200).
