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
import { SaveResolver } from '../../src/resolvers/save.resolver';

describe('Save resolver', () => {
    it('should return boolean', async () => {
        const options = {
            save: true,
            url: '',
            network: '',
            profile: '',
            password: '',
            epochAdjustment: 123,
            default: false,
            generationHash: '1',
            namespaceId: '',
            divisibility: 0,
            hd: false,
            ledger: false,
        };
        expect(await new SaveResolver().resolve(options)).to.be.equal(true);
    });
});
