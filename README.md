# MedLearn – persönliche Medizin-Lernapp

Lokal auf deinem Laptop. Skripte (PDF) hochladen → vollständige Wissensbasis → Karteikarten, Lückentexte, MC-Fragen, klinische Fälle, Zuordnungsaufgaben (Drag & Drop) → Lernen mit Spaced Repetition (FSRS), Fehlerspeicher, Suche, KI-Tutor.

## Einmalige Einrichtung

1. **Node.js 22.13 oder neuer** installieren: https://nodejs.org (LTS-Version, z. B. 22 oder 24).
2. **Claude Code** installieren und mit deinem Claude-Abo einloggen (siehe https://docs.claude.com/en/docs/claude-code), danach im Terminal einmal `claude` starten und mit deinem Claude-Konto (Pro/Max) anmelden.
3. Im Ordner `medlearn` im Terminal:

```bash
npm install
```

## Starten

```bash
npm run dev
```

Der Browser öffnet sich automatisch unter **http://localhost:3210**. Beenden mit `Strg+C`.

Erster Test: In der App unter **Einstellungen → Verbindung testen** prüfen, ob Claude erreichbar ist. Dann in der **Bibliothek** z. B. `beispiel/Kardiologie_Herzinsuffizienz.pdf` hochladen.

## Kosten – wie die KI angebunden ist

Die App ruft **Claude Code im Hintergrund** auf (`claude -p …`). Das läuft über **dein bestehendes Claude-Abo** – es fallen **keine API-Kosten** an. Die Nutzung zählt aber zu deinem normalen Nutzungslimit des Abos (große Skripte verbrauchen spürbar Kontingent; „sonnet“ ist der sparsame Standard).

- Die App entfernt beim Aufruf bewusst `ANTHROPIC_API_KEY` aus der Umgebung, damit Claude Code nicht versehentlich über eine kostenpflichtige API abrechnet.
- Optional (nicht nötig): In den Einstellungen kann man stattdessen einen API-Key hinterlegen – das würde separat pro Nutzung abgerechnet.
- Offline-Modus ohne KI ist vorhanden, liefert aber nur sehr einfache Karten.

Alles andere ist lokal und kostenlos: SQLite-Datenbank (in Node eingebaut), PDF-Verarbeitung mit pdf.js, kein Cloud-Dienst.

## Wo liegen meine Daten?

Im Ordner `data/` (Datenbank `medlearn.db` + Kopien deiner PDFs). Beim Start wird automatisch einmal täglich eine Sicherung in `data/backups/` angelegt (die letzten 10 bleiben). Für eine echte Sicherung den Ordner `data/` ab und zu auf einen USB-Stick kopieren (App vorher beenden).

**Wichtig (Mac):** Den Ordner `medlearn` nicht in „Dokumente“ oder „Schreibtisch“ legen, wenn iCloud diese synchronisiert – das führt zu Fehlern („disk I/O error“). Empfohlen: `~/medlearn`.

## Wie die Verarbeitung funktioniert

1. **Text** wird seitenweise aus dem PDF gelesen (Tabellen zeilenweise mit Spaltentrennern).
2. **Gliederung**: Kapitel und Themen werden aus Überschriften/Lesezeichen erkannt.
3. **Wissensbasis**: Das Skript wird abschnittsweise vollständig in einzelne Wissenseinheiten zerlegt (jede Tabellenzeile, jede Zahl, jeder Grenzwert) – mit Seitenangabe. Seiten mit Text, aber ohne erfasste Einheiten, werden automatisch nachbearbeitet.
4. **Lernmaterial** entsteht nur aus der Wissensbasis. Jede Wissenseinheit wird von mindestens einer Karteikarte abgedeckt (wird geprüft und ggf. nachgeneriert).
5. Inhalte, die **nicht** aus dem Skript stammen, sind mit 🧠 **KI-Ergänzung** markiert.

Dauer: ca. 1–2 Minuten pro 5 Seiten. Die Verarbeitung läuft im Hintergrund; du kannst währenddessen schon lernen. Bricht sie ab (App geschlossen, Limit erreicht), in der Bibliothek auf **Fortsetzen** klicken – bereits Erledigtes bleibt erhalten.

## Bedienung

- **Jetzt lernen**: automatische Session aus fälligen Wiederholungen, offenen Fehlern und neuen Inhalten.
- **Bibliothek**: Fach → Skript → Kapitel → Thema; „Nur dieses Thema“ / „Alles aus diesem Fach lernen“. Klick auf ein Thema zeigt die Wissensbasis.
- **Tastatur**: Leertaste = Antwort zeigen, 1–4 = Bewertung, A–E = MC-Antwort, ←/→ = vorherige/nächste Frage, Enter = Zuordnung prüfen.
- **Sessions** bleiben gespeichert, bis du sie abschließt – auch wenn du zwischendurch woanders hinwechselst oder die App neu startest.
- **Abbildungen**: Bilder, Schemata und Grafiken aus dem PDF werden automatisch ausgeschnitten, von der KI ausgewertet und als Bildkarten genutzt (Abbildung vorne, Frage dazu); passende Abbildungen erscheinen außerdem auf der Rückseite von Textkarten und kommen beim Anki-Export mit.
- **Bearbeiten / Ausblenden**: fehlerhafte Inhalte direkt in der Lernansicht korrigieren oder ausblenden (wiederherstellbar in der Themenansicht).
- **Quelle öffnen** bei jeder Karte: zeigt die Wissenseinheiten, den Seitentext und öffnet das PDF auf der richtigen Seite.

## Hinweise

- Eingescannte PDFs ohne Textebene vorher mit OCR versehen (z. B. in Adobe Acrobat oder mit „OCRmyPDF“).
- Falls `claude` nicht gefunden wird: In den Einstellungen den vollständigen Pfad eintragen (Terminal: `which claude` bzw. Windows: `where claude`).
- Port ändern: `PORT=4000 npm run dev`. Browser nicht automatisch öffnen: `MEDLEARN_NO_OPEN=1`.

## MedLearn an Freunde weitergeben

- **Installer (Windows):** `MedLearn installieren (Windows).cmd` startet `install/install-windows.ps1`: kopiert nach `%USERPROFILE%\MedLearn`, Node.js lokal (ohne Admin), Claude Code (`install.ps1`), Claude-Anmeldung, Verknüpfungen auf Desktop und im Startmenü (`install/start.vbs` startet den Server unsichtbar, Log in `data/server.log`).
- **Installer (Mac):** `MedLearn installieren (Mac).command` kopiert die App nach `~/MedLearn`, installiert bei Bedarf Node.js (lokal, ohne Admin) und Claude Code, führt durch die Claude-Anmeldung, legt das Programmsymbol `~/Applications/MedLearn.app` an und fragt, ob es ins Dock soll. Erneut ausführen = Update; Daten in `data/` bleiben unberührt.
- **Weitergeben:** ZIP des Ordners **ohne** `data/` und `node_modules/` verschicken (dein Lernstand und deine Skripte bleiben bei dir). Anleitung für Freunde: `LIES MICH – Installation.txt`.
- **Jeder nutzt sein eigenes Claude-Abo** – ein gemeinsamer Server mit Abo-Login ist laut Anthropic nicht erlaubt.
- **Lernpakete (.medlearn):** Bibliothek › Teilen-Symbol bei Skript, Fach oder Ordner. Enthält Struktur, Lerninhalte, Abbildungen, Seitentexte und optional die PDF – keinen Lernfortschritt. Import über „Lernpaket importieren“.
- **Updates in der App:** In `package.json` unter `medlearn.updateRepo` ein öffentliches GitHub-Repo (`besitzer/repo`) eintragen. Dann zeigt Einstellungen › App neue Versionen an (Vergleich der `version` in `package.json`) und installiert sie mit einem Klick (`data/`, `node_modules/`, `runtime/` bleiben unangetastet).
