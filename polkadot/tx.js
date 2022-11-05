module.exports = function (RED) {
    function PolkadotApiTxNode(config) {
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
                    const pair = client.keyFromMnemonic(node.credentials.seed)
                    const method = "method" in msg ? msg.method : config.method;
                    const proxy = "proxy" in msg ? msg.proxy : config.proxy;
                    const address = "address" in msg ? msg.address : config.address;
                    // Create a extrinsic, transferring 1 units to Target
                    node.log(`Tx ${method} => via ${pair.address} [proxy:${proxy}]`)
                    const transfer = proxy ? eval(`api.tx.proxy.proxy(
                        '${address}',
                        '${proxy}',
                        api.tx.${method},
                    )`) : eval(`api.tx.${method}`)
                    node.log(`Signing ${transfer}`)
                    // Sign and send the transaction using our account
                    const hash = await transfer.signAndSend(pair);
                    // Done
                    msg.payload = {
                        method: method,
                        proxy: proxy,
                        address: address,
                        hash: hash
                    }
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

    RED.nodes.registerType("transact", PolkadotApiTxNode, {
        credentials: {
            seed: {type: "password", required: true}
        }
    });
}