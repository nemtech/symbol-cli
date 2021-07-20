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
import { Ora } from 'ora';
import { LedgerDerivationPath } from 'symbol-ledger-typescript/lib';
import { NetworkType } from 'symbol-sdk';
import { OptionsChoiceResolver } from '../options-resolver';
import { LedgerService } from '../services/ledger.service';
import { Resolver } from './resolver';

/**
 * Ledger accounts resolver
 */
export class LedgerResolver implements Resolver {
    constructor(private readonly networkType: NetworkType, private readonly optin: boolean, private readonly spinner: Ora) {}
    /**
     * Resolves a mnemonic passphrase provided by the user.
     * @returns {Promise<string>}
     */
    async resolve(options: Options): Promise<{ path: string; optin: boolean; publicKey: string }> {
        this.spinner.start('Connecting to Ledger');
        const accounts = await new LedgerService().resolveLedgerAccountInformation(this.networkType, this.optin);
        this.spinner.stop();
        const choices = accounts.map((key, index) => ({
            // Index is shown as 1-based to match with other wallets UX
            title: `${index + 1} - ${key.address.plain()}`,
            value: index + 1,
        }));

        const accountIndex =
            (await OptionsChoiceResolver(options, 'pathNumber', 'Select the child account number:', choices, 'select', undefined)) - 1;
        return {
            path: LedgerDerivationPath.getPath(this.networkType as number, accountIndex),
            publicKey: accounts[accountIndex].publicKey,
            optin: this.optin,
        };
    }
}
