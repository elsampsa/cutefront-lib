#!/bin/bash
echo "getting bootstrap 5.2.3"
curl https://github.com/twbs/bootstrap/releases/download/v5.2.3/bootstrap-5.2.3-dist.zip -o bootstrap-5.2.3-dist.zip
unzip bootstrap-5.2.3-dist.zip
echo "getting bootstrap fonts"
curl https://raw.githubusercontent.com/twbs/icons/main/font/bootstrap-icons.min.css -o bootstrap-5.2.3-dist/css/bootstrap-icons.min.css
echo
echo You may now remove "bootstrap-5.2.3-dist.zip"
echo
