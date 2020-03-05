import {Password} from 'symbol-sdk'
import {ProfileOptions} from '../interfaces/profile.command'
import {Profile} from '../models/profile.model'
import {OptionsResolver} from '../options-resolver'
import {PasswordValidator} from '../validators/password.validator'
import {Resolver} from './resolver'

/**
 * Password resolver
 */
export class PasswordResolver implements Resolver {

    /**
     * Resolves a password provided by the user.
     * @param {ProfileOptions} options - Command options.
     * @param {Profile} secondSource - Secondary data source.
     * @param {string} altText - Alternative text.
     * @param {string} altKey - Alternative key.
     * @returns {Promise<Password>}
     */
    async resolve(options: ProfileOptions, secondSource?: Profile, altText?: string, altKey?: string): Promise<Password> {
        const resolution = await OptionsResolver(options,
            altKey ? altKey : 'password',
            () => undefined,
            altText ? altText : 'Enter your wallet password:',
            'password',
            new PasswordValidator())
        return new Password(resolution)
    }
}
