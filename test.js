import fs from "fs";
import * as index from "./index.js";

// Event test
// read from json file

let file = fs.readFileSync('SNS_Payload.json', 'utf8');
let event = JSON.parse(file);
await index.handler(event);

