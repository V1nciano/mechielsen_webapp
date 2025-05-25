# Ventielenconfiguratie Systeem - Mechielsen Webapp

Dit document beschrijft het hydraulische ventielenconfiguratie systeem dat is toegevoegd aan de Mechielsen webapp voor het beheren van machine hydrauliek en slangkoppelingen.

## Overzicht

Het ventielenconfiguratie systeem bestaat uit vier hoofdcomponenten:

1. **Machineprofiel uitbreiding** - Extra velden voor hydraulische specificaties
2. **Ventielenconfiguratie** - Gedetailleerde configuratie per ventiel 
3. **Slangkoppeling instructies** - Mapping tussen slangen en ventielen
4. **Gebruikersinterface** - Zowel admin- als gebruikerspagina's

## Database Schema

### Machines Tabel Uitbreiding

De `machines` tabel is uitgebreid met de volgende kolommen:

```sql
ALTER TABLE machines 
ADD COLUMN IF NOT EXISTS aansluiting_type TEXT DEFAULT 'ISO A/B',
ADD COLUMN IF NOT EXISTS layout_beschrijving TEXT DEFAULT 'Standaard layout',
ADD COLUMN IF NOT EXISTS ventiel_layout JSONB DEFAULT '{"achter": [], "voor": []}';
```

### Nieuwe Tabellen

#### machine_ventielen
Slaat de ventielenconfiguratie per machine op:

```sql
CREATE TABLE machine_ventielen (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    ventiel_nummer TEXT NOT NULL, -- V1, V2, V3, etc.
    functie_naam TEXT NOT NULL, -- bijv. "Hefarm werktuig", "Grijper open/dicht"
    positie TEXT NOT NULL CHECK (positie IN ('voor', 'achter')), 
    ventiel_type TEXT NOT NULL CHECK (ventiel_type IN ('enkel', 'dubbelwerkend', 'powerBeyond')),
    omschrijving TEXT,
    kleur_code TEXT, -- bijv. "rood", "geel", "blauw" 
    poort_a_label TEXT DEFAULT 'A',
    poort_b_label TEXT DEFAULT 'B',
    volgorde INTEGER DEFAULT 1,
    actief BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(machine_id, ventiel_nummer)
);
```

#### slang_koppelingen
Slaat slangkoppeling instructies op:

```sql
CREATE TABLE slang_koppelingen (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    attachment_id UUID REFERENCES attachments(id) ON DELETE CASCADE,
    slang_nummer INTEGER NOT NULL,
    slang_kleur TEXT,
    slang_label TEXT,
    ventiel_id UUID REFERENCES machine_ventielen(id) ON DELETE CASCADE,
    poort TEXT CHECK (poort IN ('A', 'B', 'P', 'T')),
    functie_beschrijving TEXT,
    instructie_tekst TEXT,
    volgorde INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(machine_id, attachment_id, slang_nummer)
);
```

#### ventiel_templates
Herbruikbare ventiel configuratie templates:

```sql
CREATE TABLE ventiel_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    naam TEXT NOT NULL,
    machine_type TEXT,
    beschrijving TEXT,
    template_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Admin Interface

### Machine Beheer (/admin/machines)
- Uitgebreid met ventiel-gerelateerde velden
- Knoppen voor "Ventielen Configureren" en "Slangkoppeling Beheren"

### Ventielenconfiguratie (/admin/machines/[id]/ventielen)
- CRUD functionaliteit voor ventielen per machine
- Kleurcodering en positionering (voor/achter)
- Ventiel types: enkel, dubbelwerkend, powerBeyond
- Poort labeling (A/B, P/T)

### Slangkoppeling Beheer (/admin/machines/[id]/slangen)  
- Configuratie per aanbouwdeel
- Mapping tussen slangen en ventielen
- Instructieteksten voor gebruikers
- Kleurcodering voor slangen

## Gebruikersinterface

### Ventielen Overzicht (/dashboard/machines/[id]/ventielen)
- Overzicht van alle ventielen per machine
- Georganiseerd per positie (voor/achter)
- Kleurcodering en functie beschrijvingen
- Instructies voor gebruikers

### Aanbouwdeel Pagina Update
- Knop toegevoegd voor "Ventielen Overzicht"
- Naadloze integratie met bestaande workflow

## Gebruiksscenario's

### Voor Administrators

1. **Machine Configuratie**
   - Login als admin (vince@admin.com)
   - Ga naar Admin Panel → Machines
   - Selecteer machine en klik "Ventielen Configureren"
   - Voeg ventielen toe met specificaties

2. **Slangkoppeling Setup**
   - Klik "Slangkoppeling Beheren" bij machine
   - Selecteer aanbouwdeel
   - Configureer welke slang naar welk ventiel gaat

### Voor Eindgebruikers

1. **Ventiel Informatie Bekijken**
   - Selecteer machine in dashboard
   - Klik "Ventielen Overzicht" 
   - Zie alle ventielen met kleuren en functies

2. **Aanbouwdeel Koppelen**
   - Bekijk ventielconfiguratie
   - Volg slangkoppeling instructies per aanbouwdeel

## Voorbeeld Configuratie

### John Deere 6155R Trekker

**Machine Specificaties:**
- Type: Trekker
- Hydraulische Inputs: 4
- Aansluiting Type: ISO A/B
- Layout: "Achterzijde: V1 t/m V4, voorzijde: V5, V6"

**Ventielen:**
- V1: Hefarm werktuig (achterzijde, dubbelwerkend, rood)
- V2: Grijper open/dicht (voorzijde, dubbelwerkend, geel) 
- V3: Vrij retour (achterzijde, enkel, blauw)
- V4: Power Beyond (achterzijde, powerBeyond, groen)

**Slangkoppeling voor Graskeerder:**
- Slang 1 (Rood) → V1 Poort A (heffen)
- Slang 2 (Blauw) → V1 Poort B (dalen)

## Installatie

1. **Database Schema Uitvoeren**
   ```sql
   -- Voer valve_configuration_schema.sql uit in Supabase
   ```

2. **Bestaande Interface Testen**
   - Start development server: `npm run dev`
   - Login als admin: vince@admin.com
   - Ga naar Admin Panel → Machines

3. **Eerste Configuratie**
   - Selecteer een machine
   - Klik "Ventielen Configureren"
   - Voeg eerste ventiel toe

## Technische Details

### URL Parameter Workaround
Het systeem gebruikt URL parameters voor admin verificatie:
```
/admin/machines/[id]/ventielen?verified=true&email=vince@admin.com
```

### Row Level Security
- Admins: volledige CRUD toegang
- Users: alleen lezen toegang
- Email-based admin detectie (emails met "admin")

### TypeScript Interfaces
Alle nieuwe componenten hebben proper TypeScript types gedefinieerd voor type safety.

## Uitbreidingsmogelijkheden

1. **QR Code Integratie**
   - QR codes kunnen leiden naar ventiel overzicht
   - Machine-specifieke slangkoppeling instructies

2. **Visual Diagrams**
   - SVG/Canvas diagrammen van ventielen
   - Interactieve slangkoppeling visualisatie

3. **Templates Systeem**
   - Standaard configuraties per machine type
   - Import/export functionaliteit

4. **Mobile Optimalisatie**
   - Responsive design voor tablet/phone gebruik
   - Offline capabilities voor veld gebruik

## Support & Contact

Voor vragen over de ventielenconfiguratie:
- Technische issues: Check console logs
- Database problemen: Supabase dashboard
- Feature requests: Contact ontwikkelteam

---

*Laatste update: December 2024* 