# Changelog

## 2.0.0 – 2026-07-16

### Neu

- Vollständig neu entwickelte v2-Oberfläche mit responsiver App-Shell, Desktop-Sidebar und mobiler Navigation.
- Neuer Game Hub sowie eigene Ansichten für Randomizer, Filter Studio, Wheel, Squad, GunGame, Miesmuschel und Einstellungen.
- Neues Loadout Board mit Karten-Locks, Einzel-Reroll und einheitlichen Event-Overlays.
- Filter Studio mit Waffensuche, Auswahlzählern, Validierung und eigenem v2-Speicherprofil.
- Neue Einstellungen für Lautstärke, reduzierte Animationen, Streamer-/Greenscreen-Modus und das Zurücksetzen lokaler v2-Daten.
- Neue Komponenten für Sheets, Dialoge, Bestätigungen, Karten, Buttons und Statusanzeigen.
- Offline-Seite, eigener v2-Service-Worker und integrierte Selbsttests unter `v2/test.html`.

### Architektur und Performance

- Neue modulare Struktur aus Views, Store, Core-Modulen, Services und Komponenten ohne Framework oder Build-Schritt.
- Ansichten werden per dynamischem Import geladen; Firebase wird erst beim Öffnen des Squad-Modus angefordert.
- Randomizer-, GunGame-, Filter-, Storage- und Miesmuschel-Logik wurden vom DOM getrennt und mit Tests versehen.
- Neues aufgeteiltes CSS-Design-System mit Tokens sowie Komponenten- und View-Styles.
- Systemschriften ersetzen externe Google-Fonts; Wheel und Audio werden nur bei Bedarf initialisiert.

### Verbessert

- Einheitliches Dark-Tactical-Design und konsistente Bedienung auf Desktop und Mobilgeräten.
- Zugängliche Fokusführung, Tastaturbedienung, Live-Status, Reduced Motion und bestätigungspflichtige kritische Aktionen.
- GunGame zeigt die aktuelle Stufe deutlicher und fragt vor dem Zurücksetzen des Fortschritts nach.
- Squad-Mitglieder zeigen Rollen, Aktivität und Leader-Status als eindeutige Badges.
- Die bisherigen Einstiegseiten leiten direkt auf die entsprechenden v2-Ansichten weiter.

### Hinweise

- v1 und v2 bleiben vorerst parallel im Repository; v1-Daten werden nicht automatisch in das neue v2-Speicherprofil übernommen.
- Lighthouse-, vollständige Browser- und reale Gerätetests stehen noch aus.
- Alle Styles werden ohne Bundler gemeinsam geladen; echtes CSS-Code-Splitting ist daher noch nicht vorhanden.
