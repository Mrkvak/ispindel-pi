#!/usr/bin/env python3

port = 8081
host = '0.0.0.0'


token = 'nbusr123'

interval = 300

data_dir = '/var/lib/ispindel'

columns = ["date", "name", "ID", "gravity", "temperature", "temp_units", "angle", "battery", "RSSI", "interval"]

buffer_size = 1024
#{"name":"iSpindel000","ID":11417679,"token":"nbusr123","angle":44.36832,"temperature":19.875,"temp_units":"C","battery":4.087591,"gravity":1.03784,"interval":300,"RSSI":-70}

import socket
import json
import threading
import os
import re
import datetime

def rxcli(client, addr):
    data = ""
    while 1:
        try:
            l = client.recv(buffer_size)
            if not l:
                break
        except:
             break

       
        data += str(l.decode('utf-8').rstrip())
   
        print("Client "+str(addr)+" RX: "+str(l))

        try:
            j = json.loads(data)
        except Exception as e:
            print("Cannot parse JSON, trying to read more...")
#            print(e)
#            print("Full data was: '"+data+"'")
            continue

        if j["token"] != token:
            print("Token mismatch for client "+str(addr));
            return

        j["name"] = re.sub('[/,\\><:"|?*,]', '_', j["name"])
        if j["interval"] != interval:
            print("Current interval is "+str(j["interval"])+", reconfiguring to: "+str(interval))
            client.send(('{"interval": '+str(interval)+'}').encode())

        client.close()
        
        datafile = os.path.join(data_dir, j["name"] + ".csv")
        printHeader = not os.path.exists(datafile)
        
        with open(datafile, "a+") as f:
            if printHeader:
                for column in column:
                    f.write(column)
                    f.write(",")
                f.write("\n")

            for column in columns:
                if column == "date":
                    f.write(datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")+ ",")
                else:
                    f.write(str(j[column])+",")
            f.write("\n")
    


if not os.path.exists(data_dir):
    os.mkdir(data_dir)


srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind((host, port))
srv.listen(5)
while 1:
    print("Waiting for connection on "+host+":"+str(port))
    cli, addr = srv.accept()
    print("Connection from: " + str(addr))
    threading.Thread(target=rxcli, args=(cli, addr,)).start()

