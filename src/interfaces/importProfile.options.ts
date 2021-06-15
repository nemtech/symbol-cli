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
import { option } from 'clime';
import { CreateProfileOptions } from './create.profile.options';

/**
 * Create profile options.
 */
export class ImportProfileOptions extends CreateProfileOptions {
    @option({
        flag: 'P',
        description: 'Account private key.',
    })
    privateKey: string;

    @option({
        flag: 'M',
        description: '(Optional) Import a profile using a mnemonic.',
    })
    mnemonic: string;

    @option({
        flag: 'N',
        description: '(Optional) HD wallet path number.',
    })
    pathNumber: number;

    @option({
        flag: 'O',
        description: '(Optional) Whether it is an Opt-in account. (Default: false)',
        toggle: true,
    })
    optin: boolean;
}
