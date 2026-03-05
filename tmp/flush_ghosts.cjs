const mqtt = require('mqtt');

const BROKER = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_FILTER = 'vo/room/+/+/pres';

const client = mqtt.connect(BROKER);

console.log("Connecting to EMQX broker...");

client.on('connect', () => {
    console.log("Connected. Subscribing to " + TOPIC_FILTER + " to find ghosts...");
    client.subscribe(TOPIC_FILTER);

    // Give it some time to collect all retained messages
    setTimeout(() => {
        console.log("Flush complete. Closing connection.");
        process.exit(0);
    }, 10000);
});

client.on('message', (topic, message) => {
    const msgStr = message.toString();

    if (!msgStr) return; // Already cleared

    try {
        const payload = JSON.parse(msgStr);
        const isNewFormat = payload.sessionStartTime && payload.lastSeen;

        // If it's the old format (from before the update), flush it
        if (!isNewFormat) {
            console.log(`[FLUSH] Old session found at ${topic}. Clearing retained message...`);
            client.publish(topic, '', { retain: true, qos: 1 });
        } else {
            // Even if it is new format, if it's super old (e.g. 1 hour old), flush it
            const age = Date.now() - payload.lastSeen;
            if (age > 3600000) { // 1 hour
                console.log(`[FLUSH] Stale session (1h+) found at ${topic}. Clearing...`);
                client.publish(topic, '', { retain: true, qos: 1 });
            } else {
                console.log(`[KEEP] Active/Recent user found at ${topic}`);
            }
        }
    } catch (e) {
        // Not JSON? Clear it just in case it's garbage
        console.log(`[FLUSH] Invalid data at ${topic}. Clearing...`);
        client.publish(topic, '', { retain: true, qos: 1 });
    }
});
