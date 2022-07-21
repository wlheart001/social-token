// https://gist.github.com/zhangyouxin/1cb9e9cddc56fcfad3d4711ecf2ca765

import { Script, Hash, HexString, CellDep } from "@ckb-lumos/base";
import {
  Address,
  HashType,
  Hexadecimal,
  DepType
} from "@ckb-lumos/lumos";
import { BI } from "@ckb-lumos/bi";
import { toolkit, utils, helpers } from "@ckb-lumos/lumos";
import { molecule, number, blockchain, createFixedBytesCodec } from "@ckb-lumos/codec";
import { HashType as Lay2HashType, Script as Lay2Script } from '@lay2/pw-core'

const { table } = molecule;
const { Bytes, Byte32 } = blockchain;
const { Uint32, Uint64 } = number;

export function generateDepositLock(ethAddress: string, isTestNet: boolean) {
  const config = isTestNet ? configAggron : configLina
  const layer1Address = generateL1Address(ethAddress, config.layer1Config);
  const layer1Lock = helpers.parseAddress(layer1Address);
  const ownerLockHash: Hash = utils.computeScriptHash(layer1Lock);
  const depositLockArgs = {
    owner_lock_hash: ownerLockHash,
    layer2_lock: getLayer2LockScript(ethAddress, config.layer2Config),
    cancel_timeout: BI.from("0xc000000000093a80"),
    registry_id: 2
  };
  const depositLockArgsHexString: HexString = new toolkit.Reader(
    V1DepositLockArgs.pack(depositLockArgs)
  ).serializeJson();

  const depositLock = new Lay2Script(
    config.layer2Config.SCRIPTS.deposit_lock.script_type_hash,
    config.layer2Config.ROLLUP_CONFIG.rollup_type_hash + depositLockArgsHexString.slice(2),
    Lay2HashType.type
  );
  return depositLock;
}

export function generateL1Address(
  ethAddress: HexString,
  config: Layer1Config
): Address {
  const omniLock: Script = {
    code_hash: config.SCRIPTS.omni_lock.code_hash,
    hash_type: config.SCRIPTS.omni_lock.hash_type as HashType,
    // omni flag       pubkey hash   omni lock flags
    // chain identity   eth addr      function flag()
    // 00: Nervos                     00: owner
    // 01: Ethereum                   01: administrator
    args: `0x01${ethAddress.substring(2)}00`
  };
  return helpers.generateAddress(omniLock);
}

function getLayer2LockScript(ethAddress: string, config: Layer2Config): Script {
  return {
    code_hash: config.SCRIPTS.eth_account_lock.script_type_hash,
    hash_type: "type",
    args: config.ROLLUP_CONFIG.rollup_type_hash + ethAddress.slice(2),
  }
}

const hashTypeCodec = createFixedBytesCodec<string>({
  byteLength: 1,
  pack: (type: string) => {
    const data = new DataView(new ArrayBuffer(1));
    if (type === "data") {
      data.setUint8(0, 0);
    } else if (type === "type") {
      data.setUint8(0, 1);
    } else if (type === "data1") {
      data.setUint8(0, 2);
    } else {
      throw new Error(`invalid hash type: ${type}`);
    }
    return new Uint8Array(data.buffer);
  },
  unpack: (buf: Uint8Array) => {
    const data = new DataView(buf.buffer).getUint8(0);
    if (data === 0) {
      return "data";
    } else if (data === 1) {
      return "type";
    } else if (data === 2) {
      return "data1";
    } else {
      throw new Error("invalid data");
    }
  },
});

const V1DepositLockArgs = table(
  {
    owner_lock_hash: Byte32,
    layer2_lock: table(
      {
        code_hash: Byte32,
        hash_type: hashTypeCodec,
        args: Bytes,
      },
      ["code_hash", "hash_type", "args"],
    ),
    cancel_timeout: Uint64,
    registry_id: Uint32,
  },
  ["owner_lock_hash", "layer2_lock", "cancel_timeout", "registry_id"],
);

type ScriptType = {
  code_hash: Hash;
  hash_type: HashType;
  tx_hash: Hash;
  index: Hexadecimal;
  dep_type: DepType;
};

type Layer1Config = {
  SCRIPTS: {
    omni_lock: ScriptType;
    secp256k1_blake160: ScriptType;
    sudt: ScriptType;
  };
  CKB_INDEXER_URL: string;
  CKB_RPC_URL: string;
  SCANNER_URL: string;
};

type Layer2Config = {
  SCRIPTS: {
    deposit_lock: {
      script_type_hash: Hash;
      cell_dep: CellDep;
    };
    withdrawal_lock: {
      script_type_hash: Hash;
      cell_dep: CellDep;
    };
    eth_account_lock: {
      script_type_hash: Hash;
    };
  };
  ROLLUP_CONFIG: {
    rollup_type_hash: Hash;
    rollup_type_script: Script;
  };
  GW_POLYJUICE_RPC_URL: string;
  SCANNER_URL: string;
  SCANNER_API: string;
  CHAIN_NAME: string;
  FINALITY_BLOCKS: number;
  BLOCK_PRODUCE_TIME: number;
  MIN_CANCEL_DEPOSIT_TIME: number;
  MULTICALL_ADDRESS?: string;
};

// https://github.com/nervosnetwork/light-godwoken/blob/f9153b64bdee22acb4ee20b4827dc0927c284ae6/src/light-godwoken/constants/lightGodwokenConfig.ts

const layer1ConfigAggron: Layer1Config = {
  SCRIPTS: {
    omni_lock: {
      code_hash: "0x79f90bb5e892d80dd213439eeab551120eb417678824f282b4ffb5f21bad2e1e",
      hash_type: "type",
      tx_hash: "0x9154df4f7336402114d04495175b37390ce86a4906d2d4001cf02c3e6d97f39c",
      index: "0x0",
      dep_type: "code",
    },
    secp256k1_blake160: {
      code_hash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
      hash_type: "type",
      tx_hash: "0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37",
      index: "0x0",
      dep_type: "dep_group",
    },
    sudt: {
      code_hash: "0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4",
      hash_type: "type",
      tx_hash: "0xe12877ebd2c3c364dc46c5c992bcfaf4fee33fa13eebdf82c591fc9825aab769",
      index: "0x0",
      dep_type: "code",
    },
  },
  CKB_INDEXER_URL: "https://testnet.ckb.dev/indexer",
  CKB_RPC_URL: "https://testnet.ckb.dev",
  SCANNER_URL: "https://pudge.explorer.nervos.org",
};

const layer1ConfigLina: Layer1Config = {
  SCRIPTS: {
    omni_lock: {
      code_hash: "0x9f3aeaf2fc439549cbc870c653374943af96a0658bd6b51be8d8983183e6f52f",
      hash_type: "type",
      tx_hash: "0xaa8ab7e97ed6a268be5d7e26d63d115fa77230e51ae437fc532988dd0c3ce10a",
      index: "0x1",
      dep_type: "code",
    },
    secp256k1_blake160: {
      code_hash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
      hash_type: "type",
      tx_hash: "0x71a7ba8fc96349fea0ed3a5c47992e3b4084b031a42264a018e0072e8172e46c",
      index: "0x0",
      dep_type: "dep_group",
    },
    sudt: {
      code_hash: "0x5e7a36a77e68eecc013dfa2fe6a23f3b6c344b04005808694ae6dd45eea4cfd5",
      hash_type: "type",
      tx_hash: "0xc7813f6a415144643970c2e88e0bb6ca6a8edc5dd7c1022746f628284a9936d5",
      index: "0x0",
      dep_type: "code",
    },
  },
  CKB_INDEXER_URL: "https://mainnet.ckb.dev/indexer",
  CKB_RPC_URL: "https://mainnet.ckb.dev/rpc",
  SCANNER_URL: "https://explorer.nervos.org",
};

const layer2ConfigAggron: Layer2Config = {
  SCRIPTS: {
    deposit_lock: {
      script_type_hash: "0x50704b84ecb4c4b12b43c7acb260ddd69171c21b4c0ba15f3c469b7d143f6f18",
      cell_dep: {
        out_point: {
          tx_hash: "0x9caeec735f3cd2a60b9d12be59bb161f7c61ddab1ac22c4383a94c33ba6404a2",
          index: "0x0",
        },
        dep_type: "code",
      },
    },
    withdrawal_lock: {
      script_type_hash: "0x06ae0706bb2d7997d66224741d3ec7c173dbb2854a6d2cf97088796b677269c6",
      cell_dep: {
        out_point: {
          tx_hash: "0x9c607a9a75ea4699dd01b1c2a478002343998cac8346d2aa582f35b532bd2b93",
          index: "0x0",
        },
        dep_type: "code",
      },
    },
    eth_account_lock: {
      script_type_hash: "0x07521d0aa8e66ef441ebc31204d86bb23fc83e9edc58c19dbb1b0ebe64336ec0",
    },
  },
  ROLLUP_CONFIG: {
    rollup_type_hash: "0x702359ea7f073558921eb50d8c1c77e92f760c8f8656bde4995f26b8963e2dd8",
    rollup_type_script: {
      code_hash: "0x1e44736436b406f8e48a30dfbddcf044feb0c9eebfe63b0f81cb5bb727d84854",
      hash_type: "type",
      args: "0x86c7429247beba7ddd6e4361bcdfc0510b0b644131e2afb7e486375249a01802",
    },
  },
  GW_POLYJUICE_RPC_URL: "https://godwoken-testnet-v1.ckbapp.dev",
  SCANNER_URL: "https://v1.betanet.gwscan.com/",
  SCANNER_API: "https://api.v1.betanet.gwscan.com/api/",
  CHAIN_NAME: "Godwoken Testnet v1",
  FINALITY_BLOCKS: 100,
  BLOCK_PRODUCE_TIME: 30,
  MIN_CANCEL_DEPOSIT_TIME: 604800, // 7 days in seconds

  // https://github.com/mds1/multicall/blob/a6ed03f4bb232a573e9f6d4bdeca21a4edd3c1f7/README.md
  MULTICALL_ADDRESS: "0xcA11bde05977b3631167028862bE2a173976CA11",
};

const layer2ConfigLina: Layer2Config = {
  SCRIPTS: {
    deposit_lock: {
      script_type_hash: "0xff602581f07667eef54232cce850cbca2c418b3418611c132fca849d1edcd775",
      cell_dep: {
        out_point: {
          tx_hash: "0x61e576a7e5d2398ecc5b1a969d1af0142c87db0996c2f6fce41bf28f68d805b2",
          index: "0x0",
        },
        dep_type: "code",
      },
    },
    withdrawal_lock: {
      script_type_hash: "0x3714af858b8b82b2bb8f13d51f3cffede2dd8d352a6938334bb79e6b845e3658",
      cell_dep: {
        out_point: {
          tx_hash: "0xe6389b5cf63eec1e2592e930414bc43f92508e529bdd5f5a07fa1dd140f4f20a",
          index: "0x0",
        },
        dep_type: "code",
      },
    },
    eth_account_lock: {
      script_type_hash: "0x096df264f38fff07f3acd318995abc2c71ae0e504036fe32bc38d5b6037364d4",
    },
  },
  ROLLUP_CONFIG: {
    rollup_type_hash: "0x1ca35cb5fda4bd542e71d94a6d5f4c0d255d6d6fba73c41cf45d2693e59b3072",
    rollup_type_script: {
      code_hash: "0xfef1d086d9f74d143c60bf03bd04bab29200dbf484c801c72774f2056d4c6718",
      hash_type: "type",
      args: "0xab21bfe2bf85927bb42faaf3006a355222e24d5ea1d4dec0e62f53a8e0c04690",
    },
  },
  GW_POLYJUICE_RPC_URL: "https://v1.mainnet.godwoken.io/rpc",
  SCANNER_URL: "https://v1.gwscan.com/",
  SCANNER_API: "https://api.v1.gwscan.com/api/",
  CHAIN_NAME: "Godwoken Mainet v1",
  FINALITY_BLOCKS: 16800,
  // Assuming layer 1 block produce time is 12 secondes, layer 2 produces 1 block every 3 layer 1 blocks
  BLOCK_PRODUCE_TIME: 12 * 3,
  MIN_CANCEL_DEPOSIT_TIME: 604800,

  // https://github.com/mds1/multicall/commit/a6ed03f4bb232a573e9f6d4bdeca21a4edd3c1f7
  MULTICALL_ADDRESS: "0xcA11bde05977b3631167028862bE2a173976CA11",
};

const configAggron = {
  'layer1Config': layer1ConfigAggron,
  'layer2Config': layer2ConfigAggron
};

const configLina = {
  'layer1Config': layer1ConfigLina,
  'layer2Config': layer2ConfigLina
}
