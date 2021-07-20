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
import { CreateProfileOptions } from '../interfaces/create.profile.options';
import { ImportProfileOptions } from '../interfaces/importProfile.options';
import { ImportType } from '../models/importType.enum';
import { OptionsChoiceResolver } from '../options-resolver';
import { Resolver } from './resolver';

/**
 * Import type resolver
 */
export class ImportTypeResolver implements Resolver {
    /**
     * Resolves an import type provided by the user.
     * @param {CreateProfileOptions} options - Command options.
     * @param {string} altText - Alternative text.
     * @param {string} altKey - Alternative key.
     * @returns {Promise<number>}
     */
    async resolve(options: ImportProfileOptions | CreateProfileOptions, altText?: string, altKey?: string): Promise<number> {
        // interpret other options, default to private key profile in case of conflict
        if ('privateKey' in options || 'mnemonic' in options) {
            if (options.privateKey) {
                return ImportType.PrivateKey;
            }
            if (options.mnemonic) {
                return ImportType.Mnemonic;
            }
        }

        if (options.ledger) {
            return ImportType.Ledger;
        }

        if (options.hd) {
            return ImportType.Mnemonic;
        }

        const choices = Object.keys(ImportType)
            .filter((key) => Number.isNaN(parseFloat(key)))
            .map((string) => ({
                title: string,
                value: ImportType[string as any],
            }));

        const value = +(await OptionsChoiceResolver(
            options,
            altKey ? altKey : 'importType',
            altText ? altText : 'Select an import type:',
            choices,
            'select',
            undefined,
        ));
        return value;
    }
}
