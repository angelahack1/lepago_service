const http = require('http');
const soap = require('soap');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { MlKem1024 } = require('mlkem');

const PORT = 30000
const PORT_REST = 3000
const app = express();
app.use(bodyParser.raw({ type: () => true, limit: '5mb' }));


const service = {
  LepagoService: {
    LepagoPort: {
      loginReg: function (args) {
        let login_name = args.login_name;
        let cptxt = args.cptxt;
        //ALM Check availability of login_name...
        const randomBytes = crypto.randomBytes(16).toString('hex');
        return { status: "OK", idc: "01234567890ABCDEF", challenge: `${randomBytes}` };
      },
      loginReq: function (args) {
        let idc = args.idc;
        //ALM Check correctness of idc...
        const randomBytes = crypto.randomBytes(16).toString('hex');
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
    <part name="cptxt" type="xsd:string"/>
  </message>
  <message name="loginReq">
    <part name="idc" type="xsd:string"/>
  </message>
  <message name="loginRegResp">
    <part name="status" type="xsd:string"/>
    <part name="idc" type="xsd:string"/>
    <part name="challenge" type="xsd:string"/>
  </message>
  <message name="loginReqResp">
    <part name="challenge" type="xsd:string"/>
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
