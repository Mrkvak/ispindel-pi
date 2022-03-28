#!/usr/bin/env python3
print("Status: 200")
print("Content-Type: application/json")
print("")
data_dir = '/var/lib/ispindel'

import os
#import cgi
import json

data_files = []
for f in os.listdir(data_dir):
    device_path = os.path.join(data_dir, f)
    if not os.path.isfile(device_path):
        continue
    device = { }
    device['name'] = str(os.path.splitext(f)[0])
    
    infile = open(device_path, 'rb')
    header = infile.readline().decode('utf-8').rstrip()
    first_record = infile.readline().decode('utf-8').rstrip()

    infile.seek(-2, os.SEEK_END)
    while infile.read(1) != b'\n':
        infile.seek(-2, os.SEEK_CUR)
    last_record = infile.readline().decode('utf-8').rstrip()


    device['first_record'] = first_record.split(",")[0]
    device['last_record'] = last_record.split(",")[0]
    device['reported_data'] = list(filter(None, header.split(",")))

    data_files.append(device)

print(json.dumps(data_files))
