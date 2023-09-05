import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { agent } from "./setup.js";
import {
  AgentRouter,
  apiKeyAuth,
  ApiSchemaRouter,
  createDefaultDid,
  RequestWithAgentRouter,
  WebDidDocRouter,
} from "@veramo/remote-server";

const baseUrl = process.env.BASE_URL || "http://localhost:3332";
const apiKey = process.env.API_KEY || "test";
const ENV = process.env.NODE_ENV || "development";
console.log("ENV", ENV);

const getAgentForRequest = async (req: express.Request) => agent;
const exposedMethods = agent.availableMethods();
// TODO: Might use later
const webDIDPath = "/.well-known/did.json";

// Add agent to the request object
const requestWithAgentRouter = RequestWithAgentRouter({
  getAgentForRequest,
});

// API requests
const agentRouter = AgentRouter({
  exposedMethods,
});
const apiKeyAuthMiddleware = apiKeyAuth({
  apiKey,
});

const basePath = ENV === "production" ? "/agent" : ":3332/agent";
console.log("basePath", basePath);
// open API schema
const schemaRouter = ApiSchemaRouter({
  // localhost requires port number, otherwise it's domain
  basePath,
  exposedMethods,
  securityScheme: "bearer",
  apiName: "Agent",
  apiVersion: "1.0.0",
});

// DID document
const didDocRouter = WebDidDocRouter({});

const app = express();
const port = 3332; // default port to listen

app.use(cors());
app.use(requestWithAgentRouter);
app.use("/agent", agentRouter, apiKeyAuthMiddleware);
app.use("/open-api.json", schemaRouter);
app.use(didDocRouter);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, { swaggerOptions: { url: "/open-api.json" } })
);

// define a route handler for the default home page
app.get("/", (req, res) => {
  res.status(200).send("Health check");
});

// start the Express server
createDefaultDid({
  agent,
  baseUrl,
  messagingServiceEndpoint: "/messaging",
}).then(() => {
  app.listen(port, () => {
    console.log(`server started at ${baseUrl}`);
  });
});
