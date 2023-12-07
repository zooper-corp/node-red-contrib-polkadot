# Node Red Client for Polkadot

## Overview 

The Node Red Client for Polkadot is a powerful bridge connecting the Polkadot ecosystem with Node Red's no-code automation capabilities. This plugin enables users, including those with limited technical expertise, to interact with the Substrate blockchain easily.

Using the query node for example you can monitor the governance and then check the output to notify someone via telegram when things changes:
![Example Governance Alarm](https://raw.githubusercontent.com/zooper-corp/node-red-contrib-polkadot/5fcb3d7c2f50b66b7aeb1a799f9f5e91bed4bd8e/images/example_gov_alarm.jpg)

## Getting Started

Documentation is not ready yet

## Current Nodes

- **Configuration Client Node:** Connects to Substrate chains, supports sr25519, support for EVM is TBD
- **Chain Query Node:** Enables raw querying chain storage with `pallet.method(params...)`, humanization of data still TBD
- **Chain Info Node:** Provides chain details like decimals and runtime version, more data will be added in the future
- **Transaction Nodes:** For balance transfers and raw transactions on the chain, still unstable
