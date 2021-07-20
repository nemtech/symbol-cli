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
import { Account, Password, PublicAccount, SimpleWallet } from 'symbol-sdk';
import { SigningAccount } from '../services/signing.service';
import { NetworkCurrency } from './networkCurrency.model';
import { CURRENT_PROFILE_VERSION, epochAdjustment, Profile, ProfileType } from './profile.model';
import { PrivateKeyProfileCreation } from './profileCreation.types';
import { PrivateKeyProfileDto } from './profileDTO.types';
export class PrivateKeyProfile extends Profile<SimpleWallet> {
    /**
     * Creates a new Private Key Profile from a DTO
     * @static
     * @param {ProfileDTOBase} DTO
     * @returns {PrivateKeyProfile}
     */
    public static createFromDTO(DTO: PrivateKeyProfileDto): PrivateKeyProfile {
        return new PrivateKeyProfile(
            SimpleWallet.createFromDTO(DTO.simpleWallet),
            DTO.url,
            DTO.networkGenerationHash,
            DTO.epochAdjustment || epochAdjustment,
            NetworkCurrency.createFromDTO(DTO.networkCurrency),
            DTO.version,
            DTO.type as ProfileType,
            DTO.default as '0' | '1',
        );
    }

    /**
     * Creates a new Private Key Profile
     * @static
     * @param {PrivateKeyProfileCreation} args
     * @returns {PrivateKeyProfile}
     */
    public static create(args: PrivateKeyProfileCreation): PrivateKeyProfile {
        const simpleWallet = SimpleWallet.createFromPrivateKey(args.name, args.password, args.privateKey, args.networkType);
        return new PrivateKeyProfile(
            simpleWallet,
            args.url,
            args.generationHash,
            args.epochAdjustment,
            args.networkCurrency,
            CURRENT_PROFILE_VERSION,
            'PrivateKey',
            args.isDefault ? '1' : '0',
        );
    }

    /**
     * Creates a DTO
     * @returns {ProfileDTOBase}
     */
    public toDTO(): PrivateKeyProfileDto {
        return {
            simpleWallet: this.simpleWallet.toDTO(),
            url: this.url,
            epochAdjustment: this.epochAdjustment,
            networkGenerationHash: this.networkGenerationHash,
            networkCurrency: this.networkCurrency.toDTO(),
            version: this.version,
            default: this.isDefault,
            type: this.type,
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
     * @param {Password} options - The  attribute "password" should contain the profile's password.
     * @throws {ExpectedError}
     * @returns {Account}
     */
    public decrypt(password: Password): Account {
        if (!this.isPasswordValid(password)) {
            throw new ExpectedError('The password provided does not match your account password');
        }
        return this.simpleWallet.open(password);
    }

    getAccount(password?: Password): Account | PublicAccount {
        if (!password) {
            throw new Error('Password must be provided');
        }
        return this.decrypt(password);
    }

    public getTable(password?: Password): HorizontalTable {
        const table = this.getBaseTable();
        if (password) {
            table.push(['Password', password.value]);
            table.push(['Private key', this.decrypt(password).privateKey]);
        }
        return table;
    }

    public async getSigningAccount(passwordResolver: () => Promise<Password>): Promise<SigningAccount> {
        throw this.decrypt(await passwordResolver());
    }
}
