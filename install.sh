#!/bin/bash
sudo cp server.py /usr/local/sbin/ispindel-server.py
sudo cp ispindel.service /etc/systemd/system/

sudo mkdir -p /usr/local/lib/cgi-bin/ispindel
sudo cp cgi-bin/* /usr/local/lib/cgi-bin/ispindel

sudo mkdir -p /var/www/html/ispindel
sudo cp html/* /var/www/html/ispindel

sudo systemctl enable ispindel.service
sudo systemctl start ispindel.service
