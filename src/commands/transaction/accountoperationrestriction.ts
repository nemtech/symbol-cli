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
import { AccountRestrictionTransaction, Deadline } from 'symbol-sdk';
import { AnnounceTransactionsCommand } from '../../interfaces/announce.transactions.command';
import { AnnounceTransactionsOptions } from '../../interfaces/announce.transactions.options';
import { ActionType } from '../../models/action.enum';
import { ActionResolver } from '../../resolvers/action.resolver';
import { MaxFeeResolver } from '../../resolvers/maxFee.resolver';
import { RestrictionAccountOperationFlagsResolver } from '../../resolvers/restrictionAccount.resolver';
import { TransactionTypeResolver } from '../../resolvers/transactionType.resolver';
import { TransactionSignatureOptions } from '../../services/transaction.signature.service';

export class CommandOptions extends AnnounceTransactionsOptions {
    @option({
        flag: 'f',
        description: 'Restriction flag. (' + 'AllowOutgoingTransactionType,' + 'BlockOutgoingTransactionType)',
    })
    flags: string;

    @option({
        flag: 'a',
        description: 'Modification action. (Add, Remove).',
    })
    action: string;

    @option({
        flag: 'v',
        description: 'Transaction type formatted as hex.',
    })
    transactionType: string;
}

@command({
    description: 'Allow or block outgoing transactions by transaction type',
})
export default class extends AnnounceTransactionsCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        const profile = this.getProfile(options);
        const account = await this.getSigningAccount(profile, options);
        const action = await new ActionResolver().resolve(options);
        const flags = await new RestrictionAccountOperationFlagsResolver().resolve(options);
        const transactionType = await new TransactionTypeResolver().resolve(options);
        const maxFee = await new MaxFeeResolver().resolve(options);
        const multisigSigner = await this.getMultisigSigner(options);

        const transaction = AccountRestrictionTransaction.createOperationRestrictionModificationTransaction(
            Deadline.create(profile.epochAdjustment),
            flags,
            action === ActionType.Add ? [transactionType] : [],
            action === ActionType.Remove ? [transactionType] : [],
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
