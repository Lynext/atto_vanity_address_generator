# ATTO Vanity Address Generator

A powerful tool for generating custom ATTO cryptocurrency addresses with specific patterns. This project includes both a command-line interface and a modern web application.

## Features

- **Pattern Matching**: Generate addresses that start with, contain, or end with your desired text
- **Wildcard Support**: Use `*` as wildcards to match any character in your pattern
- **Real-time Progress**: Monitor generation progress with live statistics and performance metrics
- **Web Interface**: User-friendly React-based web application
- **Command Line**: Powerful CLI tool for batch generation
- **Cryptographically Secure**: All generated addresses are fully compatible with ATTO wallets

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Clone the Repository
```bash
git clone <repository-url>
cd atto_vanity_address_generator
npm install
```

### Install Web Application Dependencies
```bash
cd webpage
npm install
cd ..
```

## Usage

### Command Line Interface

Run the vanity address generator from the command line:

```bash
npm start
```

The CLI will prompt you to:
1. Enter your desired pattern
2. Choose search type (starts, contains, ends)
3. Monitor progress as addresses are generated

#### Pattern Examples
- `"abc"` - Find addresses containing "abc"
- `"a*c"` - Find addresses with "a" and "c" separated by any character
- `"123*"` - Find addresses starting with "123" followed by any character

### Web Application

To run the web application:

```bash
cd webpage
npm run dev
```

The web application will be available at `http://localhost:3000`

## Configuration

Copy `.env.example` to `.env` and configure any necessary environment variables.

### Notification Setup (Optional)

The generator can send POST request notifications when a vanity address is found using the [ntfy](https://ntfy.sh/) service.

1. Set up an ntfy topic (either use ntfy.sh or self-host)
2. Add the `NTFY_URL` environment variable to your `.env` file:

```bash
NTFY_URL=https://ntfy.sh/your-topic-name
# or for self-hosted:
NTFY_URL=https://your-ntfy-server.com/your-topic
```

#### Notification Data

When a vanity address is found, the script sends a POST request with the following JSON payload:

```json
{
  "title": "🎉 ATTO Vanity Address Found!",
  "message": "Address: atto://...\nTarget: \"pattern\" (search_type)\nAttempts: 12345\nTime: 45.67s",
  "tags": ["tada", "atto"]
}
```

If `NTFY_URL` is not configured, the notification feature will be skipped without affecting the generation process.

## How It Works

1. **Mnemonic Generation**: Creates a 24-word BIP39 mnemonic phrase
2. **Key Derivation**: Uses BIP44 hierarchical deterministic key derivation (path: m/44'/1869902945'/0')
3. **Address Generation**: Converts public keys to ATTO addresses using BLAKE2B hashing and Base32 encoding
4. **Pattern Matching**: Efficiently searches for addresses matching your specified pattern

## Performance Notes

- Shorter patterns are found faster
- "Start" option ignores the first 2 characters (which can only be a, b, c, or d)
- Longer patterns may take significantly more time
- The tool uses optimized algorithms for maximum performance

## Technical Details

### Dependencies
- **bip39**: Mnemonic phrase generation
- **blakejs**: BLAKE2B hashing
- **tweetnacl**: Ed25519 cryptographic operations
- **crypto**: Node.js cryptographic functions

### Address Format
ATTO addresses follow the format: `atto://[base32-encoded-data]`

## Scripts

- `npm start` - Run the command-line generator
- `npm test` - Run tests (placeholder)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the LICENSE file for details.

## Donations

If you find this tool useful, consider supporting the development:

**ATTO Address**: `atto://abnextegrj74n2md4i3mqhuicmyig6tdfk3u6zoyuzlx2uoixrnjk7b2jd7h2`

## Credits

Made with ❤️ by Lynext

---

**Disclaimer**: Always verify generated addresses and keep your private keys secure. This tool is provided as-is without any warranties