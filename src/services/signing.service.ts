/*
 * Copyright 2021 NEM
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
 */
import { ExpectedError } from 'clime';
import { LedgerNetworkType, SymbolLedger } from 'symbol-ledger-typescript/lib';
import {
    Account,
    Address,
    AggregateTransaction,
    Convert,
    KeyPair,
    Message,
    NetworkType,
    PublicAccount,
    SignedTransaction,
    Transaction,
    UInt64,
} from 'symbol-sdk';

/**
 * Basic read only information of an account.
 */
export interface SigningAccountInfo {
    readonly publicKey: string;
    readonly address: Address;
    readonly publicAccount: PublicAccount;
}

/**
 * An account that knows how to asynchronously sign and co-sign transactions
 */
export interface SigningAccount extends SigningAccountInfo {
    cosignTransaction(transaction: Transaction, transactionHash: string): Promise<string>;
    sign(transaction: Transaction, generationHash: string): Promise<SignedTransaction>;
    encryptMessage(rawMessage: string, recipientPublicAccount: PublicAccount): Promise<Message>;
    close(): Promise<void>;
}

/**
 * Basic signing account that adapts the sdk's account.
 */
export class PrivateKeyAccount implements SigningAccount {
    public readonly address: Address;
    public readonly publicKey: string;
    public readonly publicAccount: PublicAccount;
    constructor(private readonly account: Account) {
        this.address = account.address;
        this.publicKey = account.publicAccount.publicKey;
        this.publicAccount = account.publicAccount;
    }

    async cosignTransaction(transaction: Transaction, transactionHash: string): Promise<string> {
        const keyPairEncoded = KeyPair.createKeyPairFromPrivateKeyString(this.account.privateKey);
        return Convert.uint8ToHex(KeyPair.sign(keyPairEncoded, Convert.hexToUint8(transactionHash)));
    }

    async sign(transaction: Transaction, generationHash: string): Promise<SignedTransaction> {
        return this.account.sign(transaction, generationHash);
    }

    encryptMessage(rawMessage: string, recipientPublicAccount: PublicAccount): Promise<Message> {
        return Promise.resolve(this.account.encryptMessage(rawMessage, recipientPublicAccount));
    }

    close(): Promise<void> {
        //nothing to close
        return Promise.resolve();
    }
}

/**
 * Ledger account that can sign by connecting to the device.
 */
export class LedgerAccount implements SigningAccount {
    public readonly address: Address;
    public readonly publicAccount: PublicAccount;

    constructor(
        private readonly ledger: SymbolLedger,
        networkType: LedgerNetworkType,
        public readonly path: string,
        public readonly publicKey: string,
        public readonly isOptinSymbolWallet: boolean,
    ) {
        const symbolNetworkType = (networkType as number) as NetworkType;
        this.address = Address.createFromPublicKey(publicKey, symbolNetworkType);
        this.publicAccount = PublicAccount.createFromPublicKey(publicKey, symbolNetworkType);
    }

    encryptMessage(): Promise<Message> {
        throw new ExpectedError('Ledger does not allow to encrypt messages yet!');
    }

    async cosignTransaction(transaction: Transaction, transactionHash: string): Promise<string> {
        console.log();
        console.log(`Co-signing transaction ${transactionHash} with Ledger account ${this.address.plain()}. Check your device!`);
        return await this.ledger.signCosignatureTransaction(
            this.path,
            transaction,
            transactionHash,
            this.publicKey,
            this.isOptinSymbolWallet,
        );
    }

    async sign(transaction: Transaction, generationHash: string): Promise<SignedTransaction> {
        console.log();
        console.log(`Signing transaction with Ledger account ${this.address.plain()}. Check your device!`);
        const { payload } = await this.ledger.signTransaction(this.path, transaction, generationHash, this.publicKey, false);
        const generationHashBytes = Array.from(Convert.hexToUint8(generationHash));
        return new SignedTransaction(
            payload,
            Transaction.createTransactionHash(payload, generationHashBytes),
            this.publicKey,
            transaction.type,
            transaction.networkType,
        );
    }

    close(): Promise<void> {
        return this.ledger.close();
    }
}

/**
 * Utility object to sign transactions asynchronously
 */
export class SigningUtils {
    public static async signTransactionWithCosignatories(
        initiatorAccount: SigningAccount,
        transaction: AggregateTransaction,
        cosignatories: SigningAccount[],
        generationHash: string,
    ): Promise<SignedTransaction> {
        const signedTransaction = await initiatorAccount.sign(transaction, generationHash);
        let signedPayload = signedTransaction.payload;
        for (const cosigner of cosignatories) {
            const signature = await cosigner.cosignTransaction(transaction, signedTransaction.hash);
            Convert.validateHexString(signature, 128, 'Cosignature is not valid hex!');
            signedPayload += UInt64.fromUint(0).toHex() + cosigner.publicKey + signature;
        }
        // Calculate new size
        const size = `00000000${(signedPayload.length / 2).toString(16)}`;
        const formatedSize = size.substr(size.length - 8, size.length);
        const littleEndianSize =
            formatedSize.substr(6, 2) + formatedSize.substr(4, 2) + formatedSize.substr(2, 2) + formatedSize.substr(0, 2);
        signedPayload = littleEndianSize + signedPayload.substr(8, signedPayload.length - 8);
        return new SignedTransaction(
            signedPayload,
            signedTransaction.hash,
            initiatorAccount.publicKey,
            transaction.type,
            transaction.networkType,
        );
    }
}
