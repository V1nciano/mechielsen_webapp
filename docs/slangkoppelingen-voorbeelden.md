# Praktische Handleiding Slangkoppelingen

## Voorbeeld 1: Enkelwerkende Heffunctie

### Situatie
Een graafmachine met een heffunctie voor de giek.

### Configuratie Stappen
1. **Aanbouwdeel Selecteren**
   - Selecteer "Giek" uit de lijst met aanbouwdelen

2. **Nieuwe Slangkoppeling Toevoegen**
   ```
   Slang Nummer: 1
   Slang Label: "Giek Omhoog"
   Slang Kleur: Rood
   Poort Type: P
   Functie Beschrijving: "Hydraulische heffunctie voor de giek"
   Instructie Tekst: "Controleer altijd de omgeving voordat u de giek heft"
   Druk Rating: 250
   Debiet Rating: 40
   ```

3. **Tweede Slangkoppeling**
   ```
   Slang Nummer: 2
   Slang Label: "Giek Omlaag"
   Slang Kleur: Blauw
   Poort Type: T
   Functie Beschrijving: "Retourstroom voor de giek"
   Instructie Tekst: "Laat de giek langzaam zakken"
   Druk Rating: 250
   Debiet Rating: 40
   ```

## Voorbeeld 2: Dubbelwerkende Grijper

### Situatie
Een graafmachine met een hydraulische grijper.

### Configuratie Stappen
1. **Aanbouwdeel Selecteren**
   - Selecteer "Hydraulische Grijper" uit de lijst

2. **Eerste Slangkoppeling**
   ```
   Slang Nummer: 1
   Slang Label: "Grijper Open"
   Slang Kleur: Geel
   Poort Type: A
   Functie Beschrijving: "Openen van de grijper"
   Instructie Tekst: "Controleer de grijper op vrije beweging"
   Druk Rating: 300
   Debiet Rating: 60
   ```

3. **Tweede Slangkoppeling**
   ```
   Slang Nummer: 2
   Slang Label: "Grijper Dicht"
   Slang Kleur: Groen
   Poort Type: B
   Functie Beschrijving: "Sluiten van de grijper"
   Instructie Tekst: "Pas de grijpkracht aan op het materiaal"
   Druk Rating: 300
   Debiet Rating: 60
   ```

4. **Druk- en Retourleidingen**
   ```
   Slang Nummer: 3
   Slang Label: "Druk Grijper"
   Slang Kleur: Rood
   Poort Type: P
   Functie Beschrijving: "Hoofddrukleiding grijper"
   Druk Rating: 300
   Debiet Rating: 60
   ```

   ```
   Slang Nummer: 4
   Slang Label: "Retour Grijper"
   Slang Kleur: Blauw
   Poort Type: T
   Functie Beschrijving: "Retourleiding grijper"
   Druk Rating: 300
   Debiet Rating: 60
   ```

## Voorbeeld 3: Hoge Doorstroming voor Rotator

### Situatie
Een graafmachine met een hydraulische rotator.

### Configuratie Stappen
1. **Aanbouwdeel Selecteren**
   - Selecteer "Hydraulische Rotator" uit de lijst

2. **Eerste Slangkoppeling**
   ```
   Slang Nummer: 1
   Slang Label: "Rotator Links"
   Slang Kleur: Geel
   Poort Type: A
   Functie Beschrijving: "Linksom draaien rotator"
   Instructie Tekst: "Start met lage snelheid"
   Druk Rating: 350
   Debiet Rating: 100
   ```

3. **Tweede Slangkoppeling**
   ```
   Slang Nummer: 2
   Slang Label: "Rotator Rechts"
   Slang Kleur: Groen
   Poort Type: B
   Functie Beschrijving: "Rechtsom draaien rotator"
   Instructie Tekst: "Start met lage snelheid"
   Druk Rating: 350
   Debiet Rating: 100
   ```

4. **Druk- en Retourleidingen**
   ```
   Slang Nummer: 3
   Slang Label: "Druk Rotator"
   Slang Kleur: Rood
   Poort Type: P
   Functie Beschrijving: "Hoofddrukleiding rotator"
   Druk Rating: 350
   Debiet Rating: 100
   ```

   ```
   Slang Nummer: 4
   Slang Label: "Retour Rotator"
   Slang Kleur: Blauw
   Poort Type: T
   Functie Beschrijving: "Retourleiding rotator"
   Druk Rating: 350
   Debiet Rating: 100
   ```

## Voorbeeld 4: Volvo EWR150E met Hydraulische Boor

### Situatie
Een Volvo EWR150E graafmachine met een hydraulische boor voor grondboringen. De machine heeft 2 ventielen en de boor heeft ook 2 ventielen.

### Ventiel Configuratie
#### Machine Ventielen (Volvo EWR150E)
1. **Ventiel 1 (Hoofdventiel)**
   - Functie: Rotatie en voeding
   - Poorten: P, T, A, B
   - Druk: 300 bar
   - Debiet: 80 l/min

2. **Ventiel 2 (Secundair ventiel)**
   - Functie: Noodstop en extra functies
   - Poorten: P, T, A, B
   - Druk: 300 bar
   - Debiet: 40 l/min

#### Boor Ventielen
1. **Ventiel 1 (Rotatie ventiel)**
   - Functie: Boorrotatie controle
   - Poorten: A, B
   - Druk: 300 bar
   - Debiet: 80 l/min

2. **Ventiel 2 (Voeding ventiel)**
   - Functie: Boorkracht en snelheid
   - Poorten: A, B
   - Druk: 300 bar
   - Debiet: 80 l/min

### Configuratie Stappen
1. **Aanbouwdeel Selecteren**
   - Selecteer "Hydraulische Boor" uit de lijst

2. **Machine Ventiel 1 Koppelingen**
   ```
   Slang Nummer: 1
   Slang Label: "Machine Ventiel 1 P"
   Slang Kleur: Rood
   Poort Type: P
   Functie Beschrijving: "Hoofddruk machine ventiel 1"
   Instructie Tekst: "Controleer druk voor gebruik"
   Druk Rating: 300
   Debiet Rating: 80
   ```

   ```
   Slang Nummer: 2
   Slang Label: "Machine Ventiel 1 T"
   Slang Kleur: Blauw
   Poort Type: T
   Functie Beschrijving: "Retour machine ventiel 1"
   Instructie Tekst: "Controleer retourstroom"
   Druk Rating: 300
   Debiet Rating: 80
   ```

3. **Machine Ventiel 2 Koppelingen**
   ```
   Slang Nummer: 3
   Slang Label: "Machine Ventiel 2 P"
   Slang Kleur: Rood
   Poort Type: P
   Functie Beschrijving: "Hoofddruk machine ventiel 2"
   Instructie Tekst: "Controleer druk voor gebruik"
   Druk Rating: 300
   Debiet Rating: 40
   ```

   ```
   Slang Nummer: 4
   Slang Label: "Machine Ventiel 2 T"
   Slang Kleur: Blauw
   Poort Type: T
   Functie Beschrijving: "Retour machine ventiel 2"
   Instructie Tekst: "Controleer retourstroom"
   Druk Rating: 300
   Debiet Rating: 40
   ```

4. **Boor Ventiel 1 Koppelingen (Rotatie)**
   ```
   Slang Nummer: 5
   Slang Label: "Boor Rotatie A"
   Slang Kleur: Geel
   Poort Type: A
   Functie Beschrijving: "Linksom draaien boorkop"
   Instructie Tekst: "Start rotatie bij lage snelheid"
   Druk Rating: 300
   Debiet Rating: 80
   ```

   ```
   Slang Nummer: 6
   Slang Label: "Boor Rotatie B"
   Slang Kleur: Groen
   Poort Type: B
   Functie Beschrijving: "Rechtsom draaien boorkop"
   Instructie Tekst: "Start rotatie bij lage snelheid"
   Druk Rating: 300
   Debiet Rating: 80
   ```

5. **Boor Ventiel 2 Koppelingen (Voeding)**
   ```
   Slang Nummer: 7
   Slang Label: "Boor Voeding A"
   Slang Kleur: Geel
   Poort Type: A
   Functie Beschrijving: "Boorkracht verhogen"
   Instructie Tekst: "Verhoog kracht geleidelijk"
   Druk Rating: 300
   Debiet Rating: 80
   ```

   ```
   Slang Nummer: 8
   Slang Label: "Boor Voeding B"
   Slang Kleur: Groen
   Poort Type: B
   Functie Beschrijving: "Boorkracht verlagen"
   Instructie Tekst: "Verlaag kracht geleidelijk"
   Druk Rating: 300
   Debiet Rating: 80
   ```

### Koppelschema
```
Machine Ventiel 1 P (Rood) → Boor Ventiel 1 P
Machine Ventiel 1 T (Blauw) → Boor Ventiel 1 T
Machine Ventiel 2 P (Rood) → Boor Ventiel 2 P
Machine Ventiel 2 T (Blauw) → Boor Ventiel 2 T
```

### Veiligheidscontroles voor EWR150E Boor
- [ ] Controleer alle ventiel koppelingen
- [ ] Verifieer druk in beide circuits
- [ ] Test rotatie in beide richtingen
- [ ] Controleer voeding in beide richtingen
- [ ] Verifieer noodstop circuit
- [ ] Test automatische remfunctie

### Tips voor EWR150E Boor Gebruik
- Start altijd met lage rotatiesnelheid
- Controleer beide ventielen voor gebruik
- Monitor hydraulische olie temperatuur
- Gebruik juiste boorpen voor grondsoort
- Houd noodstop bereikbaar
- Documenteer boorparameters per grondsoort

### Onderhoudscontroles
- [ ] Dagelijks: Controleer alle slangkoppelingen op lekkage
- [ ] Wekelijks: Verifieer druk- en debietwaardes beide circuits
- [ ] Maandelijks: Controleer boorpen slijtage
- [ ] Per 100 uur: Vervang hydraulische filters
- [ ] Per 500 uur: Controleer complete hydraulische installatie

### Probleemoplossing EWR150E Boor
1. **Lage Rotatiesnelheid**
   - Controleer debiet instellingen ventiel 1
   - Verifieer hydraulische olie niveau
   - Check filters

2. **Onvoldoende Boorkracht**
   - Controleer debiet instellingen ventiel 2
   - Verifieer druk in beide circuits
   - Check ventiel instellingen

3. **Onregelmatige Rotatie**
   - Controleer slangkoppelingen ventiel 1
   - Verifieer ventiel instellingen
   - Check boorpen koppeling

### Best Practices voor EWR150E
- Gebruik alleen goedgekeurde booraccessoires
- Houd werkgebied schoon en overzichtelijk
- Documenteer alle boorparameters
- Volg Volvo onderhoudsschema
- Gebruik juiste hydraulische olie
- Controleer regelmatig alle slangkoppelingen

## Veiligheidscontroles per Voorbeeld

### Enkelwerkende Heffunctie
- [ ] Controleer terugkeer via zwaartekracht
- [ ] Verifieer drukbeveiliging
- [ ] Test noodstop functie
- [ ] Controleer slangdiameter

### Dubbelwerkende Grijper
- [ ] Test beide richtingen
- [ ] Controleer druk in beide leidingen
- [ ] Verifieer grijpkracht
- [ ] Test veiligheidsventielen

### Hoge Doorstroming Rotator
- [ ] Controleer slangdiameter
- [ ] Verifieer drukbeveiliging
- [ ] Test snelheidsregeling
- [ ] Controleer koeling

## Tips per Situatie

### Heffunctie
- Gebruik altijd de juiste slangdiameter
- Controleer de omgeving voor het heffen
- Test de functie bij lage druk eerst
- Documenteer de maximale hefhoogte

### Grijper
- Pas de grijpkracht aan op het materiaal
- Controleer de grijper op vrije beweging
- Test de functie in beide richtingen
- Verifieer de druk in beide leidingen

### Rotator
- Start altijd met lage snelheid
- Controleer de rotatiesnelheid
- Verifieer de koeling
- Test de remfunctie 