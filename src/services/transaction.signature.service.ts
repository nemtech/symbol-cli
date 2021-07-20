import { AggregateTransaction, Deadline, HashLockTransaction, PublicAccount, SignedTransaction, Transaction, UInt64 } from 'symbol-sdk';
import { AnnounceTransactionsOptions } from '../interfaces/announce.transactions.options';
import { MultisigAccount } from '../models/multisig.types';
import { Profile } from '../models/profile.model';
import { MaxFeeResolver } from '../resolvers/maxFee.resolver';
import { TransactionView } from '../views/transactions/details/transaction.view';
import { SigningAccount } from './signing.service';

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

export enum AnnounceMode {
    'standard' = 'standard',
    'partial' = 'partial',
    'complete' = 'complete',
}

export interface TransactionSignatureOptions {
    /**
     * The account that will sign the transactions
     * @type {SigningAccount}
     */
    account: SigningAccount;
    /**
     * The transactions to sign
     * @type {Transaction[]}
     */
    transactions: Transaction[];
    /**
     * The max fee of the transactions to sign
     * @type {UInt64}
     */
    maxFee: UInt64;
    /**
     * The public key of the signer
     * (if sending a multisig transaction)
     * @type {string}
     */
    multisigSigner?: MultisigAccount | null;

    /**
     * Whether to force wrapping transactions in an aggregate
     * (eg: Mosaic creation transaction)
     * @type {boolean}
     */
    isAggregate?: boolean;

    /**
     * Whether to force announcing a transaction in an hash lock
     * @type {boolean}
     */
    isAggregateBonded?: boolean;

    /**
     *
     * @type {Deadline}
     */
    aggregateDeadline?: Deadline;

    /**
     *
     * @type {(PublicAccount | undefined)[]}
     */
    transactionSigners?: (PublicAccount | undefined)[];
}

export class TransactionSignatureService {
    maxFee: UInt64;
    transactions: Transaction[];
    signerPublicAccount: PublicAccount;
    signedLockTransaction: SignedTransaction;
    multisigSigner?: MultisigAccount | null;
    isAggregate? = false;
    isAggregateBonded? = false;
    aggregateDeadline?: Deadline;
    transactionSigners?: (PublicAccount | undefined)[];

    /**
     * Gets announcement mode
     * @returns {AnnounceMode}
     */
    get announceMode(): AnnounceMode {
        if (this.isAggregateBonded || (this.multisigSigner && this.multisigSigner.info && this.multisigSigner.info.minApproval > 1)) {
            return AnnounceMode.partial;
        } else if (this.isAggregate || this.multisigSigner) {
            return AnnounceMode.complete;
        }
        return AnnounceMode.standard;
    }

    /**
     * Creates an instance of TransactionSignatureService.
     * @static
     * @param {Profile} profile
     * @param {AnnounceTransactionsOptions} options
     * @returns {TransactionSignatureService}
     */
    public static create(profile: Profile, options: AnnounceTransactionsOptions): TransactionSignatureService {
        return new TransactionSignatureService(profile, options);
    }

    /**
     * Constructor
     * @private
     * @param {Profile} profile
     * @param {AnnounceTransactionsOptions} options
     */
    private constructor(private readonly profile: Profile, private readonly options: AnnounceTransactionsOptions) {}

    /**
     * Signs a set of transactions.
     * @public
     * @param {TransactionSignatureOptions} args
     * @returns {Promise<SignedTransaction[]>}
     */
    public async signTransactions(args: TransactionSignatureOptions): Promise<SignedTransaction[]> {
        const {
            account,
            transactions,
            multisigSigner,
            maxFee,
            isAggregate,
            isAggregateBonded,
            aggregateDeadline,
            transactionSigners,
        } = args;

        this.maxFee = maxFee;
        this.transactions = transactions;
        this.multisigSigner = multisigSigner;
        this.isAggregate = isAggregate;
        this.isAggregateBonded = isAggregateBonded;
        this.signerPublicAccount = multisigSigner ? multisigSigner.publicAccount : account.publicAccount;
        this.aggregateDeadline = aggregateDeadline;
        this.transactionSigners = transactionSigners;

        if (this.announceMode === AnnounceMode.complete) {
            return this.signCompleteTransactions(account);
        } else if (this.announceMode === AnnounceMode.partial) {
            return this.signPartialTransactions(account);
        }

        const signedTransactions: SignedTransaction[] = [];
        for (const transaction of transactions) {
            const signedTransaction = await account.sign(transaction, this.profile.networkGenerationHash);
            new TransactionView(transaction, signedTransaction, this.profile).print();
            signedTransactions.push(signedTransaction);
        }
        return signedTransactions;
    }

    /**
     * Creates an aggregate bonded transaction and hash lock transaction and returns them signed.
     * @private
     * @param {Account} account - Signer account.
     * @returns {Promise<SignedTransaction[]>}
     */
    private async signPartialTransactions(account: SigningAccount): Promise<SignedTransaction[]> {
        const getTxSigner = (inx: number) => {
            if (this.transactionSigners) {
                return this.transactionSigners[inx] ? this.transactionSigners[inx]! : this.signerPublicAccount;
            }
            return this.signerPublicAccount;
        };
        const aggregateTransaction = AggregateTransaction.createBonded(
            this.aggregateDeadline ? this.aggregateDeadline : Deadline.create(this.profile.epochAdjustment),
            this.transactions.map((t, inx) => t.toAggregate(getTxSigner(inx))),
            this.profile.networkType,
            [],
            this.maxFee,
        );

        const signedAggregateTransaction = await account.sign(aggregateTransaction, this.profile.networkGenerationHash);
        const hashLockTransaction = await this.createHashLockTransaction(signedAggregateTransaction);
        const signedHashLockTransaction = await account.sign(hashLockTransaction, this.profile.networkGenerationHash);
        new TransactionView(aggregateTransaction, signedAggregateTransaction, this.profile).print();
        new TransactionView(hashLockTransaction, signedHashLockTransaction, this.profile).print();

        return [signedHashLockTransaction, signedAggregateTransaction];
    }

    /**
     * Creates an aggregate complete transaction and returns it signed.
     * @private
     * @param {SigningAccount} account - Signer account.
     * @returns {SignedTransaction[]}
     */
    private async signCompleteTransactions(account: SigningAccount): Promise<SignedTransaction[]> {
        const getTxSigner = (inx: number) => {
            if (this.transactionSigners) {
                return this.transactionSigners[inx] ? this.transactionSigners[inx]! : this.signerPublicAccount;
            }
            return this.signerPublicAccount;
        };
        const aggregateTransaction = AggregateTransaction.createComplete(
            this.aggregateDeadline ? this.aggregateDeadline : Deadline.create(this.profile.epochAdjustment),
            this.transactions.map((t, inx) => t.toAggregate(getTxSigner(inx))),
            this.profile.networkType,
            [],
            this.maxFee,
        );

        const signedTransaction = await account.sign(aggregateTransaction, this.profile.networkGenerationHash);
        new TransactionView(aggregateTransaction, signedTransaction, this.profile).print();
        return [signedTransaction];
    }

    private async createHashLockTransaction(aggregateTx: SignedTransaction): Promise<HashLockTransaction> {
        const maxFeeHashLock = await new MaxFeeResolver().resolve(
            this.options,
            'Enter the maximum fee to announce the hashlock transaction (absolute amount):',
            'maxFeeHashLock',
        );

        return HashLockTransaction.create(
            this.aggregateDeadline ? this.aggregateDeadline : Deadline.create(this.profile.epochAdjustment),
            this.profile.networkCurrency.createRelative(this.options.lockAmount),
            UInt64.fromNumericString(this.options.lockDuration),
            aggregateTx,
            this.profile.networkType,
            maxFeeHashLock,
        );
    }
}
