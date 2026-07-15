# Vitrine

A small frontend project that explores the [Art Institute of Chicago](https://api.artic.edu/docs/) public REST API.

## Features

- Featured artwork hero loaded from the `/artworks` endpoint
- Search powered by `/artworks/search`
- Artwork detail dialog with title, artist, medium, and description
- No API key required (public CORS-enabled API)

## Run locally

```bash
python -m http.server 5500
```

Then open [http://localhost:5500](http://localhost:5500).

## Tech

- HTML, CSS, vanilla JavaScript
- `fetch` for HTTP GET requests
- Art Institute of Chicago API + IIIF images

## Project notes

See `reflection.txt` for how the project was approached.
