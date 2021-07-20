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

import { Options } from 'clime';
import { Network } from 'symbol-hd-wallets';
import { NetworkType } from 'symbol-sdk';
import { publicKeys } from '../config/keys-whitelist';
import { Choices } from '../interfaces/options.interface';
import { OptionsChoiceResolver } from '../options-resolver';
import { AccountService } from '../services/account.service';
import { Resolver } from './resolver';

export interface OptinPathNumber {
    pathNumber: number;
    optin: boolean;
}

/**
 * Optin Adresses and Path Number resolver
 */
export class OptinPathNumberResolver implements Resolver {
    constructor(public mnemonic: string, public networkType: NetworkType) {}

    /**
     * Resolves a path number provided by the user.
     * @returns {Promise<number>}
     */
    async resolve(options: Options): Promise<OptinPathNumber> {
        const possibleOptInAccounts = AccountService.generateAccountsFromMnemonic(this.mnemonic, this.networkType, Network.BITCOIN);

        const optinPublicKeys = publicKeys
            ? publicKeys
            : {
                  mainnet: [''],
                  testnet: [''],
              };

        // whitelist opt in accounts
        const key = this.networkType === NetworkType.MAIN_NET ? 'mainnet' : 'testnet';
        const whitelisted = optinPublicKeys[key];
        const optInAccounts = possibleOptInAccounts
            .map((account, index) => {
                return { account, inx: index, optin: true };
            })
            .filter(({ account }) => whitelisted.indexOf(account.publicKey) >= 0);

        const hdAccounts = AccountService.generateAccountsFromMnemonic(this.mnemonic, this.networkType, Network.SYMBOL);
        const choices: Choices<OptinPathNumber>[] = [
            ...optInAccounts,
            ...hdAccounts.map((account, inx) => ({ account, inx, optin: false })),
        ].map(({ account, inx, optin }, index) => ({
            title: `${index + 1} \t ${account.address.pretty()} ${optin ? '(Opt-in)' : ''}`,
            value: {
                pathNumber: inx,
                optin,
            },
        }));

        const value = await OptionsChoiceResolver<OptinPathNumber>(
            options,
            'optinPathNumber',
            'Select the child account to import:',
            choices,
            'select',
            undefined,
        );

        return value;
    }
}
