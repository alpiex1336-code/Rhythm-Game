# Rhythm Drop v1 (alpiex1336-code)

## Quick Start (Download and Play)

After downloading this folder, open Terminal and run:

```bash
cd "$HOME/Downloads/rhythm-drop-v1-alpiex1336-code" && (python3 -m http.server 8000 || python -m http.server 8000 || npx serve . -l 8000)
```

Then open:

- <http://localhost:8000>

---

## About

Rhythm Drop is a browser rhythm game with:

- Falling arrow lanes (`Left`, `Up`, `Right`, `Down`)
- Tap notes and long-hold notes
- Timing-based grading and combo scoring
- Song selection with multiple difficulty levels
- Retry/home flow and result summary

## Controls

- `ArrowLeft` -> left lane
- `ArrowUp` -> up lane
- `ArrowRight` -> right lane
- `ArrowDown` -> down lane

## Project Structure

- `index.html` - UI layout
- `styles.css` - game styling and animations
- `script.js` - gameplay logic and audio/chart handling

## Notes

- A local server is required for reliable browser audio behavior.
- First-time song preparation can take a short moment depending on network speed.

## License

This project is released under the MIT License. See `LICENSE`.
