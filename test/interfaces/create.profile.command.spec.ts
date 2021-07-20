/*
 *
 * Copyright 2018-present NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { expect } from 'chai';
import * as fs from 'fs';
import { Account, NetworkType, Password } from 'symbol-sdk';
import { AccountCredentialsTable, CreateProfileCommand } from '../../src/interfaces/create.profile.command';
import { NetworkCurrency } from '../../src/models/networkCurrency.model';
import { epochAdjustment } from '../../src/models/profile.model';
import { ProfileRepository } from '../../src/respositories/profile.repository';
import { mockHdProfile1, mockPrivateKeyProfile1 } from '../mocks/profiles/profile.mock';

const networkCurrency = NetworkCurrency.createFromDTO({ namespaceId: 'symbol.xym', divisibility: 6 });

describe('Create Profile Command', () => {
    let repositoryFileUrl: string;
    let command: CreateProfileCommand;

    class StubCommand extends CreateProfileCommand {
        constructor() {
            super(repositoryFileUrl);
        }
        execute() {
            throw new Error('Method not implemented');
        }
    }

    const removeAccountsFile = () => {
        const file = (process.env.HOME || process.env.USERPROFILE) + '/' + repositoryFileUrl;
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    };

    before(() => {
        removeAccountsFile();
        repositoryFileUrl = '.symbolrctest.json';
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
        const name = 'default';

        const profile = command['createProfile']({
            generationHash: '',
            isDefault: false,
            name,
            epochAdjustment: epochAdjustment,
            networkCurrency,
            networkType: NetworkType.MAIN_NET,
            password: new Password('password'),
            url: 'http://localhost:3000',
            privateKey: Account.generateNewAccount(NetworkType.MAIN_NET).privateKey,
        });

        expect(profile.name).to.equal(name);
    });

    it('should set as default when creating new profile', () => {
        const name = 'default';

        const profile = command['createProfile']({
            generationHash: '',
            isDefault: true,
            name,
            epochAdjustment,
            networkCurrency,
            networkType: NetworkType.MAIN_NET,
            password: new Password('password'),
            url: 'http://localhost:3000',
            privateKey: Account.generateNewAccount(NetworkType.MAIN_NET).privateKey,
        });

        expect(profile.name).to.equal(name);
        expect(new ProfileRepository(repositoryFileUrl).getDefaultProfile().name).to.equal(name);
    });

    it('should set profile as default', () => {
        const name = 'new profile';

        command['createProfile']({
            generationHash: '',
            isDefault: true,
            name,
            epochAdjustment,
            networkCurrency,
            networkType: NetworkType.MAIN_NET,
            password: new Password('password'),
            url: 'http://localhost:3000',
            privateKey: Account.generateNewAccount(NetworkType.MAIN_NET).privateKey,
        });

        command['setDefaultProfile'](name);

        expect(new ProfileRepository(repositoryFileUrl).getDefaultProfile().name).to.equal(name);
    });

    it('should throw when the profile already exists', () => {
        const name = 'new profile';

        expect(() => {
            command['createProfile']({
                generationHash: '',
                isDefault: true,
                name,
                epochAdjustment,
                networkCurrency,
                networkType: NetworkType.MAIN_NET,
                password: new Password('password'),
                url: 'http://localhost:3000',
                privateKey: Account.generateNewAccount(NetworkType.MAIN_NET).privateKey,
            });
        }).not.to.throw();

        expect(() => {
            command['createProfile']({
                generationHash: '',
                isDefault: true,
                name,
                epochAdjustment,
                networkCurrency,
                networkType: NetworkType.MAIN_NET,
                password: new Password('password'),
                url: 'http://localhost:3000',
                privateKey: Account.generateNewAccount(NetworkType.MAIN_NET).privateKey,
            });
        }).to.throw();
    });

    it('should not set as default if profile does not exist', () => {
        expect(() => command['setDefaultProfile']('random')).to.throws(Error);
    });
});

describe('AccountCredentialsTable', () => {
    it('toString() should not be undefined when creating a table from an account', () => {
        const table = AccountCredentialsTable.createFromAccount(Account.generateNewAccount(NetworkType.MAIN_NET));

        const tableAsString = table.toString();
        expect(tableAsString).not.to.be.undefined;
        expect(tableAsString.length).greaterThan(0);
    });

    it('toString() should not be undefined when creating a table from a private key profile', () => {
        const table = mockPrivateKeyProfile1.getTable(new Password('password'));

        const tableAsString = table.toString();
        expect(tableAsString).not.to.be.undefined;
        expect(tableAsString.length).greaterThan(0);
    });

    it('toString() should not be undefined when creating a table from an HD profile', () => {
        const table = mockHdProfile1.getTable(new Password('password'));

        const tableAsString = table.toString();
        expect(tableAsString).not.to.be.undefined;
        expect(tableAsString.length).greaterThan(0);
    });
});
