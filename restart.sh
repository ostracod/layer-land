#!/bin/sh

echo "Restarting..."

pkill -f "node layerLand.js"
sleep 1
NODE_ENV="production" nohup node layerLand.js > serverMessages.txt 2>&1 &


