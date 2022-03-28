#!/usr/bin/env python3
import re
import cgi
import os
import datetime
import json

data_dir = '/var/lib/ispindel'


form = cgi.FieldStorage()
device = form.getvalue('device')
since_str = form.getvalue('since')
until_str = form.getvalue('until')
columns_str = form.getvalue('columns')

#until_str="2030-01-01T01:01:01"
#since_str="2020-01-01T01:01:01"
#device="iSpindel000"
#columns_str="date,gravity,temperature"

if since_str is not None:
    since = datetime.datetime.strptime(since_str, "%Y-%m-%dT%H:%M:%S")
else:
    since = None

if until_str is not None:
    until = datetime.datetime.strptime(until_str, "%Y-%m-%dT%H:%M:%S")
else:
    until = None


columns = columns_str.rstrip().split(",")


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

parsed_header = False

report_columns = [ ]
column_names = { }
report_data = [ ]
with open(device_path, 'r') as fd:
    while fd:
        line = fd.readline()
        if line == None or line == "":
            break
        line = line.rstrip().split(",")
        if not parsed_header:
            i = 0
            for column in line:
                column_names[i] = column
                if column in columns:
                    report_columns.append(i)
                i += 1
            parsed_header = True
#            print("report columns: "+str(report_columns))

        try:
            time = datetime.datetime.strptime(line[0], "%Y-%m-%dT%H:%M:%S")
        except:
            continue

        if ((since is not None and (time < since)) or (until is not None and (time > until))):
            continue

#        print("l: "+str(line))
        report_line = { }
        i = 0
        for column in line:
            if i in report_columns:
#                print("reporting column "+str(i)+": "+str(column))
                report_line[column_names[i]] = column
            i += 1

        report_data.append(report_line)


print(json.dumps(report_data, default=json_serializer))
