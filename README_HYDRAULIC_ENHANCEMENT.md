# Hydraulic System Enhancement - Mechielsen Webapp

## 🚀 Nieuwe Features

### Multi-Machine Attachment Support
- **Attachments kunnen nu aan meerdere machines gekoppeld worden**
- Verbeterde flexibiliteit in machine-attachment relaties
- Automatische compatibiliteitscontrole tussen machines en attachments

### Visuele Hydraulische Inputs
- **Kleurgecodeerde hydraulische inputs** voor machines en attachments
- **Visuele rondjes** met kleurcodes voor snelle herkenning
- Standaard kleuren: Rood (hoofdfunctie), Blauw (hulpfunctie), Geel, Groen, etc.

### Slangen Configuratie
- **Kleurgecodeerde slangen** voor elk attachment
- Visuele weergave van slangkoppelingen
- Functiebeschrijvingen en labels per slang

## 🎨 Kleurcodes

| Kleur  | Betekenis              | Typisch Gebruik         |
|--------|------------------------|-------------------------|
| 🔴 Rood  | Hoofdfunctie/Heffen    | Primaire hydrauliek     |
| 🔵 Blauw | Hulpfunctie/Kantelen   | Secundaire hydrauliek   |
| 🟡 Geel  | Extra functie          | Optionele functies      |
| 🟢 Groen | Optionele functie      | Hulpfuncties           |
| ⚫ Zwart | Retour/Tank            | Retourlijnen           |
| ⚪ Wit   | Neutraal               | Neutrale lijnen        |
| 🟠 Oranje| Waarschuwing           | Kritieke verbindingen  |
| 🟣 Paars | Speciale functie       | Speciale toepassingen  |

## 📁 Nieuwe Database Tabellen

### `attachment_machines`
- **Many-to-many** relatie tussen attachments en machines
- Maakt meerdere machine-koppelingen mogelijk

### `attachment_slangen`
- Slang configuratie per attachment
- Kleurcode, nummer, label en functiebeschrijving

### `machine_hydraulic_inputs`
- Hydraulische input configuratie per machine
- Druk- en debietspecificaties per input
- Kleurcode en functiebeschrijving

## 🛠 Setup Instructies

### 1. Database Setup
Voer het SQL script uit in je Supabase database:

```sql
-- Voer het bestand uit: database_hydraulic_enhancement.sql
```

**Let op:** Dit script verwijdert de oude `machine_id` kolom uit de `attachments` tabel en maakt nieuwe relatie-tabellen aan.

### 2. Bestaande Data Migratie
Als je bestaande attachments hebt die gekoppeld zijn aan machines:

```sql
-- Backup van bestaande koppelingen (voor je het script uitvoert)
SELECT id, naam, machine_id FROM attachments WHERE machine_id IS NOT NULL;

-- Na het uitvoeren van het script, herstel koppelingen:
-- INSERT INTO attachment_machines (attachment_id, machine_id)
-- SELECT id, machine_id FROM backup_data;
```

### 3. Admin Interface
- **Machines Beheren**: Configureer hydraulische inputs met kleuren
- **Attachments Beheren**: Koppel aan meerdere machines, configureer slangen
- **Visuele Feedback**: Kleurcirkels tonen hydraulische configuratie

## 🎯 Gebruikershandleiding

### Machine Configuratie
1. Ga naar **Admin** → **Machines Beheren**
2. Klik op **Configureren** bij Hydraulische Inputs
3. Voeg inputs toe met kleurcodes en specificaties
4. Automatische standaard inputs bij nieuwe machines

### Attachment Configuratie
1. Ga naar **Admin** → **Attachments Beheren**
2. Selecteer meerdere machines bij het toevoegen
3. Klik op **Beheren** bij Slangen Configuratie
4. Configureer slangen met passende kleuren

### Kleurmatching
- **Zorg dat attachment slangkleuren overeenkomen met machine input kleuren**
- Rood attachment slang → Rood machine input
- Blauw attachment slang → Blauw machine input
- Etc.

## 🔍 Compatibiliteitscontrole

Het systeem controleert automatisch:
- **Drukcompatibiliteit**: Attachment druk ≤ Machine druk
- **Debietcompatibiliteit**: Attachment debiet ≤ Machine debiet
- **Kleurmatching**: Visuele verificatie van juiste koppelingen

## 📊 Nieuwe Database Views

### `attachment_machine_details`
```sql
SELECT * FROM attachment_machine_details;
-- Toont alle attachment-machine koppelingen met details
```

### `hydraulic_compatibility`
```sql
SELECT * FROM hydraulic_compatibility;
-- Toont compatibiliteitsstatus van alle koppelingen
```

## 🎨 UI Verbeteringen

### Visuele Elementen
- **Kleurcirkels** (8x8px) voor compacte weergave
- **Hover effects** voor betere UX
- **Responsive grid** voor verschillende schermformaten

### Navigation
- **Verbeterde admin navigatie** tussen machines/attachments/users
- **Consistente URL parameters** voor admin verificatie
- **Loading states** en **error handling**

## 🔧 Technische Details

### Component Architectuur
- `MachinesAdmin`: Hydraulische input management
- `AttachmentsAdmin`: Multi-machine koppeling + slangen
- `VentielenConfig`: Ongewijzigd (bestaande functionaliteit)
- `SlangkoppelingConfig`: Ongewijzigd (bestaande functionaliteit)

### TypeScript Interfaces
```typescript
interface HydraulicInput {
  id: string;
  machine_id: string;
  input_nummer: number;
  input_kleur: string;
  input_label?: string;
  functie_beschrijving?: string;
  volgorde: number;
  druk_rating?: number;
  debiet_rating?: number;
}

interface AttachmentSlang {
  id: string;
  attachment_id: string;
  slang_nummer: number;
  slang_kleur: string;
  slang_label?: string;
  functie_beschrijving?: string;
  volgorde: number;
}
```

## 🚨 Belangrijke Opmerkingen

1. **Database Backup**: Maak altijd een backup voordat je het SQL script uitvoert
2. **Testing**: Test grondig in development voor productie deployment
3. **Kleurcode Standaardisatie**: Train gebruikers in de standaard kleurcodes
4. **Compatibiliteit**: Controleer hydraulische specificaties bij elke koppeling

## 🔮 Toekomstige Uitbreidingen

- **Automatische slang mapping** gebaseerd op kleuren
- **3D visualisatie** van hydraulische verbindingen
- **Configuratie templates** voor standaard setups
- **Export functionaliteit** voor technische documentatie
- **Mobile app** voor veldtechnici

## 📞 Support

Voor vragen of problemen:
- Check de console logs voor foutmeldingen
- Controleer database permissions voor nieuwe tabellen
- Verify admin access rechten

---

**Status**: ✅ Geïmplementeerd en getested  
**Versie**: 1.0  
**Datum**: December 2024 