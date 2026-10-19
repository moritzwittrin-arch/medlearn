// Alle KI-Prompts an einer Stelle (leicht anpassbar)

export function structurePrompt({ title, pages, outline }) {
  const pageLines = pages.map((p) => {
    const head = p.headings.length ? ` [Überschriften: ${p.headings.slice(0, 6).join(' / ')}]` : '';
    const start = p.text.replace(/\s+/g, ' ').slice(0, 220);
    return `S.${p.page}:${head} ${start}`;
  }).join('\n');
  const ol = outline.length
    ? `\nInhaltsverzeichnis/Lesezeichen des PDFs:\n${outline.map((o) => `${'  '.repeat(o.depth)}${o.title}${o.page ? ` (S.${o.page})` : ''}`).join('\n')}\n`
    : '';
  return `Analysiere die Gliederung des medizinischen Skripts "${title}" (${pages.length} Seiten).
${ol}
Für jede Seite siehst du Überschriften-Kandidaten und den Seitenanfang:
${pageLines}

Aufgabe: Teile das Skript in Kapitel und darin in Themen (Lerneinheiten) auf.
Regeln:
- Verwende die Überschriften des Skripts (Wortlaut beibehalten, ggf. leicht kürzen).
- Ein Thema ist ein klar abgegrenztes medizinisches Teilthema (meist ein Unterkapitel, z. B. "Definition", "Pathophysiologie", "Therapie"). Lieber feiner als zu grob: eigene Unterüberschriften werden eigene Themen.
- Mehrere Themen dürfen auf derselben Seite beginnen und enden (dann gleiche Seitenzahl, z. B. page_from 1, page_to 1).
- Die Themen müssen alle Seiten von 1 bis ${pages.length} lückenlos und in aufsteigender Reihenfolge abdecken.
- Titelseiten, Inhaltsverzeichnisse, Literaturverzeichnisse: dem Thema "Allgemeines" im ersten bzw. letzten Kapitel zuordnen.

Antworte NUR mit JSON in diesem Format:
{"chapters":[{"title":"Kapitelname","topics":[{"title":"Themenname","page_from":1,"page_to":3}]}]}`;
}

export const UNIT_KINDS = ['definition', 'fakt', 'zahl', 'klassifikation', 'symptom', 'diagnostik', 'therapie',
  'medikament', 'mechanismus', 'nebenwirkung', 'kontraindikation', 'anatomie', 'physiologie',
  'pathophysiologie', 'zusammenhang', 'differentialdiagnose', 'klinik', 'merksatz', 'tabelle', 'vergleich'];

export function extractPrompt({ title, chunkText, topics }) {
  const tl = topics.map((t) => `${t.id}: ${t.chapter} › ${t.title} (S.${t.page_from}–${t.page_to})`).join('\n');
  return `Du erstellst eine VOLLSTÄNDIGE Wissensbasis aus einem Abschnitt des medizinischen Skripts "${title}".

ZIEL: Das Skript soll vollständig lernbar werden. Es geht NICHT um eine Zusammenfassung.
Jede prüfungsrelevante Information des Textes muss als Wissenseinheit erfasst werden.

Regeln:
1. Erfasse systematisch ALLES: Definitionen, Fakten, Zahlen, Grenzwerte, Klassifikationen, Symptome, Diagnostik, Therapie, Medikamente (inkl. Dosierungen), Wirkmechanismen, Nebenwirkungen, Kontraindikationen, Anatomie, Physiologie, Pathophysiologie, Zusammenhänge, Differentialdiagnosen, klinische Besonderheiten, Merksätze, Vergleiche.
2. Lass NICHTS weg, nur weil es unwichtig wirkt. Enthält eine Liste/Tabelle 5 Elemente, müssen alle 5 erfasst werden.
3. Tabellen: Jede Tabellenzeile wird eine eigene Einheit, die den Kontext (Tabellenthema + Spaltenbezeichnungen) enthält. Spalten sind im Text oft durch " | " getrennt.
4. Zahlen, Grenzwerte, Einheiten und Fachbegriffe EXAKT wie im Skript übernehmen. Formulierungen nah am Original.
5. Jede Einheit muss für sich allein verständlich sein (Bezug nennen, z. B. "Bei HFrEF ..." statt "Hier ...").
6. Eine Einheit = eine prüfbare Aussage (bei Aufzählungen: eine Einheit mit der vollständigen Aufzählung ist erlaubt, wenn die Aufzählung als Ganzes gelernt wird).
7. Füge KEIN Wissen hinzu, das nicht im Text steht. Korrigiere keine Inhalte.
8. Ordne jede Einheit dem passenden Thema (Themen-ID) und der Seite zu, auf der sie steht (Seitenmarker [[Seite N]]).
9. Ignoriere reine Formalia (Seitenzahlen, Kopf-/Fußzeilen, Literaturangaben).

Erlaubte Arten (k): ${UNIT_KINDS.join(', ')}

Themen:
${tl}

TEXT:
${chunkText}

Antworte NUR mit JSON:
{"units":[{"t":Themen-ID,"p":Seite,"k":"art","c":"Inhalt der Wissenseinheit"}]}`;
}

export function generatePrompt({ topic, units, onlyFlashcards = false }) {
  const ul = units.map((u) => `[u${u.id}|S.${u.page}|${u.kind}] ${u.content}`).join('\n');
  const n = units.length;
  const mcN = Math.max(2, Math.round(n / 3));
  const formats = onlyFlashcards
    ? '{"flashcards":[{"q":"Frage","a":"Antwort","u":[12]}]}'
    : `{
 "flashcards":[{"q":"Frage","a":"Antwort","u":[12]}],
 "cloze":[{"text":"Satz mit {{Lücke}} und {{zweiter Lücke}}","u":[12]}],
 "mc":[{"type":"wissen|klinisch","stem":"Frage/Fallvignette","options":["A","B","C","D","E"],"correct":0,
        "explanation":"Warum die richtige Antwort stimmt","why_wrong":["leer für richtige Option","warum B falsch","..."],
        "u":[12],"ki":"optional: ergänzendes Wissen, das NICHT im Skript steht"}],
 "cases":[{"vignette":"Patient ... Symptome ... Untersuchung ... Labor ... Befunde","q":"Was ist die wahrscheinlichste Diagnose?","answer":"...","explanation":"...","u":[12],"ki":"optional"}]
}`;
  const rules = onlyFlashcards
    ? `Erstelle Karteikarten NUR für die folgenden Wissenseinheiten (jede Einheit mindestens eine Karte).`
    : `Erstelle aus den Wissenseinheiten Lernmaterial:
- flashcards: JEDE Wissenseinheit muss von mindestens einer Karteikarte abgedeckt sein (Abdeckung wird geprüft!). Bei Zahlen/Grenzwerten eigene Karten. Konkrete, prüfungsorientierte Fragen ("Ab welcher LVEF spricht man von HFrEF?"), KEINE generischen Fragen ("Was weißt du über ...?"). Antworten knapp und exakt.
- cloze: ca. ${Math.max(1, Math.round(n / 5))} Lückentexte für Zahlen, Grenzwerte und Schlüsselbegriffe ({{...}} markiert Lücken).
- mc: ca. ${mcN} Single-Best-Answer-Fragen mit genau 5 Optionen; Mischung aus Wissensfragen und klinischen Anwendungsfragen (kurze Fallvignette). Die Distraktoren müssen plausibel sein, ähnlich lang und ähnlich aufgebaut wie die richtige Antwort; die richtige Antwort darf nicht durch Länge oder Formulierung erkennbar sein. Position der richtigen Antwort variieren. why_wrong hat genau 5 Einträge (für die richtige Option leerer String).
- cases: 0–2 klinische Fallvignetten, NUR wenn das Thema klinisch ist (Krankheitsbilder, Diagnostik, Therapie). Sonst leeres Array.`;
  return `Thema: "${topic.chapter} › ${topic.title}"

Wissenseinheiten aus dem Skript (Format: [ID|Seite|Art] Inhalt):
${ul}

${rules}

Zuverlässigkeit:
- Die richtigen Antworten müssen sich aus den Wissenseinheiten ergeben (Skript = Referenz).
- "u" listet die IDs (nur die Zahl, ohne "u") der Wissenseinheiten, auf denen das Element beruht.
- Wenn du für Distraktor-Erklärungen oder Fälle Wissen benötigst, das NICHT in den Einheiten steht, schreibe dieses ausschließlich in das Feld "ki". Erfinde nichts als Skriptinhalt.
- Sprache: Deutsch, medizinische Fachsprache wie im Skript.

Antworte NUR mit JSON:
${formats}`;
}

export function matchPrompt({ topic, units }) {
  const ul = units.map((u) => `[u${u.id}|S.${u.page}|${u.kind}] ${u.content}`).join('\n');
  return `Thema: "${topic.chapter} › ${topic.title}"

Wissenseinheiten aus dem Skript (Format: [ID|Seite|Art] Inhalt):
${ul}

Erstelle Zuordnungsaufgaben (Drag & Drop): Der Student zieht Begriffe der rechten Seite auf die passenden Begriffe der linken Seite.
- 0 bis 3 Aufgaben, je nach Stoffmenge. Nur sinnvolle, eindeutige Zuordnungen (z. B. Substanzklasse ↔ typische Nebenwirkung, Einteilung ↔ Grenzwert, Symptom ↔ Links-/Rechtsherzinsuffizienz, Erreger ↔ Therapie, Nerv ↔ Funktion).
- Jede Aufgabe hat 3 bis 6 Paare. Jede rechte Seite passt zu GENAU EINER linken Seite (keine Doppeldeutigkeit). Alle linken und alle rechten Einträge sind jeweils verschieden.
- Beide Seiten kurz (max. ca. 80 Zeichen), wörtlich bzw. sinngemäß aus dem Skript – nichts erfinden.
- Rechte Einträge sollen ähnlich lang und ähnlich aufgebaut sein, damit man nicht an der Form erkennt, was wohin gehört.
- "title": kurze Arbeitsanweisung, z. B. "Ordne den Substanzklassen ihre typische Nebenwirkung zu".
- "u": IDs (nur Zahlen) der zugrunde liegenden Wissenseinheiten.
- Wenn das Thema keine sinnvolle Zuordnung hergibt: leeres Array.

Antworte NUR mit JSON:
{"match":[{"title":"...","pairs":[{"l":"links","r":"rechts"}],"u":[12]}]}`;
}

export function gradePrompt({ question, answer, points, sources, userAnswer }) {
  return `Bewerte die Antwort eines Medizinstudenten auf eine offene Prüfungsfrage.

Frage: ${question}
Musterantwort (laut Skript): ${answer}
Kernpunkte laut Skript:
${(points || []).map((p) => `- ${p}`).join('\n')}

Zugehörige Skriptstellen:
${sources}

Antwort des Studenten:
"""${userAnswer}"""

Bewerte INHALTLICH/SEMANTISCH (Synonyme, andere Formulierungen und Reihenfolgen sind korrekt). Referenz ist das Skript.
- richtig: welche Kernpunkte wurden (sinngemäß) korrekt genannt
- fehlt: welche Kernpunkte fehlen
- falsch: welche Aussagen sind falsch oder ungenau (mit kurzer Korrektur)
- extra: korrekte Aussagen, die über das Skript hinausgehen (kennzeichne als KI-Wissen)
- score: Vollständigkeit & Korrektheit 0–100
- rating: 1 = nicht gewusst, 2 = schwer/lückenhaft, 3 = gut, 4 = perfekt
- feedback: 1–3 Sätze, direkt und konstruktiv

Antworte NUR mit JSON:
{"score":0,"rating":1,"richtig":[],"fehlt":[],"falsch":[],"extra":[],"feedback":""}`;
}

export function tutorPrompt({ context, history, message, focus, web = true }) {
  const h = history.slice(-8).map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n\n');
  if (web) {
    return `Du bist ein medizinischer Tutor für einen Medizinstudenten.
${focus ? `Kontext: ${focus}\n` : ''}
${h ? `Bisheriger Verlauf:\n${h}\n\n` : ''}Frage des Studenten: ${message}

SO GEHST DU VOR
1. Recherchiere die Frage online (WebSearch, bei Bedarf WebFetch). Die Online-Recherche ist die Grundlage deiner Antwort. Suche gründlich (mehrere gezielte Suchen, z. B. je Teilaspekt), sodass möglichst jede Kernaussage mit einer hochwertigen Quelle belegt ist.
   Quellen-Rangfolge: (a) aktuelle Leitlinien – AWMF/Nationale VersorgungsLeitlinien, ESC, ERS, ESMO, EASL, EAU, ESH u. a. europäische Fachgesellschaften, NICE, WHO; (b) Cochrane-Reviews und Fachliteratur (PubMed/PMC, NEJM, Lancet, JAMA, BMJ); (c) Referenzwerke – StatPearls (NCBI Bookshelf), MSD Manual für Fachkreise, Deutsches Ärzteblatt, Fachinformationen, RKI. Wikipedia, Laienportale, Blogs und Foren sind keine Belege.
2. Schreibe EINE zusammenhängende, integrierte Antwort – so, wie ein guter Oberarzt die Frage beantworten würde. Aufbau nach dem Inhalt (z. B. Definition → Diagnostik → Therapie), NICHT nach Quellenart. Es gibt KEINE getrennten Abschnitte wie "Laut Skript", "Laut Leitlinie", "Hinweise zum Skript", "KI-Ergänzung" oder "Einschränkungen".
3. Priorität bei Widersprüchen: Die Online-Recherche (aktuelle Leitlinie/Literatur) gilt. Schreibe den aktuellen Stand als Aussage und ergänze direkt im selben Satz knapp in Klammern, wenn das Skript abweicht, z. B. "… ab LVEF ≤ 40 % [1] (dein Skript: ≤ 35 %, älterer Stand)." Stimmt das Skript überein, erwähne es nicht extra.
4. Belege Kernaussagen mit [1], [2] … direkt im Text. Was du ohne gefundene Quelle aus eigenem Wissen ergänzt, markiere knapp inline mit "(ohne Quellenbeleg)" – keine eigenen Absätze dafür.
5. Ganz am Ende: "Quellen:" als nummerierte Liste ("1. [Titel – Herausgeber, Jahr](URL)"), nur tatsächlich gefundene Quellen. Falls nötig danach EIN kurzer Satz, wenn eine wichtige Quelle nicht im Volltext lesbar war.
6. Will der Student geprüft werden: stelle EINE Frage nach der anderen und warte auf die Antwort (keine Recherche nötig).
7. Deutsch, präzise, prüfungsorientiert, mit Zahlen/Grenzwerten wo relevant. Markdown (fett, Listen). Keine Einleitungsfloskeln, keine Rückfrage am Ende.

Auszüge aus dem Skript des Studenten – NUR zum Abgleich (Abweichungen kurz in Klammern nennen, sonst ignorieren):
${context || '(keine passenden Skriptstellen)'}`;
  }
  return `Du bist ein KI-Tutor für einen Medizinstudenten.
${focus ? `Aktueller Fokus: ${focus}\n` : ''}
Relevante Skriptstellen:
${context || '(keine passenden Skriptstellen gefunden)'}

Regeln:
- Stütze dich auf die Skriptstellen und nenne die Quelle im Format [Dokument, S. X].
- Alles, was NICHT aus den Skriptstellen stammt, kennzeichne mit "🧠 KI-Ergänzung:" am Absatzanfang.
- Wenn du unsicher bist, sag das ausdrücklich. Behaupte nie, etwas stehe im Skript, wenn es dort nicht steht.
- Wenn der Student geprüft werden will: stelle EINE Frage nach der anderen.
- Antworte auf Deutsch, klar strukturiert, prägnant. Markdown erlaubt.

${h ? `Bisheriger Verlauf:\n${h}\n\n` : ''}Student: ${message}

Tutor:`;
}
