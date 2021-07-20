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

import { ExpectedError } from 'clime';
import { AccountHttp, PublicAccount, SignedTransaction } from 'symbol-sdk';
import { MultisigAccount } from '../models/multisig.types';
import { AddressChoiceResolver } from '../resolvers/address.resolver';
import { TransactionAnnounceMode, TransactionAnnounceModeResolver } from '../resolvers/transactionAnnounceMode.resolver';
import { MultisigService } from '../services/multisig.service';
import { TransactionAnnounceService } from '../services/transaction.announce.service';
import { TransactionSignatureOptions, TransactionSignatureService } from '../services/transaction.signature.service';
import { AnnounceTransactionsOptions } from './announce.transactions.options';
import { ProfileCommand } from './profile.command';

/**
 * Base command class to announce transactions.
 */
export abstract class AnnounceTransactionsCommand extends ProfileCommand {
    protected constructor() {
        super();
    }

    /**
     * Gets the signer multisig info if the transaction is multisig
     * @protected
     * @param {AnnounceTransactionsOptions} options
     * @throws {ExpectedError}
     * @returns {(Promise<MultisigAccount | null>)}
     */
    protected async getMultisigSigner(options: AnnounceTransactionsOptions): Promise<MultisigAccount | null> {
        const profile = this.getProfile(options);
        const announceMode = await new TransactionAnnounceModeResolver(profile.networkType).resolve(options);

        if (announceMode === TransactionAnnounceMode.normal) {
            return null;
        }

        // Get the profile's multisig accounts info
        const childMultisigAccountsInfo = await new MultisigService(profile).getChildrenMultisigAccountInfo();

        if (!childMultisigAccountsInfo) {
            throw new ExpectedError('The selected profile does not have multisig accounts');
        }

        // A signer public key was provided as an option
        if (options.signer) {
            const signerPublicAccount = PublicAccount.createFromPublicKey(options.signer, profile.networkType);
            const multisigInfo = childMultisigAccountsInfo.find(({ accountAddress }) => accountAddress.equals(signerPublicAccount.address));

            if (!multisigInfo) {
                throw new ExpectedError(`
                    ${options.signer} is not a multisig account of the profile ${profile.name}
                `);
            }

            return { info: multisigInfo, publicAccount: signerPublicAccount };
        }

        const availableAddresses = childMultisigAccountsInfo.map(({ accountAddress }) => accountAddress.plain());

        const chosenSigner = await new AddressChoiceResolver().resolve(availableAddresses);

        const chosenMultisigSigner = childMultisigAccountsInfo.find(({ accountAddress }) => accountAddress.equals(chosenSigner));
        const chosenSignerPublicAccount = (await new AccountHttp(profile.url).getAccountInfo(chosenSigner).toPromise()).publicAccount;

        if (!chosenMultisigSigner || !chosenSignerPublicAccount) {
            throw new ExpectedError('Could not retrieve the multisig account information from the node.');
        }

        return { info: chosenMultisigSigner, publicAccount: chosenSignerPublicAccount };
    }

    /**
     * Signs a set of regular transactions.
     * @protected
     * @param {TransactionSignatureOptions} signatureOptions
     * @param {AnnounceTransactionsOptions} options
     * @returns { Promise<SignedTransaction[]> }
     */
    protected async signTransactions(
        signatureOptions: TransactionSignatureOptions,
        options: AnnounceTransactionsOptions,
    ): Promise<SignedTransaction[]> {
        try {
            const profile = this.getProfile(options);
            return await TransactionSignatureService.create(profile, options).signTransactions(signatureOptions);
        } finally {
            await signatureOptions.account.close();
        }
    }

    /**
     * Announces a set of transactions.
     * @protected
     * @param {AnnounceTransactionsOptions} options
     * @param {SignedTransaction[]} signedTransactions
     */
    protected async announceTransactions(options: AnnounceTransactionsOptions, signedTransactions: SignedTransaction[]): Promise<void> {
        const profile = this.getProfile(options);
        TransactionAnnounceService.create(profile, options).announce(signedTransactions);
    }
}
