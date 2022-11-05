module.exports = function (RED) {
    function PolkadotApiInfoNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.client = RED.nodes.getNode(config.client);
        node.on('input', async function (msg) {
            node.status({fill: "yellow", shape: "dot", text: "connecting"});
            const client = await node.client.connect();
            if (client == null) {
                node.status({fill: "red", shape: "dot", text: "disconnected"});
            } else {
                const api = client.api
                node.status({fill: "green", shape: "dot", text: "connected"});
                try {
                    // Retrieve timestamp
                    const [now] = await Promise.all([
                        api.query.timestamp.now(),
                    ]);
                    msg.payload = {
                        timestamp: parseInt(now),
                        endpoint: client.endpoint,
                        chain: client.chain,
                        runtime: client.runtime,
                        decimals: client.decimals,
                        symbol: client.symbol,
                    }
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

    RED.nodes.registerType("chain info", PolkadotApiInfoNode);
}
