import {ProfileOptions} from '../interfaces/profile.command'
import {Profile} from '../models/profile'
import {OptionsResolver} from '../options-resolver'
import {Resolver} from './resolver'

/**
 * Proof resolver
 */
export class ProofResolver implements Resolver {

    /**
     * Resolves an secret provided by the user.
     * @param {ProfileOptions} options - Command options.
     * @param {Profile} secondSource - Secondary data source.
     * @param {string} altText - Alternative text.
     * @param {string} altKey - Alternative key.
     * @returns {string}
     */
    async resolve(options: ProfileOptions, secondSource?: Profile, altText?: string, altKey?: string): Promise<string> {
        const resolution = await OptionsResolver(options,
            altKey ? altKey : 'proof',
            () => undefined,
            altText ? altText : 'Enter the original random set of bytes in hexadecimal: ')
        return resolution
    }
}
