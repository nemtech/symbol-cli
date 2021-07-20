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
import ora, { Ora } from 'ora';
import { merge } from 'rxjs';
import { filter, mergeMap, tap } from 'rxjs/operators';
import { IListener, SignedTransaction, Transaction, TransactionAnnounceResponse, TransactionRepository, TransactionType } from 'symbol-sdk';
import { AnnounceTransactionsOptions } from '../interfaces/announce.transactions.options';
import { Profile } from '../models/profile.model';
import { AnnounceResolver } from '../resolvers/announce.resolver';
import { FormatterService } from './formatter.service';

export class TransactionAnnounceService {
    public spinner: Ora;
    private transactionHttp: TransactionRepository;
    private listener: IListener;
    to: any;

    /**
     * Creates an instance of TransactionAnnounceService.
     * @static
     * @param {Profile} profile
     * @param {AnnounceTransactionsOptions} options
     * @returns {TransactionAnnounceService}
     */
    public static create(profile: Profile, options: AnnounceTransactionsOptions): TransactionAnnounceService {
        return new TransactionAnnounceService(profile, options);
    }

    /**
     * Constructor.
     * @param {Profile} profile
     * @param {AnnounceTransactionsOptions} options
     */
    private constructor(private readonly profile: Profile, private readonly options: AnnounceTransactionsOptions) {
        this.spinner = ora('Processing');
        const repositoryFactory = profile.repositoryFactory;
        this.transactionHttp = repositoryFactory.createTransactionRepository();
        this.listener = repositoryFactory.createListener();
    }

    /**
     * Announce any transactions.
     * Takes no more than 1 aggregate bounded with its hash lock.
     * @param {SignedTransaction[]} transactions
     * @returns {Promise<void>}
     */
    public async announce(transactions: SignedTransaction[]): Promise<void> {
        // does the user wants to announce?
        if (!(await new AnnounceResolver().resolve(this.options))) {
            return;
        }

        // split transactions by announce mode
        const aggregateTxTypes = [TransactionType.AGGREGATE_BONDED, TransactionType.HASH_LOCK];
        const normalTx = transactions.filter(({ type }) => !aggregateTxTypes.includes(type));
        const hashLockTx = transactions.filter(({ type }) => aggregateTxTypes.includes(type));

        if (normalTx.length) {
            this.announceTransactions(normalTx);
        }
        if (hashLockTx.length) {
            this.announceAggregateTransaction(hashLockTx);
        }
    }

    /**
     * Announces transactions that are not aggregate bounded.
     * @private
     * @param {SignedTransaction[]} transactions
     */
    private announceTransactions(transactions: SignedTransaction[]) {
        if (this.options.sync) {
            for (const tx of transactions) {
                this.announceTransactionSync(tx);
            }
            return;
        }

        for (const tx of transactions) {
            this.announceTransaction(tx);
        }
    }

    /**
     * Announces a transaction.
     * @param {SignedTransaction} signedTransaction
     */
    private announceTransaction(signedTransaction: SignedTransaction): void {
        this.transactionHttp.announce(signedTransaction).subscribe(
            (ignored) => {
                this.spinner.stop();
                console.log(FormatterService.success('Transaction announced correctly'));
                console.log(
                    FormatterService.info(
                        "To check if the network confirms or rejects the transaction, run the command 'symbol-cli transaction status'",
                    ),
                );
            },
            (err) => {
                this.spinner.stop();
                console.log(FormatterService.error(err));
            },
        );
    }

    /**
     * Announces a transaction waiting for the response.
     * @param {SignedTransaction} Signed transaction.
     */
    public announceTransactionSync(signedTransaction: SignedTransaction) {
        this.spinner.start();
        const senderAddress = signedTransaction.getSignerAddress();

        this.listener.open().then(
            () => {
                merge(
                    this.transactionHttp.announce(signedTransaction),
                    this.listener
                        .confirmed(senderAddress)
                        .pipe(
                            filter(
                                (transaction) =>
                                    transaction.transactionInfo !== undefined &&
                                    transaction.transactionInfo.hash === signedTransaction.hash,
                            ),
                        ),
                    this.listener.status(senderAddress).pipe(
                        filter((error) => error.hash === signedTransaction.hash),
                        tap((error) => {
                            throw new Error(error.code);
                        }),
                    ),
                ).subscribe(
                    (response) => {
                        if (response instanceof TransactionAnnounceResponse) {
                            this.spinner.stop();
                            console.log(FormatterService.success('Transaction announced'));
                            this.spinner.start();
                        } else if (response instanceof Transaction) {
                            this.listener.close();
                            this.spinner.stop();
                            console.log(FormatterService.success('Transaction confirmed'));
                        }
                    },
                    (err) => {
                        this.listener.close();
                        this.spinner.stop();
                        console.log(FormatterService.error(err));
                    },
                );
            },
            (err) => {
                this.listener.close();
                this.spinner.stop();
                console.log(FormatterService.error(err));
            },
        );
    }

    /**
     * Announces a hash lock transaction. Once this is confirmed, announces an aggregate transaction.
     * @param {SignedTransaction[]} transactions
     */
    public announceAggregateTransaction(transactions: SignedTransaction[]): void {
        this.spinner.start();

        if (transactions.length !== 2) {
            throw new Error('announceAggregateTransaction must be provided with 2 transactions');
        }

        const hashLock = transactions.find(({ type }) => type === TransactionType.HASH_LOCK);
        const aggregate = transactions.find(({ type }) => type === TransactionType.AGGREGATE_BONDED);

        if (!hashLock || !aggregate) {
            throw new Error('announceAggregateTransaction must be provided with an haslock and an aggregate bonded');
        }

        let confirmations = 0;
        const senderAddress = hashLock.getSignerAddress();

        this.listener.open().then(
            () => {
                merge(
                    this.transactionHttp.announce(hashLock),
                    this.listener.status(senderAddress).pipe(
                        filter((error) => error.hash === hashLock.hash),
                        tap((error) => {
                            throw new Error(error.code);
                        }),
                    ),
                    this.listener.confirmed(senderAddress).pipe(
                        filter(
                            (transaction) =>
                                transaction.transactionInfo !== undefined && transaction.transactionInfo.hash === hashLock.hash,
                        ),
                        mergeMap((ignored) => this.transactionHttp.announceAggregateBonded(aggregate)),
                    ),
                ).subscribe(
                    (ignored) => {
                        confirmations = confirmations + 1;
                        if (confirmations === 1) {
                            this.spinner.stop();
                            console.log(FormatterService.success('Hash lock transaction announced'));
                            this.spinner.start();
                        } else if (confirmations === 2) {
                            this.listener.close();
                            this.spinner.stop();
                            console.log(FormatterService.success('Hash lock transaction confirmed'));
                            console.log(FormatterService.success('Aggregate transaction announced'));
                        }
                    },
                    (err) => {
                        this.listener.close();
                        this.spinner.stop();
                        console.log(FormatterService.error(err));
                    },
                );
            },
            (err) => {
                this.listener.close();
                this.spinner.stop();
                console.log(FormatterService.error(err));
            },
        );
    }
}
