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
import { NetworkType, Password, SimpleWallet } from 'symbol-sdk';
import { HdProfile } from '../../src/models/hdProfile.model';
import { NetworkCurrency } from '../../src/models/networkCurrency.model';
import { epochAdjustment } from '../../src/models/profile.model';
import { HdProfileDTO } from '../../src/models/profileDTO.types';

const networkCurrency = NetworkCurrency.createFromDTO({ namespaceId: 'symbol.xym', divisibility: 6 });

describe('HdProfile MainNet', () => {
    it('should create a profile from mnemonic', () => {
        const generationHash = 'defaultGenerationHash';
        const isDefault = true;
        const name = 'default';
        const networkType = NetworkType.MAIN_NET;
        const password = new Password('password');
        const url = 'http://localhost:3000';
        const mnemonic = 'test';
        const expectedPath = "m/44'/4343'/0'/0'/0'";
        const pathNumber = 0;

        const profile = HdProfile.create({
            generationHash,
            isDefault,
            name,
            networkCurrency,
            epochAdjustment,
            networkType,
            password,
            url,
            mnemonic,
            pathNumber,
        });

        expect(profile.networkGenerationHash).to.equal(generationHash);
        expect(profile.type).to.equal('HD');
        expect(profile.isDefault).to.equal('1');
        expect(profile.name).to.equal(name);
        expect(profile.networkType).to.equal(networkType);
        expect(profile.url).to.equal(url);
        expect(profile.encryptedPassphrase).to.exist;
        expect(profile.pathNumber).to.equal(pathNumber);
        expect(profile.path).to.equal(expectedPath);
        expect(profile).instanceOf(HdProfile);
    });

    it('createFromDTO should instantiate an HD wallet properly', () => {
        const networkType = NetworkType.TEST_NET;
        const name = 'profile name';
        const password = new Password('password');
        const simpleWallet = SimpleWallet.createFromPrivateKey(name, password, '0'.repeat(64), networkType);
        const encryptedPassphrase = 'encryptedPassphrase';
        const path = "m/44'/4343'/0'/0'/0'";
        const url = 'http://localhost:3000';
        const networkGenerationHash = 'generationHash';
        const version = 3;
        const isDefault = '0';
        const type = 'HD';

        const profile = HdProfile.createFromDTO({
            simpleWallet: simpleWallet.toDTO(),
            url,
            networkGenerationHash,
            epochAdjustment: epochAdjustment,
            networkCurrency: networkCurrency.toDTO(),
            version,
            default: isDefault,
            type,
            encryptedPassphrase,
            path,
        });

        expect(profile.simpleWallet.encryptedPrivateKey).to.deep.equal(simpleWallet.encryptedPrivateKey);
        expect(profile.networkGenerationHash).to.equal(networkGenerationHash);
        expect(profile.type).to.equal(type);
        expect(profile.isDefault).to.equal(isDefault);
        expect(profile.name).to.equal(name);
        expect(profile.networkType).to.equal(networkType);
        expect(profile.url).to.equal(url);
        expect(profile.encryptedPassphrase).to.equal(encryptedPassphrase);
        expect(profile.path).to.equal(path);
        expect(profile.pathNumber).to.equal(0);
        expect(profile).instanceOf(HdProfile);
    });

    it('should create a DTO', () => {
        const DTO: HdProfileDTO = {
            simpleWallet: {
                name: 'profile name',
                network: 152,
                address: {
                    address: 'TA4E47MGAO57ZJFORKCFSPADBMWHLX7UKMZJKAO',
                    networkType: 152,
                },
                creationDate: '2020-04-09T17:54:30.421',
                schema: 'simple_v1',
                encryptedPrivateKey: 'd47e526995324428257af732684420dbe718047cc8ae2fdfa7ae49f820a300c691ac558b8669d45105acc438b04df83e',
            },
            url: 'http://localhost:3000',
            epochAdjustment: epochAdjustment,
            networkGenerationHash: 'generationHash',
            networkCurrency: { namespaceId: 'symbol.xym', divisibility: 6 },
            version: 3,
            default: '1',
            type: 'HD',
            encryptedPassphrase: 'encryptedPassphrase',
            path: "m/44'/4343'/0'/0'/0'",
        };

        const profile = HdProfile.createFromDTO(DTO);
        expect(profile).instanceOf(HdProfile);
        expect(profile.toDTO().simpleWallet.encryptedPrivateKey).to.deep.equal(DTO.simpleWallet.encryptedPrivateKey);
    });
});

describe('HdProfile TestNet', () => {
    it('should create a profile from mnemonic', () => {
        const generationHash = 'defaultGenerationHash';
        const isDefault = true;
        const name = 'default';
        const networkType = NetworkType.TEST_NET;
        const password = new Password('password');
        const url = 'http://localhost:3000';
        const mnemonic = 'test';
        const expectedPath = "m/44'/1'/0'/0'/0'";
        const pathNumber = 0;

        const profile = HdProfile.create({
            generationHash,
            isDefault,
            name,
            networkCurrency,
            epochAdjustment,
            networkType,
            password,
            url,
            mnemonic,
            pathNumber,
        });

        expect(profile.networkGenerationHash).to.equal(generationHash);
        expect(profile.type).to.equal('HD');
        expect(profile.isDefault).to.equal('1');
        expect(profile.name).to.equal(name);
        expect(profile.networkType).to.equal(networkType);
        expect(profile.url).to.equal(url);
        expect(profile.encryptedPassphrase).to.exist;
        expect(profile.pathNumber).to.equal(pathNumber);
        expect(profile.path).to.equal(expectedPath);
        expect(profile).instanceOf(HdProfile);
    });

    it('should create a profile from optin mnemonic', () => {
        const generationHash = 'defaultGenerationHash';
        const isDefault = true;
        const name = 'default';
        const networkType = NetworkType.TEST_NET;
        const password = new Password('password');
        const url = 'http://localhost:3000';
        const mnemonic = 'test';
        const expectedPath = "m/44'/1'/0'/0'/0'";
        const pathNumber = 0;
        const optin = true;

        const profile = HdProfile.create({
            generationHash,
            isDefault,
            name,
            networkCurrency,
            epochAdjustment,
            networkType,
            password,
            url,
            mnemonic,
            pathNumber,
            optin,
        });

        expect(profile.networkGenerationHash).to.equal(generationHash);
        expect(profile.type).to.equal('HD');
        expect(profile.isDefault).to.equal('1');
        expect(profile.name).to.equal(name);
        expect(profile.networkType).to.equal(networkType);
        expect(profile.url).to.equal(url);
        expect(profile.encryptedPassphrase).to.exist;
        expect(profile.pathNumber).to.equal(pathNumber);
        expect(profile.path).to.equal(expectedPath);
        expect(profile).instanceOf(HdProfile);
    });

    it('createFromDTO should instantiate an HD wallet properly', () => {
        const networkType = NetworkType.TEST_NET;
        const name = 'profile name';
        const password = new Password('password');
        const simpleWallet = SimpleWallet.createFromPrivateKey(name, password, '0'.repeat(64), networkType);
        const encryptedPassphrase = 'encryptedPassphrase';
        const path = "m/44'/1'/0'/0'/0'";
        const url = 'http://localhost:3000';
        const networkGenerationHash = 'generationHash';
        const version = 3;
        const isDefault = '0';
        const type = 'HD';

        const profile = HdProfile.createFromDTO({
            simpleWallet: simpleWallet.toDTO(),
            url,
            networkGenerationHash,
            epochAdjustment: epochAdjustment,
            networkCurrency: networkCurrency.toDTO(),
            version,
            default: isDefault,
            type,
            encryptedPassphrase,
            path,
        });

        expect(profile.simpleWallet.encryptedPrivateKey).to.deep.equal(simpleWallet.encryptedPrivateKey);
        expect(profile.networkGenerationHash).to.equal(networkGenerationHash);
        expect(profile.type).to.equal(type);
        expect(profile.isDefault).to.equal(isDefault);
        expect(profile.name).to.equal(name);
        expect(profile.networkType).to.equal(networkType);
        expect(profile.url).to.equal(url);
        expect(profile.encryptedPassphrase).to.equal(encryptedPassphrase);
        expect(profile.path).to.equal(path);
        expect(profile.pathNumber).to.equal(0);
        expect(profile).instanceOf(HdProfile);
    });

    it('should create a DTO', () => {
        const DTO: HdProfileDTO = {
            simpleWallet: {
                name: 'profile name',
                network: 152,
                address: {
                    address: 'TA4E47MGAO57ZJFORKCFSPADBMWHLX7UKMZJKAO',
                    networkType: 152,
                },
                creationDate: '2020-04-09T17:54:30.421',
                schema: 'simple_v1',
                encryptedPrivateKey: 'd47e526995324428257af732684420dbe718047cc8ae2fdfa7ae49f820a300c691ac558b8669d45105acc438b04df83e',
            },
            url: 'http://localhost:3000',
            epochAdjustment: epochAdjustment,
            networkGenerationHash: 'generationHash',
            networkCurrency: { namespaceId: 'symbol.xym', divisibility: 6 },
            version: 3,
            default: '1',
            type: 'HD',
            encryptedPassphrase: 'encryptedPassphrase',
            path: "m/44'/1'/0'/0'/0'",
        };

        const profile = HdProfile.createFromDTO(DTO);
        expect(profile).instanceOf(HdProfile);
        expect(profile.toDTO().simpleWallet.encryptedPrivateKey).to.deep.equal(DTO.simpleWallet.encryptedPrivateKey);
    });
});
