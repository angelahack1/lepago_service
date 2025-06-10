require('dotenv').config({ path: '.env.local' });
const http = require('http');
const soap = require('soap');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { getFormattedTimestamp } = require('./timestamp/timestamp');
const { DBService } = require('./db/db_access.js');
const AuthService = require('./ckyber/authservice').default;
const crypto = require('crypto');


const PORT = 30000;
const app = express();
app.use(bodyParser.raw({ type: () => true, limit: '5mb' }));

function decryptWithSharedSecret(encryptedData, sharedSecret) {
  console.log("decryptWithSharedSecret() -> encryptedData: ", encryptedData, " sharedSecret: ", sharedSecret);
  // Convert base64 string back to hex
  const encryptedDataHex = Buffer.from(encryptedData, 'base64').toString('hex');
  console.log("decryptWithSharedSecret() -> encryptedDataHex: ", encryptedDataHex);
  const encryptedBuffer = Buffer.from(encryptedData, 'base64');
  // Extract IV (first 16 bytes), encrypted data, and auth tag
  const iv = encryptedBuffer.slice(0, 16);
  const authTag = encryptedBuffer.slice(-16);
  const encryptedContent = encryptedBuffer.slice(16, -16);
  console.log("decryptWithSharedSecret() -> iv: ", iv);
  console.log("decryptWithSharedSecret() -> authTag: ", authTag);
  console.log("decryptWithSharedSecret() -> encryptedContent: ", encryptedContent);
  // Create decipher using AES-256-GCM
  const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecret.slice(0, 32), iv);
  console.log("decryptWithSharedSecret() -> decipher: ", decipher);
  console.log("decryptWithSharedSecret() -> decipher.setAuthTag(authTag): ", decipher.setAuthTag(authTag));
  // Decrypt the data
  try {
    const decrypted = Buffer.concat([
        decipher.update(encryptedContent),
        decipher.final()
    ]);
    console.log('decryptWithSharedSecret() -> Decrypted data:', decrypted.toString('hex'));
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
          console.log('>>>>>>>>>>>>>>>loginReg', args);
          const dbService = new DBService(process.env.MONGODB_URI);
          const db = await dbService.connect();
          if (!db) {
            console.error('Failed to connect to MongoDB');
            return { status: "ERROR Failed to connect to DB", idc: "", ciphertext: "", challenge: "" };
          }
          console.log('Getting in...');


          //TODO ALM: Check how to use the correct soap specification...

          
          let login_name = args.login_name.$value;
          let public_key = args.pubkey.$value;
          console.log("About to clean the strings, login_name: <", login_name, "> public_key: <", public_key+">");
          var cleanedString = login_name.replace(/\r|\n/g, "");
          login_name = cleanedString;
          cleanedString = public_key.replace(/\r|\n/g, "");
          public_key = cleanedString;
          console.log("...Strings cleaned");
          console.log(`[${getFormattedTimestamp()}]`,'login_name: ', login_name);
          console.log(`[${getFormattedTimestamp()}]`,'public_key: ', public_key);
          
          let extractedAlias = '';
          if(login_name.indexOf('$value') !== -1) {
            console.log(`[${getFormattedTimestamp()}]`,'isAliasRegistered()->Alias contains $value');
            const valueIndex = login_name.indexOf("'$value': '") + "'$value': '".length;
            const endIndex = login_name.indexOf("'", valueIndex);
            const result = login_name.substring(valueIndex, endIndex);
            extractedAlias = result;
          } else {
            extractedAlias = login_name;
          }
          
          console.log(`[${getFormattedTimestamp()}]`,'Extracted alias: ', extractedAlias);

          let extractedPublicKey = '';
          if(public_key.indexOf('$value') !== -1) {
            console.log(`[${getFormattedTimestamp()}]`,'isAliasRegistered()->Public Key contains $value');
            const valueIndex = public_key.indexOf("'$value': '") + "'$value': '".length;
            const endIndex = public_key.indexOf("'", valueIndex);
            const result = public_key.substring(valueIndex, endIndex);
            extractedPublicKey = result;
          } else {
            extractedPublicKey = public_key;
          }

          console.log(`[${getFormattedTimestamp()}]`,'Extracted public key: ', extractedPublicKey);
          login_name = extractedAlias;
          public_key = extractedPublicKey;
          console.log(`[${getFormattedTimestamp()}]`, "login_name: ", login_name, ", checking availability...");
          const isUserAliasRegistered = await dbService.isAliasRegistered(login_name);
          if (isUserAliasRegistered) {
            console.log(`[${getFormattedTimestamp()}] loginReg->ALREADY_REGISTERED(${login_name})`);
            return { status: "ALREADY_REGISTERED according to database", idc: "", ciphertext: "", challenge: "" };
          }
          console.log(`[${getFormattedTimestamp()}]`, "pubkey on b64 to hex:", Buffer.from(public_key, 'base64').toString('hex'));
          const authService = new AuthService();
          const [cipherTextR, idcR] = await authService.registerUser(login_name, public_key);
          if(!cipherTextR || !idcR) {
            console.error(`[${getFormattedTimestamp()}]`,'User not registered');
            return { status: "ERROR Authservice registering User", idc: "", ciphertext: "", challenge: "" };
          }
          console.log(`[${getFormattedTimestamp()}]`, 'Encapsulation successful');
          const challengeR = await authService.genChallenge(login_name);
          console.log(`[${getFormattedTimestamp()}]`, 'challenge: ', challengeR);
          console.log('<<<<<<<<<<<<<<loginReg', { status: "OK", idc: idcR, ciphertext: `${cipherTextR}`, challenge: `${challengeR}` });
          await dbService.close();
          return { status: "OK", idc: idcR, ciphertext: `${cipherTextR}`, challenge: `${challengeR}` };
        },
        loginReq: async function(args) {
          console.log('>>>>>>>>>>>>>>>loginReq', args);
          let idc = args.idc;
          let login_nameR = args.login_name;
          const dbService = new DBService(process.env.MONGODB_URI);
          const db = await dbService.connect();
          if (!db) {
            console.error('Failed to connect to MongoDB');
            return { status: "ERROR Failed to connect to DB", idc: "", ciphertext: "", challenge: "" };
          } else {
            console.log('Connected to MongoDB');
          }
          const login_name = await dbService.getLoginNameFromIdc(idc);
          if (!login_name) {
            console.log(`[${getFormattedTimestamp()}]`, 'loginReq->IDC_NOT_FOUND(' + idc + ')');
            return { status: "IDC_NOT_FOUND", challenge: "" };
          }
          if (login_nameR !== login_name) {
            console.log(`[${getFormattedTimestamp()}]`, 'loginReq->LOGIN_NAME_MISMATCH(${login_nameR} !== ${login_name})');
            return { status: "LOGIN_NAME_MISMATCH", challenge: "" };
          }
          console.log(`[${getFormattedTimestamp()}]`, 'login_name: ', login_name);
          const authService = new AuthService();
          const challenge = await authService.genChallenge(login_name);
          console.log(`[${getFormattedTimestamp()}]`, '(LR) challenge: ', challenge);
          console.log('<<<<<<<<<<<<<<loginReq', { status: "OK", challenge: `${challenge}` });
          await dbService.close();
          return { status: "OK", challenge: `${challenge}` };
        },
        challengeResp: async function(args) {
          console.log('>>>>>>>>>>>>>>challengeResp', args);
          let idc = args.idc;
          let crypted_hash = args.crypted_hash;
          const dbService = new DBService();
          const db = await dbService.connect();
          if (!db) {
            console.error('Failed to connect to MongoDB');
            return { status: "ERROR Failed to connect to DB", challenge: "" };
          }
          const authService = new AuthService();
          const login_name = await dbService.getLoginNameFromIdc(idc);
          if (!login_name) {
            console.log(`[${getFormattedTimestamp()}]`, 'challengeResp->IDC_NOT_FOUND(' + idc + ')');
            await dbService.close();
            return { status: "IDC_NOT_FOUND", challenge: "" };
          }

          //get the sharedSecret from the database
          const sharedSecret = await dbService.getSharedSecretFromIdc(idc);
          if (!sharedSecret) {
            console.log(`[${getFormattedTimestamp()}]`, 'challengeResp->SHARED_SECRET_NOT_FOUND(' + login_name + ')');
            await dbService.close();
            return { status: "SHARED_SECRET_NOT_FOUND", challenge: "" };
          }

          const decryptedHash = decryptWithSharedSecret(crypted_hash, sharedSecret);
          console.log('decryptWithSharedSecret() -> Decrypted hash:', decryptedHash);

          const isChallengeHashValid = await authService.checkChallengeHash(login_name, decryptedHash);
          if (!isChallengeHashValid) {
            console.log(`[${getFormattedTimestamp()}]`, 'challengeResp->HASH_MISMATCH(${challengeHash} !== ${hash})');
            await dbService.close();
            return { status: "HASH_MISMATCH", challenge: "" };
          }
          console.log(`[${getFormattedTimestamp()}]`, 'challengeResp->OK(${idc}), hash(${hash})');
          await dbService.close();
          return { status: "OK" };
        }
      }
    }
  };

  const wsdl = fs.readFileSync('./lepagoservice.wsdl', 'utf8');
  const server = http.createServer(app);
  soap.listen(server, '/lepagoservice', service, wsdl);

  server.listen(PORT, () => {
    console.log(`[${getFormattedTimestamp()}]`, 'SOAP service v 0.98.0 (2025-06-09 at 21:42 hrs.) is running on /lepagoservice...');
  });
}

// Call the async function to start the application
startApp().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
