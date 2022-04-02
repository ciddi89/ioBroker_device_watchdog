/* 
** Watchdog **
** Skript um Geräte zu Überwachen ob diese noch erreichbar sind und wie der aktuelle Batteriestand ist.
** Github Link: https://github.com/ciddi89/ioBroker_device_watchdog
** ioBroker Topiclink: https://forum.iobroker.net/topic/52108/zigbee-geräte-überwachen
** Thanks to JohannesA for the first work and great idea!
** Last change on 02.04.2022
*/

const watchDogVersion = '0.0.6';

//Hauptpfad wo die Datenpunkte gespeichert werden sollen. Kann bei Bedarf angepasst werden.
const basePath = "0_userdata.0.Datenpunkte.DeviceWatchdog.";

//Für Telegram Benachrichtigung
const sendTelegram = false;                 //Soll per Telegram eine Nachricht gesendet werden? true = Ja / false = Nein
const userTelegram = '';                    //leer lassen falls jeder User eine Nachricht bekommen soll.

//Für Pushover Benachrichtigung
const sendPushover      = true;                 //Soll per Pushover eine Nachricht gesendet werden? true = Ja / false = Nein
const devicePushover    = 'All';
const titelPushover     = 'ioBroker Watchdog';
const pushoverInstanz   = 'pushover.0';         //Welche Instanz soll genutzt werden?

//Für Jarvis Notification
const sendJarvis    = false;                //Soll per Jarvis Notifications eine Nachricht gesendet werden? true = Ja / false = Nein
const titleJarvis   = 'WatchDog-Script'

//Soll eine Meldung erfolgen falls der Batteriestand der Geräte gering ist? Hinweis: Die Meldung kommt 3x in einer Woche als Auflistung!
const sendBatterieMsg = true;

//Soll bei Skript Neustart eine Meldung der Batteriestände gesendet werden?
const sendBatterieMsgAtStart = false;

//Ab wieviel % Restbatterie soll eine Meldung erfolgen?
const batteryWarningMin = 75;

//Soll eine Meldung erfolgen falls die Anzahl der "Offline-Geräte" im Vergleich zur letzten Prüfung höher ist?
const sendOfflineMsg = true;

// "Gerät offline" - Wert in Minuten: Gilt erst, wenn Gerät länger als X Minuten keine Meldung gesendet hat 
const maxMinutes = 300;


//Welche Geräte sollen überwacht werden?
const watchZigbee       = true;     // Zigbee Adapter
const watchBle          = true;     // Ble Adapter z.B. MiFlora Sensoren
const watchMqttXiaomi   = false;    // MQTT Xiaomi Antenna

const trueLinkQuality   = false;    // Soll der Echt-Wert der Linkqualität (0-255 oder RSSI-Wert) verwendet werde? true = Ja / false = Nein


/*****************************************************************
**
** Ab hier bitte nichts mehr ändern! Außer man weiß was man tut!
**
******************************************************************/

//Pfad der einzelenden Datenpunkte
const stateDevicesCount             = basePath + "devices_count_all";
const stateDevicesLinkQuality       = basePath + "devices_link_quality_list";
const stateDevicesOfflineCount      = basePath + "devices_offline_count";
const stateDevicesOffline           = basePath + "devices_offline_list";
const stateDevicesWithBatteryCount  = basePath + "devices_battery_count";
const stateDevicesWithBattery       = basePath + "devices_battery_list";
const stateDevicesInfoList          = basePath + "devices_list_all";
const stateDevicesLastCheck         = basePath + "lastCheck";
const watchdogLog                   = basePath + "watchdogLog";

//Funktion zur Erstellung der Datenpunkte
async function doStates() {

    if (!(await existsStateAsync(stateDevicesCount))) await createStateAsync(stateDevicesCount, 0, { read: true, write: true, desc: "Anzahl Geräte gesamt", name: "Anzahl Geräte gesamt",type: 'number' });
    if (!(await existsStateAsync(stateDevicesLinkQuality))) await createStateAsync(stateDevicesLinkQuality, "", { read: true, write: true, desc: "Liste Geräte Signalstärke", name: "Liste Geräte Signalstärke", type: 'string' });
    if (!(await existsStateAsync(stateDevicesOfflineCount))) await createStateAsync(stateDevicesOfflineCount, 0, { read: true, write: true, desc: "Anzahl Geräte offline", name: "Anzahl Geräte offline",type: 'number' });
    if (!(await existsStateAsync(stateDevicesOffline))) await createStateAsync(stateDevicesOffline, "", { read: true, write: true, desc: "Liste Geräte offline", name: "Liste Geräte offline",type: 'string' });
    if (!(await existsStateAsync(stateDevicesWithBattery))) await createStateAsync(stateDevicesWithBattery, "", {read: true, write: true, desc: "Liste Geräte mit Batterie", name: "Liste Geräte mit Batterie", type: 'string'});
    if (!(await existsStateAsync(stateDevicesWithBatteryCount))) await createStateAsync(stateDevicesWithBatteryCount, 0, {read: true, write: true, desc: "Anzahl Geräte mit Batterie", name: "Anzahl Geräte mit Batterie", type: 'number'});
    if (!(await existsStateAsync(stateDevicesInfoList))) await createStateAsync(stateDevicesInfoList, "", {read: true, write: true, desc: "Liste aller Geräte", name: "Liste aller Geräte", type: 'string'}); 
    if (!(await existsStateAsync(stateDevicesLastCheck))) await createStateAsync(stateDevicesLastCheck, "", {read: true, write: true, desc: "Zeitpunkt letzter Überprüfung", name: "Zeitpunkt letzter Überprüfung", type: 'string'});
    if (!(await existsStateAsync(watchdogLog))) await createStateAsync(watchdogLog, "", {read: true, write: true, desc: "Log vom Device Watchdog", name: "Device Watchdog Log", type: 'string'});

}
 
//Die Mainfunction.
async function deviceWatchdog() {
 
    let arrOfflineDevices           = []; //JSON-Info alle offline-Geräte
    let arrLinkQualityDevices       = []; //JSON-Info alle mit LinkQuality
    let arrBatteryPowered           = []; //JSON-Info alle batteriebetriebenen Geräte
    let arrListAllDevices           = []; //JSON-Info Gesamtliste mit Info je Gerät


    const myArrDev              = [];
    const myArrBlacklist        = [];
 
    if (watchZigbee) {
        myArrDev.push({"theSelektor":"zigbee.0.*.link_quality","theName":"common","linkQual":"zigbee","batt":"zigbee"})
    }
    if (watchBle) {
        myArrDev.push({"theSelektor":"ble.0.*.rssi","theName":"common","linkQual":"ble","batt":"none"})
    }
    if (watchMqttXiaomi) {
        myArrDev.push({"theSelektor":"mqtt.0.xiaomiantenna.*.status","theName":"Objectname2Level","linkQual":"none","batt":"none"})
        myArrDev.push({"theSelektor":"mqtt.0.xiaomiantenna.sensors.sensor.*_batt.state","theName":"Objectname1Level","linkQual":"none","batt":"dpvalue"})
    }

    for(let x=0; x<myArrDev.length;x++) {
 
        var device = $(myArrDev[x].theSelektor);
 
        device.each(function (id, i) {
    
            let currDeviceString    = id.slice(0, (id.lastIndexOf('.') + 1) - 1);
            let adapterName         = getObject(currDeviceString)._id[0].toUpperCase() + getObject(currDeviceString)._id.slice(1, (id.indexOf('.') + 1) - 1);

            //hier braucht man eine function, die den hostnamen findet:
            let deviceName;
            if (myArrDev[x].theName=="common")  deviceName=getObject(currDeviceString).common.name
            if (myArrDev[x].theName=="dp") {
                                        let ida=id.split('.');
                                        let mySelect=$(ida[0]+'.'+ida[1]+'.'+ida[2]+'.*');
                                        mySelect.each(function (ad, i) {
                                            if (ad.includes(myArrDev[x].thedpName)) deviceName=getState(ad).val
                                        });
                                        }

            let currRoom = getObject(id, 'rooms').enumNames[0];
            if(typeof currRoom == 'object') currRoom = currRoom.de;
                                        
    
            // 1. Link-Qualität des Gerätes ermitteln
            //---------------------------------------
            let linkQuality;
            if (trueLinkQuality) {
                linkQuality = getState(id).val;
            } 
            else {
                if (getState(id).val < 0) {
                    linkQuality = Math.min(Math.max(2 * (getState(id).val + 100), 0), 100) + "%"; // Linkqualität von RSSI in % umrechnen
                } else {
                    linkQuality = parseFloat((100/255 * getState(id).val).toFixed(0)) + "%"; // Linkqualität in % verwenden
                }
            };

            arrLinkQualityDevices.push({device: deviceName, adapter: adapterName, room: currRoom, link_quality: linkQuality})
    
            // 2. Wann bestand letzter Kontakt zum Gerät
            //------------------------      
            let lastContact = Math.round((new Date() - new Date(getState(id).ts)) / 1000 / 60);
            // 2b. wenn seit X Minuten kein Kontakt mehr besteht, nimm Gerät in Liste auf
            //Rechne auf Tage um, wenn mehr als 48 Stunden seit letztem Kontakt vergangen sind
            let lastContactString=Math.round(lastContact) + " Minuten";
            if (Math.round(lastContact) > 100) {
                lastContactString=Math.round(lastContact/60) + " Stunden";
            } 
            if (Math.round(lastContact/60) > 48) {
                lastContactString=Math.round(lastContact/60/24) + " Tagen";
            } 
            if (lastContact > maxMinutes) {
                arrOfflineDevices.push({device: deviceName, adapter: adapterName, room: currRoom, lastContact: lastContactString});
            }
    
            // 3. Batteriestatus abfragen
            let batteryHealth;
            let currDeviceBatteryString = currDeviceString + ".battery";
            if (existsState(currDeviceBatteryString)) {
                batteryHealth = getState(currDeviceBatteryString).val + "%"; // Batteriestatus in %
                arrBatteryPowered.push({device: deviceName, adapter: adapterName, room: currRoom, battery: batteryHealth});
            } 
            else {
                batteryHealth = "-";
            }
        
            arrListAllDevices.push({device: deviceName, adapter: adapterName, room: currRoom, battery: batteryHealth, lastContact: lastContactString, link_quality: linkQuality});
    
        });
    
    
        // 1b. Zähle, wie viele Geräte existieren
        //---------------------------------------------       
        let deviceCounter = arrLinkQualityDevices.length;
    
        // 2c. Wie viele Geräte sind offline?
        //------------------------   
        let offlineDevicesCount = arrOfflineDevices.length;
    
        // 3c. Wie viele Geräte sind batteriebetrieben?
        //------------------------   
        let batteryPoweredCount = arrBatteryPowered.length;

        // Wenn keine Devices gezählt sind
        let arrOfflineDevicesZero       = [{device: "--keine--", room: "", lastContact: ""}]; //JSON-Info alle offline-Geräte = 0
        let arrLinkQualityDevicesZero   = [{device: "--keine--", room: "", link_quality: ""}]; //JSON-Info alle mit LinkQuality = 0
        let arrBatteryPoweredZero       = [{device: "--keine--", room: "", battery: ""}]; //JSON-Info alle batteriebetriebenen Geräte
        let arrListAllDevicesZero       = [{device: "--keine--", room: "", battery: "", lastContact: "", link_quality: ""}]; //JSON-Info Gesamtliste mit Info je Gerät


        // SETZE STATES
        await setStateAsync(stateDevicesCount, deviceCounter);
        await setStateAsync(stateDevicesOfflineCount, offlineDevicesCount);
        await setStateAsync(stateDevicesWithBatteryCount, batteryPoweredCount);

        if (deviceCounter == 0) {
            await setStateAsync(stateDevicesLinkQuality, JSON.stringify(arrLinkQualityDevicesZero));
            await setStateAsync(stateDevicesInfoList, JSON.stringify(arrListAllDevicesZero));
        } else {
            await setStateAsync(stateDevicesLinkQuality, JSON.stringify(arrLinkQualityDevices));
            await setStateAsync(stateDevicesInfoList, JSON.stringify(arrListAllDevices));
        };

        if (offlineDevicesCount == 0) {
            await setStateAsync(stateDevicesOffline, JSON.stringify(arrOfflineDevicesZero));
        } else {
            await setStateAsync(stateDevicesOffline, JSON.stringify(arrOfflineDevices));
        };

        if (batteryPoweredCount == 0) {
            await setStateAsync(stateDevicesWithBattery, JSON.stringify(arrBatteryPoweredZero));  
        } else {
            await setStateAsync(stateDevicesWithBattery, JSON.stringify(arrBatteryPowered));
        };

        await setStateAsync(stateDevicesLastCheck, [formatDate(new Date(), "DD.MM.YYYY"),' - ',formatDate(new Date(), "hh:mm:ss")].join(''));

        // Sende Benachrichtigungen falls sich die Anzahl der "Offline-Geräte" im Vergleich zur letzten Prüfung erhöht hat.
        if (sendOfflineMsg) {
            let infotext
            let offlineDevicesCountOld = getState(stateDevicesOfflineCount).val;
            if (offlineDevicesCount > offlineDevicesCountOld) {
                if (offlineDevicesCount == 1) {
                    infotext = "Folgendes Gerät ist seit einiger Zeit nicht erreichbar: \n";
                } else if (offlineDevicesCount >= 2) {
                    infotext = "Folgende " + offlineDevicesCount + " Geräte sind seit einiger Zeit nicht erreichbar: \n";
                }
                for (const id of arrOfflineDevices) {
                    infotext = infotext + "\n" + id["device"] + " " + id["room"] + " (" + id["lastContact"] + ")";
                };
                log(infotext);
                await setStateAsync(watchdogLog, infotext);
                if (sendJarvis) {
                await setStateAsync("jarvis.0.addNotification", '{"title":"'+ titleJarvis +' (' + formatDate(new Date(), "DD.MM.YYYY - hh:mm:ss") + ')","message":" ' + offlineDevicesCount + ' Geräte sind nicht erreichbar","display": "drawer"}');
                };
                if (sendPushover) {
                    await pushover("Watchdog Alarm: " + infotext)
                };
                if (sendTelegram) {
                    await telegram("Watchdog Alarm: " + infotext)
                }
            }
        }
}};

//Telegram function
async function telegram (msg) {
    sendTo('telegram', { 
        text: msg,
        user: userTelegram,
        parse_mode: 'HTML'
    })
};

//Pushover function
async function pushover (msg) {
    sendTo(pushoverInstanz, {
        title: titelPushover,
        message: msg,
        device: devicePushover
    })
};

async function checkBatterie () {
    if (sendBatterieMsg) {
        let weakCount = 0;
        let batteryData = JSON.parse(getState(stateDevicesWithBattery).val);
        let infotext = "";
        for (const id of batteryData) {
            let batteryValue = id["battery"].replace("%", "");
            if (batteryValue < batteryWarningMin) {
                infotext = infotext + "\n" + id["device"] + " " + id["room"] + " (" + id["battery"] + ")";
                ++weakCount;
            }
        }

        if (weakCount > 0) {
            log("Batteriezustand: " + infotext);
            await setStateAsync(watchdogLog, infotext);
            if (sendJarvis) {
                await setStateAsync("jarvis.0.addNotification", '{"title":"'+ titleJarvis +' (' + formatDate(new Date(), "DD.MM.YYYY - hh:mm:ss") + ')","message":" ' + weakCount + ' Geräte mit schwacher Batterie","display": "drawer"}'); 
            };
            if (sendPushover) {
                await pushover("Batteriezustand: " + infotext)
            }
            if (sendTelegram) {
                await telegram("Batteriezustand: " + infotext)
            }

        } 
        else {
            await setStateAsync(watchdogLog, "Batterien der Geräte in Ordnung");
        }
    }

};

//Das Skript wird nach jeder vollen Stunde in der 6 minute ausgeführt
schedule("6 */1 * * *", async function () {
    log("Run Device-Watchdog");
    await doStates().then(deviceWatchdog);
});

//Das Skript wird einmal nach Skriptstart ausgeführt
setTimeout (async function () {
    log("Run Device-Watchdog");
    await doStates().then(deviceWatchdog);
    if (sendBatterieMsgAtStart) {
        await checkBatterie()
    }
}, 300);

//Script überprüft an vordefinierten Zeitpunkten den Batteriestand der Geräte und macht entsprechend Meldung, wenn der Batteriestatus unter x% fällt
// Hinweis: 
// Dies passiert 3x pro Woche
if (sendBatterieMsg) {
    schedule('{"time":{"exactTime":true,"start":"12:50"},"period":{"days":1,"dows":"[2,4,6]"}}', async function () {
        await checkBatterie();
    })
}
