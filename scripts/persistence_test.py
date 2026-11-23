#!/usr/bin/env python3
"""Create a vehicle probe, restart the backend, then verify MySQL persistence."""
import argparse
import json
from pathlib import Path
import uuid
from urllib import request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('phase', choices=['prepare', 'verify'])
parser.add_argument('--url', default='http://localhost:9001/api')
parser.add_argument('--state', required=True, type=Path)
args = parser.parse_args()
base = args.url.rstrip('/')


def api(method, path, data=None):
    body = None if data is None else json.dumps(data).encode()
    req = request.Request(base + path, data=body,
                          headers={'Content-Type': 'application/json'}, method=method)
    with request.urlopen(req, timeout=20) as response:
        raw = response.read()
        return json.loads(raw) if raw else None


if args.phase == 'prepare':
    if args.state.exists():
        raise SystemExit('State file already exists; verify or clean up that probe first.')
    token = 'PERSIST-' + uuid.uuid4().hex[:12].upper()
    vehicle = api('POST', '/vehicles', dict(vehicleNumber=token, vehicleType='CAR',
        brand='Persistence', model='Restart probe', fuelType='PETROL', status='AVAILABLE'))
    args.state.write_text(json.dumps({'vehicle': vehicle}))
    print('PREPARED: restart the backend using the same MySQL database.')
else:
    vehicle = json.loads(args.state.read_text())['vehicle']
    loaded = api('GET', f'/vehicles/{vehicle["id"]}')
    assert loaded['vehicleNumber'] == vehicle['vehicleNumber']
    api('DELETE', f'/vehicles/{vehicle["id"]}')
    args.state.unlink()
    print('PASS: vehicle data persisted across backend restart; probe cleaned up.')
