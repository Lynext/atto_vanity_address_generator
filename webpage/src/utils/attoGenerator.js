import * as bip39 from 'bip39';
import { sign } from 'tweetnacl';
import { blake2b } from 'blakejs';

// Base32 encoding (RFC 4648)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(data) {
    let result = '';
    let bits = 0;
    let value = 0;
    
    for (let i = 0; i < data.length; i++) {
        value = (value << 8) | data[i];
        bits += 8;
        
        while (bits >= 5) {
            result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    
    if (bits > 0) {
        result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }
    
    return result;
}

// Convert mnemonic to seed using PBKDF2
function mnemonicToSeed(mnemonic, passphrase = '') {
    return bip39.mnemonicToSeedSync(mnemonic, passphrase);
}

// BIP44 hierarchical deterministic key derivation
class BIP44 {
    constructor(key, chainCode) {
        this.key = key;
        this.chainCode = chainCode;
    }
    
    static async fromSeed(seed) {
        const hmacKey = new TextEncoder().encode('ed25519 seed');
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            hmacKey,
            { name: 'HMAC', hash: 'SHA-512' },
            false,
            ['sign']
        );
        
        const derived = await crypto.subtle.sign('HMAC', cryptoKey, seed);
        const derivedArray = new Uint8Array(derived);
        
        return new BIP44(
            derivedArray.slice(0, 32),
            derivedArray.slice(32, 64)
        );
    }
    
    async derive(index) {
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            this.chainCode,
            { name: 'HMAC', hash: 'SHA-512' },
            false,
            ['sign']
        );
        
        // Create data for HMAC: 0x00 + private key + hardened index
        const data = new Uint8Array(1 + 32 + 4);
        data[0] = 0x00; // prefix for private key derivation
        data.set(this.key, 1);
        
        // Add the index as big-endian 32-bit integer with hardened bit set
        const hardenedIndex = index | 0x80000000;
        const view = new DataView(data.buffer, 33, 4);
        view.setUint32(0, hardenedIndex, false); // big-endian
        
        const derived = await crypto.subtle.sign('HMAC', cryptoKey, data);
        const derivedArray = new Uint8Array(derived);
        
        return new BIP44(
            derivedArray.slice(0, 32),
            derivedArray.slice(32, 64)
        );
    }
}

// Derive private key using BIP44 path m/44'/1869902945'/0'
async function derivePrivateKey(seed) {
    const coinType = 1869902945; // "atto".toByteArray().toUInt()
    
    let bip44 = await BIP44.fromSeed(seed);
    bip44 = await bip44.derive(44);        // m/44'
    bip44 = await bip44.derive(coinType);  // m/44'/1869902945'
    bip44 = await bip44.derive(0);         // m/44'/1869902945'/0'
    
    return bip44.key;
}

// Generate Ed25519 public key from private key
function privateKeyToPublicKey(privateKey) {
    const keyPair = sign.keyPair.fromSeed(privateKey);
    return keyPair.publicKey;
}

// Generate ATTO address from public key
function generateAttoAddress(publicKey) {
    const algorithmCode = new Uint8Array([0]); // V1 algorithm
    
    // Create checksum using BLAKE2B with exactly 5 bytes output
    const checksumData = new Uint8Array(algorithmCode.length + publicKey.length);
    checksumData.set(algorithmCode, 0);
    checksumData.set(publicKey, algorithmCode.length);
    const checksum = blake2b(checksumData, undefined, 5);
    
    // Combine algorithm + public key + checksum (38 bytes total)
    const addressBytes = new Uint8Array(algorithmCode.length + publicKey.length + checksum.length);
    addressBytes.set(algorithmCode, 0);
    addressBytes.set(publicKey, algorithmCode.length);
    addressBytes.set(checksum, algorithmCode.length + publicKey.length);
    
    // Encode to Base32 and convert to lowercase
    const base32 = base32Encode(addressBytes);
    const addressPath = base32.replace(/=/g, '').toLowerCase();
    
    return 'atto://' + addressPath;
}

// Generate random 24-word mnemonic
export function generateMnemonic() {
    return bip39.generateMnemonic(256);
}

// Generate ATTO address from mnemonic
export async function generateAttoAddressFromMnemonic(mnemonic) {
    const seed = mnemonicToSeed(mnemonic);
    const privateKey = await derivePrivateKey(seed);
    const publicKey = privateKeyToPublicKey(privateKey);
    return generateAttoAddress(publicKey);
}

// Validate mnemonic
export function validateMnemonic(mnemonic) {
    return bip39.validateMnemonic(mnemonic);
}

// Pattern matching functions
export function createWildcardRegex(pattern) {
    // Escape special regex characters except *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Replace * with regex pattern for any character
    const regexPattern = escaped.replace(/\*/g, '.');
    return new RegExp(regexPattern, 'i');
}

export function matchesPattern(address, targetString, searchType) {
    const addressPart = address.replace('atto://', '');
    const lowerTarget = targetString.toLowerCase();
    const lowerAddress = addressPart.toLowerCase();
    
    // Check for wildcard patterns
    const hasWildcard = targetString.includes('*');
    
    if (hasWildcard) {
        const regex = createWildcardRegex(lowerTarget);
        
        switch (searchType) {
            case 'start':
                // Skip first 2 characters for start matching
                const startPart = lowerAddress.slice(2);
                return regex.test(startPart) && startPart.indexOf(lowerTarget.replace(/\*/g, '')) === 0;
            case 'contain':
                return regex.test(lowerAddress);
            case 'end':
                return regex.test(lowerAddress) && lowerAddress.endsWith(lowerTarget.replace(/\*/g, ''));
            default:
                return false;
        }
    } else {
        switch (searchType) {
            case 'start':
                // Skip first 2 characters for start matching
                return lowerAddress.slice(2).startsWith(lowerTarget);
            case 'contain':
                return lowerAddress.includes(lowerTarget);
            case 'end':
                return lowerAddress.endsWith(lowerTarget);
            default:
                return false;
        }
    }
}