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
import { command, metadata } from 'clime';
import { CreateProfileCommand } from '../../interfaces/create.profile.command';
import { ImportProfileOptions } from '../../interfaces/importProfile.options';
import { ImportType } from '../../models/importType.enum';
import {
    HdProfileCreation,
    LedgerProfileCreation,
    PrivateKeyProfileCreation,
    ProfileCreationBase,
} from '../../models/profileCreation.types';
import { DefaultResolver } from '../../resolvers/default.resolver';
import { EpochAdjustmentResolver } from '../../resolvers/epochAdjustment.resolver';
import { GenerationHashResolver } from '../../resolvers/generationHash.resolver';
import { ImportTypeResolver } from '../../resolvers/importType.resolver';
import { LedgerResolver } from '../../resolvers/ledger.resolver';
import { MnemonicResolver } from '../../resolvers/mnemonic.resolver';
import { NetworkResolver } from '../../resolvers/network.resolver';
import { NetworkCurrencyResolver } from '../../resolvers/networkCurrency.resolver';
import { OptinResolver } from '../../resolvers/optin.resolver';
import { OptinPathNumber, OptinPathNumberResolver } from '../../resolvers/optinPathNumber.resolver';
import { PasswordResolver } from '../../resolvers/password.resolver';
import { PathNumberResolver } from '../../resolvers/pathNumber.resolver';
import { PrivateKeyResolver } from '../../resolvers/privateKey.resolver';
import { ProfileNameResolver } from '../../resolvers/profile.resolver';
import { URLResolver } from '../../resolvers/url.resolver';
import { FormatterService } from '../../services/formatter.service';

@command({
    description: 'Create a new profile with existing private key',
})
export default class extends CreateProfileCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: ImportProfileOptions) {
        const networkType = await new NetworkResolver().resolve(options);
        options.url = await new URLResolver().resolve(options);
        const name = await new ProfileNameResolver().resolve(options);
        const isDefault = await new DefaultResolver().resolve(options);

        this.spinner.start();
        const generationHash = await new GenerationHashResolver().resolve(options);
        const epochAdjustment = await new EpochAdjustmentResolver().resolve(options);
        const networkCurrency = await new NetworkCurrencyResolver().resolve(options);
        this.spinner.stop();

        const importType = await new ImportTypeResolver().resolve(options);

        const url = options.url;
        const baseArguments: ProfileCreationBase = {
            generationHash,
            epochAdjustment,
            isDefault,
            name,
            networkCurrency,
            networkType,
            url,
        };

        if (importType === ImportType.PrivateKey) {
            const password = await new PasswordResolver().resolve(options);
            const privateKey = await new PrivateKeyResolver().resolve(options);
            const args: PrivateKeyProfileCreation = { ...baseArguments, password, privateKey };
            const profile = this.createProfile(args);
            console.log(profile.getTable(password).toString());
        } else if (importType === ImportType.Mnemonic) {
            const password = await new PasswordResolver().resolve(options);
            const mnemonic = await new MnemonicResolver().resolve(options);
            let optinPathNumber: OptinPathNumber;
            if (options.pathNumber) {
                const optin = await new OptinResolver().resolve(options);
                optinPathNumber = { pathNumber: await new PathNumberResolver().resolve(options), optin: optin };
            } else {
                optinPathNumber = await new OptinPathNumberResolver(mnemonic, networkType).resolve(options);
            }
            const args: HdProfileCreation = { ...baseArguments, password, mnemonic, ...optinPathNumber };
            const profile = this.createProfile(args);
            console.log(profile.getTable(password).toString());
        } else if (importType === ImportType.Ledger) {
            const optin = await new OptinResolver().resolve(options);
            const ledgerArguments = await new LedgerResolver(networkType, optin, this.spinner).resolve(options);
            const args: LedgerProfileCreation = { ...baseArguments, ...ledgerArguments };
            const profile = this.createProfile(args);
            console.log(profile.getTable(undefined).toString());
        } else {
            throw new Error(`Invalid import type ${importType}`);
        }

        console.log(FormatterService.success(`Stored ${name} profile`));
    }
}
