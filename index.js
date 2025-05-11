require('dotenv').config({ path: '.env.local' });
const http = require('http');
const soap = require('soap');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { MlKem1024 } = require('mlkem');
const QRCode = require('qrcode');
const fs = require('fs');
const { isThereThisUserAlias } = require('./db/db_access');
const { getFormattedTimestamp } = require('./timestamp/timestamp');

const PORT = 30000
const PORT_REST = 3000
const app = express();
app.use(bodyParser.raw({ type: () => true, limit: '5mb' }));
const kem = new MlKem1024();

const service = {
  LepagoService: {
    LepagoPort: {
      loginReg: async function (args) {
        let login_name = args.login_name;
        let public_key = args.pubkey;
        console.log(`[${getFormattedTimestamp()}]`,"login_name: ",login_name, ", checking availability...");
        const isUserAliasRegistered = await isThereThisUserAlias(login_name);
        if (isUserAliasRegistered) {
          console.log(`[${getFormattedTimestamp()}] loginReg->ALREADY_REGISTERED(${login_name})`);
          return { status: "ALREADY_REGISTERED", idc: "", ciphertext: "", challenge: "" };
        }
        console.log(`[${getFormattedTimestamp()}]`,"pubkey on b64 to hex:", Buffer.from(public_key, 'base64').toString('hex'));
        const originalPublicKey = Buffer.from(public_key, 'base64');
        console.log(`[${getFormattedTimestamp()}]`,'Encapsulating...');
        const [ciphertext, sharedSecret] = await kem.encap(originalPublicKey);
        console.log(`[${getFormattedTimestamp()}]`,'Encapsulation successful');
        let cipherTextEncoded = Buffer.from(ciphertext).toString('base64');
        console.log(`[${getFormattedTimestamp()}]`,'cipherTextEncoded: ',cipherTextEncoded);
        const randomBytes = crypto.randomBytes(16).toString('hex');
        console.log(`[${getFormattedTimestamp()}]`,'randomBytes: ',randomBytes);
        return { status: "OK", idc: "01234567890ABCDEF", ciphertext: `${cipherTextEncoded}`, challenge: `${randomBytes}` };
      },
      loginReq: function (args) {
        let idc = args.idc;
        const randomBytes = crypto.randomBytes(16).toString('hex');
        console.log(`[${getFormattedTimestamp()}]`,'randomBytes: ',randomBytes);
        return { challenge: `${randomBytes}` };
      }
    }
  }
};

const wsdl = fs.readFileSync('./lepagoservice.wsdl', 'utf8');
const server = http.createServer(app);
soap.listen(server, '/lepagoservice', service, wsdl);

server.listen(PORT, () => {
  console.log(`[${getFormattedTimestamp()}]`,'SOAP service is running on /lepagoservice');
});
