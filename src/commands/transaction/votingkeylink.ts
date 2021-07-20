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
import { Deadline, Transaction, UInt64, VotingKeyLinkTransaction } from 'symbol-sdk';
import { AnnounceTransactionsCommand } from '../../interfaces/announce.transactions.command';
import { AnnounceTransactionsOptions } from '../../interfaces/announce.transactions.options';
import { Profile } from '../../models/profile.model';
import { LinkActionResolver } from '../../resolvers/action.resolver';
import { FinalizationPointResolver } from '../../resolvers/finalizationPoint.resolver';
import { MaxFeeResolver } from '../../resolvers/maxFee.resolver';
import { PublicKeyResolver } from '../../resolvers/publicKey.resolver';
import { TransactionSignatureOptions } from '../../services/transaction.signature.service';

export class CommandOptions extends AnnounceTransactionsOptions {
    @option({
        flag: 'u',
        description: 'BLS Linked Public Key.',
    })
    linkedPublicKey: string;

    @option({
        description: 'Start Point.',
    })
    startPoint: string;

    @option({
        description: 'End Point.',
    })
    endPoint: string;

    @option({
        flag: 'a',
        description: 'Alias action (Link, Unlink).',
    })
    action: string;
}

@command({
    description: 'Link an account with a BLS public key. Required for node operators willing to vote finalized blocks.    ',
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
        votingKeyLinkAltKey = 'action',
        startPointAltKey = 'startPoint',
        endPointAltKey = 'endPoint',
    ): Promise<Transaction> {
        const linkedPublicKey = (
            await new PublicKeyResolver().resolve(
                options,
                profile.networkType,
                'Enter the public key of the voting key account: ',
                publicKeyAltKey,
            )
        ).publicKey;
        const action = await new LinkActionResolver().resolve(options, 'Select an action:', votingKeyLinkAltKey);

        const startPoint = await new FinalizationPointResolver().resolve(options, 'Enter the start point:', startPointAltKey);
        const endPoint = await new FinalizationPointResolver().resolve(options, 'Enter the end point:', endPointAltKey);

        return VotingKeyLinkTransaction.create(
            Deadline.create(profile.epochAdjustment),
            linkedPublicKey,
            startPoint.compact(),
            endPoint.compact(),
            action,
            profile.networkType,
            1,
            maxFee,
        );
    }
}
