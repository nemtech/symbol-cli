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
import {
    AggregateTransaction,
    Convert,
    CosignatureSignedTransaction,
    NetworkType,
    SignedTransaction,
    Transaction,
    TransactionMapping,
    TransactionType,
} from 'symbol-sdk';
import { AnnounceTransactionsCommand } from '../../interfaces/announce.transactions.command';
import { AnnounceTransactionsOptions } from '../../interfaces/announce.transactions.options';
import { Profile } from '../../models/profile.model';
import { OptionsResolver } from '../../options-resolver';
import { CosignatureResolver } from '../../resolvers/cosignature.resolver';
import { FormatterService } from '../../services/formatter.service';
import { TransactionView } from '../../views/transactions/details/transaction.view';

export class CommandOptions extends AnnounceTransactionsOptions {
    @option({
        flag: 'P',
        description: 'Transaction payload to be announced (hex string).',
    })
    payload: string;

    @option({
        flag: 'c',
        description: 'Cosignatures json array to be added (e.g. ["cosig1","cosig2"]).',
    })
    cosignatures: string;
}

@command({
    description: 'Announce a transaction payload (with cosignatures if the type is aggregate complete)',
})
export default class extends AnnounceTransactionsCommand {
    private profile: Profile;
    private options: CommandOptions;

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        this.options = options;
        this.profile = this.getProfile(this.options);

        const txPayload = await OptionsResolver(
            options,
            'payload',
            () => undefined,
            'Enter the transaction payload (hex string):',
            'text',
            undefined,
        );
        const transaction = TransactionMapping.createFromPayload(txPayload) as AggregateTransaction;
        console.log(FormatterService.success('Transaction loaded:'));
        new TransactionView(transaction, undefined, this.profile).print();

        let cosignatures: CosignatureSignedTransaction[] | null = [];
        if (transaction.type === TransactionType.AGGREGATE_COMPLETE) {
            cosignatures = await new CosignatureResolver().resolve(options);
            if (cosignatures) {
                console.log('Cosignatures added:', JSON.stringify(cosignatures));
            } else {
                console.log('No cosignatures added.');
                cosignatures = [];
            }
        }

        const txHash = Transaction.createTransactionHash(txPayload, Array.from(Convert.hexToUint8(this.profile.networkGenerationHash)));
        const signedTransactionWithSignatures = this.signTransactionGivenSignatures(
            txPayload,
            txHash,
            transaction.signer!!.publicKey,
            transaction.type,
            this.profile.networkType,
            cosignatures,
        );

        new TransactionView(transaction, signedTransactionWithSignatures, this.profile).print();
        await this.announceTransactions(options, [signedTransactionWithSignatures]);
    }

    public signTransactionGivenSignatures(
        signedPayload: string,
        transactionHash: string,
        signerPublicKey: string,
        transactionType: TransactionType,
        networkType: NetworkType,
        cosignatureSignedTransactions: CosignatureSignedTransaction[],
    ): SignedTransaction {
        if (cosignatureSignedTransactions && cosignatureSignedTransactions.length > 0) {
            cosignatureSignedTransactions.forEach((cosignedTransaction) => {
                signedPayload += cosignedTransaction.version.toHex() + cosignedTransaction.signerPublicKey + cosignedTransaction.signature;
            });

            // Calculate new size
            const size = `00000000${(signedPayload.length / 2).toString(16)}`;
            const formatedSize = size.substr(size.length - 8, size.length);
            const littleEndianSize =
                formatedSize.substr(6, 2) + formatedSize.substr(4, 2) + formatedSize.substr(2, 2) + formatedSize.substr(0, 2);

            signedPayload = littleEndianSize + signedPayload.substr(8, signedPayload.length - 8);
        }
        return new SignedTransaction(signedPayload, transactionHash, signerPublicKey, transactionType, networkType);
    }
}
