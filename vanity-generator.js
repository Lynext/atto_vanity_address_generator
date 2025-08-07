const crypto = require('crypto');
const { sign } = require('tweetnacl');
const blake = require('blakejs');
const bip39 = require('bip39');
const readline = require('readline');
const fs = require('fs');
const https = require('https');
require('dotenv').config();

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

// Generate random 24-word mnemonic using bip39
function generateMnemonic() {
    // Generate 256 bits of entropy for 24-word mnemonic
    return bip39.generateMnemonic(256);
}

// Convert mnemonic to seed using PBKDF2
function mnemonicToSeed(mnemonic, passphrase = '') {
    const salt = 'mnemonic' + passphrase;
    return crypto.pbkdf2Sync(mnemonic, salt, 2048, 64, 'sha512');
}

// BIP44 hierarchical deterministic key derivation (matching Kotlin implementation)
class BIP44 {
    constructor(key, chainCode) {
        this.key = key;
        this.chainCode = chainCode;
    }
    
    static fromSeed(seed) {
        const hmac = crypto.createHmac('sha512', 'ed25519 seed');
        hmac.update(seed);
        const derived = hmac.digest();
        
        return new BIP44(
            derived.slice(0, 32),
            derived.slice(32, 64)
        );
    }
    
    derive(index) {
        // Create new HMAC with the chain code
        const hmac = crypto.createHmac('sha512', this.chainCode);
        
        // Add 0x00 prefix for private key derivation
        hmac.update(Buffer.from([0x00]));
        
        // Add the private key (32 bytes)
        hmac.update(this.key);
        
        // Add the index as big-endian 32-bit integer with hardened bit set
        const indexBuffer = Buffer.allocUnsafe(4);
        indexBuffer.writeInt32BE(index, 0);
        // Set the hardened bit (MSB)
        indexBuffer[0] = indexBuffer[0] | 0x80;
        hmac.update(indexBuffer);
        
        const derived = hmac.digest();
        
        return new BIP44(
            derived.slice(0, 32),
            derived.slice(32, 64)
        );
    }
}

// Derive private key using BIP44 path m/44'/1869902945'/0'
function derivePrivateKey(seed) {
    const coinType = 1869902945; // "atto".toByteArray().toUInt()
    
    let bip44 = BIP44.fromSeed(seed);
    bip44 = bip44.derive(44);        // m/44'
    bip44 = bip44.derive(coinType);  // m/44'/1869902945'
    bip44 = bip44.derive(0);         // m/44'/1869902945'/0'
    
    return bip44.key;
}

// Convert private key to public key using Ed25519
function privateKeyToPublicKey(privateKey) {
    const keyPair = sign.keyPair.fromSeed(privateKey);
    return keyPair.publicKey;
}

// BLAKE2B hash function
function blake2bHash(data, size = 32) {
    return blake.blake2b(data, null, size);
}

// Generate ATTO address from public key
function generateAttoAddress(publicKey) {
    // Algorithm V1 code
    const algorithmCode = Buffer.from([0x00]);
    
    // Combine algorithm and public key
    const combined = Buffer.concat([algorithmCode, publicKey]);
    
    // Calculate BLAKE2B checksum
    const checksum = blake2bHash(combined, 5);
    
    // Combine all parts
    const addressData = Buffer.concat([combined, checksum]);
    
    // Base32 encode
    const encoded = base32Encode(addressData);
    
    // Add ATTO schema and convert to lowercase
    return ('atto://' + encoded).toLowerCase();
}

// Convert wildcard pattern to regex
function createWildcardRegex(pattern) {
    // Escape special regex characters except *
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    // Replace * with regex equivalent (any character except nothing)
    const regexPattern = escaped.replace(/\*/g, '.');
    return new RegExp(regexPattern, 'i'); // case insensitive
}

// Check if address matches pattern with wildcard support
function matchesPattern(address, targetString, searchType) {
    const addressPart = address.replace('atto://', '');
    const addressLower = addressPart.toLowerCase();
    const targetLower = targetString.toLowerCase();
    
    // Check if pattern contains wildcards
    const hasWildcard = targetString.includes('*');
    
    if (hasWildcard) {
        const regex = createWildcardRegex(targetLower);
        
        switch (searchType) {
            case 'starts':
                // For starts, skip first 2 characters and check from position 2
                const startPart = addressLower.substring(2);
                return regex.test(startPart) && startPart.search(regex) === 0;
            case 'ends':
                return regex.test(addressLower) && addressLower.search(regex) === addressLower.length - targetLower.replace(/\*/g, '.').length;
            case 'contains':
            default:
                return regex.test(addressLower);
        }
    } else {
        // No wildcards, use simple string matching
        switch (searchType) {
            case 'starts':
                // For starts, skip first 2 characters (they can only be a,b,c,d)
                return addressLower.substring(2).startsWith(targetLower);
            case 'ends':
                return addressLower.endsWith(targetLower);
            case 'contains':
            default:
                return addressLower.includes(targetLower);
        }
    }
}

// Main vanity address generation function
async function findVanityAddress(targetString, searchType = 'contains') {
    const searchDescription = searchType === 'starts' ? 
        `starting with "${targetString}" (after first 2 chars)` :
        searchType === 'ends' ? 
        `ending with "${targetString}"` :
        `containing "${targetString}"`;
    
    console.log(`Searching for ATTO address ${searchDescription}`);
    if (targetString.includes('*')) {
        console.log('Using wildcard matching (* = any character)');
    }
    console.log('This may take a while depending on the target string...');
    
    let attempts = 0;
    const startTime = Date.now();
    
    // Progress reporting
    const reportInterval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = attempts / elapsed;
        console.log(`Checked ${attempts} addresses (${rate.toFixed(2)} addr/sec)`);
    }, 5000);
    
    while (true) {
        attempts++;
        
        // Generate random mnemonic
        const mnemonic = generateMnemonic();
        
        // Convert to seed
        const seed = mnemonicToSeed(mnemonic);
        
        // Derive private key
        const privateKey = derivePrivateKey(seed);
        
        // Generate public key
        const publicKey = privateKeyToPublicKey(privateKey);
        
        // Generate ATTO address
        const address = generateAttoAddress(publicKey);
        
        // Check if address matches the pattern
        const isMatch = matchesPattern(address, targetString, searchType);
        
        if (isMatch) {
            clearInterval(reportInterval);
            
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = attempts / elapsed;
            
            console.log('\n🎉 VANITY ADDRESS FOUND! 🎉');
            console.log('================================');
            console.log(`Address: ${address}`);
            console.log(`Mnemonic: ${mnemonic}`);
            console.log('================================');
            console.log(`Found after ${attempts} attempts in ${elapsed.toFixed(2)} seconds`);
            console.log(`Average rate: ${rate.toFixed(2)} addresses/second`);
            
            // Save to file
            const result = {
                address,
                mnemonic,
                searchType,
                targetString,
                attempts,
                elapsed: elapsed.toFixed(2),
                rate: rate.toFixed(2),
                timestamp: new Date().toISOString()
            };
            
            await saveToFile(result);
            
            // Send notification to ntfy
            sendNotification(result);
            
            return result;
        }
        
        // Optional: Add a small delay to prevent overwhelming the system
        if (attempts % 1000 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
        }
    }
}

// Send notification to ntfy
 function sendNotification(result) {
     const ntfyUrl = process.env.NTFY_URL;
     
     if (!ntfyUrl) {
         console.log('⚠️ NTFY_URL not configured, skipping notification');
         return;
     }
     
     const data = JSON.stringify({
         title: '🎉 ATTO Vanity Address Found!',
         message: `Address: ${result.address}\nTarget: "${result.targetString}" (${result.searchType})\nAttempts: ${result.attempts}\nTime: ${result.elapsed}s`,
         tags: ['tada', 'atto']
     });
     
     // Parse the URL to extract hostname, port, and path
     const url = new URL(ntfyUrl);
     const options = {
         hostname: url.hostname,
         port: url.port || (url.protocol === 'https:' ? 443 : 80),
         path: url.pathname,
         method: 'POST',
         headers: {
             'Content-Type': 'application/json',
             'Content-Length': data.length
         }
     };
     
     const requestModule = url.protocol === 'https:' ? https : require('http');
     const req = requestModule.request(options, (res) => {
         if (res.statusCode === 200) {
             console.log('📱 Notification sent successfully');
         } else {
             console.log(`⚠️ Notification failed with status: ${res.statusCode}`);
         }
     });
     
     req.on('error', (error) => {
         console.log('⚠️ Notification error:', error.message);
     });
     
     req.write(data);
     req.end();
 }

// Save result to file
async function saveToFile(result) {
    const content = `ATTO Vanity Address Found\n` +
                   `========================\n` +
                   `Timestamp: ${result.timestamp}\n` +
                   `Address: ${result.address}\n` +
                   `Mnemonic: ${result.mnemonic}\n` +
                   `Search Type: ${result.searchType}\n` +
                   `Target String: ${result.targetString}\n` +
                   `Attempts: ${result.attempts}\n` +
                   `Time Elapsed: ${result.elapsed} seconds\n` +
                   `Rate: ${result.rate} addresses/second\n` +
                   `\n${'='.repeat(50)}\n\n`;
    
    try {
        await fs.promises.appendFile('foundAddress.txt', content);
        console.log('\n✅ Result saved to foundAddress.txt');
    } catch (error) {
        console.error('❌ Error saving to file:', error.message);
    }
}

// Create readline interface for user input
function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

// Prompt user for input
function askQuestion(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

// Interactive mode
async function interactiveMode() {
    const rl = createReadlineInterface();
    
    console.log('🎯 ATTO Vanity Address Generator');
    console.log('================================\n');
    
    try {
        // Get target string
        let targetString;
        while (true) {
            console.log('💡 Tips:');
            console.log('   • Use * as wildcard (matches any single character)');
            console.log('   • Example: "a*c" matches "abc", "axc", "a5c", etc.');
            console.log('   • For "start" option: first 2 characters are ignored (they can only be a,b,c,d)\n');
            
            targetString = await askQuestion(rl, 'Enter the text/pattern you want in your address: ');
            if (targetString.length >= 1) {
                break;
            }
            console.log('❌ Target string must be at least 1 character long.\n');
        }
        
        // Get search type
        console.log('\nHow should the address match your text/pattern?');
        console.log('1. Start with the text (ignores first 2 characters)');
        console.log('2. Contain the text anywhere');
        console.log('3. End with the text');
        
        let searchType;
        while (true) {
            const choice = await askQuestion(rl, '\nEnter your choice (1-3): ');
            switch (choice) {
                case '1':
                    searchType = 'starts';
                    break;
                case '2':
                    searchType = 'contains';
                    break;
                case '3':
                    searchType = 'ends';
                    break;
                default:
                    console.log('❌ Please enter 1, 2, or 3.\n');
                    continue;
            }
            break;
        }
        
        rl.close();
        
        // Show warning for long strings
        if (targetString.length > 6) {
            console.log('\n⚠️  Warning: Long target strings may take a very long time to find!');
            console.log('Consider using shorter strings for faster results.\n');
        }
        
        // Start generation
        const searchDesc = searchType === 'starts' ? 
            `starts with "${targetString}" (after first 2 chars)` :
            searchType === 'ends' ? 
            `ends with "${targetString}"` :
            `contains "${targetString}"`;
        
        console.log(`\n🚀 Starting search for address that ${searchDesc}...`);
        if (targetString.includes('*')) {
            console.log('🎯 Using wildcard pattern matching\n');
        } else {
            console.log('');
        }
        
        await findVanityAddress(targetString, searchType);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        rl.close();
    }
}

// Command line interface
async function main() {
    const args = process.argv.slice(2);
    
    // If no arguments, run interactive mode
    if (args.length === 0) {
        await interactiveMode();
        return;
    }
    
    // Legacy command line mode
    const targetString = args[0];
    const searchType = args[1] || 'contains';
    
    if (targetString.length < 1) {
        console.log('Error: Target string must be at least 1 character long.');
        process.exit(1);
    }
    
    if (targetString.length > 10) {
        console.log('Warning: Long target strings may take a very long time to find!');
        console.log('Consider using shorter strings for faster results.');
    }
    
    await findVanityAddress(targetString, searchType);
}

// Handle async function in main
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    generateMnemonic,
    mnemonicToSeed,
    derivePrivateKey,
    privateKeyToPublicKey,
    generateAttoAddress,
    findVanityAddress,
    saveToFile,
    interactiveMode
};