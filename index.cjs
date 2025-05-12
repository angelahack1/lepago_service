require('dotenv').config({ path: '.env.local' });
const http = require('http');
const soap = require('soap');
const express = require('express');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const fs = require('fs');
const { UserDbService } = require('./db/db_access');
const { getFormattedTimestamp } = require('./timestamp/timestamp');
const AuthService = require('./ckyber/crystals_kyber');
const{ ProofOfWork } = require('./pow/proofofwork');

const PORT = 30000;
const PORT_REST = 3000;
const app = express();
app.use(bodyParser.raw({ type: () => true, limit: '5mb' }));

// Define an async function to start the application
async function startApp() {
  const authService = new AuthService();
  await authService.loadFromFileAll();
  const dbService = new UserDbService();
  const db = await dbService.connect();
  if (!db) {
    console.error('Failed to connect to MongoDB');
    process.exit(1);
  }

  const service = {
    LepagoService: {
      LepagoPort: {
        loginReg: async function (args) {
          let login_name = args.login_name;
          let public_key = args.pubkey;

          console.log(`[${getFormattedTimestamp()}]`, "login_name: ", login_name, ", checking availability...");
          const isUserAliasRegistered = await dbService.isAliasRegistered(login_name);
          if (isUserAliasRegistered) {
            console.log(`[${getFormattedTimestamp()}] loginReg->ALREADY_REGISTERED(${login_name})`);
            return { status: "ALREADY_REGISTERED", idc: "", ciphertext: "", challenge: "" };
          }
          console.log(`[${getFormattedTimestamp()}]`, "pubkey on b64 to hex:", Buffer.from(public_key, 'base64').toString('hex'));
          console.log(`[${getFormattedTimestamp()}]`, 'Encapsulating...');
          const [cipherTextR, idcR] = await authService.registerUser(login_name, public_key);
          console.log(`[${getFormattedTimestamp()}]`, 'Encapsulation successful');
          const challengeR = await authService.genChallenge(login_name);
          console.log(`[${getFormattedTimestamp()}]`, 'challenge: ', challengeR);
          const pow = new ProofOfWork(challengeR, 4);
          const { blockData, nonce, hash } = pow.mine();
          console.log(`[${getFormattedTimestamp()}]`, '(LRG) Mined block:', blockData);
          console.log(`[${getFormattedTimestamp()}]`, '(LRG) Nonce:', nonce);
          console.log(`[${getFormattedTimestamp()}]`, '(LRG) challenge: ', challengeR);
          console.log(`[${getFormattedTimestamp()}]`, '(LRG) challenge hash: ', hash);
          await authService.registerChallengeHash(login_name, hash);
          await authService.syncToFileAll();
          console.log(`[${getFormattedTimestamp()}]`, 'Syncing to file successful');
          return { status: "OK", idc: idcR, ciphertext: `${cipherTextR}`, challenge: `${challengeR}` };
        },
        loginReq: async function (args) {
          let idc = args.idc;
          let login_nameR = args.login_name;
          const login_name = await authService.getLoginNameFromIdc(idc);
          if (!login_name) {
            console.log(`[${getFormattedTimestamp()}]`, 'loginReq->IDC_NOT_FOUND(' + idc + ')');
            return { status: "IDC_NOT_FOUND", challenge: "" };
          }
          if (login_nameR !== login_name) {
            console.log(`[${getFormattedTimestamp()}]`, 'loginReq->LOGIN_NAME_MISMATCH(${login_nameR} !== ${login_name})');
            return { status: "LOGIN_NAME_MISMATCH", challenge: "" };
          }
          console.log(`[${getFormattedTimestamp()}]`, 'login_name: ', login_name);
          const challenge = await authService.genChallenge(login_name);
          const pow = new ProofOfWork(challenge, 4);
          const { blockData, nonce, hash } = pow.mine();
          console.log(`[${getFormattedTimestamp()}]`, '(LR) Mined block:', blockData);
          console.log(`[${getFormattedTimestamp()}]`, '(LR) Nonce:', nonce);
          console.log(`[${getFormattedTimestamp()}]`, '(LR) challenge: ', challenge);
          console.log(`[${getFormattedTimestamp()}]`, '(LR) challenge hash: ', hash);
          await authService.registerChallengeHash(login_name, hash);
          return { status: "OK", challenge: `${challenge}` };
        },
        challengeResp: async function (args) {
          let idc = args.idc;
          let hash = args.hash;
          const login_name = await authService.getLoginNameFromIdc(idc);
          if (!login_name) {
            console.log(`[${getFormattedTimestamp()}]`, 'loginReq->IDC_NOT_FOUND(' + idc + ')');
            return { status: "IDC_NOT_FOUND", challenge: "" };
          }
          const challengeHash = await authService.getChallengeHash(login_name);
          if (challengeHash != hash) {
            console.log(`[${getFormattedTimestamp()}]`, 'challengeResp->HASH_MISMATCH(${challengeHash} !== ${hash})');
            return { status: "HASH_MISMATCH", challenge: "" };
          }
          console.log(`[${getFormattedTimestamp()}]`, 'challengeResp->OK(${idc}), hash(${hash})');
          return { status: "OK" };
        }
      }
    }
  };

  const wsdl = fs.readFileSync('./lepagoservice.wsdl', 'utf8');
  const server = http.createServer(app);
  soap.listen(server, '/lepagoservice', service, wsdl);

  server.listen(PORT, () => {
    console.log(`[${getFormattedTimestamp()}]`, 'SOAP service is running on /lepagoservice');
  });
}

// Call the async function to start the application
startApp().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
