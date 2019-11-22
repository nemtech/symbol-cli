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
import chalk from 'chalk';
import {Command, command, metadata, option, Options} from 'clime';
import {ProfileRepository} from '../../respository/profile.repository';
import {ProfileService} from '../../service/profile.service';

export class CommandOptions extends Options {
    @option({
        flag: 'a',
        description: 'Account address.',
    })
    address: string;
}

@command({
    description: 'Display the list of stored profiles',
})
export default class extends Command {
    private readonly profileService: ProfileService;

    constructor() {
        super();
        const profileRepository = new ProfileRepository('.nem2rc.json');
        this.profileService = new ProfileService(profileRepository);
    }

    @metadata
    execute(options: CommandOptions) {
        let message = '';
        this.profileService.findAll().map((profile) => {
            message += '\n\n' + profile.toString();
        });
        console.log(message);
        try {
            const currentProfile = this.profileService.getDefaultProfile();
            console.log(chalk.green('\n\n Default profile:', currentProfile.name));
        } catch {
            console.log(chalk.green('\n\n Default profile: None'));
        }
    }
}
