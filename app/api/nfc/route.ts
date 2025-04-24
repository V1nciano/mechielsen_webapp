import { NextResponse } from 'next/server';

// Flask server URL - make sure this matches your Flask server's address
const FLASK_SERVER_URL = 'http://localhost:5000';
const TIMEOUT_DURATION = 10000; // 10 seconds timeout

// Valid tag IDs for different hose positions
const VALID_TAGS = {
  'SUPPLY_LEFT': 'Aanvoerslang links',
  'RETURN_RIGHT': 'Retourslang rechts',
  'LEAK': 'Lekleiding'
};

// Check if Flask server is running
async function checkServerStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

    const response = await fetch(`${FLASK_SERVER_URL}/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('Server status check error:', error);
    return false;
  }
}

export async function GET() {
  try {
    // First check if server is running
    const serverRunning = await checkServerStatus();
    if (!serverRunning) {
      return NextResponse.json({
        error: 'Server offline',
        message: 'Flask server is niet gestart',
        tag_detected: false,
        connectionStatus: 'server_offline',
        details: 'Start de Flask server en probeer opnieuw'
      }, { status: 503 });
    }

    // Get NFC status from Flask server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

    try {
      const response = await fetch(`${FLASK_SERVER_URL}/api/nfc`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      // Handle Pico W connection issues
      if (data.error) {
        return NextResponse.json({
          error: 'Pico W error',
          message: data.error,
          tag_detected: false,
          connectionStatus: 'error',
          details: 'Controleer de verbinding met de Pico W'
        }, { status: 503 });
      }

      // Check if tag is detected and valid
      if (data.tag_detected && data.last_tag_id) {
        const tagId = data.last_tag_id.toUpperCase();
        const hoseType = VALID_TAGS[tagId as keyof typeof VALID_TAGS];

        if (hoseType) {
          return NextResponse.json({
            tag_detected: true,
            message: 'Slang correct aangesloten',
            connectionStatus: 'connected',
            details: hoseType,
            position: data.position
          });
        } else {
          return NextResponse.json({
            tag_detected: true,
            message: 'Slang niet correct aangesloten',
            connectionStatus: 'connected',
            details: 'Onbekende slang of verkeerde positie',
            position: data.position
          });
        }
      }

      // No tag detected
      return NextResponse.json({
        tag_detected: false,
        message: 'Geen slang gedetecteerd',
        connectionStatus: 'connected',
        details: 'Houd de slang bij de NFC lezer',
        position: null
      });

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }

  } catch (error) {
    console.error('NFC API error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({
          error: 'Timeout',
          message: 'Server reageert niet',
          tag_detected: false,
          connectionStatus: 'timeout',
          details: `Server reageert niet binnen ${TIMEOUT_DURATION/1000} seconden`
        }, { status: 504 });
      }

      if (error.message.includes('fetch failed')) {
        return NextResponse.json({
          error: 'Connection failed',
          message: 'Kan geen verbinding maken met server',
          tag_detected: false,
          connectionStatus: 'error',
          details: 'Controleer of de Flask server draait op ' + FLASK_SERVER_URL
        }, { status: 503 });
      }
    }

    return NextResponse.json({
      error: 'Unknown error',
      message: 'Onbekende fout opgetreden',
      tag_detected: false,
      connectionStatus: 'error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 