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

import { expect } from 'chai';
import { Deadline, MultisigAccountInfo, TransactionType, UInt64 } from 'symbol-sdk';
import { PrivateKeyAccount } from '../../src/services/signing.service';
import { AnnounceMode, TransactionSignatureService } from '../../src/services/transaction.signature.service';
import { account1, account2 } from '../mocks/accounts.mock';
import { mockPrivateKeyProfile1 } from '../mocks/profiles/profile.mock';
import { unsignedAggregateBonded1, unsignedTransfer1, unsignedTransfer2 } from '../mocks/transactions';

describe('Transaction signature service', () => {
    const default_options = {
        maxFee: '1',
        profile: 'test',
        password: 'test',
        sync: false,
        announce: false,
        maxFeeHashLock: '50000',
        lockAmount: '10',
        lockDuration: '100',
        signer: '',
        mode: 'normal',
    };

    const signatureOptionsStandard = {
        maxFee: UInt64.fromUint(1),
        multisigSigner: null,
        isAggregate: false,
        transactions: [unsignedTransfer1],
        account: new PrivateKeyAccount(account1),
    };

    const signatureOptionsComplete = {
        maxFee: UInt64.fromUint(1),
        multisigSigner: null,
        isAggregate: true,
        transactions: [unsignedTransfer1, unsignedTransfer2],
        account: new PrivateKeyAccount(account1),
    };

    const signatureOptionsBonded = {
        maxFee: UInt64.fromUint(1),
        multisigSigner: null,
        isAggregate: true,
        isAggregateBonded: true,
        transactions: [unsignedTransfer1, unsignedTransfer2],
        account: new PrivateKeyAccount(account1),
    };

    const signatureOptionsMultisig = {
        maxFee: UInt64.fromUint(1),
        multisigSigner: {
            info: new MultisigAccountInfo(1, account2.publicAccount.address, 2, 2, [], []),
            publicAccount: account2.publicAccount,
        },
        isAggregate: true,
        transactions: [unsignedTransfer1],
        account: new PrivateKeyAccount(account1),
    };

    it('should create transaction signature service', () => {
        expect(TransactionSignatureService.create(mockPrivateKeyProfile1, default_options)).to.not.be.equal(undefined);
    });

    it('should get announce mode standard', async () => {
        const transactionSignatureService = TransactionSignatureService.create(mockPrivateKeyProfile1, default_options);
        const signatures = await transactionSignatureService.signTransactions(signatureOptionsStandard);
        expect(transactionSignatureService.announceMode).to.be.equal(AnnounceMode.standard);
        expect((await signatures).length).to.be.equal(1);
    });

    it('should get announce mode complete', async () => {
        const transactionSignatureService = TransactionSignatureService.create(mockPrivateKeyProfile1, default_options);
        const signatures = transactionSignatureService.signTransactions(signatureOptionsComplete);
        expect(transactionSignatureService.announceMode).to.be.equal(AnnounceMode.complete);
        expect((await signatures).length).to.be.equal(1);
        const signedTransactions = await transactionSignatureService['signCompleteTransactions'](signatureOptionsComplete.account);
        expect(signedTransactions.length).to.be.equal(1);
    });

    it('should get announce mode complete w/ aggregate deadline', async () => {
        const transactionSignatureService = TransactionSignatureService.create(mockPrivateKeyProfile1, default_options);
        const signatureOptionsCompleteWithAggregateDeadline = {
            ...signatureOptionsComplete,
            aggregateDeadline: Deadline.createFromDTO('1'),
        };
        const signatures = transactionSignatureService.signTransactions(signatureOptionsCompleteWithAggregateDeadline);
        expect(transactionSignatureService.announceMode).to.be.equal(AnnounceMode.complete);
        expect((await signatures).length).to.be.equal(1);
        const signedTransactions = await transactionSignatureService['signCompleteTransactions'](
            signatureOptionsCompleteWithAggregateDeadline.account,
        );
        expect(signedTransactions.length).to.be.equal(1);
    });

    it('should get announce mode partial', async () => {
        const transactionSignatureService = TransactionSignatureService.create(mockPrivateKeyProfile1, default_options);
        const signatures = transactionSignatureService.signTransactions(signatureOptionsBonded);
        expect(transactionSignatureService.announceMode).to.be.equal(AnnounceMode.partial);
        expect((await signatures).length).to.be.equal(2);
        expect((await transactionSignatureService['signPartialTransactions'](signatureOptionsBonded.account)).length).to.be.equal(2);
    });

    it('should get announce mode partial w/ aggregate deadline', async () => {
        const transactionSignatureService = TransactionSignatureService.create(mockPrivateKeyProfile1, default_options);
        const signatureOptionsBondedWithAggregateDeadline = { ...signatureOptionsBonded, aggregateDeadline: Deadline.createFromDTO('1') };
        const signatures = transactionSignatureService.signTransactions(signatureOptionsBondedWithAggregateDeadline);
        expect(transactionSignatureService.announceMode).to.be.equal(AnnounceMode.partial);
        expect((await signatures).length).to.be.equal(2);
        expect(
            (await transactionSignatureService['signPartialTransactions'](signatureOptionsBondedWithAggregateDeadline.account)).length,
        ).to.be.equal(2);
    });

    it('should get announce mode partial mutisig', async () => {
        const transactionSignatureService = TransactionSignatureService.create(mockPrivateKeyProfile1, default_options);
        const signatures = transactionSignatureService.signTransactions(signatureOptionsMultisig);
        expect(transactionSignatureService.announceMode).to.be.equal(AnnounceMode.partial);
        expect((await signatures).length).to.be.equal(2);
    });

    it('should get announce mode partial mutisig w/ aggregate deadline', async () => {
        const transactionSignatureService = TransactionSignatureService.create(mockPrivateKeyProfile1, default_options);
        const signatureOptionsMultisigWithAggregateDeadline = {
            ...signatureOptionsMultisig,
            aggregateDeadline: Deadline.createFromDTO('1'),
        };
        const signatures = transactionSignatureService.signTransactions(signatureOptionsMultisigWithAggregateDeadline);
        expect(transactionSignatureService.announceMode).to.be.equal(AnnounceMode.partial);
        expect((await signatures).length).to.be.equal(2);
    });

    it('should create hash lock', async () => {
        const transactionSignatureService = TransactionSignatureService.create(mockPrivateKeyProfile1, default_options);
        const hashLockTransaction = await transactionSignatureService['createHashLockTransaction'](
            account1.sign(unsignedAggregateBonded1, mockPrivateKeyProfile1.networkGenerationHash),
        );
        expect(hashLockTransaction.type).to.be.equal(TransactionType.HASH_LOCK);
        expect(hashLockTransaction.maxFee.toString()).to.be.equal(UInt64.fromNumericString(default_options.maxFeeHashLock).toString());
    });
});
