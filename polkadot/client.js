// Required imports
const {ApiPromise, WsProvider, Keyring} = require('@polkadot/api');

/**
 * Api Client object with helper methods
 */
class ApiClient {
    constructor(api, endpoint, keytype, info) {
        this.api = api;
        this.endpoint = endpoint;
        this.keytype = keytype;
        // Main info
        this.decimals = info.tokenDecimals.unwrap()[0].toBigInt();
        this.symbol = info.tokenSymbol.unwrap()[0].toString();
        // Version
        const version = api.consts.system.version
        this.chain = version.specName;
        this.runtime = parseInt(version.specVersion);
    }

    floatToAmount(value) {
        const exp = BigInt(10) ** this.decimals;
        return multiplyFloat(exp, parseFloat(value));
    }

    amountToFloat(bigIntAmount) {
        const a = new BigDecimal(bigIntAmount);
        const b = new BigDecimal(BigInt(10) ** this.decimals);
        return parseFloat(a.divide(b).toString())
    }

    keyFromMnemonic(mnemonic) {
        const keyring = new Keyring({type: this.keytype});
        if (this.keytype === "ethereum") {
            const ethDerPath = "m/44'/60'/0'/0/0";
            return keyring.addFromUri(`${mnemonic}/${ethDerPath}`)
        } else {
            return keyring.addFromMnemonic(mnemonic)
        }
    }
}

/**
 * Class to get approx float value out of U128
 */
class BigDecimal {
    constructor(value) {
        let [ints, decis] = String(value).split(".").concat("");
        decis = decis.padEnd(BigDecimal.decimals, "0");
        this.bigint = BigInt(ints + decis);
    }

    static fromBigInt(bigint) {
        return Object.assign(Object.create(BigDecimal.prototype), {bigint});
    }

    divide(divisor) { // You would need to provide methods for other operations
        return BigDecimal.fromBigInt(this.bigint * BigInt("1" + "0".repeat(BigDecimal.decimals)) / divisor.bigint);
    }

    toString() {
        const s = this.bigint.toString().padStart(BigDecimal.decimals + 1, "0");
        return s.slice(0, -BigDecimal.decimals) + "." + s.slice(-BigDecimal.decimals)
            .replace(/\.?0+$/, "");
    }
}

BigDecimal.decimals = 18;

/**
 * Creates a new client connecting to endpoint
 *
 * @param endpoint - the ws endpoint uri
 * @param keytype - the ws endpoint keyring type
 */
const getClient = async (endpoint, keytype) => {
    const provider = new WsProvider(endpoint);
    const api = await ApiPromise.create({provider});
    // Retrieve chain info (decimals and symbol)
    const [info] = await Promise.all([
        api.registry.getChainProperties(),
    ]);
    // Unpack
    return new ApiClient(api, endpoint, keytype, info);
};

/**
 * For a finite normal 64-bit float `f`, extracts integers `sgn`,
 * `exponent`, and `mantissa` such that:
 *
 *   - `sgn` is -1 or +1
 *   - `exponent` is between -1023 and 1024, inclusive
 *   - `mantissa` is between 0 and 2^51 - 1, inclusive
 *   - the number given by `f` equals `sgn * 2^exponent * (1 + mantissa / 2^52)`
 *
 * The results are all bigints within the range of safe integers for
 * 64-bit floats (i.e., converting them to `Number` is lossless).
 *
 * Throws an error if `f` is subnormal (biased exponent is 0).
 */
function decomposeFloat(f) {
    if (!isFinite(f)) {
        throw new Error("Input must be finite: " + f);
    }
    const union = new DataView(new ArrayBuffer(8));
    const littleEndian = true; // arbitrary, but faster when matches native arch
    union.setFloat64(0, f, littleEndian);
    const bytes = union.getBigUint64(0, littleEndian);
    const sgn = (-1n) ** (bytes >> 63n);
    const biasedExponent = (bytes & ~(1n << 63n)) >> 52n;
    if (biasedExponent === 0n) {
        throw new Error("Subnormal floats not supported: " + f);
    }
    const exponent = biasedExponent - 1023n;
    const mantissa = bytes & ((1n << 52n) - 1n);
    return {sgn, exponent, mantissa};
}

/**
 * Multiply an exact bigint by a floating point number.
 *
 * This function is exact in the first argument and subject to the usual
 * floating point considerations in the second. Thus, it is the case
 * that
 *
 *      multiplyFloat(g, 1) === g
 *      multiplyFloat(g, x) + multiplyFloat(h, f) === multiplyFloat(g + h, x)
 *      multiplyFloat(k * g, x) === k * multiplyFloat(g, x)
 *
 * for all `BigInt`s `k`, `g`, and `h` and all floats `x`. But it is not
 * necessarily the case that
 *
 *      multiplyFloat(g, x) + multiplyFloat(g, y) === multiplyFloat(g, x + y)
 *
 * for all `BigInt`s `g` and floats `x` and `y`: e.g., when `x === 1`
 * and `y === 1e-16`, we have `x + y === x` even though `y !== 0`.
 */
function multiplyFloat(g, fac) {
    if (fac === 0) {
        // Special case, as 0 is subnormal.
        return 0n;
    }
    const {sgn, exponent, mantissa} = decomposeFloat(fac);
    // from `decomposeFloat` contract, `fac = numerator / denominator`
    // exactly (in arbitrary-precision arithmetic)
    const numerator = sgn * 2n ** (exponent + 1023n) * (2n ** 52n + mantissa);
    const denominator = 2n ** (1023n + 52n);
    // round to nearest, biasing toward zero on exact tie
    return (2n * numerator * g + sgn * denominator) / (2n * denominator);
}

/**
 * Main module
 */
module.exports = function (RED) {
    function PolkadotApiClient(n) {
        // Create node
        RED.nodes.createNode(this, n);
        const node = this;
        node.endpoint = n.endpoint;
        node.keytype = n.keytype;
        node.status({fill: "yellow", shape: "dot", text: "connecting"});
        node.connect = async function () {
            try {
                const apiClient = node.context().get("client");
                if (apiClient
                    && apiClient.api
                    && apiClient.api.isConnected) return apiClient;
                // Create new
                node.log(`Connecting to ${node.endpoint}`);
                const client = await getClient(node.endpoint, node.keytype);
                node.log(`Connected to ${client.chain} v${client.runtime}`);
                node.context().set("client", client)
                return client;
            } catch (e) {
                node.warn(e)
            }
            return null
        };
    }

    RED.nodes.registerType("client", PolkadotApiClient);
}