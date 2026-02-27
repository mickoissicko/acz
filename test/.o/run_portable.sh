#!/bin/bash
export STUMP_CONFIG_DIR="./config"
export STUMP_CLIENT_DIR="./client"
export STUMP_DB_PATH="./config" 
export STUMP_PORT=10801
chmod +x ./stump_server
./stump_server