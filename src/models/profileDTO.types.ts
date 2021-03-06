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

/**
 * Base properties of all profiles
 * @export
 * @interface ProfileDTOBase
 */
export interface ProfileDTOBase {
    simpleWallet: ISimpleWalletDTO;
    url: string;
    networkGenerationHash: string;
    epochAdjustment: number | undefined;
    networkCurrency: NetworkCurrencyDTO;
    version: number;
    default: string;
    type: string;
}

/**
 * HD Profile DTO
 * @interface HdProfileDTO
 * @extends {ProfileDTOBase}
 */
export interface HdProfileDTO extends ProfileDTOBase {
    encryptedPassphrase: string;
    path: string;
}

export type ProfileDTO = ProfileDTOBase | HdProfileDTO;
