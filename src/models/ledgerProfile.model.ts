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
import { Account, Address, NetworkType, Password, PublicAccount } from 'symbol-sdk';
import { LedgerService } from '../services/ledger.service';
import { SigningAccount } from '../services/signing.service';
import { NetworkCurrency } from './networkCurrency.model';
import { CliWallet, CURRENT_PROFILE_VERSION, epochAdjustment, Profile, ProfileType } from './profile.model';
import { LedgerProfileCreation } from './profileCreation.types';
import { ILedgerWalletDTO, LedgerProfileDTO } from './profileDTO.types';

export class LedgerWallet implements CliWallet {
    public readonly networkType: NetworkType;

    constructor(
        public readonly name: string,
        public readonly address: Address,
        public readonly publicKey: string,
        public readonly path: string,
        public readonly optin: boolean,
    ) {
        this.networkType = address.networkType;
    }

    /**
     * Instantiate a LedgerWallet from a DTO
     * @param dto ledger wallet without prototype
     * @returns an instance of LedgerWallet
     */
    static createFromDTO(dto: ILedgerWalletDTO): LedgerWallet {
        return new LedgerWallet(dto.name, Address.createFromRawAddress(dto.address.address), dto.publicKey, dto.path, dto.optin);
    }

    /**
     * Creates a LedgerWallet DTO
     * @returns {ILedgerWalletDTO}
     */
    toDTO(): ILedgerWalletDTO {
        return JSON.parse(JSON.stringify(this));
    }
}

/**
 * Hd Profile model
 * @export
 * @class HdProfile
 * @extends {Profile}
 */
export class LedgerProfile extends Profile<LedgerWallet> {
    /**
     * Creates a new LEDGER Profile from a DTO
     * @static
     * @param {LedgerProfileDTO} DTO
     * @returns {LedgerProfile}
     */
    public static createFromDTO(DTO: LedgerProfileDTO): LedgerProfile {
        return new LedgerProfile(
            LedgerWallet.createFromDTO(DTO.simpleWallet),
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
     * Creates a new LEDGER Profile
     * @static
     * @param {LedgerProfileCreation} args
     * @returns
     */
    public static create(args: LedgerProfileCreation) {
        const simpleWallet = new LedgerWallet(
            args.name,
            Address.createFromPublicKey(args.publicKey, args.networkType),
            args.publicKey,
            args.path,
            args.optin,
        );
        return new LedgerProfile(
            simpleWallet,
            args.url,
            args.generationHash,
            args.epochAdjustment || epochAdjustment,
            args.networkCurrency,
            CURRENT_PROFILE_VERSION,
            'Ledger',
            args.isDefault ? '1' : '0',
        );
    }

    /**
     * Creates a DTO
     * @returns {LedgerProfileDTO}
     */
    public toDTO(): LedgerProfileDTO {
        return {
            simpleWallet: this.simpleWallet.toDTO(),
            url: this.url,
            networkGenerationHash: this.networkGenerationHash,
            epochAdjustment: this.epochAdjustment,
            networkCurrency: this.networkCurrency.toDTO(),
            version: this.version,
            default: this.isDefault,
            type: this.type,
        };
    }

    public isPasswordValid(): boolean {
        throw new Error("Ledger profiles don't need a password.");
    }
    public decrypt(): Account {
        throw new Error("Ledger profiles don't need a password.");
    }

    getAccount(password?: Password): PublicAccount {
        if (password) {
            throw new Error('Password must is not required provided');
        }
        return PublicAccount.createFromPublicKey(this.simpleWallet.publicKey, this.networkType);
    }

    public getTable(password?: Password): HorizontalTable {
        const table = this.getBaseTable();
        if (password) {
            table.push(['Password', password.value]);
        }
        table.push(['Public Key', this.simpleWallet.publicKey]);
        table.push(['Path', this.simpleWallet.path]);
        table.push(['OptIn', this.simpleWallet.optin]);
        return table;
    }
    public async getSigningAccount(): Promise<SigningAccount> {
        return new LedgerService().resolveLedgerAccount(this.networkType, this.simpleWallet.path, this.simpleWallet.optin);
    }
}
