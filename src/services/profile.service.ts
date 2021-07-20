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
import { HdProfile } from '../models/hdProfile.model';
import { LedgerProfile } from '../models/ledgerProfile.model';
import { PrivateKeyProfile } from '../models/privateKeyProfile.model';
import { Profile } from '../models/profile.model';
import { ProfileCreation } from '../models/profileCreation.types';
import { ProfileRepository } from '../respositories/profile.repository';

/**
 * Profile service
 */
export class ProfileService {
    private readonly profileRepository: ProfileRepository;

    /**
     * Constructor
     * @param {ProfileRepository} profileRepository
     */
    constructor(profileRepository: ProfileRepository) {
        this.profileRepository = profileRepository;
    }

    /**
     * Find profile by name.
     * @param {string} name - Profile name.
     * @returns {Profile}
     */
    findProfileNamed(name: string): Profile {
        return this.profileRepository.find(name);
    }

    /**
     * Gets all profiles.
     * @returns {Profile[]}
     */
    findAllProfiles(): Profile[] {
        return this.profileRepository.all();
    }

    /**
     * Sets a profile as the default one.
     * @param {string} name - Profile name.
     */
    setDefaultProfile(name: string) {
        this.profileRepository.setDefault(name);
    }

    /**
     * Gets the profile set as default.
     * @returns {Profile}
     */
    getDefaultProfile(): Profile {
        return this.profileRepository.getDefaultProfile();
    }

    /**
     * Creates and save a new profile
     * @param {ProfileCreation} args
     * @returns {Profile}
     */
    public createNewProfile(args: ProfileCreation): Profile {
        const profile =
            'mnemonic' in args ? HdProfile.create(args) : 'path' in args ? LedgerProfile.create(args) : PrivateKeyProfile.create(args);
        this.profileRepository.save(profile);
        return profile;
    }
}
