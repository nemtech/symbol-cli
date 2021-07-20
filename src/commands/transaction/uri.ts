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
import { AnnounceTransactionsCommand } from '../../interfaces/announce.transactions.command';
import { AnnounceTransactionsOptions } from '../../interfaces/announce.transactions.options';
import { TransactionURIResolver } from '../../resolvers/transactionURI.resolver';
import { TransactionSignatureOptions } from '../../services/transaction.signature.service';
import { WebhookService } from '../../services/webhook.service';

export class CommandOptions extends AnnounceTransactionsOptions {
    @option({
        flag: 'u',
        description: 'Transaction URI.',
    })
    uri: string;
}

@command({
    description: 'Announce transaction from URI',
})
export default class extends AnnounceTransactionsCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        const profile = this.getProfile(options);
        const account = await this.getSigningAccount(profile, options);

        const transactionURI = await new TransactionURIResolver().resolve(options);
        const transaction = transactionURI.toTransaction();

        const signatureOptions: TransactionSignatureOptions = {
            account,
            transactions: [transaction],
            maxFee: transaction.maxFee,
        };

        const signedTransactions = await this.signTransactions(signatureOptions, options);
        this.announceTransactions(options, signedTransactions);

        if (transactionURI.webhookUrl) {
            await WebhookService.postAnnounceTransactionWebhook(
                transactionURI.webhookUrl,
                signedTransactions[0].hash,
                signedTransactions[0].signerPublicKey,
            );
        }
    }
}
