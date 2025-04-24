from flask import Flask, jsonify
from flask_cors import CORS
import requests
import time
import json
import socket
import logging
from datetime import datetime
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Update CORS configuration to be more permissive
CORS(app, resources={r"/*": {
    "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Accept"]
}})

# Pico W configuration
PICO_IP = "172.20.10.5"  # Update with your Pico W's IP
PICO_PORT = 80
MAX_RETRIES = 3
TIMEOUT = 5  # seconds

class SystemType(Enum):
    SINGLE = 'single'
    DOUBLE = 'double'
    LEAK = 'leak'

class HoseType(Enum):
    SUPPLY = 'supply'
    RETURN = 'return'
    LEAK = 'leak'

# Store connection history and system state
connection_history = []
current_config = None
system_type = SystemType.SINGLE
connected_hoses = {
    'supply': {'connected': False, 'position': 'left'},
    'return': {'connected': False, 'position': 'right'},
    'leak': {'connected': False, 'position': 'leak'}
}

# Tag information database (simulated)
TAG_DATABASE = {
    'SUPPLY_LEFT': {
        'type': 'Aanvoerslang',
        'function': 'Hydraulische olie naar werktuig',
        'connection': 'Ventiel A (links)',
        'color': 'Rood',
        'max_pressure': '300 bar',
        'flow_rate': '60 l/min'
    },
    'RETURN_RIGHT': {
        'type': 'Retourslang',
        'function': 'Olie terug naar tank',
        'connection': 'Ventiel B (rechts)',
        'color': 'Blauw',
        'max_pressure': '300 bar',
        'flow_rate': '60 l/min'
    },
    'LEAK': {
        'type': 'Lekleiding',
        'function': 'Afvoer lekkage-olie',
        'connection': 'Ventiel C (lekaansluiting)',
        'color': 'Geel',
        'max_pressure': '10 bar',
        'flow_rate': '5 l/min'
    }
}

@app.route('/')
def index():
    logger.info("Root route accessed")
    return jsonify({
        "status": "ok",
        "message": "Flask server is running",
        "endpoints": {
            "/api/nfc": "Get NFC status",
            "/config": "Get configuration"
        }
    })

def connect_to_pico():
    """Attempt to connect to Pico W with retries"""
    for attempt in range(MAX_RETRIES):
        try:
            logger.info(f"Poging {attempt + 1} om verbinding te maken met Pico W op {PICO_IP}:{PICO_PORT}")
            response = requests.get(f"http://{PICO_IP}:{PICO_PORT}/api/nfc", timeout=TIMEOUT)
            response.raise_for_status()
            
            # Log de ruwe response
            logger.info(f"Pico W response: {response.text}")
            
            data = response.json()
            logger.info(f"Pico W JSON data: {data}")
            
            # Controleer of de response de verwachte velden bevat
            if not isinstance(data, dict):
                logger.error(f"Ongeldige response vorm: {type(data)}")
                continue
                
            if 'tag_detected' not in data:
                logger.error("Response mist 'tag_detected' veld")
                continue
                
            # Als we hier komen, hebben we een geldige response
            return {
                "tag_detected": data.get('tag_detected', False),
                "position": "unknown",  # Pico W stuurt dit niet
                "timestamp": data.get('timestamp'),
                "error": None
            }
            
        except requests.exceptions.Timeout:
            logger.warning(f"Timeout bij verbinding met Pico W (poging {attempt + 1})")
            if attempt < MAX_RETRIES - 1:
                time.sleep(1)
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Verbindingsfout met Pico W: {str(e)}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(1)
        except json.JSONDecodeError as e:
            logger.error(f"Ongeldige JSON response: {str(e)}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(1)
        except Exception as e:
            logger.error(f"Onverwachte fout: {str(e)}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(1)
    
    return {
        "tag_detected": False,
        "position": None,
        "timestamp": None,
        "error": "Kon geen verbinding maken met Pico W of geen geldige response ontvangen"
    }

@app.route('/api/nfc', methods=['GET'])
def get_nfc_status():
    logger.info("NFC status verzoek ontvangen")
    try:
        result = connect_to_pico()
        logger.info(f"Retourneren NFC status: {result}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Fout bij verwerken NFC status: {str(e)}")
        return jsonify({
            "tag_detected": False,
            "position": None,
            "timestamp": None,
            "error": f"Fout bij ophalen NFC status: {str(e)}"
        }), 500

def validate_connection(hose_type: str, position: str) -> tuple[bool, str]:
    """Validate hose connection based on system type and position"""
    if system_type == SystemType.SINGLE:
        if hose_type == HoseType.SUPPLY.value and position != 'left':
            return False, "Bij enkelwerkend systeem moet de aanvoer links worden aangesloten"
        if hose_type == HoseType.RETURN.value and position != 'right':
            return False, "Bij enkelwerkend systeem moet de retour rechts worden aangesloten"
    elif system_type == SystemType.LEAK:
        if hose_type == HoseType.LEAK.value and position != 'leak':
            return False, "Le kleiding mag alleen op de specifieke lekaansluiting worden aangesloten"
    
    return True, ""

def get_tag_info(tag_id: str) -> dict:
    """Get information about a tag from the database"""
    return TAG_DATABASE.get(tag_id, {
        'type': 'Onbekend',
        'function': 'Onbekend',
        'connection': 'Onbekend',
        'color': 'Onbekend',
        'max_pressure': 'Onbekend',
        'flow_rate': 'Onbekend'
    })

def get_system_recommendations() -> dict:
    """Get system recommendations based on connected hoses"""
    warnings = []
    
    # Check for required hoses
    if not connected_hoses['supply']['connected']:
        warnings.append("Waarschuwing: Aanvoerslang is niet aangesloten")
    if not connected_hoses['return']['connected']:
        warnings.append("Waarschuwing: Retourslang is niet aangesloten")
    
    # Determine system type and requirements
    if connected_hoses['leak']['connected']:
        system_type = "Systeem met lekleiding"
        required_hoses = 3
        max_pressure = "300 bar"
        required_flow = "60 l/min"
    elif connected_hoses['supply']['connected'] and connected_hoses['return']['connected']:
        system_type = "Dubbelwerkend systeem"
        required_hoses = 2
        max_pressure = "300 bar"
        required_flow = "60 l/min"
    else:
        system_type = "Enkelwerkend systeem"
        required_hoses = 2
        max_pressure = "300 bar"
        required_flow = "60 l/min"
    
    return {
        "systemType": system_type,
        "requiredHoses": required_hoses,
        "maxPressure": max_pressure,
        "requiredFlow": required_flow,
        "warnings": warnings
    }

def update_configuration():
    global current_config
    # Get system recommendations
    recommendations = get_system_recommendations()
    
    # Update configuration based on system type
    if system_type == SystemType.SINGLE:
        current_config = {
            "pressure": 250,  # bar
            "flowRate": 60,   # l/min
            "temperature": 40, # °C
            "maxPressure": 300, # bar
            "systemType": "single",
            "connections": connected_hoses,
            "recommendations": recommendations
        }
    elif system_type == SystemType.DOUBLE:
        current_config = {
            "pressure": 300,  # bar
            "flowRate": 80,   # l/min
            "temperature": 45, # °C
            "maxPressure": 350, # bar
            "systemType": "double",
            "connections": connected_hoses,
            "recommendations": recommendations
        }
    else:  # LEAK system
        current_config = {
            "pressure": 200,  # bar
            "flowRate": 50,   # l/min
            "temperature": 35, # °C
            "maxPressure": 250, # bar
            "systemType": "leak",
            "connections": connected_hoses,
            "recommendations": recommendations
        }

@app.route('/config', methods=['GET'])
def get_config():
    try:
        logger.info("Received config request")
        if not current_config:
            update_configuration()
            
        return jsonify(current_config)
    except Exception as e:
        logger.error(f"Error getting config: {str(e)}")
        return jsonify({
            "error": str(e),
            "details": str(e)
        })

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET')
    return response

if __name__ == '__main__':
    logger.info("Starting Flask server...")
    # Update host to ensure it's accessible from other devices
    app.run(host='0.0.0.0', port=5000, debug=True) 