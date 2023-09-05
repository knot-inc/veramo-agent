import dotenv from "dotenv";
dotenv.config();
// Core interfaces
import {
  createAgent,
  IDIDManager,
  IResolver,
  IDataStore,
  IKeyManager,
  ICredentialPlugin,
} from "@veramo/core";

// Core identity manager plugin
import { DIDManager } from "@veramo/did-manager";

// Ethr did identity provider
import { EthrDIDProvider } from "@veramo/did-provider-ethr";

// Web did identity provider
import { WebDIDProvider } from "@veramo/did-provider-web";

// Core key manager plugin
import { KeyManager } from "@veramo/key-manager";

// Custom key management system for RN
import { KeyManagementSystem, SecretBox } from "@veramo/kms-local";

// W3C Verifiable Credential plugin
import { CredentialPlugin } from "@veramo/credential-w3c";

// Custom resolvers
import { DIDResolverPlugin } from "@veramo/did-resolver";
import { Resolver } from "did-resolver";
import { getResolver as ethrDidResolver } from "ethr-did-resolver";
import { getResolver as webDidResolver } from "web-did-resolver";

// Storage plugin using TypeOrm
import {
  Entities,
  KeyStore,
  DIDStore,
  IDataStoreORM,
  PrivateKeyStore,
  migrations,
} from "@veramo/data-store";

import { DataSource } from "typeorm";
import fs from "fs";
import { fileURLToPath } from "url";
import path, { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const caPath = path.join(__dirname, "../ca/rds-ca-2019.pem");

const DATABASE_URL = process.env.DATABASE_URL;
const KMS_SECRET_KEY = process.env.KMS_SECRET_KEY as string;
const RPC_URL = process.env.RPC_URL;
const ENV = process.env.NODE_ENV || "development";
let ssl = undefined;
if (ENV === "production") {
  ssl = {
    ca: fs.readFileSync(caPath).toString(),
  };
}
const dbConfig = {
  type: "postgres",
  url: DATABASE_URL,
  ssl,
  synchronize: false,
  migrations,
  migrationsRun: true,
  logging: ["error", "info", "warn"],
  entities: Entities,
} as any;

const dbConnection = new DataSource(dbConfig).initialize();

export const agent = createAgent<
  IDIDManager &
    IKeyManager &
    IDataStore &
    IDataStoreORM &
    IResolver &
    ICredentialPlugin
>({
  plugins: [
    new KeyManager({
      store: new KeyStore(dbConnection),
      kms: {
        local: new KeyManagementSystem(
          new PrivateKeyStore(dbConnection, new SecretBox(KMS_SECRET_KEY))
        ),
      },
    }),
    new DIDManager({
      store: new DIDStore(dbConnection),
      defaultProvider: "did:ethr:goerli",
      providers: {
        "did:ethr:goerli": new EthrDIDProvider({
          defaultKms: "local",
          networks: [{ name: "goerli", rpcUrl: RPC_URL }],
        }),
        "did:web": new WebDIDProvider({
          defaultKms: "local",
        }),
      },
    }),
    new DIDResolverPlugin({
      resolver: new Resolver({
        ...ethrDidResolver({ networks: [{ name: "goerli", rpcUrl: RPC_URL }] }),
        ...webDidResolver(),
      }),
    }),
    new CredentialPlugin(),
  ],
});
