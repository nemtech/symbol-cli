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
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid';
import { ExpectedError } from 'clime';
import { AppVersion, LedgerDerivationPath, SymbolLedger } from 'symbol-ledger-typescript';
import { NetworkType } from 'symbol-sdk';
import { LedgerAccount, SigningAccountInfo } from './signing.service';

/**
 * A service that knows how to connect and retrieve Ledger accounts from a ledger device.
 */
export class LedgerService {
    /**
     * Returns the accounts 0-9 form the device.
     * @param networkType the network type
     * @param isOptinSymbolWallet if Opt-in Symbol wallet uses curve Secp256K1 else uses curve Ed25519
     */
    public async resolveLedgerAccountInformation(networkType: NetworkType, isOptinSymbolWallet: boolean): Promise<SigningAccountInfo[]> {
        const ledger = await this.createLedgerClient();
        try {
            const accounts: LedgerAccount[] = [];
            for (const i of Array.from(Array(10).keys())) {
                try {
                    const ledgerNetworkType = networkType as number;
                    const path = LedgerDerivationPath.getPath(ledgerNetworkType, i, 0);
                    const publicKey = await ledger.getAccount(path, ledgerNetworkType, false, false, isOptinSymbolWallet);
                    accounts.push(new LedgerAccount(ledger, ledgerNetworkType, path, publicKey, isOptinSymbolWallet));
                } catch (e) {
                    throw new ExpectedError(
                        `It seems the device hasn't been connected yet. Have you unlocked your device and open then Symbol App?. Error ${e}`,
                    );
                }
            }
            return accounts;
        } finally {
            //These accounts are closed! We just want the information
            ledger.close();
        }
    }

    /**
     * Returns an signing account from the known path
     * @param networkType the network type
     * @param path the path
     * @param isOptinSymbolWallet if Opt-in Symbol wallet uses curve Secp256K1 else uses curve Ed25519
     */
    public async resolveLedgerAccount(networkType: NetworkType, path: string, isOptinSymbolWallet: boolean): Promise<LedgerAccount> {
        const ledger = await this.createLedgerClient();
        try {
            const ledgerNetworkType = networkType as number;
            const publicKey = await ledger.getAccount(path, ledgerNetworkType, false, false, isOptinSymbolWallet);
            return new LedgerAccount(ledger, ledgerNetworkType, path, publicKey, isOptinSymbolWallet);
        } catch (e) {
            await ledger.close();
            throw new ExpectedError(
                `It seems the device hasn't been connected yet. Have you unlocked your device and open then Symbol App?. Error ${e}`,
            );
        }
    }

    public async createLedgerClient(): Promise<SymbolLedger> {
        let appVersion: AppVersion;
        let ledger: SymbolLedger | undefined;
        try {
            console.log();
            console.log('Looking for a Ledger device...');
            const transport = await TransportNodeHid.create(10000, 10000);
            ledger = new SymbolLedger(transport, 'XYM');
            appVersion = await ledger.getAppVersion();
        } catch (e) {
            if (ledger) ledger.close();
            throw new ExpectedError(
                `It seems the device hasn't been connected yet. Have you unlocked your device and open then Symbol App?. Error ${e}`,
            );
        }
        const expectedAppVersion = ledger.getExpectedAppVersion();
        function printVersion(appVersion: AppVersion) {
            return `v${appVersion.majorVersion}.${appVersion.minorVersion}.${appVersion.patchVersion}`;
        }

        console.log(`Symbol App version is ${printVersion(appVersion)}`);
        if (!ledger.isVersionSupported(appVersion, expectedAppVersion)) {
            if (ledger) ledger.close();
            throw new ExpectedError(
                `The current Symbol Application ${printVersion(appVersion)} is not supported. Expected version is at least ${printVersion(
                    expectedAppVersion,
                )}. Install latest Symbol App via Ledger Live`,
            );
        }
        return ledger;
    }
}
