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
import { AccountKeyLinkTransaction, Deadline, Transaction, UInt64 } from 'symbol-sdk';
import { AnnounceTransactionsCommand } from '../../interfaces/announce.transactions.command';
import { AnnounceTransactionsOptions } from '../../interfaces/announce.transactions.options';
import { Profile } from '../../models/profile.model';
import { LinkActionResolver } from '../../resolvers/action.resolver';
import { MaxFeeResolver } from '../../resolvers/maxFee.resolver';
import { PublicKeyResolver } from '../../resolvers/publicKey.resolver';
import { TransactionSignatureOptions } from '../../services/transaction.signature.service';

export class CommandOptions extends AnnounceTransactionsOptions {
    @option({
        flag: 'u',
        description: 'Linked Public Key.',
    })
    linkedPublicKey: string;

    @option({
        flag: 'a',
        description: 'Alias action (Link, Unlink).',
    })
    action: string;
}

@command({
    description: 'Delegate the account importance to a proxy account. Required for all accounts willing to activate delegated harvesting.',
})
export default class extends AnnounceTransactionsCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        const profile = this.getProfile(options);
        const account = await this.getSigningAccount(profile, options);
        const maxFee = await new MaxFeeResolver().resolve(options);
        const multisigSigner = await this.getMultisigSigner(options);

        const transaction = await this.createTransaction(maxFee, options, profile);
        const signatureOptions: TransactionSignatureOptions = {
            account,
            transactions: [transaction],
            maxFee,
            multisigSigner,
        };

        const signedTransactions = await this.signTransactions(signatureOptions, options);
        this.announceTransactions(options, signedTransactions);
    }

    public async createTransaction(
        maxFee: UInt64,
        options: AnnounceTransactionsOptions,
        profile: Profile,
        publicKeyAltKey = 'linkedPublicKey',
        accountKeyLinkAltKey = 'action',
    ): Promise<Transaction> {
        const linkedPublicKey = (
            await new PublicKeyResolver().resolve(
                options,
                profile.networkType,
                'Enter the public key of the remote account: ',
                publicKeyAltKey,
            )
        ).publicKey;
        const action = await new LinkActionResolver().resolve(options, 'Select an action:', accountKeyLinkAltKey);

        return AccountKeyLinkTransaction.create(
            Deadline.create(profile.epochAdjustment),
            linkedPublicKey,
            action,
            profile.networkType,
            maxFee,
        );
    }
}
