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

import * as Table from 'cli-table3';
import { HorizontalTable } from 'cli-table3';
import { Address, NetworkType, Password, RepositoryFactoryHttp } from 'symbol-sdk';
import { SigningAccount } from '../services/signing.service';
import { NetworkCurrency } from './networkCurrency.model';
import { ProfileDTO } from './profileDTO.types';

export const CURRENT_PROFILE_VERSION = 3;

/**
 * Profile DTO mapped by profile names
 */
export type ProfileRecord = Record<string, ProfileDTO>;

/**
 * Profile types.
 */
export type ProfileType = 'PrivateKey' | 'HD' | 'Ledger';

export const epochAdjustment = 1573430400;

/**
 * Basic abstraction of the sdk wallet. The current sdk wallet expect a private key to be present which is not the case in a Ledger.
 */
export interface CliWallet {
    readonly name: string;
    readonly address: Address;
    readonly networkType: NetworkType;
}

/**
 * Base implementation of the Profile models
 * @export
 * @abstract
 * @class Profile
 */
export abstract class Profile<T extends CliWallet = CliWallet> {
    /**
     * Creates an instance of Profile.
     * @param {CliWallet} simpleWallet
     * @param {string} url
     * @param {string} networkGenerationHash
     * @param {number} epochAdjustment the configured epoch adjustment.
     * @param {NetworkCurrency} networkCurrency
     * @param {number} version
     * @param {ProfileType} type
     * @param {('0' | '1')} isDefault
     */
    protected constructor(
        public readonly simpleWallet: T,
        public readonly url: string,
        public readonly networkGenerationHash: string,
        public readonly epochAdjustment: number,
        public readonly networkCurrency: NetworkCurrency,
        public readonly version: number,
        public readonly type: ProfileType,
        public readonly isDefault: '0' | '1',
    ) {}

    /**
     * returns a table with the properties common to all profiles
     * @protected
     * @returns {HorizontalTable}
     */
    protected getBaseTable(): HorizontalTable {
        const { namespaceId, divisibility } = this.networkCurrency;
        const table = new Table({
            style: { head: ['cyan'] },
            head: ['Property', 'Value'],
        }) as HorizontalTable;

        table.push(
            ['Name', this.simpleWallet.name],
            ['Address', this.simpleWallet.address.pretty()],
            ['Network', NetworkType[this.simpleWallet.networkType]],
            ['Node URL', this.url],
            ['Generation Hash', this.networkGenerationHash],
            ['Network Currency', `name: ${namespaceId.fullName}, divisibility: ${divisibility}`],
            ['Profile type', this.type],
        );

        return table;
    }

    /**
     * The table showing the data of the profile.
     */
    public abstract getTable(password?: Password): HorizontalTable;

    /**
     * Gets profile address.
     * @returns {Address}
     */
    public get address(): Address {
        return this.simpleWallet.address;
    }

    /**
     * Gets profile network type.
     * @returns {NetworkType}
     */
    public get networkType(): NetworkType {
        return this.simpleWallet.networkType;
    }

    /**
     * Gets profile name.
     * @returns {string}
     */
    public get name(): string {
        return this.simpleWallet.name;
    }

    /**
     * Gets repository factory.
     * @returns {RepositoryFactoryHttp}
     */
    public get repositoryFactory(): RepositoryFactoryHttp {
        return new RepositoryFactoryHttp(this.url);
    }

    /**
     * Loads a signing accounts, this could be a hardwar device.
     * @param passwordResolver, it allows to resolve the password if it's necessary.
     * @returns {Account}
     */
    public abstract async getSigningAccount(passwordResolver: () => Promise<Password>): Promise<SigningAccount>;

    /**
     * Returns a profile DTO
     * @returns {ProfileDTO}
     */
    public abstract toDTO(): ProfileDTO;

    /**
     * Formats profile as a string.
     * @returns {string}
     */
    public toString(): string {
        return this.getTable(undefined).toString();
    }
}
