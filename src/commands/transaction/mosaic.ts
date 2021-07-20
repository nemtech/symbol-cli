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
    Deadline,
    MosaicDefinitionTransaction,
    MosaicId,
    MosaicNonce,
    MosaicSupplyChangeAction,
    MosaicSupplyChangeTransaction,
    UInt64,
} from 'symbol-sdk';
import { AnnounceTransactionsCommand } from '../../interfaces/announce.transactions.command';
import { AnnounceTransactionsOptions } from '../../interfaces/announce.transactions.options';
import { OptionsConfirmResolver } from '../../options-resolver';
import { AmountResolver } from '../../resolvers/amount.resolver';
import { DivisibilityResolver } from '../../resolvers/divisibility.resolver';
import { DurationResolver } from '../../resolvers/duration.resolver';
import { MaxFeeResolver } from '../../resolvers/maxFee.resolver';
import { MosaicFlagsResolver } from '../../resolvers/mosaic.resolver';
import { TransactionSignatureOptions } from '../../services/transaction.signature.service';

export class CommandOptions extends AnnounceTransactionsOptions {
    @option({
        flag: 'a',
        description: 'Initial supply of mosaics.',
    })
    amount: string;

    @option({
        flag: 't',
        description: '(Optional) Mosaic transferable.',
        toggle: true,
    })
    transferable: any;

    @option({
        flag: 's',
        description: '(Optional) Mosaic supply mutable.',
        toggle: true,
    })
    supplyMutable: any;

    @option({
        flag: 'r',
        description: '(Optional) Mosaic restrictable.',
        toggle: true,
    })
    restrictable: any;

    @option({
        flag: 'd',
        description: 'Mosaic divisibility, from 0 to 6.',
    })
    divisibility: number;

    @option({
        flag: 'u',
        description: 'Mosaic duration in amount of blocks.',
    })
    duration: string;

    @option({
        flag: 'n',
        description: '(Optional) Mosaic non-expiring.',
        toggle: true,
    })
    nonExpiring: any;
}

@command({
    description: 'Create a new mosaic',
})
export default class extends AnnounceTransactionsCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        const profile = this.getProfile(options);
        const account = await this.getSigningAccount(profile, options);

        const nonce = MosaicNonce.createRandom();
        let blocksDuration;
        if (!(await OptionsConfirmResolver(options, 'nonExpiring', 'Do you want a non-expiring mosaic?'))) {
            blocksDuration = await new DurationResolver().resolve(options);
        }
        const divisibility = await new DivisibilityResolver().resolve(options);
        const mosaicFlags = await new MosaicFlagsResolver().resolve(options);
        const amount = await new AmountResolver().resolve(options, 'Amount of mosaics units to create: ');
        const maxFee = await new MaxFeeResolver().resolve(options);
        const multisigSigner = await this.getMultisigSigner(options);

        const signerAddress = multisigSigner ? multisigSigner.info.accountAddress : account.address;

        const mosaicDefinition = MosaicDefinitionTransaction.create(
            Deadline.create(profile.epochAdjustment),
            nonce,
            MosaicId.createFromNonce(nonce, signerAddress),
            mosaicFlags,
            divisibility,
            blocksDuration ? blocksDuration : UInt64.fromUint(0),
            profile.networkType,
        );

        const mosaicSupplyChange = MosaicSupplyChangeTransaction.create(
            Deadline.create(profile.epochAdjustment),
            mosaicDefinition.mosaicId,
            MosaicSupplyChangeAction.Increase,
            amount,
            profile.networkType,
        );

        const signatureOptions: TransactionSignatureOptions = {
            account,
            transactions: [mosaicDefinition, mosaicSupplyChange],
            maxFee,
            multisigSigner,
            isAggregate: true,
            isAggregateBonded: signerAddress.plain() !== account.address.plain(),
        };

        const signedTransactions = await this.signTransactions(signatureOptions, options);
        this.announceTransactions(options, signedTransactions);
    }
}
