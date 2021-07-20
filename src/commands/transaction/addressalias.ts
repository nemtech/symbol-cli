/*
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
import { AddressAliasTransaction, Deadline } from 'symbol-sdk';
import { AnnounceTransactionsCommand } from '../../interfaces/announce.transactions.command';
import { AnnounceTransactionsOptions } from '../../interfaces/announce.transactions.options';
import { LinkActionResolver } from '../../resolvers/action.resolver';
import { AddressResolver } from '../../resolvers/address.resolver';
import { MaxFeeResolver } from '../../resolvers/maxFee.resolver';
import { NamespaceNameResolver } from '../../resolvers/namespace.resolver';
import { TransactionSignatureOptions } from '../../services/transaction.signature.service';

export class CommandOptions extends AnnounceTransactionsOptions {
    @option({
        flag: 'a',
        description: 'Alias action (Link, Unlink).',
    })
    action: string;

    @option({
        flag: 'a',
        description: 'Account address.',
    })
    address: string;

    @option({
        flag: 'n',
        description: 'Namespace name.',
    })
    namespaceName: string;
}

@command({
    description: 'Set an alias to an address',
})
export default class extends AnnounceTransactionsCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        const profile = this.getProfile(options);
        const account = await this.getSigningAccount(profile, options);
        const namespaceId = await new NamespaceNameResolver().resolve(options);
        const address = await new AddressResolver().resolve(options);
        const action = await new LinkActionResolver().resolve(options);
        const maxFee = await new MaxFeeResolver().resolve(options);
        const multisigSigner = await this.getMultisigSigner(options);

        const transaction = AddressAliasTransaction.create(
            Deadline.create(profile.epochAdjustment),
            action,
            namespaceId,
            address,
            profile.networkType,
            maxFee,
        );

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
