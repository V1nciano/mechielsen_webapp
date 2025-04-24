import { NextResponse } from 'next/server';

// Flask server URL - make sure this matches your Flask server's address
const FLASK_SERVER_URL = 'http://127.0.0.1:5000';

export async function GET() {
  try {
    console.log('Attempting to connect to Flask server...');
    
    const response = await fetch(`${FLASK_SERVER_URL}/api/nfc`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout and other fetch options
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
      mode: 'cors',
    });

    if (!response.ok) {
      console.error('Flask server returned error:', response.status);
      return NextResponse.json(
        { 
          error: 'Server error',
          message: 'Fout bij verbinding met server',
          status: response.status 
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    // Check if there's a Pico W connection error
    if (data.connectionStatus === 'disconnected' || data.connectionStatus === 'error') {
      return NextResponse.json({
        error: data.error || 'Pico W error',
        message: data.message || 'Fout bij verbinding met Pico W',
        tag_detected: false,
        connectionStatus: 'error',
        details: data.details || 'Geen verbinding met Pico W mogelijk'
      }, { status: 503 });
    }
    
    return NextResponse.json({
      tag_detected: data.tag_detected || false,
      message: data.message || 'NFC status opgehaald',
      connectionStatus: data.connectionStatus || 'connected',
      timestamp: data.timestamp,
      details: data.details || 'Success'
    });
  } catch (error) {
    console.error('Detailed error:', error);
    
    // Handle specific error types
    if (error instanceof TypeError && error.message.includes('fetch failed')) {
      return NextResponse.json(
        { 
          error: 'Connection error',
          message: 'Kan geen verbinding maken met server',
          details: 'Server is mogelijk niet gestart of niet bereikbaar',
          tag_detected: false,
          connectionStatus: 'error'
        },
        { status: 503 }
      );
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { 
          error: 'Timeout',
          message: 'Verbinding met server verlopen',
          details: 'Server reageert niet binnen de gestelde tijd',
          tag_detected: false,
          connectionStatus: 'timeout'
        },
        { status: 504 }
      );
    }

    // Generic error response
    return NextResponse.json(
      { 
        error: 'Unknown error',
        message: 'Onbekende fout opgetreden',
        details: error instanceof Error ? error.message : 'Unknown error',
        tag_detected: false,
        connectionStatus: 'error'
      },
      { status: 500 }
    );
  }
} 