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
import { ImportProfileOptions } from '../interfaces/importProfile.options';
import { OptionsConfirmResolver } from '../options-resolver';
import { Resolver } from './resolver';

/**
 * Optin resolver
 */
export class OptinResolver implements Resolver {
    /**
     * Resolves if the account is imported using the optin. Opt-in Symbol wallet uses curve Secp256K1 else uses curve Ed25519
     * @param {CommandOptions} options - Command options.
     * @param {string} altText - Alternative text.
     * @returns {Promise<boolean>}
     */
    async resolve(options: ImportProfileOptions, altText?: string): Promise<boolean> {
        if (await OptionsConfirmResolver(options, 'optin', altText ? altText : 'Are you importing an Opted In account?')) {
            options.optin = true;
        }
        return options.optin;
    }
}
