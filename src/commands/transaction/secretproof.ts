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
import { Deadline, SecretProofTransaction } from 'symbol-sdk';
import { AnnounceTransactionsCommand } from '../../interfaces/announce.transactions.command';
import { AnnounceTransactionsOptions } from '../../interfaces/announce.transactions.options';
import { UnresolvedAddressResolver } from '../../resolvers/address.resolver';
import { HashAlgorithmResolver } from '../../resolvers/hashAlgorithm.resolver';
import { MaxFeeResolver } from '../../resolvers/maxFee.resolver';
import { ProofResolver } from '../../resolvers/proof.resolver';
import { SecretResolver } from '../../resolvers/secret.resolver';
import { TransactionSignatureOptions } from '../../services/transaction.signature.service';

export class SecretProofCommandOptions extends AnnounceTransactionsOptions {
    @option({
        description: 'Proof hashed in hexadecimal. ',
        flag: 's',
    })
    secret: string;

    @option({
        description: 'Original random set of bytes in hexadecimal. ',
        flag: 'p',
    })
    proof: string;

    @option({
        description: 'Algorithm used to hash the proof (Op_Sha3_256, Op_Hash_160, Op_Hash_256). ',
        flag: 'H',
    })
    hashAlgorithm: string;

    @option({
        description: 'Address or @alias that receives the funds once unlocked.',
        flag: 'r',
    })
    recipientAddress: string;
}

@command({
    description: 'Announce a secret proof transaction',
})
export default class extends AnnounceTransactionsCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: SecretProofCommandOptions) {
        const profile = this.getProfile(options);
        const account = await this.getSigningAccount(profile, options);
        const recipientAddress = await new UnresolvedAddressResolver().resolve(
            options,
            undefined,
            'Enter the address (or @alias) that receives the funds once unlocked:',
            'recipientAddress',
        );
        const secret = await new SecretResolver().resolve(options);
        const hashAlgorithm = await new HashAlgorithmResolver().resolve(options);
        const proof = await new ProofResolver().resolve(options, hashAlgorithm);
        const maxFee = await new MaxFeeResolver().resolve(options);
        const multisigSigner = await this.getMultisigSigner(options);

        const transaction = SecretProofTransaction.create(
            Deadline.create(profile.epochAdjustment),
            hashAlgorithm,
            secret,
            recipientAddress,
            proof,
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
