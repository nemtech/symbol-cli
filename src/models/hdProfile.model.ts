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

import { HorizontalTable } from 'cli-table3';
import { ExpectedError } from 'clime';
import { Account, Crypto, Password, SimpleWallet } from 'symbol-sdk';
import { DerivationService } from '../services/derivation.service';
import { SigningAccount } from '../services/signing.service';
import { NetworkCurrency } from './networkCurrency.model';
import { CURRENT_PROFILE_VERSION, epochAdjustment, Profile, ProfileType } from './profile.model';
import { HdProfileCreation } from './profileCreation.types';
import { HdProfileDTO } from './profileDTO.types';

/**
 * Hd Profile model
 * @export
 * @class HdProfile
 * @extends {Profile}
 */
export class HdProfile extends Profile<SimpleWallet> {
    /**
     * Creates a new HD Profile from a DTO
     * @static
     * @param {HdProfileDTO} DTO
     * @returns {HdProfile}
     */
    public static createFromDTO(DTO: HdProfileDTO): HdProfile {
        return new HdProfile(
            SimpleWallet.createFromDTO(DTO.simpleWallet),
            DTO.url,
            DTO.networkGenerationHash,
            DTO.epochAdjustment || epochAdjustment,
            NetworkCurrency.createFromDTO(DTO.networkCurrency),
            DTO.version,
            DTO.type as ProfileType,
            DTO.default as '0' | '1',
            DTO.encryptedPassphrase,
            DTO.path,
        );
    }

    /**
     * Creates a new HD Profile
     * @static
     * @param {HdProfileCreation} args
     * @returns
     */
    public static create(args: HdProfileCreation): HdProfile {
        let privateKey = '';
        if (args.optin) {
            privateKey = DerivationService.getPrivateKeyFromOptinMnemonic(args.mnemonic, args.pathNumber, args.networkType);
        } else {
            privateKey = DerivationService.getPrivateKeyFromMnemonic(args.mnemonic, args.pathNumber, args.networkType);
        }
        const path = DerivationService.getPathFromPathNumber(args.pathNumber, args.networkType);
        const simpleWallet = SimpleWallet.createFromPrivateKey(args.name, args.password, privateKey, args.networkType);
        return new HdProfile(
            simpleWallet,
            args.url,
            args.generationHash,
            args.epochAdjustment || epochAdjustment,
            args.networkCurrency,
            CURRENT_PROFILE_VERSION,
            'HD',
            args.isDefault ? '1' : '0',
            Crypto.encrypt(args.mnemonic, args.password.value),
            path,
        );
    }

    /**
     * Creates an instance of HdProfile.
     * @param {SimpleWallet} simpleWallet
     * @param {string} url
     * @param {string} networkGenerationHash
     * @param {number} epochAdjustment
     * @param {NetworkCurrency} networkCurrency
     * @param {number} version
     * @param {ProfileType} type
     * @param {('0' | '1')} isDefault
     * @param {string} encryptedPassphrase
     * @param {string} path
     */
    private constructor(
        simpleWallet: SimpleWallet,
        url: string,
        networkGenerationHash: string,
        epochAdjustment: number,
        networkCurrency: NetworkCurrency,
        version: number,
        type: ProfileType,
        isDefault: '0' | '1',
        public readonly encryptedPassphrase: string,
        public readonly path: string,
    ) {
        super(simpleWallet, url, networkGenerationHash, epochAdjustment, networkCurrency, version, type, isDefault);
    }

    /**
     * Gets path number
     * @returns {(number | null)}
     */
    public get pathNumber(): number {
        return DerivationService.getPathIndexFromPath(this.path);
    }

    /**
     * Creates a DTO
     * @returns {HdProfileDTO}
     */
    public toDTO(): HdProfileDTO {
        return {
            simpleWallet: this.simpleWallet.toDTO(),
            url: this.url,
            networkGenerationHash: this.networkGenerationHash,
            epochAdjustment: this.epochAdjustment,
            networkCurrency: this.networkCurrency.toDTO(),
            version: this.version,
            default: this.isDefault,
            type: this.type,
            encryptedPassphrase: this.encryptedPassphrase,
            path: this.path,
        };
    }
    /**
     * Returns true if the password is valid.
     * @param {Password} password.
     * @returns {boolean}
     */
    public isPasswordValid(password: Password): boolean {
        try {
            this.simpleWallet.open(password);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Opens a wallet.
     * @param password The  attribute "password" should contain the profile's password.
     */
    public decrypt(password: Password): Account {
        if (!this.isPasswordValid(password)) {
            throw new ExpectedError('The password provided does not match your account password');
        }
        return this.simpleWallet.open(password);
    }

    public getTable(password?: Password): HorizontalTable {
        const table = this.getBaseTable();
        if (password) {
            table.push(['Password', password.value]);
            table.push(['Mnemonic', Crypto.decrypt(this.encryptedPassphrase, password.value)]);
            table.push(['Private key', this.decrypt(password).privateKey]);
        }
        table.push(['Path', `Path n. ${this.pathNumber + 1} (${this.path})`]);
        return table;
    }

    public async getSigningAccount(passwordResolver: () => Promise<Password>): Promise<SigningAccount> {
        throw this.decrypt(await passwordResolver());
    }
}
