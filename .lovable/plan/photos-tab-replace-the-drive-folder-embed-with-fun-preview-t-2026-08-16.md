# Photos tab: replace the Drive folder embed with fun preview tiles

The block under the text is Google Drive's own embedded folder view, so its grey folder thumbnails and icons cannot be restyled from inside the app. It will be replaced with our own modern tiles that open Drive in a new tab.

## What changes

- Remove the embedded Google Drive folder iframe from the Photos tab.
- Add a set of large, rounded preview tiles in a responsive grid (1 column on mobile, 2–3 on wider screens):
  - All photos — opens the Drive folder
  - Group shots — opens the Drive folder
  - Upload your photos — opens the Drive folder
- Each tile: bold display-font label, short one-line description, a clean Lucide icon in a soft coloured badge, subtle shadow and a lift/scale hover transition.
- Tiles use the existing brand tokens (blue / green / orange accents) so they match the rest of the app.
- Keep the heading, the Google-document text, and the Ponio Instagram credit exactly as they are.
- Keep a small "Opens in Google Drive" note under the tiles so the behaviour is clear.

## Technical notes

- Single file change: `src/components/TimetableApp.tsx`, in the `sheet.kind === 'photos'` branch.
- Delete the `PHOTOS_EMBED_URL` constant and its `iframe`; keep `PHOTOS_FOLDER_URL`.
- Tiles are plain `<a target="_blank" rel="noopener noreferrer">` elements — no new dependencies, no backend, no data changes.
- Icons from `lucide-react` (e.g. `Images`, `Users`, `CloudUpload`), styled with semantic tokens only.
