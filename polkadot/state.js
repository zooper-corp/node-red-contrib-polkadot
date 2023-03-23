module.exports = function (RED) {
    function PolkadotApiStateNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.client = RED.nodes.getNode(config.client);
        node.on('input', async function (msg) {

            // Migration of flows from 0.0.11 and older version required.
            // If query type is missing in configuration must be set to historic default
            if(config.qtype == undefined){
                config.qtype="query";
                node.warn('Query Type missing, using defaulting to "query"')
            }

            node.status({fill: "yellow", shape: "dot", text: "connecting"});
            const client = await node.client.connect();
            if (client == null) {
                node.status({fill: "red", shape: "dot", text: "disconnected"});
            } else {

                const api = client.api
                const method = "method" in msg ? msg.method : config.method;
                const qtype = "qtype" in msg ? msg.qtype : config.qtype;

                node.status({fill: "green", shape: "dot", text: "connected"});
                try {
                    // Check if message was received as expected
                    if (qtype === "$") throw "msg.qtype was undefined";
                    if (method === "") throw "msg.method was undefined";

                    // Exec
                    const [result] = await Promise.all([
                        eval(`api.${qtype}.${method}`),
                    ]);
                    msg.payload = JSON.parse(JSON.stringify(result));
                    // Done
                    node.send(msg);
                } catch (e) {
                    node.warn(e)
                    node.status({fill: "red", shape: "dot", text: "error"});
                } finally {
                    node.status({fill: "grey", shape: "dot", text: "idle"});
                }
            }
        });
    }

    RED.nodes.registerType("query state", PolkadotApiStateNode);
}
