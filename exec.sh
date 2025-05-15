#!/usr/bin/env bash
docker build -t a0-chatbot .
docker run --init -p 3000:3000 -it a0-chatbot
