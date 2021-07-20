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
import * as fs from 'fs';
import { ProfileMigrations } from '../migrations/profile.migrations';
import { HdProfile } from '../models/hdProfile.model';
import { LedgerProfile } from '../models/ledgerProfile.model';
import { PrivateKeyProfile } from '../models/privateKeyProfile.model';
import { CURRENT_PROFILE_VERSION, Profile, ProfileRecord } from '../models/profile.model';
import { HdProfileDTO, LedgerProfileDTO, PrivateKeyProfileDto, ProfileDTO } from '../models/profileDTO.types';

/**
 * Profile repository
 */
export class ProfileRepository {
    public readonly filePath: string;

    /**
     * Constructor
     * @param {string} fileUrl - File path where profiles are saved.
     */
    constructor(private readonly fileUrl: string) {
        this.filePath = require('os').homedir() + '/' + fileUrl;
    }

    /**
     * Find profile by name.
     * @param {string} name - Profile name.
     * @throws {Error}
     * @returns {Profile}
     */
    public find(name: string): Profile {
        const profiles = this.getProfiles();
        if (profiles[name]) {
            return this.createProfileFromDTO(profiles[name]);
        }
        throw new Error(`${name} not found`);
    }

    /**
     * Gets all profiles.
     * @returns {Profile[]}
     */
    public all(): Profile[] {
        const profiles = this.getProfiles();
        const list: Profile[] = [];
        for (const name in profiles) {
            if (profiles.hasOwnProperty(name)) {
                list.push(this.createProfileFromDTO(profiles[name]));
            }
        }
        return list;
    }

    /**
     * Persists a profile to the storage
     * @param {Profile} profile
     * @returns {Profile}
     */
    public save(profile: Profile): Profile {
        const profiles = this.getProfiles();
        const { name } = profile.simpleWallet;

        if (profiles.hasOwnProperty(name)) {
            throw new Error(`A profile named ${name} already exists.`);
        }

        profiles[name] = profile.toDTO();
        this.saveProfiles(profiles);
        return profile;
    }

    /**
     * Sets a profile as the default one.
     * @param {string} name - Profile name.
     * @throws {Error}
     */
    public setDefault(name: string) {
        const profiles = this.getProfiles();
        if (profiles.hasOwnProperty(name)) {
            for (const item in profiles) {
                if (item !== name) {
                    profiles[item].default = '0';
                } else {
                    profiles[item].default = '1';
                }
            }
            this.saveProfiles(profiles);
        } else {
            throw new Error(`${name} not found`);
        }
    }

    /**
     * Gets the default profile.
     * @returns {Profile}
     */
    public getDefaultProfile(): Profile {
        const profiles = this.getProfiles();
        let defaultProfile = '';
        for (const name in profiles) {
            if ('1' === profiles[name].default) {
                defaultProfile = name;
            }
        }
        if ('' === defaultProfile) {
            throw new Error('default profile not found');
        }
        return this.find(defaultProfile);
    }

    /**
     * Get all profiles as JSON objects.
     * @returns {object}
     */
    private getProfiles(): ProfileRecord {
        // check if profile storage file exists, creates one if not
        try {
            if (!fs.existsSync(this.filePath)) {
                fs.writeFileSync(this.filePath, '{}', 'utf-8');
                return {};
            }
        } catch (error) {
            throw new Error('Something went wrong when creating a file to store your profiles...' + JSON.stringify(error));
        }

        try {
            // get accounts from storage
            const profiles = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));

            // migrate accounts if necessary
            if (!this.checkSchemaVersion(profiles)) {
                const migratedProfiles = this.migrate(profiles);
                // persist updated profiles
                this.saveProfiles(migratedProfiles);
                return migratedProfiles;
            }

            return profiles;
        } catch (error) {
            throw new Error('Something went wrong when retrieving your profiles from the storage...' + JSON.stringify(error));
        }
    }

    /**
     * Iterates entities to find *out-of-date* data schemas.
     * @param {ProfileRecord} profiles
     * @return {boolean}  True if profiles are up to date, false if any requires migration
     */
    private checkSchemaVersion(profiles: ProfileRecord): boolean {
        const profileNeedingMigration = Object.values(profiles).find(({ version }) => !version || version < CURRENT_PROFILE_VERSION);

        return profileNeedingMigration === undefined;
    }

    /**
     * Return a profile record with updated profiles
     * @private
     * @param {ProfileRecord} profiles
     * @returns {ProfileRecord}
     */
    private migrate(profiles: ProfileRecord): ProfileRecord {
        const allMigrations = ProfileMigrations.get();
        return Object.entries(profiles)
            .map((entry) => {
                const [name, profile] = entry;
                const profileVersion = Number(profile.version) || 0;

                // Skip if profile is up-to-date
                if (profileVersion >= CURRENT_PROFILE_VERSION) {
                    return { [name]: profile };
                }

                // get migrations to apply
                const migrations = Object.entries(allMigrations)
                    .filter(([version]) => Number(version) > profileVersion)
                    .map(([, migration]) => migration);

                // apply migrations
                let migrated = { [name]: profile };
                migrations.forEach((migration) => {
                    migrated = migration(migrated);
                });
                return migrated;
            })
            .reduce((acc, profile) => ({ ...acc, ...profile }), {});
    }

    /**
     * Save profiles from JSON.
     * @param {JSON} profiles
     */
    private saveProfiles(profiles: ProfileRecord) {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(profiles), 'utf-8');
            fs.chmodSync(this.filePath, 0o600);
        } catch (e) {
            throw new Error('Something went wrong when saving your profiles...' + JSON.stringify(e));
        }
    }

    /**
     * Creates a new profile from a DTO
     * @private
     * @param {ProfileDTO} args
     * @returns {Profile}
     */
    private createProfileFromDTO(args: ProfileDTO): Profile {
        if (args.type == 'HD') {
            return HdProfile.createFromDTO(args as HdProfileDTO);
        }
        if (args.type == 'PrivateKey') {
            return PrivateKeyProfile.createFromDTO(args as PrivateKeyProfileDto);
        }
        if (args.type == 'Ledger') {
            return LedgerProfile.createFromDTO(args as LedgerProfileDTO);
        }
        throw new Error(`Invalid profile type ${args.type}`);
    }
}
