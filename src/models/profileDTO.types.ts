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
import { ISimpleWalletDTO } from 'symbol-sdk';
import { NetworkCurrencyDTO } from './networkCurrency.model';
import { ProfileType } from './profile.model';

/**
 * Used to instantiate a SimpleWallet
 */
export interface ICliWalletDTO {
    name: string;
    network: number;
    address: {
        address: string;
        networkType: number;
    };
    creationDate: string;
    schema: string;
}

/**
 * Used to instantiate a SimpleWallet
 */
export interface ILedgerWalletDTO extends ICliWalletDTO {
    path: string;
    publicKey: string;
    optin: boolean;
}

/**
 * Base properties of all profiles
 *
 * @interface ProfileDTOBase
 */
export interface ProfileDTOBase {
    url: string;
    networkGenerationHash: string;
    epochAdjustment: number | undefined;
    networkCurrency: NetworkCurrencyDTO;
    version: number;
    default: string;
    type: ProfileType;
}

/**
 * Private key wallet.
 * @export
 * @interface ProfileDTOBase
 */
export interface PrivateKeyProfileDto extends ProfileDTOBase {
    simpleWallet: ISimpleWalletDTO;
}

/**
 * HD Profile DTO
 * @interface HdProfileDTO
 * @extends {ProfileDTOBase}
 */
export interface HdProfileDTO extends ProfileDTOBase {
    simpleWallet: ISimpleWalletDTO;
    encryptedPassphrase: string;
    path: string;
}

/**
 * Ledger Profile DTO
 * @interface LedgerProfileDTO
 * @extends {ProfileDTOBase}
 */
export interface LedgerProfileDTO extends ProfileDTOBase {
    simpleWallet: ILedgerWalletDTO;
}

export type ProfileDTO = PrivateKeyProfileDto | HdProfileDTO | LedgerProfileDTO;
