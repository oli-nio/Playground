FORMIKAT CUTPLAN V2.1 - statische Review-Veröffentlichung
Stand: 24.10.2026

Grundlage ist die unverändert erhaltene lokale Anwendung
FORMIKAT_CUTPLAN_V2_1_DEV_2026-10-24/app mit ihrem geprüften
Senckenberg-Testprojekt (Modultest und Generationendialog).
Diese Veröffentlichung ist keine neue Generator- oder Solverversion.

Einstieg: index.html. Alle Berechnungen, Projektspeicherung und Exporte
laufen im Browser. GitHub Pages liefert nur die statischen Dateien aus.
Änderungen werden nicht auf GitHub oder in einer Cloud-Datenbank gespeichert.
Eigene Änderungen als Projektdatei sichern; der Browser-Zwischenspeicher
ist nicht geräteübergreifend und kein verlässliches Backup.

Nur folgende Hosting-Anpassungen wurden gegenüber der lokalen App vorgenommen:
1. HiGHS-WASM wird relativ zum Worker aus vendor/highs.wasm geladen,
   damit der Solver auch in einem GitHub-Pages-Unterverzeichnis funktioniert.
2. index.html enthält die lokale Sicherheitsregel als CSP-Meta-Angabe
   (ohne das in Meta-Angaben nicht unterstützte frame-ancestors),
   den Titel mit V2.1 und den Link zum vorhandenen Bildvergleich.
3. Vorhandene Berichte, Bilder und genau die im Bildvergleich verlinkten
   Prüfbelege wurden unter review/ und qa/ mitgeliefert. Die große separate
   Projektdatei wird nicht veröffentlicht: „Projekt speichern“ in der Anwendung
   erzeugt dieselbe portable Datenbasis lokal. Der Bildvergleich verlinkt dies.
4. Vorhandene Bibliothekslizenzen und dieses Übergabedokument liegen bei.

review/VERGLEICH.html ist der ursprüngliche lokale Vergleichsbericht.
Sein Hinweis auf START_CUTPLAN.cmd betrifft das separate Offline-Paket,
nicht diesen Browser-Einstieg. Die damaligen lokalen Prüfungen sind dort
als historische Nachweise dokumentiert; sie ersetzen keinen aktuellen
öffentlichen Browser-Test.

Enthalten sind nur abgeleitete Geometrien und Ergebnisse der freigegebenen
Quellen. Keine Original-3DM, keine lokalen Startprogramme, kein Python-Server,
keine Upload-Funktion und keine externen Laufzeit-APIs.

Materialpreise sind sichtbar gekennzeichnete Testszenarien.
Keine Maschinen-, Bestell- oder Produktionsfreigabe.
Lizenzhinweise der mitgelieferten Bibliotheken: LICENSES/.

Transportanpassung ohne Funktionsänderung:
Der GitHub-Verbindungsweg konnte die große seed.js-Datei nicht übertragen.
Darum sind das ursprüngliche JSON und die unveränderten HiGHS-WASM-Bytes
mechanisch in kleine, lokal mitgelieferte JavaScript-Dateien zerlegt.
index.html lädt die JSON-Teile in fester Reihenfolge; seed.js setzt daraus
mit JSON.parse die ursprünglichen Daten wieder zusammen. Der Worker lädt
die WASM-Teile in fester Reihenfolge und rekonstruiert die ursprünglichen
Bytes für den bereits vorhandenen wasmBinary-Eingang des Solvers.
Es werden weder Geometrien, Mengen noch Algorithmen geändert.
Text-/Datenidentität und WASM-Byteidentität werden vor der Übergabe geprüft.
Direkte highs.wasm und die große .cutplan-Datei bleiben nur in der lokalen
Veröffentlichungsvorbereitung und sind explizit vom Upload ausgeschlossen.

Startzeit und Suchzeit werden getrennt behandelt:
Der Browser wartet höchstens 30 Sekunden auf die lokalen Worker-Module.
Erst wenn der Worker nach vollständig geladenen Modulen „started“ meldet,
beginnt das unveränderte eingestellte Suchbudget mit 350 ms Abbruchreserve.
Ein Lade-Zeitlimit beendet nur diesen Worker-Versuch; eine vorhandene
geprüfte Lösung bleibt erhalten. Geometrie und Suchverfahren sind unverändert.
