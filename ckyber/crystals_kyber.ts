const nodeCrypto = require('crypto');
const fs = require('fs');
const { MlKem1024 } = require('mlkem');
const { getFormattedTimestamp } = require('../timestamp/timestamp');


class AuthService {
    private kem: typeof MlKem1024;
    private idcs: any[] = [];
    private publicKeys: any[] = [];
    private sharedSecrets: any[] = [];
    private challenges: any[] = [];
    private challengeHashes: any[] = [];
    private idc_counter_sarray_view: Int32Array;

    constructor() {
        this.kem = new MlKem1024();
        const buffer = new SharedArrayBuffer(4);
        this.idc_counter_sarray_view = new Int32Array(buffer);
        Atomics.store(this.idc_counter_sarray_view, 0, 0);
    }

    private getNextIdcAtomically(): number {
        const previousCounterValue = Atomics.add(this.idc_counter_sarray_view, 0, 1);
        const idc = this.getMillisecondsSince1900() + previousCounterValue;
        return idc;
    }

    public async registerUser(login_name: string, publicKey: any) {
        console.log(`[${getFormattedTimestamp()}]`,'Registering user: ',login_name);
        const originalPublicKey = Buffer.from(publicKey, 'base64');
        this.publicKeys.push({login_name, originalPublicKey});
        const [ciphertext, sharedSecret] = await this.kem.encap(originalPublicKey);
        this.sharedSecrets.push({login_name, sharedSecret});
        let cipherTextEncoded = Buffer.from(ciphertext).toString('base64');
        console.log(`[${getFormattedTimestamp()}]`,'Ciphertext: ',cipherTextEncoded);
        const idc = this.getNextIdcAtomically();
        this.idcs.push({login_name, idc});
        return [ cipherTextEncoded, idc ];
    }

    public async getLoginNameFromIdc(idc: number) {
        const idcf = this.idcs.find(iter => iter.idc == idc);
        if (!idcf) {
            return null;
        }
        return idcf.login_name;
    }

    public getSharedSecret(login_name: string) {
      console.log(`[${getFormattedTimestamp()}]`,'Getting shared secret for: ',login_name);
      const sharedSecret = this.sharedSecrets.find(iter => iter.login_name == login_name);
      if (!sharedSecret) {
          throw new Error(`User ${login_name} not found for shared secret`);
      }
      console.log(`[${getFormattedTimestamp()}]`,'Shared secret: ',sharedSecret);
      return sharedSecret;
    }

    public genChallenge(login_name: string) {
      console.log(`[${getFormattedTimestamp()}]`,'Generating challenge for: ',login_name);
      const randomBytes = nodeCrypto.randomBytes(16).toString('hex');
      console.log(`[${getFormattedTimestamp()}]`,'Random bytes: ',randomBytes);
      this.challenges.push({login_name, challenge: randomBytes});
      return randomBytes;
    }

    public registerIdc(login_name: string, idc: string) {
      console.log(`[${getFormattedTimestamp()}]`,'Registering IDC for: ',login_name);
      this.idcs.push({login_name, idc});
      console.log(`[${getFormattedTimestamp()}]`,'IDC registered for: ',login_name);
    }

    public registerChallengeHash(login_name: string, hash: string) {
      console.log(`[${getFormattedTimestamp()}]`,'Registering challenge hash for: ',login_name);
      this.challengeHashes.push({login_name, hash});
    }

    public getIdc(login_name: string) {
      console.log(`[${getFormattedTimestamp()}]`,'Getting IDC for: ',login_name);
      const idc = this.idcs.find(iter => iter.login_name == login_name);
      if (!idc) {
        throw new Error(`User ${login_name} not found for IDC`);
      }
      console.log(`[${getFormattedTimestamp()}]`,'IDC: ',idc);
      return idc;
    }

    public syncToIdcs() {
      console.log(`[${getFormattedTimestamp()}]`,'Syncing IDCs to file');
      try {
        fs.writeFileSync('/home/node/app/idcs.json', JSON.stringify(this.idcs, null, 2));
        console.log(`[${getFormattedTimestamp()}]`,'IDCs synced to file');
      } catch (error) {
        console.error(`[${getFormattedTimestamp()}]`,'Error syncing IDCs to file: ',error);
      }
    }

    public syncToFilePublicKeys() {
      console.log(`[${getFormattedTimestamp()}]`,'Syncing Public Keys to file');
      try {
        fs.writeFileSync('/home/node/app/public_keys.json', JSON.stringify(this.publicKeys, null, 2));
        console.log(`[${getFormattedTimestamp()}]`,'Public Keys synced to file');
      } catch (error) {
        console.error(`[${getFormattedTimestamp()}]`,'Error syncing Public Keys to file: ',error);
      }
    }

    public syncToFileSharedSecrets() {
      console.log(`[${getFormattedTimestamp()}]`,'Syncing Shared Secrets to file');
      try {
        fs.writeFileSync('/home/node/app/shared_secrets.json', JSON.stringify(this.sharedSecrets, null, 2));
        console.log(`[${getFormattedTimestamp()}]`,'Shared Secrets synced to file');
      } catch (error) {
        console.error(`[${getFormattedTimestamp()}]`,'Error syncing Shared Secrets to file: ',error);
      }
    }

    public syncToFileChallenges() {
      console.log(`[${getFormattedTimestamp()}]`,'Syncing Challenges to file');
      try {
        fs.writeFileSync('/home/node/app/challenges.json', JSON.stringify(this.challenges, null, 2));
        console.log(`[${getFormattedTimestamp()}]`,'Challenges synced to file');
      } catch (error) {
        console.error(`[${getFormattedTimestamp()}]`,'Error syncing Challenges to file: ',error);
      }
    }

    public syncToFileAll() {
      this.syncToFilePublicKeys();
      this.syncToFileSharedSecrets();
      this.syncToFileChallenges();
      this.syncToIdcs();
    }

    public loadFromFilePublicKeys() {
      //Detect if public_keys.json exists
      if (fs.existsSync('/home/node/app/public_keys.json')) {
        this.publicKeys = JSON.parse(fs.readFileSync('/home/node/app/public_keys.json', 'utf8'));
        console.log(`[${getFormattedTimestamp()}]`,'Loaded public keys from file');
        return true;
      }
      return false;
    }
    
    public loadFromFileSharedSecrets() {
      //Detect if shared_secrets.json exists
      if (fs.existsSync('/home/node/app/shared_secrets.json')) {
        this.sharedSecrets = JSON.parse(fs.readFileSync('/home/node/app/shared_secrets.json', 'utf8'));
        console.log(`[${getFormattedTimestamp()}]`,'Loaded shared secrets from file');
        return true;
      }
      return false;
    }

    public loadFromFileChallenges() {
      //Detect if challenges.json exists
      if (fs.existsSync('/home/node/app/challenges.json')) {
        this.challenges = JSON.parse(fs.readFileSync('/home/node/app/challenges.json', 'utf8'));
        console.log(`[${getFormattedTimestamp()}]`,'Loaded challenges from file');
        return true;
      }
      return false;
    }

    public loadFromFileIdcs() {
      if (fs.existsSync('/home/node/app/idcs.json')) {
        this.idcs = JSON.parse(fs.readFileSync('/home/node/app/idcs.json', 'utf8'));
        console.log(`[${getFormattedTimestamp()}]`,'Loaded idcs from file');
        return true;
      }
      return false;
    }

    public loadFromFileAll() {    
      console.log(`[${getFormattedTimestamp()}]`,'Loading from file all, reanimation...');
      const response1 = this.loadFromFilePublicKeys();
      const response2 = this.loadFromFileSharedSecrets();
      const response3 = this.loadFromFileChallenges();
      const response4 = this.loadFromFileIdcs();
      console.log(`[${getFormattedTimestamp()}]`,'Loading from file all, reanimation successful');
      return response1 && response2 && response3 && response4;
    }

    private getMillisecondsSince1900(): number {
      const millisecondsSince1970Epoch = new Date().getTime();
      const epoch1900Offset = new Date('1900-01-01T00:00:00Z').getTime();
      return millisecondsSince1970Epoch - epoch1900Offset;
    }
}



module.exports = AuthService;