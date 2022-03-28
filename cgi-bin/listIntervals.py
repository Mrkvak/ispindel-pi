#!/usr/bin/env python3
import re
import cgi
import os
import datetime
import json

data_dir = '/var/lib/ispindel'


form = cgi.FieldStorage()
device = form.getvalue('device')
#device = "iSpindel000"
#device = "test"

print("Status: 200")
print("Content-Type: application/json")
print("")

device = re.sub('[/,\\><:"|?*,]', '_', device)

device_path = os.path.join(data_dir, device + ".csv")

last_time = None

intervals = []


def json_serializer(obj):
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    raise TypeError ("Type %s not serializable" % type(obj))

first_time = None
with open(device_path, 'r') as fd:
    while fd:
        line = fd.readline()
        if line == None or line == "":
            break
        line = line.rstrip().split(",")
        try:
            time = datetime.datetime.strptime(line[0], "%Y-%m-%dT%H:%M:%S")
        except:
            continue
        interval = line[9]
        
        if first_time is None:
            first_time = time

        if last_time is None:
            last_time = time
            interval_start = time
            continue

        if (time-last_time).total_seconds() > 10 * float(interval):
            interval_end = time
            intvl = { "start": interval_start, "end": interval_end}
            intervals.append(intvl)
            interval_start = time

        
        last_time = time

#interval_end = last_time

#intvl = { "start": interval_start, "end": interval_end}
intvl = { "start": interval_start}

intervals.append(intvl)
intvl = { "start": first_time}
#intvl = { "start": first_time, "end": interval_end}}
if intvl not in intervals:
    intervals.append(intvl)


print(json.dumps(intervals, default=json_serializer))
