require('dotenv').config({ path: '.env.local' });
const http = require('http');
const soap = require('soap');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { getFormattedTimestamp } = require('./timestamp/timestamp');
const { DBService } = require('./db/db_access.js');
const AuthService = require('./ckyber/authservice').default;
const crypto = require('crypto');


const PORT = 30000;
const app = express();
app.use(bodyParser.raw({ type: () => true, limit: '5mb' }));

const STATUS = {
    OK: "OK",
    ERROR_DB_CONNECT: "ERROR Failed to connect to DB",
    ERROR_LOGIN_NAME_UNDEFINED: "ERROR login_name is undefined",
    ERROR_PUBLIC_KEY_UNDEFINED: "ERROR public_key is undefined",
    ALREADY_REGISTERED: "ALREADY_REGISTERED according to database",
    ERROR_AUTH_REGISTER: "ERROR Authservice registering User",
    IDC_NOT_FOUND: "IDC_NOT_FOUND",
    LOGIN_NAME_MISMATCH: "LOGIN_NAME_MISMATCH",
    SHARED_SECRET_NOT_FOUND: "SHARED_SECRET_NOT_FOUND",
    HASH_MISMATCH: "HASH_MISMATCH",
};

function extractValue(arg) {
  if (arg === undefined || arg === null) return null;

  let value = arg;
  // Handle objects from SOAP parsing like { '$value': '...' }
  if (typeof value === 'object' && value.$value) {
    value = value.$value;
  }

  // Handle stringified JSON from clients
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.$value) {
        value = parsed.$value;
      }
    } catch (e) {
      // Not a JSON string, continue
    }
  }
  
  // Handle the weird string format `"{ '$value': '...' }"`
  if (typeof value === 'string' && value.includes('$value')) {
    const match = value.match(/'\$value':\s*'([^']*)'/);
    if (match && match[1]) {
      value = match[1];
    }
  }

  // Clean and return
  if (typeof value === 'string') {
    return value.replace(/\r|\n/g, "").trim();
  }

  return value;
}

function decryptWithSharedSecret(encryptedData, sharedSecret) {
  try {
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    const iv = encryptedBuffer.slice(0, 16);
    const authTag = encryptedBuffer.slice(-16);
    const encryptedContent = encryptedBuffer.slice(16, -16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecret.slice(0, 32), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
        decipher.update(encryptedContent),
        decipher.final()
    ]);
    return decrypted.toString('hex');
  } catch (error) {
    console.error('decryptWithSharedSecret() -> Error:', error);
    return null;
  }
}

// Define an async function to start the application
async function startApp() {
  const service = {
    LepagoService: {
      LepagoPort: {
        loginReg: async function(args) {
          const dbService = new DBService(process.env.MONGODB_URI);
          await dbService.connect();

          const login_name = extractValue(args.login_name);
          const public_key = extractValue(args.public_key);

          if (!login_name) {
            return { status: STATUS.ERROR_LOGIN_NAME_UNDEFINED, idc: "", ciphertext: "", challenge: "" };
          }
          if (!public_key) {
            return { status: STATUS.ERROR_PUBLIC_KEY_UNDEFINED, idc: "", ciphertext: "", challenge: "" };
          }
          
          const isUserAliasRegistered = await dbService.isAliasRegistered(login_name);
          if (isUserAliasRegistered) {
            return { status: STATUS.ALREADY_REGISTERED, idc: "", ciphertext: "", challenge: "" };
          }
          
          const authService = new AuthService();
          const [cipherTextR, idcR] = await authService.registerUser(login_name, public_key);
          if(!cipherTextR || !idcR) {
            return { status: STATUS.ERROR_AUTH_REGISTER, idc: "", ciphertext: "", challenge: "" };
          }
          
          const challengeR = await authService.genChallenge(login_name);
          await dbService.close();
          
          return { status: STATUS.OK, idc: idcR, ciphertext: `${cipherTextR}`, challenge: `${challengeR}` };
        },
        loginReq: async function(args) {
          const idc = args.idc;
          const login_nameR = args.login_name;
          const dbService = new DBService(process.env.MONGODB_URI);
          await dbService.connect();
          
          const login_name = await dbService.getLoginNameFromIdc(idc);
          if (!login_name) {
            return { status: STATUS.IDC_NOT_FOUND, challenge: "" };
          }
          if (login_nameR !== login_name) {
            return { status: STATUS.LOGIN_NAME_MISMATCH, challenge: "" };
          }
          
          const authService = new AuthService();
          const challenge = await authService.genChallenge(login_name);
          
          await dbService.close();
          return { status: STATUS.OK, challenge: `${challenge}` };
        },
        challengeResp: async function(args) {
          const idc = args.idc;
          const crypted_hash = args.crypted_hash;
          const dbService = new DBService(process.env.MONGODB_URI);
          await dbService.connect();
          
          const login_name = await dbService.getLoginNameFromIdc(idc);
          if (!login_name) {
            await dbService.close();
            return { status: STATUS.IDC_NOT_FOUND, challenge: "" };
          }

          const sharedSecret = await dbService.getSharedSecretFromIdc(idc);
          if (!sharedSecret) {
            await dbService.close();
            return { status: STATUS.SHARED_SECRET_NOT_FOUND, challenge: "" };
          }

          const decryptedHash = decryptWithSharedSecret(crypted_hash, sharedSecret);

          const authService = new AuthService();
          const isChallengeHashValid = await authService.checkChallengeHash(login_name, decryptedHash);
          if (!isChallengeHashValid) {
            await dbService.close();
            return { status: STATUS.HASH_MISMATCH, challenge: "" };
          }
          
          await dbService.close();
          return { status: STATUS.OK };
        }
      }
    }
  };

  const wsdlURL = process.env.WSDL_URL;
  const { data: wsdl } = await axios.get(wsdlURL);
  const server = http.createServer(app);
  soap.listen(server, '/lepagoservice', service, wsdl);

  server.listen(PORT, () => {
    console.log(`[${getFormattedTimestamp()}]`, `SOAP service v 0.113.0 (2025-06-29 at 20:52 hrs.) is running on /lepagoservice...`);
  });
}

// Call the async function to start the application
startApp().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
