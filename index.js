const http = require('http');
const soap = require('soap');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const PORT = 4000
const app = express();
app.use(bodyParser.raw({ type: () => true, limit: '5mb' }));


const service = {
  LepagoService: {
    LepagoPort: {
      loginReq: function (args) {
        const randomBytes = crypto.randomBytes(32).toString('hex');
        return { challenge: `${randomBytes}` };
      }
    }
  }
};

const wsdl = `
<definitions name="LepagoService"
  targetNamespace="http://www.example.org/lepago"
  xmlns:tns="http://www.example.org/lepago"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns="http://schemas.xmlsoap.org/wsdl/">
  <message name="loginRequest">
    <part name="id" type="xsd:string"/>
  </message>
  <message name="loginResponse">
    <part name="challenge" type="xsd:string"/>
  </message>
  <portType name="LepagoPortType">
    <operation name="loginReq">
      <input message="tns:loginRequest"/>
      <output message="tns:loginResponse"/>
    </operation>
  </portType>
  <binding name="LepagoBinding" type="tns:LepagoPortType">
    <soap:binding style="rpc" transport="http://schemas.xmlsoap.org/soap/http"/>
      <operation name="loginReq">
      <soap:operation soapAction="http://www.example.org/lepago#loginReq"/>
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
      <soap:address location="http://localhost:`+PORT+`/wsdl"/>
    </port>
  </service>
</definitions>
`;

app.get('/wsdl-rest', (req, res) => {
  res.type('application/xml');
  res.send(wsdl);
});

const server = http.createServer(app);

soap.listen(server, '/wsdl', service, wsdl);

server.listen(PORT, () => {
  console.log('SOAP service is running');
  console.log('WSDL is accessible via REST at http://localhost:'+PORT+'/wsdl-rest');
});
