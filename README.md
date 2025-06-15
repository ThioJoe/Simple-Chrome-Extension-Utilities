# Simple Chrome Extension Utilities

A collection of simple, single-purpose Chrome Extensions.

---

## Firefox Text Randomizer Add-on

Eine Firefox-Version der "Click To Randomize Text" Chrome Extension. Diese Add-on ermöglicht es, Text auf Webseiten temporär zu randomisieren, verwischen oder zu löschen - perfekt für Screenshots oder Layout-Tests ohne sensible Informationen preiszugeben.

### Installation in Firefox

1. Öffne Firefox und navigiere zu `about:debugging`
2. Klicke auf "Dieser Firefox" (This Firefox)
3. Klicke auf "Temporäres Add-on laden..." (Load Temporary Add-on...)
4. Navigiere zum Add-on-Ordner und wähle die `manifest.json` Datei aus

**Hinweis:** Da dies ein temporäres Add-on ist, wird es nach dem Neustart von Firefox entfernt. Für permanente Installation müsstest du es über addons.mozilla.org veröffentlichen oder Firefox Developer Edition verwenden.

#### Kann ich in Firefox selbst geschriebene Add-ons dauerhaft installieren, ohne Firefox Developer Edition zu nutzen oder mein Add-on zu veröffentlichen?

##### Selbstsignierung

- Erstelle ein Konto bei `addons.mozilla.org`
- Lade dein Add-on als ZIP hoch, aber markiere es als "selbst gehostet"
- Mozilla signiert es automatisch
- Die signierte .xpi-Datei kannst du dann dauerhaft installieren
  - `https://addons.mozilla.org/de/developers/` aufrufen
  - Dein Addon anklicken "Produktseite bearbeiten"
  - Auf der linken seite auf "Stauts und Versionen Verwalten"
  - Auf die Versionsnummer Klicken
  - Oben befindet sich ein *.xpi Dateilink zum Downloaden, der das Addon diretkt in Firefox Installiert.

### Verwendung & Features

- Klicke auf das Add-on-Icon in der Toolbar, um ein Popup zu öffnen
- Im Popup kannst du den Randomizer für den aktuellen Tab aktivieren/deaktivieren
- Optional: Automatischen Blur-Effekt nach dem Randomisieren aktivieren

### Steuerung

- **Aktivieren/Deaktivieren:** Toggle-Schalter im Add-on-Popup
- **Rückgängig:** `Strg + Z` um die letzte Textänderung rückgängig zu machen
- **Schnell deaktivieren:** `Escape`-Taste drücken

### Click-Modi

- **Alt + Click:** Ersetzt den Text des angeklickten Elements durch randomisierte Zeichen und Wörter
- **Strg + Click:** Wendet einen Blur-Effekt auf bereits randomisierte Elemente an oder erhöht ihn
- **Strg + Alt + Click:** Löscht den Textinhalt des angeklickten Elements

### Dateien für Firefox

Du benötigst folgende Dateien im Add-on-Ordner:

- `manifest.json` (Firefox Manifest v2)
- `background.js` (Background-Script)
- `content.js` (Content-Script)
- `popup.html` (Popup-Interface)
- `popup.js` (Popup-Logic)
- `icon.png` (Add-on-Icon, 128x128px)

Die originale `icon.svg` kann zu `icon.png` konvertiert werden oder direkt verwendet werden, wenn sie als PNG gespeichert wird.

### Hauptunterschiede zur Chrome-Version

- **Manifest Version:** v2 statt v3 (Firefox unterstützt v3 noch nicht vollständig)
- **API:** `browser` API statt `chrome` API
- **Background:** Background-Script statt Service Worker
- **Storage:** Lokaler Storage statt Session Storage für Tab-States
- **Content Scripts:** Automatische Injection via Manifest
