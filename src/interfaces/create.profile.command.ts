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

import * as Table from 'cli-table3';
import { HorizontalTable } from 'cli-table3';
import { Command, ExpectedError } from 'clime';
import ora, { Ora } from 'ora';
import { Account, Password, PublicAccount } from 'symbol-sdk';
import config from '../config/app.conf';
import { Profile } from '../models/profile.model';
import { ProfileCreation } from '../models/profileCreation.types';
import { ProfileRepository } from '../respositories/profile.repository';
import { DerivationService } from '../services/derivation.service';
import { FormatterService } from '../services/formatter.service';
import { ProfileService } from '../services/profile.service';

export class AccountCredentialsTable {
    private readonly table: HorizontalTable;
    private readonly account: Account | PublicAccount;

    private constructor(args: { account: Account | PublicAccount; password?: Password; mnemonic?: string; pathNumber?: number | null }) {
        this.account = args.account;

        this.table = new Table({
            style: { head: ['cyan'] },
            head: ['Property', 'Value'],
            colWidths: [15, 70],
            wordWrap: true,
        }) as HorizontalTable;

        this.renderAccountProperties();
        if (args.password) {
            this.table.push(['Password', args.password.value]);
        }
        if (args.mnemonic) {
            this.table.push(['Mnemonic', args.mnemonic]);
        }
        if (args.pathNumber !== undefined && args.pathNumber !== null) {
            const networkType = args.account.address.networkType;
            this.table.push([
                'Path',
                // Address paths are 0-based but shown as 1-based to the users
                `Seed wallet n. ${args.pathNumber + 1} (${DerivationService.getPathFromPathNumber(args.pathNumber, networkType)})`,
            ]);
        }
    }

    public static createFromAccount(account: Account, mnemonic?: string, pathNumber?: number): AccountCredentialsTable {
        return new AccountCredentialsTable({ account, mnemonic, pathNumber });
    }

    private renderAccountProperties() {
        this.table.push(['Address', this.account.address.pretty()], ['Public Key', this.account.publicKey]);
        if (this.account instanceof Account) {
            this.table.push(['Private Key', this.account.privateKey]);
        }
    }

    public toString(): string {
        let text = '';
        text += FormatterService.title('Account');
        text += '\n' + this.table.toString();
        return text;
    }
}

/**
 * Base command class to create a new profile.
 */
export abstract class CreateProfileCommand extends Command {
    public spinner: Ora;
    private readonly profileRepository: ProfileRepository;
    private readonly profileService: ProfileService;

    /**
     * Constructor.
     */
    protected constructor(fileUrl?: string) {
        super();
        this.spinner = ora('Processing');
        this.profileRepository = new ProfileRepository(fileUrl || config.PROFILES_FILE_NAME);
        this.profileService = new ProfileService(this.profileRepository);
    }

    /**
     * Creates a new profile.
     * @protected
     * @param {ProfileCreation} args creation arguments
     * @returns {Profile}
     */
    protected createProfile(args: ProfileCreation): Profile {
        try {
            const profile = this.profileService.createNewProfile(args);
            if (args.isDefault) {
                this.setDefaultProfile(args.name);
            }
            return profile;
        } catch (ignored) {
            throw new ExpectedError(`The profile [${args.name}] already exists`);
        }
    }

    /**
     * Sets a profile as default.
     * @param {string} profileName - The name of the profile to set as default.
     * @throws {ExpectedError}
     */
    protected setDefaultProfile(profileName: string) {
        try {
            this.profileService.setDefaultProfile(profileName);
        } catch (err) {
            throw new ExpectedError(
                "Can't set the profile [" +
                    profileName +
                    '] as the default profile.' +
                    "Use 'symbol-cli profile list' to check whether the profile exist, " +
                    "if not, use 'symbol-cli profile create' to create a profile",
            );
        }
    }
}
