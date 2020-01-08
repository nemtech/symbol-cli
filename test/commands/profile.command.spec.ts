import {expect} from 'chai';
import * as fs from 'fs';
import {NetworkType, Password, SimpleWallet} from 'nem2-sdk';
import {ProfileCommand} from '../../src/profile.command';
import {ProfileRepository} from '../../src/respository/profile.repository';

describe('Profile Command', () => {
    let repositoryFileUrl: string;
    let command: ProfileCommand;
    let wallet: SimpleWallet;

    class StubCommand extends ProfileCommand {
        constructor() {
            super(repositoryFileUrl);
        }

        execute(...args: any[]) {
            throw new Error('Method not implemented.');
        }
    }

    const removeAccountsFile = () => {
        if (fs.existsSync(process.env.HOME || process.env.USERPROFILE + '/' + repositoryFileUrl)) {
            fs.unlinkSync(process.env.HOME || process.env.USERPROFILE + '/' + repositoryFileUrl);
        }
    };

    before(() => {
        removeAccountsFile();
        repositoryFileUrl = '.nem2rctest.json';
        wallet = SimpleWallet.create('test', new Password('12345678'), NetworkType.MIJIN_TEST);
        command = new StubCommand();
    });

    beforeEach(() => {
        removeAccountsFile();
    });

    after(() => {
        removeAccountsFile();
    });

    it('repository url should be overwritten', () => {
        expect(command['profileService']['profileRepository']['fileUrl']).to.equal(repositoryFileUrl);
    });

    it('should create a new profile', () => {
        new ProfileRepository(repositoryFileUrl).save(wallet, 'http://localhost:3000', '1');
        const profileOptions = {profile: wallet.name};
        const profile = command['getProfile'](profileOptions);
        expect(profile.name).to.equal(wallet.name);
    });

    it('should not set as default if profile does not exist', () => {
        const profileOptions = {profile: 'random'};
        expect(() => command['getProfile'](profileOptions))
            .to.throws(Error);
    });
});
