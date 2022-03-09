# ioBroker_device_watchdog
#### Javascript for ioBroker to watch devices if there are alive
The Script generates states with arrays and counts of devices which are offline, using batteries, total devices of these and how much the signal strength is.
It's based on the script from user JohannesA in the forum of ioBroker. You can read the topic here:
https://forum.iobroker.net/topic/52108/zigbee-geräte-überwachen

In the first place it's meant for zigbee devices which are connected with the Zigbee Adapter and works perfectly with it.
All other Devices (currently Ble, MQTT Xiaomi Antennas) are in beta.
The Script can have bugs and isn't perfect. If you found something or if you've an improvement suggestion, feel free to open an issue or answer the topic in the forum.

## Changelog:
Version 0.0.3:
- changed that no message will be send if the state is changing that no devices are unreachable

Version 0.0.3:
- added rssi to percent calculation
- added more async declarations
- changed infotext
- made some small corrections of the code
- added option to choose the link quality

Version 0.0.2:
- added version number
- changed Scriptname "Zigbee Watchdog" to "Device Watchdog"
- changed the script to get states from ble adapter and mqtt xiaomi antennas too
- added function to get messages in telegram, pushover and Jarvis Notifications
- added shedule to send three days per week a notification with low battery devices
- added function to choose which devices should be watch
- cleaned up the script
- added comments
