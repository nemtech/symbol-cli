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

import { command, metadata, option } from 'clime';
import { Deadline, NamespaceRegistrationTransaction, NamespaceRegistrationType } from 'symbol-sdk';
import { AnnounceTransactionsCommand } from '../../interfaces/announce.transactions.command';
import { AnnounceTransactionsOptions } from '../../interfaces/announce.transactions.options';
import { DurationResolver } from '../../resolvers/duration.resolver';
import { MaxFeeResolver } from '../../resolvers/maxFee.resolver';
import { NamespaceNameStringResolver, NamespaceTypeResolver } from '../../resolvers/namespace.resolver';
import { TransactionSignatureOptions } from '../../services/transaction.signature.service';

export class CommandOptions extends AnnounceTransactionsOptions {
    @option({
        flag: 'n',
        description: 'Namespace name.',
    })
    name: string;

    @option({
        flag: 'r',
        description: 'Root namespace.',
        toggle: true,
    })
    rootnamespace: any;

    @option({
        flag: 's',
        description: 'Sub namespace.',
        toggle: true,
    })
    subnamespace: any;

    @option({
        flag: 'd',
        description: 'Duration (use it with --rootnamespace).',
    })
    duration: string;

    @option({
        flag: 'a',
        description: 'Parent namespace name (use it with --subnamespace).',
    })
    parentName: string;
}

@command({
    description: 'Register a namespace',
})
export default class extends AnnounceTransactionsCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        const profile = this.getProfile(options);
        const account = await this.getSigningAccount(profile, options);
        const name = await new NamespaceNameStringResolver().resolve(options, undefined, 'name');
        const namespaceType = await new NamespaceTypeResolver().resolve(options);
        const maxFee = await new MaxFeeResolver().resolve(options);
        const multisigSigner = await this.getMultisigSigner(options);

        let transaction: NamespaceRegistrationTransaction;
        if (namespaceType === NamespaceRegistrationType.RootNamespace) {
            const duration = await new DurationResolver().resolve(options);
            transaction = NamespaceRegistrationTransaction.createRootNamespace(
                Deadline.create(profile.epochAdjustment),
                name,
                duration,
                profile.networkType,
                maxFee,
            );
        } else {
            const parentName = await new NamespaceNameStringResolver().resolve(options, 'Enter the parent namespace name:', 'parentName');
            transaction = NamespaceRegistrationTransaction.createSubNamespace(
                Deadline.create(profile.epochAdjustment),
                name,
                parentName,
                profile.networkType,
                maxFee,
            );
        }

        const signatureOptions: TransactionSignatureOptions = {
            account,
            transactions: [transaction],
            maxFee,
            multisigSigner,
        };

        const signedTransactions = await this.signTransactions(signatureOptions, options);
        this.announceTransactions(options, signedTransactions);
    }
}
