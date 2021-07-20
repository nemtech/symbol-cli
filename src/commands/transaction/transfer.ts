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
import { Deadline, EmptyMessage, PlainMessage, TransferTransaction, UnresolvedAddress } from 'symbol-sdk';
import { AnnounceTransactionsCommand } from '../../interfaces/announce.transactions.command';
import { AnnounceTransactionsOptions } from '../../interfaces/announce.transactions.options';
import { UnresolvedAddressResolver } from '../../resolvers/address.resolver';
import { MaxFeeResolver } from '../../resolvers/maxFee.resolver';
import { MessageResolver } from '../../resolvers/message.resolver';
import { MosaicsResolver } from '../../resolvers/mosaic.resolver';
import { PublicKeyResolver } from '../../resolvers/publicKey.resolver';
import { TransactionSignatureOptions } from '../../services/transaction.signature.service';

export class CommandOptions extends AnnounceTransactionsOptions {
    @option({
        flag: 'r',
        description: 'Recipient address or @alias.',
    })
    recipientAddress: string;

    @option({
        flag: 'm',
        description: 'Transaction message.',
    })
    message: string;

    @option({
        flag: 'e',
        description:
            '(Optional) Send an encrypted message. ' + "If you set this value, you should set the value of 'recipientPublicKey' as well).",
        toggle: true,
    })
    encrypted: any;

    @option({
        flag: 'c',
        description: 'Mosaic to transfer in the format (mosaicId(hex)|@aliasName)::absoluteAmount. Add multiple mosaics with commas.',
    })
    mosaics: string;

    @option({
        flag: 'u',
        description: '(Optional) Recipient public key in an encrypted message.',
    })
    recipientPublicKey: string;
}

@command({
    description: 'Send transfer transaction',
})
export default class extends AnnounceTransactionsCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        const profile = this.getProfile(options);
        const account = await this.getSigningAccount(profile, options);
        const mosaics = await new MosaicsResolver().resolve(options);
        let recipientAddress: UnresolvedAddress;
        let message = EmptyMessage;
        if (options.encrypted) {
            const recipientPublicAccount = await new PublicKeyResolver().resolve(
                options,
                profile.networkType,
                'Enter the recipient public key:',
                'recipientPublicKey',
            );
            recipientAddress = recipientPublicAccount.address;
            const rawMessage = await new MessageResolver().resolve(options);
            message = await account.encryptMessage(rawMessage, recipientPublicAccount);
        } else {
            recipientAddress = await new UnresolvedAddressResolver().resolve(
                options,
                undefined,
                'Enter the recipient address or @alias:',
                'recipientAddress',
            );
            const rawMessage = await new MessageResolver().resolve(options);
            if (rawMessage) {
                message = PlainMessage.create(rawMessage);
            }
        }

        const maxFee = await new MaxFeeResolver().resolve(options);
        const multisigSigner = await this.getMultisigSigner(options);

        const transaction = TransferTransaction.create(
            Deadline.create(profile.epochAdjustment),
            recipientAddress,
            mosaics,
            message,
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
