// Required imports
const { Keyring } = require('@polkadot/api');

module.exports = function (RED) {
    function PolkadotApiTransferNode(config) {
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
                    // Get main options
                    const source = "source" in msg ? msg.source : config.source;
                    const dest = "destination" in msg ? msg.destination : config.destination;
                    const amount = client.floatToAmount("amount" in msg ? msg.amount : config.amount);
                    // Get keyring
                    const pair = client.keyFromMnemonic(node.credentials.seed)
                    // Create a extrinsic, transferring 1 units to Target
                    node.log(`Transfer ${source} => ${dest} via ${pair.address} amount: ${amount}`)
                    const transfer = api.tx.proxy.proxy(
                        source,
                        "Balances",
                        api.tx.balances.transfer(dest, amount),
                    )
                    // Sign and send the transaction using our account
                    const hash = await transfer.signAndSend(pair);
                    // Done
                    msg.payload = {
                        transferred: `${client.amountToFloat(amount)}`,
                        hash: `${hash}`
                    }
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
    RED.nodes.registerType("transfer", PolkadotApiTransferNode,{
        credentials: {
            seed: {type:"password",required:true}
        }
    });
}