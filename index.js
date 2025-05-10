const http = require('http');
const soap = require('soap');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { MlKem1024 } = require('mlkem');
const QRCode = require('qrcode');
const { isThereThisUserAlias } = require('./db/db_access');


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
        //ALM Check availability of login_name...
        const isUserAliasRegistered = await isThereThisUserAlias(login_name);
        if (!isUserAliasRegistered) {
          console.log(`[${new Date().toISOString()}] loginReg->ALREADY_REGISTERED(${login_name})`);
          return { status: "ALREADY_REGISTERED", idc: "", ciphertext: "", challenge: "" };
        }
        console.log(`[${new Date().toISOString()}]`,"pubkey on b64 to hex:", Buffer.from(public_key, 'base64').toString('hex'));
        const originalPublicKey = Buffer.from(public_key, 'base64');
        console.log(`[${new Date().toISOString()}]`,'Encapsulating...');
        const [ciphertext, sharedSecret] = await kem.encap(originalPublicKey);
        console.log(`[${new Date().toISOString()}]`,'Encapsulation successful');
        let cipherTextEncoded = Buffer.from(ciphertext).toString('base64');
        console.log(`[${new Date().toISOString()}]`,'cipherTextEncoded: ',cipherTextEncoded);
        const randomBytes = crypto.randomBytes(16).toString('hex');
        console.log(`[${new Date().toISOString()}]`,'randomBytes: ',randomBytes);
        return { status: "OK", idc: "01234567890ABCDEF", ciphertext: `${cipherTextEncoded}`, challenge: `${randomBytes}` };
      },
      loginReq: function (args) {
        let idc = args.idc;
        const randomBytes = crypto.randomBytes(16).toString('hex');
        console.log(`[${new Date().toISOString()}]`,'randomBytes: ',randomBytes);
        return { challenge: `${randomBytes}` };
      }
    }
  }
};

const wsdl = `
<definitions name="LepagoService"
  targetNamespace="http://www.example.org/lepagoservice"
  xmlns:tns="http://www.example.org/lepagoservice"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns="http://schemas.xmlsoap.org/wsdl/">
  <message name="loginReg">
    <part name="login_name" type="xsd:string"/>
    <part name="pubkey" type="xsd:string"/>
  </message>
  <message name="loginReq">
    <part name="idc" type="xsd:string"/>
  </message>
  <message name="challengeResp">
    <part name="hash" type="xsd:string"/>
  </message>
  <message name="loginRegResp">
    <part name="status" type="xsd:string"/>
    <part name="idc" type="xsd:string"/>
    <part name="ciphertext" type="xsd:string"/>
    <part name="challenge" type="xsd:string"/>
  </message>
  <message name="loginReqResp">
    <part name="challenge" type="xsd:string"/>
  </message>
  <message name="SAck">
    <part name="status" type="xsd:string"/>
  </message>
  <portType name="LepagoPortType">
    <operation name="loginReg">
      <input message="tns:loginReg"/>
      <output message="tns:loginRegResp"/>
    </operation>
    <operation name="loginReq">
      <input message="tns:loginReq"/>
      <output message="tns:loginReqResp"/>
    </operation>
    <operation name="challengeResp">
      <input message="tns:challengeResp"/>
      <output message="tns:SAck"/>
    </operation>
  </portType>
  <binding name="LepagoBinding" type="tns:LepagoPortType">
    <soap:binding style="rpc" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="loginReg">
      <soap:operation soapAction="http://www.example.org/lepagoservice#loginReg"/>
      <input>
        <soap:body use="literal" namespace="http://www.example.org/lepagoservice"/>
      </input>
      <output>
        <soap:body use="literal"/>
        <soap:body use="literal"/>
        <soap:body use="literal"/>
        <soap:body use="literal"/>
      </output>
    </operation>
    <operation name="loginReq">
      <soap:operation soapAction="http://www.example.org/lepagoservice#loginReq"/>
      <input>
        <soap:body use="literal"/>
      </input>
      <output>
        <soap:body use="literal"/>
      </output>
    </operation>
    <operation name="challengeResp">
      <soap:operation soapAction="http://www.example.org/lepagoservice#challengeResp"/>
      <input>
        <soap:body use="literal"/>
      </input>
      <output>
        <soap:body use="literal"/>
      </output>
    </operation>
  </binding>
  <service name="LepagoService">
    <port name="LepagoPort" binding="tns:LepagoBinding">
      <soap:address location="http://localhost:`+PORT_REST+`/lepagoservice"/>
    </port>
  </service>
</definitions>
`;

const server = http.createServer(app);
soap.listen(server, '/lepagoservice', service, wsdl);

server.listen(PORT, () => {
  console.log('SOAP service is running on /lepagoservice');
});
