#!/usr/bin/env python3
"""Exercise the local vehicle CRUD API; remove all generated test records."""
import argparse
import json
import uuid
from urllib import request, error


def main(base):
    checks = 0
    ids = []
    token = 'CHECK-' + uuid.uuid4().hex[:12].upper()

    def check(condition, message):
        nonlocal checks
        assert condition, message
        checks += 1

    def api(method, path, data=None, expected=200):
        req = request.Request(base + path, method=method,
            data=None if data is None else json.dumps(data).encode(),
            headers={'Accept': 'application/json', 'Content-Type': 'application/json'})
        try:
            response = request.urlopen(req, timeout=20)
        except error.HTTPError as exc:
            response = exc
        with response:
            body = response.read()
            check(response.code == expected, f'{method} {path}: {response.code}: {body[:500]!r}')
            return json.loads(body) if body else None

    try:
        initial = api('GET', '/vehicles?page=0&size=10')
        records = []
        for suffix in ('A', 'B'):
            v = api('POST', '/vehicles', dict(vehicleNumber=token + suffix,
                vehicleType='CAR', brand='Runtime Brand', model='Runtime Model',
                fuelType='PETROL', status='AVAILABLE', seatingCapacity=5), expected=201)
            records.append(v)
            ids.append(v['id'])
        first, second = records
        check(api('GET', f'/vehicles/{first["id"]}')['vehicleNumber'] == first['vehicleNumber'], 'Vehicle read')
        api('POST', '/vehicles', dict(first, vehicleNumber='  ' + first['vehicleNumber'].lower() + '  '), expected=409)
        api('PUT', f'/vehicles/{second["id"]}', dict(second, vehicleNumber=first['vehicleNumber']), expected=409)
        updated = api('PUT', f'/vehicles/{first["id"]}', dict(first, color='Silver'))
        check(updated['color'] == 'Silver', 'Vehicle edit')
        api('POST', '/vehicles', dict(first, vehicleNumber=' '), expected=400)
        api('GET', '/vehicles/9223372036854775807', expected=404)
        api('GET', '/vehicles?page=-1', expected=400)
        page = api('GET', '/vehicles?page=0&size=1')
        check(len(page['content']) == 1 and page['hasNext'], 'Server-side pagination')
        page2 = api('GET', '/vehicles?page=1&size=1')
        check(page2['content'][0]['id'] != page['content'][0]['id'], 'Second page differs')
        check(api('GET', '/vehicles?page=0&size=10')['totalElements'] == initial['totalElements'] + 2, 'Database-backed total')
        api('DELETE', f'/vehicles/{first["id"]}', expected=204)
        ids.remove(first['id'])
        api('GET', f'/vehicles/{first["id"]}', expected=404)
        print(f'PASS: {checks} live API checks for Assignment 1')
    finally:
        for vehicle_id in ids:
            api('DELETE', f'/vehicles/{vehicle_id}', expected=204)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://localhost:9001/api')
    args = parser.parse_args()
    main(args.url.rstrip('/'))
