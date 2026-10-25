# App and Safari icons

Integrated 2026-10-25 from the supplied `VidCaster-icons` artwork, without image
modifications. The ZIP, SVGs, and preview remain design references.

Production assets:

- `spikes/ipad-cast/Assets.xcassets/AppIcon.appiconset`: default, dark, and tinted
  app icons. The app target compiles this catalog and selects `AppIcon` in both
  Debug and Release configurations.
- `spikes/safari-google-cast/extension/images`: color extension icons and
  transparent toolbar glyphs. Manifest `icons` and `action.default_icon` reference
  these files; the existing popup remains configured.

For later replacements, update the production assets as well as design originals.
Run `npm run build:safari-probe`, then build/run in Xcode. The extension resource
builder copies images into ignored `dist/images`; the iPad embedded extension and
both standalone Safari probe projects package that directory as a folder.

Verification: unsigned iPad build passed, app icon metadata and compiled asset
catalog are present, and all 11 manifest-referenced images exist in the embedded
extension. Project files and whitespace checks passed. Physical Home Screen,
dark/tinted appearances, and Safari toolbar rendering still need device review.
