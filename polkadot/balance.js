module.exports = function (RED) {
    function PolkadotApiBalanceNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        node.client = RED.nodes.getNode(config.client);
        node.on('input', async function (msg) {
            node.status({ fill: "yellow", shape: "dot", text: "connecting" });
            const client = await node.client.connect();
            if (client == null) {
                node.status({ fill: "red", shape: "dot", text: "disconnected" });
            } else {
                const api = client.api
                node.status({ fill: "green", shape: "dot", text: "connected" });
                try {
                    const address = "address" in msg ? msg.address : config.address;
                    // Retrieve balance
                    const [result] = await Promise.all([
                        api.query.system.account(address)
                    ]);
                    node.log(JSON.stringify(result.toJSON()));
                    msg.payload = {
                        symbol: client.symbol,
                        free: client.amountToFloat(result.data.free.toBigInt()),
                        reserved: client.amountToFloat(result.data.reserved.toBigInt()),
                        miscFrozen: client.amountToFloat(result.data.miscFrozen.toBigInt()),
                        feeFrozen: client.amountToFloat(result.data.feeFrozen.toBigInt()),
                    };
                    // Calculate transferable assets
                    msg.payload.transferrable = msg.payload.free - msg.payload.miscFrozen
                    // Done
                    node.send(msg);
                } catch (e) {
                    node.warn(e)
                    node.status({ fill: "red", shape: "dot", text: "error" });
                } finally {
                    node.status({ fill: "grey", shape: "dot", text: "idle" });
                }
            }
        });
    }
    RED.nodes.registerType("balance", PolkadotApiBalanceNode);
}