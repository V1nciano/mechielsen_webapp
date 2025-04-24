# Mechielsen Hydraulic Hose Connection Guide

This application helps guide users through connecting hydraulic hoses using NFC tags and a Raspberry Pi Pico W with PN532 NFC reader.

## Setup

### Prerequisites
- Node.js and npm
- Python 3.8+
- Raspberry Pi Pico W with PN532 NFC reader
- NFC tags for hydraulic hoses

### Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the Python server:
```bash
python server.py
```

4. Start the Next.js development server:
```bash
npm run dev
```

## Usage

1. Connect to the web application on your phone
2. Follow the on-screen instructions to scan NFC tags
3. View connection points and configuration settings
4. Complete all hose connections as guided

## Architecture

- Frontend: Next.js web application
- Backend: Flask server
- Hardware: Raspberry Pi Pico W with PN532 NFC reader

## API Endpoints

- `/nfc-status`: Check if an NFC tag is detected
- `/config`: Get configuration settings for the current setup
