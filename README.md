# ioBroker_device_watchdog
#### Javascript for ioBroker to watch devices if there are alive
The Script generates states with arrays and counts of devices which are offline, using batteries, total devices of these and how much the signal strength is.
In the first place it's meant for zigbee devices which are connected with the Zigbee Adapter and works perfectly with it.
All other Devices (currently Ble, MQTT Xiaomi Antennas) are in beta.
The Script can have bugs and isn't perfect. So feel free to open an issue if you found something or if you've an improvement suggestion.

## Changelog:
Version 0.0.2:
- added version number
- changed Scriptname "Zigbee Watchdog" to "Device Watchdog"
- changed the script to get states from ble adapter and mqtt xiaomi antennas too
- added function to get messages in telegram, pushover and Jarvis Notifications
- added shedule to send three days per week a notification with low battery devices
- cleaned up the script
- added comments
